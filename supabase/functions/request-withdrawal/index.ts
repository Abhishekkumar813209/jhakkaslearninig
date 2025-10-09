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

    // Check available credits
    const { data: credits } = await supabaseClient
      .from('referral_credits')
      .select('available_credits')
      .eq('student_id', user.id)
      .maybeSingle();

    if (!credits || credits.available_credits < amount) {
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lock the credits
    const { error: lockError } = await supabaseClient
      .from('referral_credits')
      .update({
        locked_for_withdrawal: supabaseClient.sql`locked_for_withdrawal + ${amount}`
      })
      .eq('student_id', user.id);

    if (lockError) {
      console.error('Error locking credits:', lockError);
      return new Response(JSON.stringify({ error: 'Failed to lock credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('withdrawal_history')
      .insert({
        student_id: user.id,
        amount,
        upi_id: upiId,
        withdrawal_method: 'upi',
        status: 'pending'
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Error creating withdrawal request:', withdrawalError);
      // Unlock credits if withdrawal creation failed
      await supabaseClient
        .from('referral_credits')
        .update({
          locked_for_withdrawal: supabaseClient.sql`locked_for_withdrawal - ${amount}`
        })
        .eq('student_id', user.id);

      return new Response(JSON.stringify({ error: withdrawalError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Withdrawal Request] User ${user.id} requested ₹${amount} to ${upiId}`);

    return new Response(
      JSON.stringify({ 
        message: 'Withdrawal request submitted successfully',
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
