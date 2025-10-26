import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { topic_id, batch_id, chapter_id, dry_run = false } = await req.json();

    if (!topic_id && !batch_id && !chapter_id) {
      return new Response(JSON.stringify({ error: 'topic_id, batch_id, or chapter_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build topic list based on input
    let topicIds: string[] = [];
    
    if (topic_id) {
      topicIds = [topic_id];
    } else if (chapter_id) {
      const { data: chapterTopics } = await supabase
        .from('roadmap_topics')
        .select('id')
        .eq('chapter_id', chapter_id);
      topicIds = (chapterTopics || []).map(t => t.id);
    } else if (batch_id) {
      const { data: batchTopics } = await supabase
        .from('roadmap_topics')
        .select('id')
        .in('chapter_id', (
          await supabase
            .from('roadmap_chapters')
            .select('id')
            .in('roadmap_id', (
              await supabase
                .from('batch_roadmaps')
                .select('id')
                .eq('batch_id', batch_id)
            ).data?.map(r => r.id) || [])
        ).data?.map(c => c.id) || []);
      topicIds = (batchTopics || []).map(t => t.id);
    }

    if (topicIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No topics found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    for (const tid of topicIds) {
      // Get topic data
      const { data: topic } = await supabase
        .from('roadmap_topics')
        .select('id, topic_name, xp_reward')
        .eq('id', tid)
        .single();

      if (!topic) continue;

      const budget = topic.xp_reward || 30;

      // Get content mapping for topic
      const { data: mapping } = await supabase
        .from('topic_content_mapping')
        .select('id')
        .eq('topic_id', tid)
        .single();

      if (!mapping) {
        results.push({
          topic_id: tid,
          topic_name: topic.topic_name,
          error: 'No content mapping found',
        });
        continue;
      }

      // Get all games for this topic
      const { data: games } = await supabase
        .from('gamified_exercises')
        .select('id, game_order, xp_reward')
        .eq('topic_content_id', mapping.id)
        .order('game_order');

      const totalGames = games?.length || 0;

      if (totalGames === 0) {
        results.push({
          topic_id: tid,
          topic_name: topic.topic_name,
          error: 'No games found',
        });
        continue;
      }

      // Calculate distribution
      const baseXP = Math.floor(budget / totalGames);
      const remainder = budget % totalGames;

      // Build distribution array
      const distribution = (games || []).map((game, index) => ({
        id: game.id,
        old_xp: game.xp_reward,
        new_xp: index < remainder ? baseXP + 1 : baseXP,
        game_order: game.game_order
      }));

      const totalAllocated = distribution.reduce((sum, g) => sum + g.new_xp, 0);

      // Apply changes if not dry run
      if (!dry_run) {
        for (const game of distribution) {
          await supabase
            .from('gamified_exercises')
            .update({ xp_reward: game.new_xp })
            .eq('id', game.id);
        }
      }

      results.push({
        topic_id: tid,
        topic_name: topic.topic_name,
        total_games: totalGames,
        xp_budget: budget,
        total_allocated: totalAllocated,
        distribution,
        applied: !dry_run
      });
    }

    return new Response(JSON.stringify({
      success: true,
      topics_processed: results.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in auto-distribute-xp:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
