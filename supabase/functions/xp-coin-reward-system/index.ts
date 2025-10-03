import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, xp_amount, coin_amount, activity_type } = await req.json();

    // GET student XP/Coins
    if (action === 'get') {
      const { data: xpData, error: xpError } = await supabase
        .from('student_xp_coins')
        .select('*')
        .eq('student_id', user.id)
        .single();

      if (xpError) {
        return new Response(JSON.stringify({ error: 'Failed to fetch XP data' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: xpData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ADD XP/Coins reward
    if (action === 'add') {
      if (!xp_amount && !coin_amount) {
        return new Response(JSON.stringify({ error: 'xp_amount or coin_amount required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get current XP/Coins
      const { data: currentData } = await supabase
        .from('student_xp_coins')
        .select('*')
        .eq('student_id', user.id)
        .single();

      if (!currentData) {
        // Create record if doesn't exist
        const { error: createError } = await supabase
          .from('student_xp_coins')
          .insert({
            student_id: user.id,
            total_xp: xp_amount || 0,
            total_coins: coin_amount || 0,
            current_streak_days: 1,
            last_activity_date: new Date().toISOString().split('T')[0]
          });

        if (createError) {
          return new Response(JSON.stringify({ error: 'Failed to create XP record' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          total_xp: xp_amount || 0,
          total_coins: coin_amount || 0,
          level: 1
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newTotalXP = currentData.total_xp + (xp_amount || 0);
      const newTotalCoins = currentData.total_coins + (coin_amount || 0);

      // Calculate level (every 1000 XP = 1 level)
      const newLevel = Math.floor(newTotalXP / 1000) + 1;

      // Check streak
      const today = new Date().toISOString().split('T')[0];
      const lastActivityDate = new Date(currentData.last_activity_date);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreakDays = currentData.current_streak_days;
      let longestStreak = currentData.longest_streak_days;

      if (currentData.last_activity_date === yesterdayStr) {
        // Continuing streak
        newStreakDays += 1;
      } else if (currentData.last_activity_date !== today) {
        // Streak broken
        newStreakDays = 1;
      }
      // If last_activity_date === today, don't increment (same day activity)

      longestStreak = Math.max(longestStreak, newStreakDays);

      // Update XP/Coins
      const { error: updateError } = await supabase
        .from('student_xp_coins')
        .update({
          total_xp: newTotalXP,
          total_coins: newTotalCoins,
          level: newLevel,
          current_streak_days: newStreakDays,
          longest_streak_days: longestStreak,
          last_activity_date: today
        })
        .eq('student_id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update XP' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check for level up
      const leveledUp = newLevel > currentData.level;

      return new Response(JSON.stringify({
        success: true,
        total_xp: newTotalXP,
        total_coins: newTotalCoins,
        level: newLevel,
        leveled_up: leveledUp,
        current_streak: newStreakDays,
        xp_gained: xp_amount || 0,
        coins_gained: coin_amount || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // LEADERBOARD
    if (action === 'leaderboard') {
      const { data: leaderboard, error: leaderboardError } = await supabase
        .from('student_xp_coins')
        .select(`
          student_id,
          total_xp,
          total_coins,
          level,
          current_streak_days,
          profiles!inner(full_name, student_class)
        `)
        .order('total_xp', { ascending: false })
        .limit(100);

      if (leaderboardError) {
        return new Response(JSON.stringify({ error: 'Failed to fetch leaderboard' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        leaderboard
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in xp-coin-reward-system:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
