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
    const action = url.searchParams.get('action');
    
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
        const { studentId, month, year, paymentMethod } = await req.json();
        return await markPayment(user.id, studentId, month, year, paymentMethod);
      
      case 'get_batch_analytics':
        return await getBatchAnalytics();
      
      case 'generate_monthly_fees':
        return await generateMonthlyFees();
      
      case 'get_all_students_fees':
        return await getAllStudentsFees();
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Fee management error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getStudentFeeStatus(studentId: string) {
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
    throw error;
  }

  if (!feeRecord) {
    // Generate fee record for current month if doesn't exist
    const { error: genError } = await supabase.rpc('generate_monthly_fees');
    if (genError) throw genError;
    
    // Fetch again
    const { data: newRecord } = await supabase
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
    
    return new Response(JSON.stringify({ feeRecord: newRecord }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ feeRecord }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function markPayment(markedBy: string, studentId: string, month: number, year: number, paymentMethod: string) {
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

  const { data: updatedRecord, error } = await supabase
    .from('fee_records')
    .update({
      is_paid: true,
      paid_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      marked_by: markedBy,
      battery_level: 100 // Reset battery to full when paid
    })
    .eq('student_id', studentId)
    .eq('month', month)
    .eq('year', year)
    .select()
    .single();

  if (error) throw error;

  return new Response(JSON.stringify({ success: true, record: updatedRecord }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getBatchAnalytics() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Get batch-wise payment analytics
  const { data: batchData, error } = await supabase
    .from('fee_records')
    .select(`
      batch_id,
      is_paid,
      batches(name),
      count()
    `)
    .eq('month', currentMonth)
    .eq('year', currentYear);

  if (error) throw error;

  // Process data for charts
  const batchAnalytics = {};
  batchData?.forEach(record => {
    const batchName = record.batches?.name || 'No Batch';
    if (!batchAnalytics[batchName]) {
      batchAnalytics[batchName] = { paid: 0, unpaid: 0, total: 0 };
    }
    
    if (record.is_paid) {
      batchAnalytics[batchName].paid += record.count;
    } else {
      batchAnalytics[batchName].unpaid += record.count;
    }
    batchAnalytics[batchName].total += record.count;
  });

  return new Response(JSON.stringify({ batchAnalytics }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateMonthlyFees() {
  const { error } = await supabase.rpc('generate_monthly_fees');
  if (error) throw error;

  return new Response(JSON.stringify({ success: true, message: 'Monthly fees generated' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getAllStudentsFees() {
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

  if (error) throw error;

  return new Response(JSON.stringify({ feeRecords }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}