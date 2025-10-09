import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { withdrawalId, action, notes } = await req.json();

    if (!withdrawalId || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get withdrawal details
    const { data: withdrawal } = await supabaseService
      .from('withdrawal_history')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (!withdrawal || withdrawal.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Withdrawal not found or already processed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'approve') {
      // Update withdrawal status
      await supabaseService
        .from('withdrawal_history')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          admin_approved_by: user.id,
          admin_notes: notes
        })
        .eq('id', withdrawalId);

      // Deduct from locked and move to used
      await supabaseService
        .from('referral_credits')
        .update({
          locked_for_withdrawal: supabaseService.sql`locked_for_withdrawal - ${withdrawal.amount}`,
          used_credits: supabaseService.sql`used_credits + ${withdrawal.amount}`
        })
        .eq('student_id', withdrawal.student_id);

      console.log(`[Withdrawal Approved] ₹${withdrawal.amount} approved for user ${withdrawal.student_id}`);

      return new Response(
        JSON.stringify({ message: 'Withdrawal approved successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Reject - unlock credits
      await supabaseService
        .from('withdrawal_history')
        .update({
          status: 'failed',
          admin_approved_by: user.id,
          admin_notes: notes,
          failure_reason: notes || 'Rejected by admin'
        })
        .eq('id', withdrawalId);

      // Unlock credits
      await supabaseService
        .from('referral_credits')
        .update({
          locked_for_withdrawal: supabaseService.sql`locked_for_withdrawal - ${withdrawal.amount}`
        })
        .eq('student_id', withdrawal.student_id);

      console.log(`[Withdrawal Rejected] ₹${withdrawal.amount} rejected for user ${withdrawal.student_id}`);

      return new Response(
        JSON.stringify({ message: 'Withdrawal rejected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in admin-approve-withdrawal:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
