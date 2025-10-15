import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize correct answer to standard JSONB format
function normalizeCorrectAnswer(questionType: string, correctAnswer: any, options: string[] | null): any {
  console.log('🔧 Normalizing answer:', { questionType, correctAnswer, options });
  
  if (questionType === 'mcq') {
    if (typeof correctAnswer === 'number') {
      return { type: 'index', value: correctAnswer, options };
    }
    
    if (typeof correctAnswer === 'string') {
      const normalized = correctAnswer.trim().toUpperCase();
      
      if (normalized.length === 1 && normalized >= 'A' && normalized <= 'Z') {
        const index = normalized.charCodeAt(0) - 65;
        return { type: 'index', value: index, options };
      }
      
      if (options && options.length > 0) {
        const index = options.findIndex(opt => 
          opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
        );
        if (index !== -1) {
          return { type: 'index', value: index, options };
        }
      }
      
      const parsed = parseInt(correctAnswer);
      if (!isNaN(parsed)) {
        return { type: 'index', value: parsed, options };
      }
    }
    
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
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;
    console.log(`📥 topic-questions-api: action=${action}, user=${user.id}`);

    // ========== NEW: save_draft_questions ==========
    if (action === 'save_draft_questions') {
      const { batch_id, roadmap_id, chapter_id, topic_id, exam_domain, exam_name, subject, chapter_name, topic_name, questions } = body;
      if (!topic_id || !questions || !Array.isArray(questions)) {
        throw new Error('Missing required fields: topic_id, questions');
      }

      const savedQuestions = [];
      for (const q of questions) {
        const { data: inserted, error } = await supabaseClient
          .from('generated_questions')
          .insert({
            batch_id: batch_id || null,
            roadmap_id: roadmap_id || null,
            chapter_id: chapter_id || null,
            topic_id,
            exam_domain: exam_domain || null,
            exam_name: exam_name || null,
            subject: subject || null,
            chapter_name: chapter_name || null,
            topic_name: topic_name || null,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options || null,
            marks: q.marks || 1,
            difficulty: q.difficulty || 'medium',
            explanation: q.explanation || null,
            correct_answer: null,
            is_approved: false,
            admin_reviewed: false
          })
          .select()
          .single();

        if (!error) savedQuestions.push(inserted);
      }

      console.log(`✅ Saved ${savedQuestions.length} draft questions`);
      return new Response(
        JSON.stringify({ success: true, saved_count: savedQuestions.length, questions: savedQuestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== NEW: get_draft_questions ==========
    if (action === 'get_draft_questions') {
      const { topic_id } = body;
      if (!topic_id) throw new Error('Missing topic_id');

      const { data: questions, error } = await supabaseClient
        .from('generated_questions')
        .select('*')
        .eq('topic_id', topic_id)
        .eq('admin_reviewed', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const normalized = (questions || []).map(q => ({
        ...q,
        correct_answer: q.correct_answer ? normalizeCorrectAnswer(q.question_type, q.correct_answer, q.options) : null
      }));

      return new Response(
        JSON.stringify({ success: true, questions: normalized }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== NEW: update_question_answer ==========
    if (action === 'update_question_answer') {
      const { question_id, correct_answer, explanation } = body;
      if (!question_id || correct_answer === undefined) {
        throw new Error('Missing question_id or correct_answer');
      }

      const { data: question } = await supabaseClient
        .from('generated_questions')
        .select('*')
        .eq('id', question_id)
        .single();

      if (!question) throw new Error('Question not found');

      const normalized = normalizeCorrectAnswer(question.question_type, correct_answer, question.options);
      
      const { error } = await supabaseClient
        .from('generated_questions')
        .update({
          correct_answer: normalized,
          explanation: explanation || null,
          admin_reviewed: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', question_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== NEW: finalize_and_link ==========
    if (action === 'finalize_and_link') {
      const { question_ids, topic_id } = body;
      if (!question_ids || !Array.isArray(question_ids) || !topic_id) {
        throw new Error('Missing question_ids or topic_id');
      }

      // Mark as approved
      await supabaseClient
        .from('generated_questions')
        .update({
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .in('id', question_ids);

      const { data: questions } = await supabaseClient
        .from('generated_questions')
        .select('*')
        .in('id', question_ids);

      let linkedCount = 0;
      for (const q of questions || []) {
        const { count } = await supabaseClient
          .from('topic_content_mapping')
          .select('*', { count: 'exact', head: true })
          .eq('topic_id', topic_id);

        const { data: mapping } = await supabaseClient
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

        await supabaseClient
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

    // ========== EXISTING: get_by_topic (for approved questions) ==========
    if (action === 'get_by_topic') {
      const { topic_id } = body;
      if (!topic_id) throw new Error('topic_id required');

      const { data: mappings } = await supabaseClient
        .from('topic_content_mapping')
        .select('question_id')
        .eq('topic_id', topic_id);

      if (!mappings || mappings.length === 0) {
        return new Response(
          JSON.stringify({ success: true, questions: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: questions } = await supabaseClient
        .from('generated_questions')
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