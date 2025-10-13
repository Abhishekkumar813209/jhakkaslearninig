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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { amount, upiId } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!upiId || !upiId.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid UPI ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lock credits using RPC function (atomic operation)
    const { data: lockSuccess, error: lockError } = await supabaseClient
      .rpc('lock_credits_for_withdrawal', {
        p_student_id: user.id,
        p_amount: amount
      });

    if (lockError || !lockSuccess) {
      console.error('Error locking credits:', lockError);
      return new Response(JSON.stringify({ error: 'Insufficient credits or unable to lock' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create withdrawal record and mark as completed immediately (instant withdrawal)
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('withdrawal_history')
      .insert({
        student_id: user.id,
        amount,
        upi_id: upiId,
        withdrawal_method: 'upi',
        status: 'completed',
        completed_at: new Date().toISOString(),
        auto_approved: true
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Error creating withdrawal:', withdrawalError);
      // Rollback - unlock credits
      await supabaseClient.rpc('unlock_credits_for_withdrawal', {
        p_student_id: user.id,
        p_amount: amount
      });

      return new Response(JSON.stringify({ error: withdrawalError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Complete withdrawal - deduct credits immediately
    const { error: deductError } = await supabaseClient.rpc('complete_withdrawal', {
      p_student_id: user.id,
      p_amount: amount
    });

    if (deductError) {
      console.error('Error deducting credits:', deductError);
      // Note: Withdrawal record exists but credits weren't deducted
      // Admin should handle this manually
      return new Response(JSON.stringify({ error: 'Withdrawal created but credits not deducted. Contact support.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Instant Withdrawal] ₹${amount} withdrawn by user ${user.id} to ${upiId}`);

    return new Response(
      JSON.stringify({ 
        message: 'Withdrawal completed successfully! Money will be transferred to your UPI within 24 hours.',
        withdrawal 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in request-withdrawal:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
