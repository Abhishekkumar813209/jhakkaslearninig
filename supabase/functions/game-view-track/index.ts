import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { game_id } = await req.json();
    if (!game_id) {
      return new Response(JSON.stringify({ error: 'Missing game_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if record exists
    const { data: existing, error: selectError } = await supabase
      .from('student_game_views')
      .select('view_count')
      .eq('student_id', user.id)
      .eq('game_id', game_id)
      .maybeSingle();

    if (selectError) throw selectError;

    let viewCount = 1;

    if (existing) {
      // Increment existing view count
      viewCount = (existing.view_count || 0) + 1;
      
      const { error: updateError } = await supabase
        .from('student_game_views')
        .update({
          view_count: viewCount,
          last_viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('student_id', user.id)
        .eq('game_id', game_id);

      if (updateError) throw updateError;
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('student_game_views')
        .insert({
          student_id: user.id,
          game_id: game_id,
          view_count: 1,
          last_viewed_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
    }

    console.log(`[View Track] Student ${user.id} - Game ${game_id} - View #${viewCount}`);

    return new Response(JSON.stringify({
      view_count: viewCount,
      is_struggling: viewCount >= 3
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in game-view-track:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
