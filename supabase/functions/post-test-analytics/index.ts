import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { testId, studentId } = await req.json();

    if (!testId || !studentId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Test ID and Student ID are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get student's profile for zone and school info
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        id, full_name, zone_id, school_id,
        zones (id, name, code),
        schools (id, name, code)
      `)
      .eq('id', studentId)
      .single();

    // Get test attempt details along with test XP configuration
    const { data: testAttempt } = await supabase
      .from('test_attempts')
      .select(`
        id, score, total_marks, percentage, time_taken_minutes, rank,
        tests (
          id, title, subject, difficulty, duration_minutes,
          base_xp_reward, xp_per_mark, bonus_xp_on_perfect
        )
      `)
      .eq('test_id', testId)
      .eq('student_id', studentId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    // Get student's current analytics
    const { data: analytics } = await supabase
      .from('student_analytics')
      .select('*')
      .eq('student_id', studentId)
      .single();

    // Get zone rankings (simplified)
    let zoneRankings = null;
    if (profile?.zone_id) {
      const { data: zoneData } = await supabase
        .from('student_analytics')
        .select(`
          student_id, average_score, zone_rank, zone_percentile,
          profiles (full_name)
        `)
        .not('zone_rank', 'is', null)
        .order('zone_rank', { ascending: true })
        .limit(10);

      zoneRankings = {
        leaderboard: zoneData || [],
        currentRank: analytics?.zone_rank || null,
        currentPercentile: analytics?.zone_percentile || null,
        totalStudents: 0,
        averageScore: 0,
        zoneInfo: profile.zones
      };
    }

    // Get school rankings (simplified)
    let schoolRankings = null;
    if (profile?.school_id) {
      const { data: schoolData } = await supabase
        .from('student_analytics')
        .select(`
          student_id, average_score, school_rank, school_percentile,
          profiles (full_name)
        `)
        .not('school_rank', 'is', null)
        .order('school_rank', { ascending: true })
        .limit(10);

      schoolRankings = {
        leaderboard: schoolData || [],
        currentRank: analytics?.school_rank || null,
        currentPercentile: analytics?.school_percentile || null,
        totalStudents: 0,
        averageScore: 0,
        schoolInfo: profile.schools
      };
    }

    // Get overall rankings
    const { data: overallData } = await supabase
      .from('student_analytics')
      .select(`
        student_id, average_score, overall_rank, overall_percentile,
        profiles (full_name)
      `)
      .not('overall_rank', 'is', null)
      .order('overall_rank', { ascending: true })
      .limit(10);

    const overallRankings = {
      leaderboard: overallData || [],
      currentRank: analytics?.overall_rank || null,
      currentPercentile: analytics?.overall_percentile || null,
      totalStudents: 0,
      averageScore: 0
    };

    // Get subject-wise performance for weakness analysis
    const { data: testAnswers } = await supabase
      .from('test_answers')
      .select(`
        is_correct, marks_awarded,
        questions (
          question_text, tags, marks, correct_answer
        )
      `)
      .eq('attempt_id', testAttempt?.id);

    // Analyze weaknesses by topic/tag
    const topicPerformance = new Map();
    testAnswers?.forEach(answer => {
      const tags = (answer.questions as any)?.tags || ['General'];
      tags.forEach((tag: string) => {
        if (!topicPerformance.has(tag)) {
          topicPerformance.set(tag, { correct: 0, total: 0, totalMarks: 0, earnedMarks: 0 });
        }
        const topic = topicPerformance.get(tag);
        topic.total++;
        topic.totalMarks += (answer.questions as any)?.marks || 0;
        topic.earnedMarks += answer.marks_awarded || 0;
        if (answer.is_correct) {
          topic.correct++;
        }
      });
    });

    const weaknessAnalysis = Array.from(topicPerformance.entries())
      .map(([topic, data]: [string, any]) => ({
        topic,
        accuracy: (data.correct / data.total) * 100,
        scorePercentage: (data.earnedMarks / data.totalMarks) * 100,
        questionsAttempted: data.total,
        isWeak: (data.correct / data.total) < 0.6
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const strengths = weaknessAnalysis.filter(w => w.accuracy >= 75).slice(0, 3);
    const weaknesses = weaknessAnalysis.filter(w => w.accuracy < 60).slice(0, 3);

    // Generate improvement suggestions
    const improvementSuggestions = weaknesses.map(weakness => ({
      topic: weakness.topic,
      suggestion: `Focus on ${weakness.topic} - Current accuracy: ${weakness.accuracy.toFixed(1)}%`,
      priority: weakness.accuracy < 40 ? 'High' : weakness.accuracy < 60 ? 'Medium' : 'Low'
    }));

    // Performance insights
    const insights = [];
    
    if (testAttempt?.percentage >= 80) {
      insights.push("Excellent performance! You're in the top tier.");
    } else if (testAttempt?.percentage >= 60) {
      insights.push("Good performance with room for improvement.");
    } else {
      insights.push("Focus on strengthening weak areas for better results.");
    }

    if (analytics?.zone_rank && analytics.zone_rank <= 10) {
      insights.push("You're in the top 10 of your zone!");
    }

    if (analytics?.overall_percentile && analytics.overall_percentile >= 90) {
      insights.push("You're performing better than 90% of all students!");
    }

    // Get test configuration for XP calculation
    const testConfig = testAttempt?.tests as any;
    const baseXP = testConfig?.base_xp_reward || 50;
    const xpPerMark = testConfig?.xp_per_mark || 2;
    const perfectBonus = testConfig?.bonus_xp_on_perfect || 50;
    
    // Calculate XP rewards using configured values
    const marksEarned = testAttempt?.score || 0;
    const performanceBonus = marksEarned * xpPerMark;
    const testDuration = testConfig?.duration_minutes || 60;
    const timeTaken = testAttempt?.time_taken_minutes || 0;
    const speedBonus = (timeTaken > 0 && timeTaken < testDuration * 0.5) ? 20 : 0;
    const perfectScoreBonus = (testAttempt?.percentage === 100) ? perfectBonus : 0;
    const totalXP = baseXP + performanceBonus + speedBonus + perfectScoreBonus;

    // Award XP through jhakkas-points-system
    try {
      const { error: xpError } = await supabase.functions.invoke('jhakkas-points-system', {
        body: {
          studentId,
          action: 'complete_test',
          xpAmount: totalXP,
          metadata: {
            testId,
            score: testAttempt?.score,
            percentage: testAttempt?.percentage,
            attemptId: testAttempt?.id
          }
        }
      });

      if (xpError) {
        console.error('Error awarding XP:', xpError);
      }

      // Update test attempt with XP earned
      await supabase
        .from('test_attempts')
        .update({ xp_earned: totalXP })
        .eq('id', testAttempt?.id);
    } catch (xpErr) {
      console.error('Failed to award XP:', xpErr);
    }

    // Check and award achievements
    const achievementsAwarded = [];
    
    // First test achievement
    const { count: testCount } = await supabase
      .from('test_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'submitted');
    
    if (testCount === 1) {
      achievementsAwarded.push({
        type: 'first_test',
        title: 'First Steps',
        description: 'Completed your first test!',
        icon: '🎯',
        xpBonus: 25
      });
    }

    // Perfect score achievement
    if (testAttempt?.percentage === 100) {
      achievementsAwarded.push({
        type: 'perfect_score',
        title: 'Perfect Score!',
        description: '100% on this test!',
        icon: '💯',
        xpBonus: 50
      });
    }

    // Top 10 rank achievement
    if (analytics?.zone_rank && analytics.zone_rank <= 10) {
      achievementsAwarded.push({
        type: 'top_10_zone',
        title: 'Zone Champion',
        description: 'Top 10 in your zone!',
        icon: '🏆',
        xpBonus: 30
      });
    }

    // High scorer achievement
    if (testAttempt?.percentage >= 90) {
      achievementsAwarded.push({
        type: 'high_scorer',
        title: 'Brilliant!',
        description: 'Scored 90% or above!',
        icon: '⭐',
        xpBonus: 20
      });
    }

    // Store achievements in test attempt
    if (achievementsAwarded.length > 0) {
      await supabase
        .from('test_attempts')
        .update({ achievements_awarded: achievementsAwarded })
        .eq('id', testAttempt?.id);
    }

    const responseData = {
      testInfo: {
        title: (testAttempt?.tests as any)?.title || '',
        subject: (testAttempt?.tests as any)?.subject || '',
        difficulty: (testAttempt?.tests as any)?.difficulty || '',
        score: testAttempt?.score || 0,
        totalMarks: testAttempt?.total_marks || 0,
        percentage: testAttempt?.percentage || 0,
        timeTaken: testAttempt?.time_taken_minutes || 0,
        rank: testAttempt?.rank || null
      },
      studentInfo: {
        name: profile?.full_name || '',
        currentStats: analytics
      },
      rankings: {
        zone: zoneRankings,
        school: schoolRankings,
        overall: overallRankings
      },
      performance: {
        strengths,
        weaknesses,
        topicBreakdown: Array.from(topicPerformance.entries()).map(([topic, data]: [string, any]) => ({
          topic,
          accuracy: (data.correct / data.total) * 100,
          correct: data.correct,
          total: data.total,
          scorePercentage: (data.earnedMarks / data.totalMarks) * 100
        }))
      },
      insights,
      improvementSuggestions,
      xpRewards: {
        baseXP,
        performanceBonus,
        speedBonus,
        perfectScoreBonus,
        totalXP,
        breakdown: {
          base: `${baseXP} XP for completing test`,
          performance: `${performanceBonus} XP for ${testAttempt?.percentage}% score`,
          speed: speedBonus > 0 ? `${speedBonus} XP for quick completion` : null,
          perfect: perfectScoreBonus > 0 ? `${perfectScoreBonus} XP for perfect score` : null
        }
      },
      achievements: achievementsAwarded,
      nextSteps: {
        subscriptionRecommended: true,
        freeTestsRemaining: 0
      }
    };

    console.log(`Post-test analytics generated for student ${studentId}, test ${testId}`);

    return new Response(JSON.stringify({
      success: true,
      data: responseData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in post-test-analytics function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});