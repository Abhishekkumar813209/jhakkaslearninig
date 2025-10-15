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
    // Handle different input formats for MCQ
    if (typeof correctAnswer === 'number') {
      // Already an index
      return { type: 'index', value: correctAnswer, options };
    }
    
    if (typeof correctAnswer === 'string') {
      const normalized = correctAnswer.trim().toUpperCase();
      
      // Check if it's a letter (A, B, C, D)
      if (normalized.length === 1 && normalized >= 'A' && normalized <= 'Z') {
        const index = normalized.charCodeAt(0) - 65; // A=0, B=1, C=2...
        console.log(`✅ Converted letter "${normalized}" to index ${index}`);
        return { type: 'index', value: index, options };
      }
      
      // Check if it's the exact answer text
      if (options && options.length > 0) {
        const index = options.findIndex(opt => 
          opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
        );
        if (index !== -1) {
          console.log(`✅ Found answer text "${correctAnswer}" at index ${index}`);
          return { type: 'index', value: index, options };
        }
      }
      
      // If it's a string but not found, try parsing as number
      const parsed = parseInt(correctAnswer);
      if (!isNaN(parsed)) {
        console.log(`✅ Parsed string "${correctAnswer}" to index ${parsed}`);
        return { type: 'index', value: parsed, options };
      }
    }
    
    console.warn('⚠️ Could not normalize MCQ answer, defaulting to index 0');
    return { type: 'index', value: 0, options };
  }
  
  if (questionType === 'true_false') {
    const value = String(correctAnswer).toLowerCase() === 'true';
    return { type: 'boolean', value };
  }
  
  if (questionType === 'fill_blank' || questionType === 'subjective') {
    return { type: 'text', value: String(correctAnswer) };
  }
  
  // Default: store as-is
  return correctAnswer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { action } = body;

    console.log(`📥 topic-questions-api: action=${action}, user=${user.id}`);

    // ============ GET_BY_TOPIC ============
    if (action === 'get_by_topic') {
      const { topic_id } = body;
      if (!topic_id) {
        throw new Error('topic_id is required');
      }

      // Get all questions linked to this topic
      const { data: mappings, error: mappingError } = await supabaseClient
        .from('topic_content_mapping')
        .select('question_id, content_type')
        .eq('topic_id', topic_id);

      if (mappingError) throw mappingError;

      if (!mappings || mappings.length === 0) {
        return new Response(
          JSON.stringify({ success: true, questions: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const questionIds = mappings.map(m => m.question_id);
      
      // Fetch question details
      const { data: questions, error: questionsError } = await supabaseClient
        .from('generated_questions')
        .select('*')
        .in('id', questionIds)
        .order('created_at', { ascending: false });

      if (questionsError) throw questionsError;

      console.log(`✅ Found ${questions?.length || 0} questions for topic ${topic_id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          questions: questions || [],
          mapping_count: mappings.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ SAVE_EXTRACTED_AND_LINK ============
    if (action === 'save_extracted_and_link') {
      const { topic_id, subject, chapter_name, topic_name, questions } = body;

      if (!topic_id || !questions || !Array.isArray(questions) || questions.length === 0) {
        throw new Error('topic_id and questions array are required');
      }

      console.log(`💾 Saving ${questions.length} questions and linking to topic ${topic_id}`);

      const insertedQuestions = [];
      const createdMappings = [];
      const createdExercises = [];

      for (const q of questions) {
        // Normalize correct answer
        const normalizedAnswer = normalizeCorrectAnswer(
          q.question_type,
          q.correct_answer,
          q.options || null
        );

        // Insert question
        const questionData = {
          question_text: q.question_text,
          question_type: q.question_type,
          correct_answer: normalizedAnswer,
          options: q.options || null,
          marks: q.marks || 1,
          difficulty: q.difficulty || 'medium',
          subject: subject || q.subject || null,
          chapter_name: chapter_name || q.chapter_name || null,
          topic_name: topic_name || q.topic_name || null,
          source_id: q.source_id || null,
          is_approved: false,
          explanation: q.explanation || null
        };

        const { data: inserted, error: insertError } = await supabaseClient
          .from('generated_questions')
          .insert(questionData)
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error inserting question:', insertError);
          throw insertError;
        }

        insertedQuestions.push(inserted);

        // Create topic_content_mapping
        const { error: mappingError } = await supabaseClient
          .from('topic_content_mapping')
          .insert({
            topic_id,
            question_id: inserted.id,
            content_type: q.question_type === 'mcq' ? 'quiz' : 'game'
          });

        if (mappingError) {
          console.error('❌ Error creating mapping:', mappingError);
        } else {
          createdMappings.push(inserted.id);
        }

        // Create gamified_exercise with normalized game_data
        const gameType = q.question_type === 'true_false' ? 'true_false' : 
                         q.question_type === 'fill_blank' ? 'fill_blanks' : 
                         q.question_type === 'mcq' ? 'mcq' : q.question_type;

        let exerciseData: any = {
          question: q.question_text,
          marks: q.marks || 1,
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || null
        };

        // Format exercise_data based on game type
        if (gameType === 'mcq') {
          exerciseData = {
            ...exerciseData,
            options: q.options || [],
            correct_answer: normalizedAnswer.value, // Numeric index for MCQ game
          };
        } else if (gameType === 'true_false') {
          exerciseData = {
            ...exerciseData,
            correct_answer: normalizedAnswer.value // boolean
          };
        } else if (gameType === 'fill_blanks') {
          exerciseData = {
            ...exerciseData,
            answer: normalizedAnswer.value // text
          };
        }

        const { error: exerciseError } = await supabaseClient
          .from('gamified_exercises')
          .insert({
            topic_content_id: inserted.id, // Using question_id as content_id
            exercise_type: gameType,
            exercise_data: exerciseData,
            correct_answer: normalizedAnswer,
            explanation: q.explanation || null,
            xp_reward: (q.marks || 1) * 10,
            coin_reward: q.marks || 1,
            difficulty: q.difficulty || 'medium'
          });

        if (exerciseError) {
          console.error('❌ Error creating exercise:', exerciseError);
        } else {
          createdExercises.push(inserted.id);
        }

        // Add to approval queue
        await supabaseClient
          .from('content_approval_queue')
          .insert({
            content_type: 'question',
            content_id: inserted.id,
            source_id: q.source_id || null,
            status: 'pending'
          });
      }

      console.log(`✅ Saved ${insertedQuestions.length} questions, ${createdMappings.length} mappings, ${createdExercises.length} exercises`);

      return new Response(
        JSON.stringify({
          success: true,
          count: insertedQuestions.length,
          question_ids: insertedQuestions.map(q => q.id),
          mappings_created: createdMappings.length,
          exercises_created: createdExercises.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ APPROVE_QUESTIONS ============
    if (action === 'approve_questions') {
      const { question_ids } = body;

      if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
        throw new Error('question_ids array is required');
      }

      const { error: approveError } = await supabaseClient
        .from('generated_questions')
        .update({
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .in('id', question_ids);

      if (approveError) throw approveError;

      console.log(`✅ Approved ${question_ids.length} questions`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          approved_count: question_ids.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ UNLINK_QUESTIONS ============
    if (action === 'unlink_questions') {
      const { topic_id, question_ids } = body;

      if (!topic_id || !question_ids || !Array.isArray(question_ids)) {
        throw new Error('topic_id and question_ids are required');
      }

      // Remove mappings
      const { error: unlinkError } = await supabaseClient
        .from('topic_content_mapping')
        .delete()
        .eq('topic_id', topic_id)
        .in('question_id', question_ids);

      if (unlinkError) throw unlinkError;

      console.log(`✅ Unlinked ${question_ids.length} questions from topic ${topic_id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          unlinked_count: question_ids.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('❌ Error in topic-questions-api:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
