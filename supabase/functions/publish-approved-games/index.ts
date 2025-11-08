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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

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

    console.log(`[publish-approved-games] Publishing games for topic: ${topic_id}`);

    // Step 1: Ensure topic_content_mapping exists
    let mappingId: string | null = null;
    const { data: existingMapping } = await supabase
      .from('topic_content_mapping')
      .select('id')
      .eq('topic_id', topic_id)
      .eq('content_type', 'theory')
      .single();

    if (existingMapping) {
      mappingId = existingMapping.id;
      console.log(`[publish-approved-games] Found existing mapping: ${mappingId}`);
    } else {
      // Create mapping if it doesn't exist
      const { data: newMapping, error: mappingError } = await supabase
        .from('topic_content_mapping')
        .insert({ topic_id, content_type: 'theory', order_num: 1 })
        .select('id')
        .single();

      if (mappingError) {
        console.error('[publish-approved-games] Failed to create mapping:', mappingError);
        throw mappingError;
      }

      mappingId = newMapping.id;
      console.log(`[publish-approved-games] Created new mapping: ${mappingId}`);
    }

    // Step 2: Fetch approved games with data
    const { data: approvedGames, error: gamesError } = await supabase
      .from('topic_learning_content')
      .select('*')
      .eq('topic_id', topic_id)
      .eq('lesson_type', 'game')
      .eq('human_reviewed', true)
      .not('game_data', 'is', null);

    if (gamesError) {
      console.error('[publish-approved-games] Error fetching approved games:', gamesError);
      throw gamesError;
    }

    if (!approvedGames || approvedGames.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          inserted: 0,
          skipped: 0,
          message: 'No approved games with data found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[publish-approved-games] Found ${approvedGames.length} approved games with data`);

    // Step 3: Get current max game_order
    const { data: maxOrderResult } = await supabase
      .from('gamified_exercises')
      .select('game_order')
      .eq('topic_content_id', mappingId)
      .order('game_order', { ascending: false })
      .limit(1);

    let nextOrder = maxOrderResult && maxOrderResult.length > 0 ? maxOrderResult[0].game_order + 1 : 1;

    // Step 4: Insert games
    let inserted = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const game of approvedGames) {
      try {
        const gameData = game.game_data;
        
        // Validate game_type can be cast to exercise_type
        const exerciseType = game.game_type;
        
        const exerciseData = {
          ...gameData,
          question: gameData.question || gameData.question_text || '',
        };

        // Insert into gamified_exercises
        const { error: insertError } = await supabase
          .from('gamified_exercises')
          .insert({
            topic_content_id: mappingId,
            exercise_type: exerciseType,
            exercise_data: exerciseData,
            correct_answer: gameData.correct_answer,
            explanation: gameData.explanation,
            difficulty: gameData.difficulty || 'medium',
            xp_reward: game.xp_reward || 10,
            game_order: nextOrder
          });

        if (insertError) {
          // Check if it's a duplicate error (23505 = unique violation)
          if (insertError.code === '23505') {
            console.log(`[publish-approved-games] Skipping duplicate game at order ${nextOrder}`);
            skipped++;
          } else {
            console.error(`[publish-approved-games] Error inserting game:`, insertError);
            errors.push({ lesson_id: game.id, error: insertError.message });
          }
        } else {
          console.log(`[publish-approved-games] Inserted game at order ${nextOrder}`);
          inserted++;
          nextOrder++;
        }
      } catch (err: any) {
        console.error(`[publish-approved-games] Unexpected error:`, err);
        errors.push({ lesson_id: game.id, error: err.message });
      }
    }

    console.log(`[publish-approved-games] Complete: ${inserted} inserted, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        message: `Published ${inserted} game(s) successfully${skipped > 0 ? `, skipped ${skipped} duplicate(s)` : ''}${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[publish-approved-games] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
