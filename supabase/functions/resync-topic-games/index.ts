import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { topic_id } = await req.json();

    if (!topic_id) {
      return new Response(
        JSON.stringify({ error: 'topic_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[resync-topic-games] Resyncing games for topic: ${topic_id}`);

    // Update all approved game lessons for this topic (triggers sync_gamified_exercises_from_content)
    const { data, error, count } = await supabase
      .from('topic_learning_content')
      .update({ updated_at: new Date().toISOString() })
      .eq('topic_id', topic_id)
      .eq('lesson_type', 'game')
      .eq('human_reviewed', true)
      .select('id', { count: 'exact' });

    if (error) {
      console.error('[resync-topic-games] Error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[resync-topic-games] Touched ${count} lesson(s), trigger should sync to gamified_exercises`);

    return new Response(
      JSON.stringify({
        success: true,
        lessons_touched: count || 0,
        message: `Resync triggered for ${count || 0} approved game(s)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[resync-topic-games] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
