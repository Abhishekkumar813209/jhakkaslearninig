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
    
    // Get current user from auth header
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : authHeader;
    
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authentication required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const currentUserId = userData.user.id;
    const { action, testId, attemptId, questionId, selectedOption, textAnswer, answers, timeTaken, autoSubmitted, totalMarks } = await req.json();

    console.log('Test attempt API called with action:', action);

    switch (action) {
      case 'createAttempt':
        return await createTestAttempt(supabase, testId, currentUserId, totalMarks);
      
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
    // Check if this is a free test and user already has attempts
    const { data: existingAttempts } = await supabase
      .from('test_attempts')
      .select('id')
      .eq('test_id', testId)
      .eq('student_id', studentId);

    // Check subscription status
    const { data: subscriptionStatus } = await supabase
      .rpc('get_subscription_status', { student_id_param: studentId });

    const hasActiveSubscription = subscriptionStatus && subscriptionStatus[0]?.premium_active === true;

    // Get the oldest test to check if it's free
    const { data: allTests } = await supabase
      .from('tests')
      .select('id, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: true });

    const isOldestTest = allTests && allTests.length > 0 && allTests[0].id === testId;

    // If this is the oldest (free) test and user doesn't have subscription
    if (isOldestTest && !hasActiveSubscription) {
      // Check if user already attempted this test
      if (existingAttempts && existingAttempts.length > 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Free test can only be attempted once. Subscribe for unlimited attempts.',
          requiresSubscription: true
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Calculate attempt number
    const attemptNumber = existingAttempts ? existingAttempts.length + 1 : 1;

    const { data, error } = await supabase
      .from('test_attempts')
      .insert([{
        test_id: testId,
        student_id: studentId,
        total_marks: totalMarks,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        attempt_number: attemptNumber
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
    console.log('Saving answer:', { attemptId, questionId, selectedOption, textAnswer });
    
    // First check if answer already exists
    const { data: existingAnswer } = await supabase
      .from('test_answers')
      .select('id')
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId)
      .single();

    let result;
    if (existingAnswer) {
      // Update existing answer
      result = await supabase
        .from('test_answers')
        .update({
          selected_option: selectedOption || null,
          text_answer: textAnswer || null
        })
        .eq('attempt_id', attemptId)
        .eq('question_id', questionId);
    } else {
      // Insert new answer
      result = await supabase
        .from('test_answers')
        .insert([{
          attempt_id: attemptId,
          question_id: questionId,
          selected_option: selectedOption || null,
          text_answer: textAnswer || null
        }]);
    }

    if (result.error) {
      console.error('Database error:', result.error);
      throw result.error;
    }

    console.log('Answer saved successfully');
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
        time_taken_minutes: Math.max(1, Math.round(timeTaken / 60)), // Keep for backward compatibility
        time_taken_seconds: Math.max(1, Math.round(timeTaken)), // Store actual seconds
        submitted_at: new Date().toISOString(),
        status: autoSubmitted ? 'auto_submitted' : 'submitted'
      })
      .eq('id', attemptId);

    if (updateError) throw updateError;

    // Update ranks for all students in this test after submission
    try {
      await supabase.functions.invoke('test-analytics', {
        body: {
          action: 'updateRanks',
          testId: attempt.test_id
        }
      });
    } catch (rankError) {
      console.error('Error updating ranks:', rankError);
      // Don't fail the submission if rank update fails
    }

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