import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Dashboard overview request for user:', user.id);

    // Get or create student analytics
    let { data: analytics, error: analyticsError } = await supabase
      .from('student_analytics')
      .select('*')
      .eq('student_id', user.id)
      .single();

    if (analyticsError && analyticsError.code === 'PGRST116') {
      // Create analytics record if doesn't exist
      const { data: newAnalytics, error: createError } = await supabase
        .from('student_analytics')
        .insert([{
          student_id: user.id,
          total_study_time_minutes: 142 * 60, // Mock data: 142 hours
          streak_days: 12,
          average_score: 87,
          tests_attempted: 15,
          batch_rank: 4,
          overall_rank: 24
        }])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating analytics:', createError);
        analytics = {
          total_study_time_minutes: 142 * 60,
          streak_days: 12,
          average_score: 87,
          tests_attempted: 15,
          batch_rank: 4,
          overall_rank: 24
        };
      } else {
        analytics = newAnalytics;
      }
    }

    if (!analytics) {
      // Fallback to mock data
      analytics = {
        total_study_time_minutes: 142 * 60,
        streak_days: 12,
        average_score: 87,
        tests_attempted: 15,
        batch_rank: 4,
        overall_rank: 24
      };
    }

    // Get enrollments for course count
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', user.id);

    // Get recent test attempts for subject performance
    const { data: testAttempts } = await supabase
      .from('test_attempts')
      .select(`
        *,
        tests!inner(subject)
      `)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate subject performance
    const subjectMap = new Map();
    if (testAttempts) {
      testAttempts.forEach(attempt => {
        const subject = attempt.tests.subject;
        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, { total: 0, count: 0 });
        }
        const current = subjectMap.get(subject);
        current.total += attempt.percentage;
        current.count += 1;
      });
    }

    const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      score: Math.round(data.total / data.count)
    }));

    // Add default subjects if no data
    if (subjectPerformance.length === 0) {
      subjectPerformance.push(
        { subject: "Mathematics", score: 85 },
        { subject: "Physics", score: 78 },
        { subject: "Chemistry", score: 92 },
        { subject: "Biology", score: 74 },
        { subject: "English", score: 88 }
      );
    }

    // Create recent activity from test attempts
    const recentActivity = (testAttempts || []).slice(0, 3).map(attempt => ({
      type: "test",
      title: `Completed Quiz: ${attempt.tests.subject} Test`,
      description: `Score: ${attempt.percentage}%`,
      timestamp: attempt.created_at,
      icon: "CheckCircle",
      color: "success"
    }));

    // Add some mock recent activity if no real data
    if (recentActivity.length < 3) {
      recentActivity.push(
        {
          type: "video",
          title: "Watched: Vector Calculus Lecture", 
          description: "Duration: 45 minutes",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          icon: "PlayCircle",
          color: "primary"
        },
        {
          type: "test",
          title: "Earned Badge: Quiz Master",
          description: "For scoring 90%+ in 10 quizzes",
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          icon: "Award",
          color: "warning"
        }
      );
    }

    // Calculate changes (mock calculation)
    const studyTimeChange = 8;
    const scoreChange = 5;
    const streakChange = 15;
    const rankChange = 2;

    // Build response
    const overviewData = {
      stats: {
        totalStudyTime: {
          value: `${Math.round(analytics.total_study_time_minutes / 60)}h`,
          change: studyTimeChange,
          changeType: "increase",
          description: "This month"
        },
        averageScore: {
          value: `${Math.round(analytics.average_score)}%`,
          change: scoreChange,
          changeType: "increase", 
          description: "Across all subjects"
        },
        currentStreak: {
          value: `${analytics.streak_days} days`,
          change: streakChange,
          changeType: "increase",
          description: "Consecutive study days"
        },
        batchRank: {
          value: `#${analytics.batch_rank || 4}`,
          change: rankChange,
          changeType: "increase",
          description: "Out of 150 students"
        }
      },
      subjectPerformance,
      recentActivity,
      performanceTrend: [
        { month: "Jan", score: 65 },
        { month: "Feb", score: 72 },
        { month: "Mar", score: 68 },
        { month: "Apr", score: 78 },
        { month: "May", score: 85 },
        { month: "Jun", score: Math.round(analytics.average_score) }
      ],
      weeklyGoal: {
        current: 12,
        target: 15,
        progress: 80,
        description: "You're 80% towards your weekly goal. Keep it up!"
      }
    };

    console.log('Dashboard overview response prepared for user:', user.id);

    return new Response(JSON.stringify({
      success: true,
      data: overviewData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in dashboard-overview function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});