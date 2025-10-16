import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, Authorization, x-client-info, apikey, content-type',
};

// Normalize correct answer to standard JSONB format
function normalizeCorrectAnswer(questionType: string, correctAnswer: any, options: string[] | null): any {
  console.log('🔧 Normalizing answer:', { questionType, correctAnswer, options });
  
  if (questionType === 'mcq') {
    // Handle object format first (from frontend: { index: 3 })
    if (typeof correctAnswer === 'object' && correctAnswer !== null) {
      // Handle { index: 3 } format from frontend
      if ('index' in correctAnswer && typeof correctAnswer.index === 'number') {
        console.log('✅ Normalized object { index } format:', correctAnswer.index);
        return { type: 'index', value: correctAnswer.index, options };
      }
      // Handle already normalized { value: 3, type: 'index' } format
      if ('value' in correctAnswer && typeof correctAnswer.value === 'number') {
        console.log('✅ Normalized object { value } format:', correctAnswer.value);
        return { type: 'index', value: correctAnswer.value, options };
      }
    }
    
    // Handle number format
    if (typeof correctAnswer === 'number') {
      console.log('✅ Normalized number format:', correctAnswer);
      return { type: 'index', value: correctAnswer, options };
    }
    
    // Handle string format
    if (typeof correctAnswer === 'string') {
      // Try parsing as JSON first
      try {
        const parsed = JSON.parse(correctAnswer);
        if (typeof parsed === 'object' && parsed !== null) {
          // Handle JSON with "value" field (from DB: '{"type":"index","value":3}')
          if ('value' in parsed && typeof parsed.value === 'number') {
            console.log('✅ Normalized JSON string with value:', parsed.value);
            return { type: 'index', value: parsed.value, options };
          }
          // Handle JSON with "index" field (legacy format)
          if ('index' in parsed && typeof parsed.index === 'number') {
            console.log('✅ Normalized JSON string with index:', parsed.index);
            return { type: 'index', value: parsed.index, options };
          }
        }
      } catch {
        // Not JSON, continue with other string parsing
      }
      
      const normalized = correctAnswer.trim().toUpperCase();
      
      // Handle letter format (A, B, C, D)
      if (normalized.length === 1 && normalized >= 'A' && normalized <= 'Z') {
        const index = normalized.charCodeAt(0) - 65;
        console.log('✅ Normalized letter format:', normalized, '→', index);
        return { type: 'index', value: index, options };
      }
      
      // Handle exact text match
      if (options && options.length > 0) {
        const index = options.findIndex(opt => 
          opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
        );
        if (index !== -1) {
          console.log('✅ Normalized text match format:', index);
          return { type: 'index', value: index, options };
        }
      }
      
      // Handle numeric string
      const parsed = parseInt(correctAnswer);
      if (!isNaN(parsed)) {
        console.log('✅ Normalized numeric string format:', parsed);
        return { type: 'index', value: parsed, options };
      }
    }
    
    // Fallback
    console.error('❌ Unhandled correctAnswer format:', correctAnswer);
    return { type: 'index', value: 0, options };
  }
  
  if (questionType === 'true_false') {
    const value = String(correctAnswer).toLowerCase() === 'true';
    return { type: 'boolean', value };
  }
  
  if (questionType === 'fill_blank' || questionType === 'subjective') {
    return { type: 'text', value: String(correctAnswer) };
  }
  
  return correctAnswer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header present:', !!authHeader, authHeader ? `(length: ${authHeader.length})` : '(missing)');
    
    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token from Bearer header
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    console.log('🔑 JWT extracted (length:', jwt.length, ')');

    // Auth client for user validation
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Explicitly pass JWT to getUser() instead of relying on global headers
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError || !user) {
      console.error('❌ getUser() failed:', userError?.message || 'Invalid JWT token');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ User authenticated:', user.id, 'email:', user.email?.substring(0, 15) + '...');

    // Service role client for DB operations (bypasses RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check if user is admin
    const { data: roleData, error: roleError } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('❌ Role check failed:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = roleData?.role === 'admin';
    console.log('👤 Admin role check:', isAdmin ? '✅ Authorized' : '❌ Not admin');
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin role required for this operation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;
    console.log(`🎯 Action requested: ${action}, user: ${user.id}`);

    // ========== get_topic_questions: Load all questions from question_bank for a topic ==========
    if (action === 'get_topic_questions') {
      const { topic_id } = body;
      if (!topic_id) {
        console.error('❌ Missing topic_id in get_topic_questions');
        throw new Error('Missing topic_id');
      }

      console.log(`📚 Fetching questions for topic: ${topic_id}`);

      const { data: questions, error } = await serviceClient
        .from('question_bank')
        .select('*')
        .eq('topic_id', topic_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log(`✅ Found ${questions?.length || 0} questions in question_bank`);

      // Map to UI-friendly format for admin tool
      const normalized = (questions || []).map(q => {
        let ans = q.correct_answer ? normalizeCorrectAnswer(q.question_type, q.correct_answer, q.options) : null;
        
        // For MCQ, admin UI expects { index } format, not { value }
        if (q.question_type === 'mcq' && ans && typeof ans === 'object') {
          ans = { index: 'value' in ans ? ans.value : (ans.index ?? 0) };
        }
        
        return { ...q, correct_answer: ans };
      });

      return new Response(
        JSON.stringify({ success: true, questions: normalized }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== update_question_answer ==========
    if (action === 'update_question_answer') {
      const { question_id, correct_answer, explanation } = body;
      if (!question_id || correct_answer === undefined) {
        throw new Error('Missing question_id or correct_answer');
      }

      const { data: question } = await serviceClient
        .from('question_bank')
        .select('*')
        .eq('id', question_id)
        .single();

      if (!question) throw new Error('Question not found');

      const normalized = normalizeCorrectAnswer(question.question_type, correct_answer, question.options);
      
      // Guard against out-of-range indexes
      if (question.question_type === 'mcq' && normalized.value !== undefined) {
        const optionsLength = question.options?.length || 0;
        if (normalized.value >= optionsLength) {
          console.warn(`⚠️ Index ${normalized.value} out of range for ${optionsLength} options`);
          normalized.value = Math.min(normalized.value, optionsLength - 1);
        }
      }
      
      const { error } = await serviceClient
        .from('question_bank')
        .update({
          correct_answer: normalized,
          explanation: explanation || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', question_id);

      if (error) throw error;

      // Sync student-facing content (topic_learning_content & gamified_exercises)
      console.log('🔄 Syncing student-facing content for question:', question_id);
      
      // Update topic_learning_content rows
      const { data: learningContent, error: lcFetchError } = await serviceClient
        .from('topic_learning_content')
        .select('id, game_data')
        .eq('topic_id', question.topic_id)
        .eq('lesson_type', 'game')
        .eq('game_type', 'mcq');
      
      if (!lcFetchError && learningContent) {
        let lcUpdateCount = 0;
        for (const lc of learningContent) {
          const gameData = lc.game_data as any;
          if (gameData?.question === question.question_text) {
            await serviceClient
              .from('topic_learning_content')
              .update({
                game_data: {
                  ...gameData,
                  correct_answer: normalized.value
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', lc.id);
            lcUpdateCount++;
          }
        }
        console.log(`✅ Updated ${lcUpdateCount} topic_learning_content rows`);
      }

      // Update gamified_exercises rows
      const { data: exercises, error: exFetchError } = await serviceClient
        .from('gamified_exercises')
        .select('id, exercise_data')
        .eq('exercise_type', 'mcq');
      
      if (!exFetchError && exercises) {
        let exUpdateCount = 0;
        for (const ex of exercises) {
          const exerciseData = ex.exercise_data as any;
          if (exerciseData?.question === question.question_text) {
            await serviceClient
              .from('gamified_exercises')
              .update({
                correct_answer: normalized,
                exercise_data: {
                  ...exerciseData,
                  correct_answer: normalized.value
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', ex.id);
            exUpdateCount++;
          }
        }
        console.log(`✅ Updated ${exUpdateCount} gamified_exercises rows`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== finalize_and_link ==========
    if (action === 'finalize_and_link') {
      const { question_ids, topic_id } = body;
      if (!question_ids || !Array.isArray(question_ids) || !topic_id) {
        throw new Error('Missing question_ids or topic_id');
      }

      // Mark as approved
      await serviceClient
        .from('question_bank')
        .update({
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .in('id', question_ids);

      const { data: questions } = await serviceClient
        .from('question_bank')
        .select('*')
        .in('id', question_ids);

      let linkedCount = 0;
      for (const q of questions || []) {
        const { count } = await serviceClient
          .from('topic_content_mapping')
          .select('*', { count: 'exact', head: true })
          .eq('topic_id', topic_id);

        const { data: mapping } = await serviceClient
          .from('topic_content_mapping')
          .insert({
            topic_id,
            question_id: q.id,
            content_type: q.question_type === 'mcq' ? 'quiz' : 'game',
            order_num: (count ?? 0) + 1
          })
          .select('id')
          .single();

        if (!mapping) continue;

        const exerciseData = q.question_type === 'mcq'
          ? { question: q.question_text, options: q.options, correct_answer: q.correct_answer?.value, marks: q.marks }
          : { question: q.question_text, answer: q.correct_answer?.value, marks: q.marks };

        await serviceClient
          .from('gamified_exercises')
          .insert({
            topic_content_id: mapping.id,
            exercise_type: q.question_type,
            exercise_data: exerciseData,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            xp_reward: (q.marks || 1) * 10,
            coin_reward: q.marks || 1,
            difficulty: q.difficulty || 'medium'
          });

        linkedCount++;
      }

      return new Response(
        JSON.stringify({ success: true, linked_count: linkedCount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== get_by_topic (for approved questions) ==========
    if (action === 'get_by_topic') {
      const { topic_id } = body;
      if (!topic_id) throw new Error('topic_id required');

      const { data: mappings } = await serviceClient
        .from('topic_content_mapping')
        .select('question_id')
        .eq('topic_id', topic_id);

      if (!mappings || mappings.length === 0) {
        return new Response(
          JSON.stringify({ success: true, questions: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: questions } = await serviceClient
        .from('question_bank')
        .select('*')
        .in('id', mappings.map(m => m.question_id))
        .order('created_at', { ascending: false });

      const normalized = (questions || []).map(q => {
        let answer = q.correct_answer;
        if (q.question_type === 'mcq' && typeof answer === 'object' && answer !== null) {
          answer = answer.value ?? answer.index ?? 0;
        }
        return { ...q, correct_answer: answer };
      });

      return new Response(
        JSON.stringify({ success: true, questions: normalized }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
