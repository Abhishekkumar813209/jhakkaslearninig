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

    const url = new URL(req.url);
    const studentId = url.searchParams.get('studentId');
    const timeframe = url.searchParams.get('timeframe') || '30';

    // Mock student data for simulation
    const mockStudents = [
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Priya Patel', email: 'priya.patel@example.com', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b190?w=150' },
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Rahul Sharma', email: 'rahul.sharma@example.com', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Anita Gupta', email: 'anita.gupta@example.com', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
      { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Vikram Singh', email: 'vikram.singh@example.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
      { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Kavya Reddy', email: 'kavya.reddy@example.com', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
      { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Arjun Kumar', email: 'arjun.kumar@example.com', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
      { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Sneha Joshi', email: 'sneha.joshi@example.com', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
      { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Rohit Mehta', email: 'rohit.mehta@example.com', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
      { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Pooja Agarwal', email: 'pooja.agarwal@example.com', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
      { id: '550e8400-e29b-41d4-a716-446655440010', name: 'Karthik Rao', email: 'karthik.rao@example.com', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150' }
    ];

    const mockAnalytics = {
      '550e8400-e29b-41d4-a716-446655440001': { total_study_time_minutes: 8520, streak_days: 12, average_score: 87.5, tests_attempted: 15, batch_rank: 4, overall_rank: 24 },
      '550e8400-e29b-41d4-a716-446655440002': { total_study_time_minutes: 9240, streak_days: 18, average_score: 92.3, tests_attempted: 18, batch_rank: 1, overall_rank: 8 },
      '550e8400-e29b-41d4-a716-446655440003': { total_study_time_minutes: 7890, streak_days: 9, average_score: 78.9, tests_attempted: 12, batch_rank: 6, overall_rank: 45 },
      '550e8400-e29b-41d4-a716-446655440004': { total_study_time_minutes: 8760, streak_days: 15, average_score: 89.1, tests_attempted: 16, batch_rank: 2, overall_rank: 15 },
      '550e8400-e29b-41d4-a716-446655440005': { total_study_time_minutes: 6540, streak_days: 7, average_score: 73.4, tests_attempted: 10, batch_rank: 8, overall_rank: 67 },
      '550e8400-e29b-41d4-a716-446655440006': { total_study_time_minutes: 8100, streak_days: 11, average_score: 85.2, tests_attempted: 14, batch_rank: 5, overall_rank: 32 },
      '550e8400-e29b-41d4-a716-446655440007': { total_study_time_minutes: 9600, streak_days: 21, average_score: 94.7, tests_attempted: 20, batch_rank: 1, overall_rank: 3 },
      '550e8400-e29b-41d4-a716-446655440008': { total_study_time_minutes: 7200, streak_days: 8, average_score: 81.3, tests_attempted: 11, batch_rank: 3, overall_rank: 38 },
      '550e8400-e29b-41d4-a716-446655440009': { total_study_time_minutes: 8820, streak_days: 14, average_score: 88.6, tests_attempted: 17, batch_rank: 2, overall_rank: 18 },
      '550e8400-e29b-41d4-a716-446655440010': { total_study_time_minutes: 6900, streak_days: 6, average_score: 76.8, tests_attempted: 9, batch_rank: 4, overall_rank: 52 }
    };

    if (!studentId) {
      // Return list of all students
      return new Response(JSON.stringify({
        success: true,
        data: mockStudents
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get specific student analytics
    const student = mockStudents.find(s => s.id === studentId);
    const analytics = mockAnalytics[studentId];

    if (!student || !analytics) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Student not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate performance trends (mock data based on timeframe)
    const performanceTrend = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    for (let i = 0; i < 6; i++) {
      const baseScore = analytics.average_score;
      const variation = (Math.random() - 0.5) * 20; // ±10 points variation
      performanceTrend.push({
        month: months[i],
        score: Math.max(0, Math.min(100, Math.round(baseScore + variation)))
      });
    }

    // Subject performance based on student's overall score
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'];
    const subjectPerformance = subjects.map(subject => ({
      subject,
      score: Math.round(analytics.average_score + (Math.random() - 0.5) * 15)
    }));

    // Recent activity (mock)
    const recentActivity = [
      {
        type: 'test',
        title: 'Completed Quiz: Mathematics Test',
        description: `Score: ${Math.round(analytics.average_score)}%`,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        icon: 'CheckCircle',
        color: 'success'
      },
      {
        type: 'video',
        title: 'Watched: Physics Lecture',
        description: 'Duration: 45 minutes',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        icon: 'PlayCircle',
        color: 'primary'
      }
    ];

    const responseData = {
      student,
      stats: {
        totalStudyTime: {
          value: `${Math.round(analytics.total_study_time_minutes / 60)}h`,
          change: Math.round(Math.random() * 10 + 5),
          changeType: "increase",
          description: "This month"
        },
        averageScore: {
          value: `${Math.round(analytics.average_score)}%`,
          change: Math.round(Math.random() * 5 + 2),
          changeType: "increase",
          description: "Across all subjects"
        },
        currentStreak: {
          value: `${analytics.streak_days} days`,
          change: Math.round(Math.random() * 20 + 10),
          changeType: "increase",
          description: "Consecutive study days"
        },
        batchRank: {
          value: `#${analytics.batch_rank}`,
          change: Math.round(Math.random() * 3 + 1),
          changeType: analytics.batch_rank <= 3 ? "increase" : "decrease",
          description: "Out of 150 students"
        }
      },
      subjectPerformance,
      recentActivity,
      performanceTrend,
      weeklyGoal: {
        current: Math.round(analytics.tests_attempted * 0.8),
        target: analytics.tests_attempted,
        progress: Math.round((analytics.tests_attempted * 0.8 / analytics.tests_attempted) * 100),
        description: `You're ${Math.round((analytics.tests_attempted * 0.8 / analytics.tests_attempted) * 100)}% towards your weekly goal. Keep it up!`
      }
    };

    console.log(`Student analytics fetched for: ${student.name}`);

    return new Response(JSON.stringify({
      success: true,
      data: responseData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in student-analytics function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});