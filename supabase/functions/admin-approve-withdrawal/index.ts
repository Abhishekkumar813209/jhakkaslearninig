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

    const { withdrawalId, action, notes, paymentReference } = await req.json();

    if (!withdrawalId || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For approval, payment reference is mandatory
    if (action === 'approve' && (!paymentReference || paymentReference.trim() === '')) {
      return new Response(JSON.stringify({ error: 'Payment reference is required for approval' }), {
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
      // Update withdrawal status (trigger will enforce payment_reference requirement)
      const { error: updateError } = await supabaseService
        .from('withdrawal_history')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          admin_approved_by: user.id,
          admin_notes: notes,
          payment_reference: paymentReference.trim()
        })
        .eq('id', withdrawalId);

      if (updateError) {
        console.error('Error updating withdrawal:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use RPC function to complete withdrawal (atomic operation)
      const { error: completeError } = await supabaseService
        .rpc('complete_withdrawal', {
          p_student_id: withdrawal.student_id,
          p_amount: withdrawal.amount
        });

      if (completeError) {
        console.error('Error completing withdrawal:', completeError);
        // Rollback withdrawal status
        await supabaseService
          .from('withdrawal_history')
          .update({ status: 'pending', completed_at: null, admin_approved_by: null, payment_reference: null })
          .eq('id', withdrawalId);
        
        return new Response(JSON.stringify({ error: 'Failed to complete withdrawal: ' + completeError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[Withdrawal Approved] ₹${withdrawal.amount} approved for user ${withdrawal.student_id}, ref: ${paymentReference}`);

      return new Response(
        JSON.stringify({ message: 'Withdrawal approved and payment recorded successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Reject - update status
      await supabaseService
        .from('withdrawal_history')
        .update({
          status: 'failed',
          admin_approved_by: user.id,
          admin_notes: notes,
          failure_reason: notes || 'Rejected by admin'
        })
        .eq('id', withdrawalId);

      // Use RPC function to unlock credits (atomic operation)
      const { error: unlockError } = await supabaseService
        .rpc('unlock_credits_for_withdrawal', {
          p_student_id: withdrawal.student_id,
          p_amount: withdrawal.amount
        });

      if (unlockError) {
        console.error('Error unlocking credits:', unlockError);
      }

      console.log(`[Withdrawal Rejected] ₹${withdrawal.amount} rejected for user ${withdrawal.student_id}, reason: ${notes || 'No reason provided'}`);

      return new Response(
        JSON.stringify({ message: 'Withdrawal rejected and credits unlocked' }),
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
