import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    // Validate input
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, reason: 'invalid_input' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Normalize code
    const normalizedCode = code.trim().toUpperCase();
    
    // Basic validation
    if (normalizedCode.length === 0 || normalizedCode.length > 40) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'invalid_format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check format (only A-Z, 0-9, and -)
    if (!/^[A-Z0-9-]+$/.test(normalizedCode)) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'invalid_format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get current user
    const authHeader = req.headers.get('Authorization');
    let currentUserId = null;
    
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user } } = await supabaseClient.auth.getUser();
      currentUserId = user?.id;
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Look up referral by code
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id')
      .ilike('referral_code', normalizedCode)
      .single();

    if (referralError || !referral) {
      console.log('[Validate Referral] Code not found:', normalizedCode);
      return new Response(
        JSON.stringify({ valid: false, reason: 'not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if user is trying to use their own code
    if (currentUserId && referral.referrer_id === currentUserId) {
      console.log('[Validate Referral] User trying to use own code');
      return new Response(
        JSON.stringify({ valid: false, reason: 'self_code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get discount amount from config
    const { data: config } = await supabaseAdmin
      .from('referral_config')
      .select('student_discount')
      .single();

    const discount = config?.student_discount || 0;

    console.log('[Validate Referral] Code valid:', normalizedCode, 'Discount:', discount);

    return new Response(
      JSON.stringify({ 
        valid: true, 
        discount: discount,
        code: normalizedCode 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[Validate Referral] Error:', error);
    return new Response(
      JSON.stringify({ valid: false, reason: 'server_error', error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
