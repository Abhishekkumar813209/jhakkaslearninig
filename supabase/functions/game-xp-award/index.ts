import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AwardXPRequest {
  game_id: string;
  topic_id: string;
  is_correct: boolean;
  sub_question_result?: {
    totalSubQuestions: number;
    correctCount: number;
    percentage: number;
  };
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

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'award_xp';

    // Action: Get attempt count for a game
    if (action === 'get_attempts') {
      const gameId = url.searchParams.get('game_id');
      if (!gameId) {
        return new Response(JSON.stringify({ error: 'Missing game_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: attempts, error } = await supabase
        .from('student_question_attempts')
        .select('attempt_number, is_correct')
        .eq('student_id', user.id)
        .eq('game_id', gameId)
        .order('attempt_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      const attemptCount = attempts && attempts.length > 0 ? attempts[0].attempt_number : 0;
      const hasCorrectAttempt = attempts?.some(a => a.is_correct) || false;

      return new Response(JSON.stringify({
        attempt_count: attemptCount,
        has_correct_attempt: hasCorrectAttempt
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Action: Award XP for game completion
    if (action === 'award_xp') {
      const body: AwardXPRequest = await req.json();
      const { game_id, topic_id, is_correct, sub_question_result } = body;

      if (!game_id || !topic_id) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get game XP reward
      const { data: gameInfo, error: gameError } = await supabase
        .from('gamified_exercises')
        .select('xp_reward')
        .eq('id', game_id)
        .single();

      if (gameError) throw gameError;

      const baseXP = gameInfo?.xp_reward || 10;

      // Get existing attempts
      const { data: existingAttempts, error: attemptsError } = await supabase
        .from('student_question_attempts')
        .select('is_correct, attempt_number')
        .eq('student_id', user.id)
        .eq('game_id', game_id)
        .order('attempt_number', { ascending: true });

      if (attemptsError) throw attemptsError;

      const hasCorrectAttempt = existingAttempts?.some(a => a.is_correct) || false;
      const attemptNumber = (existingAttempts?.length || 0) + 1;

      // Block if already completed correctly
      if (hasCorrectAttempt) {
        return new Response(JSON.stringify({
          xp_awarded: 0,
          attempt_number: attemptNumber,
          message: 'Already completed correctly',
          should_advance: false
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Calculate XP with partial credit and attempt multipliers
      let xpAmount = 0;
      let shouldAwardXP = false;

      if (is_correct) {
        // Only award XP for first 2 attempts
        if (attemptNumber <= 2) {
          const attemptMultiplier = attemptNumber === 1 ? 1.0 : 0.3;
          
          if (sub_question_result && sub_question_result.totalSubQuestions > 1) {
            // Partial credit for multi-part questions
            xpAmount = baseXP * sub_question_result.percentage * attemptMultiplier;
          } else {
            // Full XP for single questions
            xpAmount = baseXP * attemptMultiplier;
          }
          
          shouldAwardXP = true;
          console.log(`[XP Award] Game: ${game_id}, Attempt: ${attemptNumber}, XP: ${xpAmount.toFixed(2)}`);
        } else {
          console.log(`[Practice Mode] Game: ${game_id}, Attempt: ${attemptNumber} - No XP`);
        }
      }

      // Insert attempt record
      const { error: insertError } = await supabase
        .from('student_question_attempts')
        .insert({
          student_id: user.id,
          question_id: game_id, // Keep for backward compatibility
          game_id: game_id,
          topic_id: topic_id,
          is_correct: is_correct,
          status: is_correct ? 'completed' : 'attempted',
          time_spent_seconds: 0,
          xp_awarded: shouldAwardXP,
          attempt_number: attemptNumber
        });

      if (insertError) throw insertError;

      // Award XP via jhakkas-points-system if > 0
      if (shouldAwardXP && xpAmount > 0) {
        const { error: xpError } = await supabase.functions.invoke('jhakkas-points-system', {
          body: {
            action: 'add',
            xp_amount: xpAmount,
            activity_type: 'game_completed',
            metadata: {
              game_id: game_id,
              topic_id: topic_id,
              attempt_number: attemptNumber,
              multiplier: attemptNumber === 1 ? 1.0 : 0.3,
              partial_credit: sub_question_result 
                ? `${sub_question_result.correctCount}/${sub_question_result.totalSubQuestions}`
                : undefined
            }
          }
        });

        if (xpError) {
          console.error('Error awarding XP:', xpError);
        }
      }

      return new Response(JSON.stringify({
        xp_awarded: xpAmount,
        attempt_number: attemptNumber,
        is_practice_mode: attemptNumber > 2,
        should_advance: !is_correct || attemptNumber > 2,
        sub_question_info: sub_question_result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in game-xp-award:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
