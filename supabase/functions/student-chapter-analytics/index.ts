import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { student_id } = await req.json();

    if (!student_id) {
      return new Response(
        JSON.stringify({ error: 'student_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch student's roadmap chapters with topics
    const { data: roadmapData, error: roadmapError } = await supabase
      .from('student_roadmaps')
      .select(`
        batch_roadmap_id,
        batch_roadmaps!inner (
          id,
          roadmap_chapters (
            id,
            chapter_name,
            subject,
            order_num,
            roadmap_topics (
              id,
              topic_name,
              order_num
            )
          )
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (roadmapError || !roadmapData) {
      return new Response(
        JSON.stringify({ chapters: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chapters = roadmapData.batch_roadmaps.roadmap_chapters || [];
    const analyticsResult = [];

    for (const chapter of chapters) {
      const topicsData = [];
      let chapterTotalXP = 0;
      let chapterTotalGames = 0;
      let chapterCompletedGames = 0;

      for (const topic of chapter.roadmap_topics || []) {
        // Get topic status
        const { data: topicStatus } = await supabase
          .from('student_topic_status')
          .select('*')
          .eq('student_id', student_id)
          .eq('topic_id', topic.id)
          .single();

        // Get game progress
        const { data: gameProgress } = await supabase
          .from('student_topic_game_progress')
          .select('*')
          .eq('student_id', student_id)
          .eq('topic_id', topic.id)
          .single();

        // Get XP earned
        const { data: xpData } = await supabase
          .from('student_xp_coins')
          .select('total_xp')
          .eq('student_id', student_id)
          .single();

        // Calculate topic XP (approximate from games + tests)
        const gamesCompleted = gameProgress?.questions_completed || 0;
        const totalGames = gameProgress?.total_questions || 0;
        const testAvgScore = topicStatus?.test_avg_score || 0;
        
        const xpFromGames = gamesCompleted * 10; // Assuming 10 XP per game
        const xpFromTests = Math.round(testAvgScore * 0.5); // XP based on test score
        const topicXP = xpFromGames + xpFromTests;

        chapterTotalXP += topicXP;
        chapterTotalGames += totalGames;
        chapterCompletedGames += gamesCompleted;

        // Determine if topic is weak
        const isWeak = topicStatus?.status === 'red' || testAvgScore < 40;

        topicsData.push({
          topic_id: topic.id,
          topic_name: topic.topic_name,
          average_score: topicStatus?.test_avg_score || 0,
          games_completed: gamesCompleted,
          total_games: totalGames,
          game_completion_rate: topicStatus?.game_completion_rate || 0,
          xp_from_games: xpFromGames,
          xp_from_tests: xpFromTests,
          total_xp: topicXP,
          is_weak: isWeak,
          status: topicStatus?.status || 'grey',
          last_practiced: topicStatus?.updated_at || null,
        });
      }

      const completionPercentage = chapterTotalGames > 0 
        ? Math.round((chapterCompletedGames / chapterTotalGames) * 100)
        : 0;

      analyticsResult.push({
        chapter_id: chapter.id,
        chapter_name: chapter.chapter_name,
        subject: chapter.subject,
        order_num: chapter.order_num,
        total_xp: chapterTotalXP,
        completion_percentage: completionPercentage,
        total_games: chapterTotalGames,
        completed_games: chapterCompletedGames,
        topics: topicsData.sort((a, b) => a.topic_name.localeCompare(b.topic_name)),
      });
    }

    // Sort by subject and order
    analyticsResult.sort((a, b) => {
      if (a.subject === b.subject) {
        return a.order_num - b.order_num;
      }
      return a.subject.localeCompare(b.subject);
    });

    return new Response(
      JSON.stringify({ chapters: analyticsResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
