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
    const { testId, studentId, action } = await req.json();

    console.log('Test analytics API called with:', { testId, studentId, action });

    switch (action) {
      case 'getTestAnalytics':
        return await getTestAnalytics(supabase, testId, studentId);
      
      case 'updateRanks':
        return await updateTestRanks(supabase, testId);
        
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in test-analytics:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getTestAnalytics(supabase: any, testId: string, studentId: string) {
  try {
    // Get student's test attempt
    const { data: studentAttempt, error: studentError } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', studentId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (studentError) throw studentError;

    // Get all submitted attempts for this test to calculate class stats
    const { data: allAttempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select('id, student_id, score, total_marks, percentage')
      .eq('test_id', testId)
      .eq('status', 'submitted')
      .order('percentage', { ascending: false });

    if (attemptsError) throw attemptsError;

    // Get student's correct answers count
    const { data: studentAnswers, error: answersError } = await supabase
      .from('test_answers')
      .select('is_correct')
      .eq('attempt_id', studentAttempt.id);

    if (answersError) throw answersError;

    // Get total questions count
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id')
      .eq('test_id', testId);

    if (questionsError) throw questionsError;

    // Calculate analytics
    const correctAnswers = studentAnswers.filter(a => a.is_correct === true).length;
    const totalQuestions = questions.length;
    
    // Calculate class average
    const classAverage = allAttempts.length > 0 
      ? Math.round(allAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / allAttempts.length)
      : 0;

    // Find student's rank
    const studentRank = allAttempts.findIndex(attempt => attempt.student_id === studentId) + 1;
    
    // Update rank in database if not already set
    if (studentAttempt.rank !== studentRank) {
      await supabase
        .from('test_attempts')
        .update({ rank: studentRank })
        .eq('id', studentAttempt.id);
    }

    console.log('Calculated analytics:', {
      correctAnswers,
      totalQuestions,
      classAverage,
      studentRank,
      totalStudents: allAttempts.length
    });

    return new Response(JSON.stringify({ 
      success: true,
      analytics: {
        correctAnswers,
        totalQuestions,
        classAverage,
        studentRank,
        totalStudents: allAttempts.length,
        accuracy: studentAttempt.percentage
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error calculating test analytics:', error);
    throw error;
  }
}

async function updateTestRanks(supabase: any, testId: string) {
  try {
    // Get all submitted attempts ordered by percentage
    const { data: attempts, error } = await supabase
      .from('test_attempts')
      .select('id, percentage')
      .eq('test_id', testId)
      .eq('status', 'submitted')
      .order('percentage', { ascending: false });

    if (error) throw error;

    // Update ranks for all attempts
    for (let i = 0; i < attempts.length; i++) {
      await supabase
        .from('test_attempts')
        .update({ rank: i + 1 })
        .eq('id', attempts[i].id);
    }

    console.log(`Updated ranks for ${attempts.length} attempts`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Updated ranks for ${attempts.length} attempts`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error updating ranks:', error);
    throw error;
  }
}