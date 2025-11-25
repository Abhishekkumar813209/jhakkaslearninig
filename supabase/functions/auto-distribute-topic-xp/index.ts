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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { topic_id, force_recalculate = false } = await req.json();

    if (!topic_id) {
      return new Response(JSON.stringify({ error: 'topic_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Get topic difficulty and XP budget
    const { data: topic, error: topicError } = await supabase
      .from('roadmap_topics')
      .select('id, topic_name, difficulty, xp_reward')
      .eq('id', topic_id)
      .single();

    if (topicError || !topic) {
      return new Response(JSON.stringify({ error: 'Topic not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const topicXPBudget = topic.difficulty === 'hard' ? 50 
                        : topic.difficulty === 'medium' ? 40 
                        : 30;

    console.log(`[XP Distribution] Topic "${topic.topic_name}" (${topic.difficulty}) - Budget: ${topicXPBudget} XP`);

    // 2. Get all active assignments for this topic
    const { data: assignments, error: assignError } = await supabase
      .from('batch_question_assignments')
      .select('id, question_id, xp_reward, assignment_order')
      .eq('roadmap_topic_id', topic_id)
      .eq('is_active', true)
      .order('assignment_order');

    if (assignError) throw assignError;

    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No questions assigned to this topic',
        topic_name: topic.topic_name,
        difficulty: topic.difficulty,
        budget: topicXPBudget
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Check for manual overrides
    const hasManualOverrides = assignments.some(a => a.xp_reward !== null);
    if (hasManualOverrides && !force_recalculate) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Topic has manual XP overrides. Use force_recalculate=true to reset.',
        manual_override_count: assignments.filter(a => a.xp_reward !== null).length
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Strict integer distribution algorithm
    const N = assignments.length;
    const base = Math.floor(topicXPBudget / N);
    const remainder = topicXPBudget - (base * N);

    console.log(`[XP Distribution] N=${N}, base=${base}, remainder=${remainder}`);

    // First `remainder` questions get base + 1, rest get base
    const updates = assignments.map((assignment, index) => ({
      id: assignment.id,
      old_xp: assignment.xp_reward,
      new_xp: index < remainder ? base + 1 : base,
      assignment_order: assignment.assignment_order
    }));

    // 5. Verify exact sum
    const totalXP = updates.reduce((sum, u) => sum + u.new_xp, 0);
    if (totalXP !== topicXPBudget) {
      console.error(`[XP Distribution] VALIDATION FAILED: sum=${totalXP}, budget=${topicXPBudget}`);
      throw new Error(`XP distribution failed: sum=${totalXP}, budget=${topicXPBudget}`);
    }

    console.log(`[XP Distribution] ✅ Validation passed: ${totalXP} = ${topicXPBudget}`);

    // 6. Batch update all assignments
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('batch_question_assignments')
        .update({ xp_reward: update.new_xp })
        .eq('id', update.id);

      if (updateError) {
        console.error(`[XP Distribution] Failed to update ${update.id}:`, updateError);
        throw updateError;
      }
    }

    console.log(`[XP Distribution] ✅ Updated ${N} questions successfully`);

    return new Response(JSON.stringify({
      success: true,
      topic_name: topic.topic_name,
      difficulty: topic.difficulty,
      budget: topicXPBudget,
      questions_count: N,
      base_xp: base,
      bonus_questions: remainder,
      distribution: updates,
      verification: {
        expected: topicXPBudget,
        actual: totalXP,
        match: totalXP === topicXPBudget
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in auto-distribute-topic-xp:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
