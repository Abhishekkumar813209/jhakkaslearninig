import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'overall'; // overall, subject, streak, batch
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let leaderboardData = {};

    switch (type) {
      case 'overall':
        // Overall XP-based leaderboard
        const { data: xpStudents, error: xpError } = await supabase
          .from('student_gamification')
          .select(`
            student_id,
            total_xp,
            level,
            streak_days,
            profiles!inner (full_name, avatar_url, student_class)
          `)
          .order('total_xp', { ascending: false })
          .limit(limit);

        if (xpError) throw xpError;

        leaderboardData = {
          title: 'Overall XP Leaderboard',
          description: 'Ranked by total Jhakkas Points earned',
          students: (xpStudents || []).map((student: any, index: number) => ({
            rank: index + 1,
            name: student.profiles?.full_name || 'Student',
            avatar: student.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.student_id}`,
            xp: student.total_xp || 0,
            level: student.level || 1,
            streak: student.streak_days || 0,
            change: 0
          }))
        };
        break;

      case 'streak':
        // Fetch students sorted by streak
        const { data: streakStudents, error: streakError } = await supabase
          .from('student_analytics')
          .select(`
            student_id,
            streak_days,
            profiles (full_name, avatar_url)
          `)
          .gt('streak_days', 0)
          .order('streak_days', { ascending: false })
          .limit(limit);

        if (streakError) throw streakError;

        leaderboardData = {
          title: 'Streak Leaders',
          description: 'Longest consecutive study days',
          students: (streakStudents || []).map((student: any, index: number) => ({
            rank: index + 1,
            name: student.profiles?.full_name || 'Student',
            avatar: student.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.student_id}`,
            streak: student.streak_days || 0
          }))
        };
        break;

      case 'batch':
        // Fetch batch-wise statistics
        const { data: batchData, error: batchError } = await supabase
          .from('student_analytics')
          .select(`
            student_id,
            average_score,
            profiles!inner (batch_id, batches (name))
          `)
          .not('profiles.batch_id', 'is', null);

        if (batchError) throw batchError;

        // Group by batch and calculate stats
        const batchStats = new Map();
        (batchData || []).forEach((student: any) => {
          const batchId = student.profiles?.batch_id;
          const batchName = student.profiles?.batches?.name || 'Unknown Batch';
          
          if (!batchStats.has(batchId)) {
            batchStats.set(batchId, {
              batch: batchName,
              totalScore: 0,
              count: 0,
              maxScore: 0,
              leader: ''
            });
          }
          
          const batch = batchStats.get(batchId);
          batch.totalScore += student.average_score || 0;
          batch.count += 1;
          if ((student.average_score || 0) > batch.maxScore) {
            batch.maxScore = student.average_score || 0;
          }
        });

        const batchLeaders = Array.from(batchStats.values())
          .map(batch => ({
            batch: batch.batch,
            avgScore: batch.count > 0 ? Math.round(batch.totalScore / batch.count) : 0,
            students: batch.count,
            leaderScore: Math.round(batch.maxScore)
          }))
          .sort((a, b) => b.avgScore - a.avgScore)
          .slice(0, limit);

        leaderboardData = {
          title: 'Batch Leaders',
          description: 'Performance by batch',
          batches: batchLeaders
        };
        break;

      default:
        leaderboardData = { error: 'Invalid leaderboard type' };
    }

    console.log(`Leaderboard data fetched for type: ${type}`);

    return new Response(JSON.stringify({
      success: true,
      data: leaderboardData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in student-leaderboard function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});