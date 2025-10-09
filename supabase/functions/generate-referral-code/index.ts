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

    // Get user's profile to extract first name
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const fullName = profile?.full_name || user.email?.split('@')[0] || 'USER';
    const firstName = fullName.split(' ')[0].toUpperCase();
    
    // Base code: FIRSTNAME2025
    let referralCode = `${firstName}2025`;
    
    // Check if code already exists
    const { data: existingReferral } = await supabaseClient
      .from('referrals')
      .select('referral_code')
      .eq('referrer_id', user.id)
      .maybeSingle();

    if (existingReferral) {
      return new Response(
        JSON.stringify({ referralCode: existingReferral.referral_code }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicates and add random suffix if needed
    const { data: duplicate } = await supabaseClient
      .from('referrals')
      .select('referral_code')
      .eq('referral_code', referralCode)
      .maybeSingle();

    if (duplicate) {
      const randomSuffix = Math.floor(Math.random() * 999);
      referralCode = `${firstName}2025-${randomSuffix}`;
    }

    // Create initial referral entry
    const { error: insertError } = await supabaseClient
      .from('referrals')
      .insert({
        referrer_id: user.id,
        referral_code: referralCode,
        status: 'pending'
      });

    if (insertError) {
      console.error('Error creating referral code:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize referral_credits for this user
    await supabaseClient
      .from('referral_credits')
      .upsert({
        student_id: user.id,
        total_credits: 0,
        used_credits: 0,
        locked_for_withdrawal: 0
      }, {
        onConflict: 'student_id'
      });

    console.log(`[Generate Referral] Created code ${referralCode} for user ${user.id}`);

    return new Response(
      JSON.stringify({ referralCode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-referral-code:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
