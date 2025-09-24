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
      .in('status', ['submitted', 'auto_submitted'])
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (studentError) throw studentError;

    // Get all submitted attempts for this test to calculate class stats
    const { data: allAttempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select('id, student_id, score, total_marks, percentage, time_taken_seconds, time_taken_minutes')
      .eq('test_id', testId)
      .in('status', ['submitted', 'auto_submitted'])
      .order('percentage', { ascending: false });

    if (attemptsError) throw attemptsError;

    // Get test duration for comparison
    const { data: testInfo, error: testError } = await supabase
      .from('tests')
      .select('duration_minutes')
      .eq('id', testId)
      .single();

    if (testError) throw testError;

    // Get student's answers with option resolution
    const { data: studentAnswers, error: answersError } = await supabase
      .from('test_answers')
      .select('question_id, selected_option, option_id')
      .eq('attempt_id', studentAttempt.id);

    if (answersError) throw answersError;

    // Resolve option_id -> option_text when selected_option is null
    const optionIds = Array.from(new Set((studentAnswers || [])
      .map((a: any) => a.option_id)
      .filter((id: string | null) => !!id)));

    let optionTextById = new Map<string, string>();
    if (optionIds.length > 0) {
      const { data: optionRows, error: oErr } = await supabase
        .from('options')
        .select('id, option_text')
        .in('id', optionIds);
      if (oErr) throw oErr;
      optionTextById = new Map((optionRows || []).map((r: any) => [r.id, r.option_text]));
    }

    console.log('Student attempt ID:', studentAttempt.id);
    console.log('Student answers fetched:', studentAnswers);

    // Get total questions and compare correctness
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, correct_answer')
      .eq('test_id', testId);

    if (questionsError) throw questionsError;

    // Build map of question -> selected text
    const selectedByQuestion = new Map<string, string | null>();
    for (const ans of studentAnswers || []) {
      const sel = ans.selected_option ?? (ans.option_id ? optionTextById.get(ans.option_id) ?? null : null);
      selectedByQuestion.set(ans.question_id, sel);
    }

    // Calculate analytics - per question
    let correctAnswers = 0;
    const totalQuestions = questions.length;
    for (const q of questions) {
      const sel = selectedByQuestion.get(q.id);
      if (!sel) continue;
      if (sel.trim().toLowerCase() === (q.correct_answer || '').trim().toLowerCase()) {
        correctAnswers += 1;
      }
    }
    
    // Calculate class average score (marks)
    const classAverage = allAttempts.length > 0 
      ? Math.round(allAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / allAttempts.length)
      : 0;

    // Calculate time analytics - work with seconds for accuracy
    const validTimes = allAttempts.filter(a => (a.time_taken_seconds || 0) > 0);
    const averageTimeSeconds = validTimes.length > 0 
      ? Math.round(validTimes.reduce((sum, attempt) => sum + (attempt.time_taken_seconds || 0), 0) / validTimes.length)
      : 0;
    
    const studentTimeSeconds = studentAttempt.time_taken_seconds || 0;
    const testDurationSeconds = testInfo.duration_minutes * 60;
    const timeEfficiency = testDurationSeconds > 0 ? Math.round((studentTimeSeconds / testDurationSeconds) * 100) : 0;

    // Percentile: lower time = better (faster)
    let fasterThanPercent = 0;
    if (validTimes.length > 0) {
      const sorted = [...validTimes].map(v => v.time_taken_seconds || 0).sort((a,b) => a - b);
      const fasterCount = sorted.filter(t => t > 0 && t > studentTimeSeconds).length; // students slower than you
      fasterThanPercent = Math.round((fasterCount / sorted.length) * 100);
    }

    // Convert to minutes for display (keeping as decimals for accurate formatting)
    const averageTime = averageTimeSeconds / 60;
    const studentTime = studentTimeSeconds / 60;

    // Calculate proper ranking with time as tiebreaker
    // Sort: higher score first, then lower time for same score
    const rankedAttempts = [...allAttempts].sort((a, b) => {
      const aScore = Number(a.score) || 0;
      const bScore = Number(b.score) || 0;
      if (bScore !== aScore) return bScore - aScore;
      const aTime = Number(a.time_taken_seconds) || (Number(a.time_taken_minutes) * 60) || 0;
      const bTime = Number(b.time_taken_seconds) || (Number(b.time_taken_minutes) * 60) || 0;
      return aTime - bTime;
    });

    // Find student's rank
    const studentRank = rankedAttempts.findIndex(attempt => attempt.student_id === studentId) + 1;
    
    // Update rank in database if not already set correctly
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
      totalStudents: allAttempts.length,
      studentTime,
      averageTime,
      timeEfficiency,
      fasterThanPercent
    });

    // Calculate accuracy based on correct answers
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    return new Response(JSON.stringify({ 
      success: true,
      analytics: {
        correctAnswers,
        totalQuestions,
        classAverage,
        studentRank,
        totalStudents: allAttempts.length,
        accuracy,
        studentTime,
        averageTime,
        timeEfficiency,
        fasterThanPercent,
        testDuration: testInfo.duration_minutes
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
    // Get all submitted attempts with time data
    const { data: attempts, error } = await supabase
      .from('test_attempts')
      .select('id, score, percentage, time_taken_seconds, time_taken_minutes')
      .eq('test_id', testId)
      .in('status', ['submitted', 'auto_submitted']);

    if (error) throw error;

    // Sort attempts: higher score first, then lower time for same score
    const rankedAttempts = attempts.sort((a, b) => {
      const aScore = Number(a.score) || 0;
      const bScore = Number(b.score) || 0;
      if (bScore !== aScore) return bScore - aScore;
      const aTime = Number(a.time_taken_seconds) || (Number(a.time_taken_minutes) * 60) || 0;
      const bTime = Number(b.time_taken_seconds) || (Number(b.time_taken_minutes) * 60) || 0;
      return aTime - bTime;
    });

    // Update ranks for all attempts
    for (let i = 0; i < rankedAttempts.length; i++) {
      await supabase
        .from('test_attempts')
        .update({ rank: i + 1 })
        .eq('id', rankedAttempts[i].id);
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