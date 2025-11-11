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
    console.log(`[publish-approved-games] Checking for existing mapping...`);
    
    const { data: existingMapping, error: mappingCheckError } = await supabase
      .from('topic_content_mapping')
      .select('id')
      .eq('topic_id', topic_id)
      .eq('content_type', 'theory')
      .maybeSingle();

    if (mappingCheckError) {
      console.error('[publish-approved-games] Error checking mapping:', mappingCheckError);
      throw mappingCheckError;
    }

    if (existingMapping) {
      mappingId = existingMapping.id;
      console.log(`[publish-approved-games] ✅ Found existing mapping: ${mappingId}`);
    } else {
      console.log('[publish-approved-games] No mapping found, upserting...');
      // Upsert mapping to handle race conditions with trigger
      const { data: newMapping, error: mappingError } = await supabase
        .from('topic_content_mapping')
        .upsert(
          { topic_id, content_type: 'theory', order_num: 1 },
          { onConflict: 'topic_id', ignoreDuplicates: false }
        )
        .select('id')
        .single();

      if (mappingError) {
        console.error('[publish-approved-games] ❌ Failed to upsert mapping:', mappingError);
        throw mappingError;
      }

      mappingId = newMapping.id;
      console.log(`[publish-approved-games] ✅ Upserted mapping: ${mappingId}`);
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

    // Game type normalization map (SINGULAR FORMS)
    const typeNormalizationMap: Record<string, string> = {
      'fill_blank': 'fill_blanks',
      'match_column': 'match_column',      // Singular form
      'match_columns': 'match_column',     // Backward compatibility
      'match_pair': 'match_pair',          // SINGULAR (standardized)
      'match_pairs': 'match_pair',         // Backward compatibility -> normalize to singular
      'drag_drop': 'drag_drop_sequence',
      'mcq': 'mcq',
      'true_false': 'true_false',
      'line_matching': 'line_matching',
      'card_memory': 'card_memory',
      'typing_race': 'typing_race',
      'drag_drop_blanks': 'drag_drop_blanks',
      'drag_drop_sequence': 'drag_drop_sequence',
      'interactive_blanks': 'interactive_blanks',
    };

    // Valid exercise types (from enum) - SINGULAR FORMS ONLY
    const validExerciseTypes = [
      'mcq', 'true_false', 'fill_blanks', 'match_pair', 'match_column',
      'drag_drop_sequence', 'line_matching', 'card_memory', 'typing_race',
      'drag_drop_blanks', 'interactive_blanks'
    ];

    // Step 3: Get current max game_order
    const { data: maxOrderResult } = await supabase
      .from('gamified_exercises')
      .select('game_order')
      .eq('topic_content_id', mappingId)
      .order('game_order', { ascending: false })
      .limit(1);

    let nextOrder = maxOrderResult && maxOrderResult.length > 0 ? maxOrderResult[0].game_order + 1 : 1;

    // Step 4: Insert games (with idempotency check)
    let inserted = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const game of approvedGames) {
      try {
        const gameData = game.game_data;
        
        // Normalize game_type
        const normalizedType = typeNormalizationMap[game.game_type] || game.game_type;
        
        // Validate normalized type is supported
        if (!validExerciseTypes.includes(normalizedType)) {
          console.error(`[publish-approved-games] Unsupported game_type: ${game.game_type} (normalized: ${normalizedType})`);
          errors.push({ 
            lesson_id: game.id, 
            error: `Unsupported game_type: ${game.game_type}. Must be one of: ${validExerciseTypes.join(', ')}` 
          });
          continue;
        }
        
        console.log(`[publish-approved-games] Normalized ${game.game_type} -> ${normalizedType}`);
        const exerciseType = normalizedType;
        
        const questionText = gameData.question || gameData.question_text || '';
        
        // Check if this game already exists (idempotency check)
        const { data: existingGames, error: checkError } = await supabase
          .from('gamified_exercises')
          .select('id')
          .eq('topic_content_id', mappingId)
          .eq('exercise_type', exerciseType);
        
        if (checkError) {
          console.error(`[publish-approved-games] Error checking for existing games:`, checkError);
          errors.push({ lesson_id: game.id, error: checkError.message });
          continue;
        }
        
        // Check if question already exists by comparing question text
        const isDuplicate = existingGames?.some(existing => {
          // For manual comparison, we'd need to fetch full data
          // For now, rely on database trigger for text-based dedup
          return false; // Let database trigger handle text comparison
        });
        
        if (isDuplicate) {
          console.log(`[publish-approved-games] Skipping duplicate game (text match)`);
          skipped++;
          continue;
        }
        
        const exerciseData = {
          ...gameData,
          question: questionText,
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
          // Check if it's a duplicate error (23505 = unique violation or prevented by trigger)
          if (insertError.code === '23505' || insertError.message?.includes('Duplicate')) {
            console.log(`[publish-approved-games] ✅ Skipping duplicate game (caught by constraint/trigger)`);
            skipped++;
          } else {
            console.error(`[publish-approved-games] ❌ Error inserting game:`, insertError);
            errors.push({ lesson_id: game.id, error: insertError.message });
          }
        } else {
          console.log(`[publish-approved-games] ✅ Inserted game at order ${nextOrder}`);
          inserted++;
          nextOrder++;
        }
      } catch (err: any) {
        console.error(`[publish-approved-games] ❌ Unexpected error:`, err);
        errors.push({ lesson_id: game.id, error: err.message });
      }
    }

    console.log(`[publish-approved-games] Complete: ${inserted} inserted, ${skipped} skipped, ${errors.length} errors`);

    // Determine response status and message
    let statusCode = 200;
    let message = '';
    
    if (inserted > 0) {
      message = `Published ${inserted} game(s)${skipped > 0 ? `, skipped ${skipped} duplicate(s)` : ''}${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`;
    } else if (skipped > 0 && errors.length === 0) {
      message = `All ${skipped} game(s) already published (duplicates)`;
    } else if (errors.length > 0 && inserted === 0) {
      statusCode = 400;
      message = `0 published; ${errors.length} error(s) - see details`;
    } else {
      message = 'Nothing to publish';
    }

    return new Response(
      JSON.stringify({
        success: statusCode === 200,
        inserted,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        message
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[publish-approved-games] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
