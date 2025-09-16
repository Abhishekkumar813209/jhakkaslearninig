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

    console.log('Dashboard achievements request for user:', user.id);

    // Get student analytics to calculate achievements
    const { data: analytics } = await supabase
      .from('student_analytics')
      .select('*')
      .eq('student_id', user.id)
      .single();

    // Get test attempts for achievement calculation
    const { data: testAttempts } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('student_id', user.id);

    // Get enrollments for achievement calculation
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*')
      .eq('student_id', user.id);

    const achievements = [];

    // Quiz Master achievement
    const highScores = (testAttempts || []).filter(attempt => attempt.percentage >= 90);
    if (highScores.length >= 3) { // Lowered threshold for demo
      achievements.push({
        title: "Quiz Master",
        description: `Scored 90%+ in ${highScores.length} quizzes`,
        icon: "Trophy",
        earnedAt: highScores[highScores.length - 1]?.created_at || new Date().toISOString(),
        category: "performance"
      });
    }

    // Consistent Learner achievement
    if (analytics && analytics.streak_days >= 7) {
      achievements.push({
        title: "Consistent Learner",
        description: `${analytics.streak_days}-day learning streak`,
        icon: "Target",
        earnedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        category: "consistency"
      });
    }

    // Course Explorer achievement
    if (enrollments && enrollments.length >= 2) {
      achievements.push({
        title: "Course Explorer",
        description: `Enrolled in ${enrollments.length} courses`,
        icon: "TrendingUp",
        earnedAt: enrollments[enrollments.length - 1]?.enrolled_at || new Date().toISOString(),
        category: "engagement"
      });
    }

    // Add default achievements if no real achievements
    if (achievements.length === 0) {
      achievements.push(
        {
          title: "Getting Started",
          description: "Welcome to the learning platform!",
          icon: "Award",
          earnedAt: new Date().toISOString(),
          category: "welcome"
        },
        {
          title: "First Steps",
          description: "Completed your first activity",
          icon: "Target",
          earnedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          category: "progress"
        }
      );
    }

    console.log('Dashboard achievements response prepared for user:', user.id);

    return new Response(JSON.stringify({
      success: true,
      data: achievements
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in dashboard-achievements function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});