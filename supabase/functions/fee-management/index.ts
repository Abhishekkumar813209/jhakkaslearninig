import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let action = url.searchParams.get('action');
    let requestBody = null;
    
    // If action is not in URL params, check request body
    if (!action && req.body) {
      requestBody = await req.json();
      action = requestBody.action;
    }
    
    console.log('Received action:', action);
    
    // Get auth user
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'get_student_fee_status':
        return await getStudentFeeStatus(user.id);
      
      case 'mark_payment':
        if (!requestBody) {
          requestBody = await req.json();
        }
        const { studentId, month, year, paymentMethod } = requestBody;
        return await markPayment(user.id, studentId, month, year, paymentMethod);
      
      case 'get_batch_analytics':
        return await getBatchAnalytics();
      
      case 'generate_monthly_fees':
        return await generateMonthlyFees();
      
      case 'get_all_students_fees':
        return await getAllStudentsFees();
      
      default:
        console.error('Invalid action received:', action);
        return new Response(JSON.stringify({ 
          error: 'Invalid action', 
          receivedAction: action,
          validActions: ['get_student_fee_status', 'mark_payment', 'get_batch_analytics', 'generate_monthly_fees', 'get_all_students_fees']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Fee management error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getStudentFeeStatus(studentId: string) {
  console.log('Getting fee status for student:', studentId);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const { data: feeRecord, error } = await supabase
    .from('fee_records')
    .select(`
      *,
      profiles!fee_records_student_id_fkey(full_name, email),
      batches(name)
    `)
    .eq('student_id', studentId)
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching fee record:', error);
    throw error;
  }

  if (!feeRecord) {
    console.log('No fee record found, generating...');
    // Generate fee record for current month if doesn't exist
    const { error: genError } = await supabase.rpc('generate_monthly_fees');
    if (genError) {
      console.error('Error generating monthly fees:', genError);
      throw genError;
    }
    
    // Fetch again
    const { data: newRecord, error: fetchError } = await supabase
      .from('fee_records')
      .select(`
        *,
        profiles!fee_records_student_id_fkey(full_name, email),
        batches(name)
      `)
      .eq('student_id', studentId)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single();
    
    if (fetchError) {
      console.error('Error fetching new record:', fetchError);
      throw fetchError;
    }
    
    return new Response(JSON.stringify({ feeRecord: newRecord }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('Fee record found:', feeRecord);
  return new Response(JSON.stringify({ feeRecord }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function markPayment(markedBy: string, studentId: string, month: number, year: number, paymentMethod: string) {
  console.log('Marking payment for student:', studentId);
  
  // Check if user has admin role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', markedBy)
    .single();

  if (!userRole || userRole.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Only admins can mark payments' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update without setting marked_by to avoid foreign key constraint
  const { data: updatedRecord, error } = await supabase
    .from('fee_records')
    .update({
      is_paid: true,
      paid_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      battery_level: 100 // Reset battery to full when paid
    })
    .eq('student_id', studentId)
    .eq('month', month)
    .eq('year', year)
    .select()
    .single();

  if (error) {
    console.error('Error marking payment:', error);
    throw error;
  }

  return new Response(JSON.stringify({ success: true, record: updatedRecord }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getBatchAnalytics() {
  console.log('Getting batch analytics...');
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Get all fee records with batch info
  const { data: feeRecords, error } = await supabase
    .from('fee_records')
    .select(`
      batch_id,
      is_paid,
      batches(name)
    `)
    .eq('month', currentMonth)
    .eq('year', currentYear);

  if (error) {
    console.error('Error fetching batch analytics:', error);
    throw error;
  }

  console.log('Fee records found:', feeRecords?.length);

  // Process data for charts
  const batchAnalytics: Record<string, { paid: number; unpaid: number; total: number }> = {};
  feeRecords?.forEach(record => {
    const batchName = record.batches?.name || 'No Batch';
    if (!batchAnalytics[batchName]) {
      batchAnalytics[batchName] = { paid: 0, unpaid: 0, total: 0 };
    }
    
    if (record.is_paid) {
      batchAnalytics[batchName].paid += 1;
    } else {
      batchAnalytics[batchName].unpaid += 1;
    }
    batchAnalytics[batchName].total += 1;
  });

  console.log('Batch analytics:', batchAnalytics);
  
  return new Response(JSON.stringify({ batchAnalytics }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateMonthlyFees() {
  console.log('Generating monthly fees...');
  
  const { error } = await supabase.rpc('generate_monthly_fees');
  if (error) {
    console.error('Error generating monthly fees:', error);
    throw error;
  }

  return new Response(JSON.stringify({ success: true, message: 'Monthly fees generated' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getAllStudentsFees() {
  console.log('Getting all students fees...');
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: feeRecords, error } = await supabase
    .from('fee_records')
    .select(`
      *,
      profiles!fee_records_student_id_fkey(full_name, email),
      batches(name)
    `)
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .order('battery_level', { ascending: true });

  if (error) {
    console.error('Error fetching all students fees:', error);
    throw error;
  }

  console.log('All students fees found:', feeRecords?.length);
  
  return new Response(JSON.stringify({ feeRecords }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}