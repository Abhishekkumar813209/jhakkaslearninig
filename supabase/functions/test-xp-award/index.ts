import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AwardTestXPRequest {
  test_id: string;
  test_attempt_id: string;
  score: number;
  total_marks: number;
  percentage: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: AwardTestXPRequest = await req.json();
    const { test_id, test_attempt_id, score, total_marks, percentage } = body;

    if (!test_id || !test_attempt_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🎯 test-xp-award Request:', {
      userId: user.id,
      testId: test_id,
      attemptId: test_attempt_id,
      score,
      percentage
    });

    // Check if this test attempt already received XP
    const { data: existingXP, error: checkError } = await supabase
      .from('test_attempts')
      .select('xp_awarded')
      .eq('id', test_attempt_id)
      .single();

    if (checkError) throw checkError;

    if (existingXP?.xp_awarded) {
      console.log('[Test XP] Already awarded for this attempt');
      return new Response(JSON.stringify({
        success: true,
        xp_awarded: 0,
        message: 'XP already awarded for this attempt'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user's batch to find batch_tests entry
    const { data: profile } = await supabase
      .from('profiles')
      .select('batch_id')
      .eq('id', user.id)
      .single();

    // Calculate XP based on test configuration
    let xpAmount = 100; // default

    if (profile?.batch_id) {
      // Check if this is a centralized test with XP override
      const { data: batchTest } = await supabase
        .from('batch_tests')
        .select('xp_override, tests!inner(default_xp)')
        .eq('batch_id', profile.batch_id)
        .eq('central_test_id', test_id)
        .single();

      if (batchTest) {
        xpAmount = batchTest.xp_override || batchTest.tests.default_xp || 100;
      } else {
        // Batch-specific test
        const { data: test } = await supabase
          .from('tests')
          .select('default_xp')
          .eq('id', test_id)
          .single();

        if (test) {
          xpAmount = test.default_xp || 100;
        }
      }
    }

    // Scale XP based on percentage (minimum 20% of XP for passing)
    const scaledXP = Math.round(xpAmount * Math.max(0.2, percentage / 100));

    console.log('[Test XP] Calculation:', {
      baseXP: xpAmount,
      percentage,
      scaledXP
    });

    // Award XP via jhakkas-points-system
    const { error: xpError } = await supabase.functions.invoke('jhakkas-points-system', {
      body: {
        action: 'add',
        xp_amount: scaledXP,
        activity_type: 'test_completed',
        metadata: {
          test_id,
          test_attempt_id,
          score,
          total_marks,
          percentage
        }
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (xpError) {
      console.error('[Test XP Award Error]:', xpError);
    } else {
      console.log(`[Test XP Award Success] ✅ Awarded ${scaledXP} XP to user ${user.id} for test ${test_id}`);
    }

    // Mark test attempt as XP awarded
    await supabase
      .from('test_attempts')
      .update({ xp_awarded: true })
      .eq('id', test_attempt_id);

    return new Response(JSON.stringify({
      success: true,
      xp_awarded: scaledXP
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error in test-xp-award:', {
      message: error.message,
      stack: error.stack
    });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check edge function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
