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

    const { amount, upiId, withdrawalMethod, phoneNumber, accountName } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Please enter a valid amount (minimum ₹25)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (amount < 25) {
      return new Response(JSON.stringify({ error: 'Minimum withdrawal amount is ₹25' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate based on withdrawal method
    if (withdrawalMethod === 'phone') {
      if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
        return new Response(JSON.stringify({ error: 'Please enter a valid 10-digit phone number' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!accountName || accountName.trim().length < 3) {
        return new Response(JSON.stringify({ error: 'Please enter your full name as per bank account' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      if (!upiId || !upiId.includes('@')) {
        return new Response(JSON.stringify({ error: 'Invalid UPI ID' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Lock credits using RPC function (atomic operation)
    const { data: lockSuccess, error: lockError } = await supabaseClient
      .rpc('lock_credits_for_withdrawal', {
        p_student_id: user.id,
        p_amount: amount
      });

    if (lockError || !lockSuccess) {
      console.error('Error locking credits:', lockError);
      return new Response(JSON.stringify({ error: 'Insufficient credits. You need at least ₹25 to withdraw.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create withdrawal record with pending status (requires admin approval)
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('withdrawal_history')
      .insert({
        student_id: user.id,
        amount,
        upi_id: withdrawalMethod === 'upi' ? upiId : null,
        phone_number: withdrawalMethod === 'phone' ? phoneNumber : null,
        account_holder_name: withdrawalMethod === 'phone' ? accountName : null,
        withdrawal_method: withdrawalMethod || 'upi',
        status: 'pending',
        auto_approved: false
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

    const paymentInfo = withdrawalMethod === 'phone' 
      ? `${phoneNumber} (${accountName})`
      : upiId;
    console.log(`[Withdrawal Requested] ₹${amount} requested by user ${user.id} to ${paymentInfo} via ${withdrawalMethod} - Pending admin approval`);

    return new Response(
      JSON.stringify({ 
        message: 'Your withdrawal request has been submitted! We will review and process it within 24 hours.',
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
