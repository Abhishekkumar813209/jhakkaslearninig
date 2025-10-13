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

    // Check if user already has a referral code (UNIQUE constraint on referrer_id)
    const { data: existingReferral } = await supabaseClient
      .from('referrals')
      .select('referral_code')
      .eq('referrer_id', user.id)
      .maybeSingle();

    if (existingReferral) {
      console.log(`[Generate Referral] Returning existing code ${existingReferral.referral_code} for user ${user.id}`);
      return new Response(
        JSON.stringify({ referralCode: existingReferral.referral_code }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile to extract first name
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const fullName = profile?.full_name || user.email?.split('@')[0] || 'USER';
    const firstName = fullName.split(' ')[0].toUpperCase();
    
    // Retry logic for code generation (handles collision on UNIQUE referral_code)
    const MAX_RETRIES = 5;
    let referralCode = '';
    let insertError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Generate unique code using FIRSTNAME-HASH format
      const hashSuffix = attempt === 1 
        ? user.id.substring(user.id.length - 6).toUpperCase()
        : crypto.randomUUID().substring(0, 6).toUpperCase();
      
      referralCode = `${firstName}-${hashSuffix}`;

      console.log(`[Generate Referral] Attempt ${attempt}: Trying code ${referralCode} for user ${user.id}`);

      // Try to insert
      const { error } = await supabaseClient
        .from('referrals')
        .insert({
          referrer_id: user.id,
          referral_code: referralCode,
          status: 'pending'
        });

      if (!error) {
        insertError = null;
        break; // Success!
      }

      // Check if it's a duplicate code error (23505 = unique_violation)
      if (error.code === '23505' && error.message.includes('referrals_referral_code_unique')) {
        console.log(`[Generate Referral] Code collision on ${referralCode}, retrying...`);
        insertError = error;
        continue; // Retry with new code
      }

      // Check if it's a duplicate referrer_id (user already has a code from race condition)
      if (error.code === '23505' && error.message.includes('referrals_referrer_unique')) {
        console.log(`[Generate Referral] User ${user.id} already has a code (race condition), fetching...`);
        const { data: racedCode } = await supabaseClient
          .from('referrals')
          .select('referral_code')
          .eq('referrer_id', user.id)
          .single();
        
        if (racedCode) {
          return new Response(
            JSON.stringify({ referralCode: racedCode.referral_code }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Other error
      insertError = error;
      break;
    }

    if (insertError) {
      console.error('[Generate Referral] Failed after retries:', insertError);
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
