import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AwardXPRequest {
  game_id: string;
  topic_id: string;
  is_correct: boolean;
  total_sub_questions?: number;
  correct_count?: number;
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

    // Parse request body for action and game_id fallback
    const parsed = await req.clone().json().catch(() => null);
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || parsed?.action || 'award_xp';

    console.log('🧪 game-xp-award Request:', {
      action,
      userId: user.id,
      body: parsed
    });

    // Action: Get attempt count for a game
    if (action === 'get_attempts') {
      const gameId = url.searchParams.get('game_id') || parsed?.game_id;
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
      const { game_id, topic_id, is_correct, total_sub_questions, correct_count } = body;

      if (!game_id || !topic_id) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Query batch_question_assignments to get question details from question_bank
      const { data: assignmentInfo, error: assignmentError } = await supabase
        .from('batch_question_assignments')
        .select(`
          id,
          question_id,
          xp_reward,
          difficulty,
          roadmap_topic_id,
          roadmap_topics!inner(
            difficulty
          ),
          question_bank!inner(
            id,
            difficulty,
            marks
          )
        `)
        .eq('id', game_id)
        .single();

      if (assignmentError || !assignmentInfo) {
        console.error('❌ Assignment not found:', { game_id, error: assignmentError });
        throw new Error(`Assignment ${game_id} not found in batch_question_assignments`);
      }

      // XP calculation priority:
      // 1. Custom xp_reward (from batch_question_assignments)
      // 2. Topic difficulty (from roadmap_topics)
      // 3. Question difficulty (from question_bank or assignment)
      // 4. Default fallback (40)
      let baseXP: number;
      
      if (assignmentInfo.xp_reward !== null && assignmentInfo.xp_reward !== undefined) {
        baseXP = assignmentInfo.xp_reward;
        console.log(`[XP Award] Using custom XP reward: ${baseXP}`);
      } else {
        // Use topic difficulty first, fallback to question/assignment difficulty
        const topicDifficulty = assignmentInfo.roadmap_topics?.difficulty;
        const effectiveDifficulty = topicDifficulty 
          || assignmentInfo.difficulty 
          || assignmentInfo.question_bank?.difficulty 
          || 'medium';
        
        baseXP = effectiveDifficulty === 'hard' ? 50 
          : effectiveDifficulty === 'medium' ? 40 
          : 30;
        
        console.log(`[XP Award] Using ${topicDifficulty ? 'topic' : 'question'} difficulty-based XP: ${baseXP} (${effectiveDifficulty})`);
      }

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

      // Extract partial correctness data
      const totalSubQuestions = total_sub_questions || 1;
      const correctCount = correct_count || (is_correct ? totalSubQuestions : 0);
      const fractionCorrect = correctCount / totalSubQuestions;

      // Calculate XP with partial credit and attempt multipliers
      let xpAmount = 0;
      let shouldAwardXP = false;

      if (is_correct || correctCount > 0) {
        // Only award XP for first 2 attempts
        if (attemptNumber <= 2) {
          const attemptMultiplier = attemptNumber === 1 ? 1.0 : 0.3;
          const rawXP = baseXP * fractionCorrect * attemptMultiplier;
          xpAmount = Math.round(rawXP * 100) / 100;
          shouldAwardXP = true;
          
          console.log(`[XP Award] Calculation:`);
          console.log(`  Base XP: ${baseXP}`);
          console.log(`  Correct: ${correctCount}/${totalSubQuestions} (${(fractionCorrect * 100).toFixed(1)}%)`);
          console.log(`  Attempt: ${attemptNumber} (multiplier: ${attemptMultiplier})`);
          console.log(`  Final XP: ${xpAmount.toFixed(2)}`);
        } else {
          console.log(`[Practice Mode] Attempt ${attemptNumber} - No XP`);
        }
      }

      // Insert attempt record with new schema columns
      const { error: insertError } = await supabase
        .from('student_question_attempts')
        .insert({
          student_id: user.id,
          question_id: assignmentInfo.question_id,
          game_id: game_id,
          topic_id: topic_id,
          is_correct: is_correct,
          status: is_correct ? 'completed' : 'attempted',
          time_spent_seconds: 0,
          attempt_number: attemptNumber,
          total_sub_questions: totalSubQuestions,
          correct_count: correctCount,
          fraction_correct: fractionCorrect,
          base_xp: baseXP,
          xp_awarded: xpAmount
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
              partial_credit: totalSubQuestions > 1 
                ? `${correctCount}/${totalSubQuestions}`
                : undefined
            }
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (xpError) {
          console.error('[XP Award Error] Failed to invoke jhakkas-points-system:', xpError);
        } else {
          console.log(`[XP Award Success] ✅ Awarded ${xpAmount.toFixed(2)} XP to user ${user.id} for game ${game_id} (attempt ${attemptNumber})`);
        }
      } else if (attemptNumber > 2) {
        console.log(`[Practice Mode] Game: ${game_id}, Attempt: ${attemptNumber} - No XP awarded (practice mode)`);
      }

      console.log('✅ XP Award Response:', {
        game_id,
        student_id: user.id,
        xp_awarded: xpAmount,
        attempt_number: attemptNumber,
        is_practice_mode: attemptNumber > 2,
        difficulty,
        baseXP,
        fraction_correct: fractionCorrect,
        total_sub_questions: totalSubQuestions,
        correct_count: correctCount
      });

      return new Response(JSON.stringify({
        success: true,
        xp_awarded: xpAmount,
        attempt_number: attemptNumber,
        is_practice_mode: attemptNumber > 2,
        fraction_correct: fractionCorrect,
        total_sub_questions: totalSubQuestions,
        correct_count: correctCount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in game-xp-award:', {
      message: error.message,
      stack: error.stack,
      errorType: error.constructor.name
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
