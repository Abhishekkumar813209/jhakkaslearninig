import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, testId, studentId, attemptId, questionId, selectedOption, textAnswer, answers, timeTaken, autoSubmitted, totalMarks } = await req.json();

    console.log('Test attempt API called with action:', action);

    switch (action) {
      case 'createAttempt':
        return await createTestAttempt(supabase, testId, studentId, totalMarks);
      
      case 'saveAnswer':
        return await saveAnswer(supabase, attemptId, questionId, selectedOption, textAnswer);
      
      case 'submitAttempt':
        return await submitAttempt(supabase, attemptId, answers, timeTaken, autoSubmitted);
      
      case 'getAttemptResults':
        return await getAttemptResults(supabase, attemptId);
      
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in test-attempt-api:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createTestAttempt(supabase: any, testId: string, studentId: string, totalMarks: number) {
  try {
    const { data, error } = await supabase
      .from('test_attempts')
      .insert([{
        test_id: testId,
        student_id: studentId,
        total_marks: totalMarks,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        attempt_number: 1
      }])
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      attemptId: data.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating test attempt:', error);
    throw error;
  }
}

async function saveAnswer(supabase: any, attemptId: string, questionId: string, selectedOption?: string, textAnswer?: string) {
  try {
    // Upsert answer
    const { data, error } = await supabase
      .from('test_answers')
      .upsert([{
        attempt_id: attemptId,
        question_id: questionId,
        selected_option: selectedOption || null,
        text_answer: textAnswer || null
      }])
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error saving answer:', error);
    throw error;
  }
}

async function submitAttempt(supabase: any, attemptId: string, answers: any[], timeTaken: number, autoSubmitted: boolean) {
  try {
    // Get all questions for this attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select('test_id, total_marks')
      .eq('id', attemptId)
      .single();

    if (attemptError) throw attemptError;

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', attempt.test_id);

    if (questionsError) throw questionsError;

    // Calculate score for MCQ questions
    let totalScore = 0;
    
    for (const answer of answers) {
      const question = questions.find((q: any) => q.id === answer.questionId);
      if (!question) continue;

      if (question.qtype === 'mcq' && question.options) {
        const options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
        const correctOption = options.find((opt: any) => opt.isCorrect);
        
        if (correctOption && answer.selectedOption === correctOption.text) {
          totalScore += question.marks;
          
          // Update answer with score
          await supabase
            .from('test_answers')
            .update({
              is_correct: true,
              marks_awarded: question.marks
            })
            .eq('attempt_id', attemptId)
            .eq('question_id', answer.questionId);
        } else {
          await supabase
            .from('test_answers')
            .update({
              is_correct: false,
              marks_awarded: 0
            })
            .eq('attempt_id', attemptId)
            .eq('question_id', answer.questionId);
        }
      }
      // Subjective questions will be graded manually later
    }

    // Calculate percentage
    const percentage = Math.round((totalScore / attempt.total_marks) * 100);

    // Update test attempt
    const { error: updateError } = await supabase
      .from('test_attempts')
      .update({
        score: totalScore,
        percentage: percentage,
        time_taken_minutes: Math.round(timeTaken),
        submitted_at: new Date().toISOString(),
        status: autoSubmitted ? 'auto_submitted' : 'submitted'
      })
      .eq('id', attemptId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ 
      success: true,
      score: totalScore,
      percentage: percentage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error submitting attempt:', error);
    throw error;
  }
}

async function getAttemptResults(supabase: any, attemptId: string) {
  try {
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select(`
        *,
        tests (*)
      `)
      .eq('id', attemptId)
      .single();

    if (attemptError) throw attemptError;

    const { data: answers, error: answersError } = await supabase
      .from('test_answers')
      .select(`
        *,
        questions (*)
      `)
      .eq('attempt_id', attemptId);

    if (answersError) throw answersError;

    return new Response(JSON.stringify({ 
      success: true,
      attempt,
      answers
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error getting attempt results:', error);
    throw error;
  }
}