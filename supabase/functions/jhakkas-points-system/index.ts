import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, xp_amount, activity_type } = body;

    if (action === 'get') {
      const { data, error } = await supabase
        .from('student_gamification')
        .select('*')
        .eq('student_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Jhakkas Points:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const xpData = data || { total_xp: 0, level: 1, streak_days: 0 };
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            xp: xpData.total_xp || 0,
            level: xpData.level || 1,
            streak_days: xpData.streak_days || 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'add') {
      if (!xp_amount || xp_amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid XP amount' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existingData } = await supabase
        .from('student_gamification')
        .select('*')
        .eq('student_id', user.id)
        .single();

      let currentXP = existingData?.total_xp || 0;
      let currentLevel = existingData?.level || 1;
      let streakDays = existingData?.streak_days || 0;
      let lastActiveDate = existingData?.last_active_date;

      const newXP = currentXP + xp_amount;

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      if (lastActiveDate === yesterday) {
        streakDays += 1;
      } else if (lastActiveDate !== today) {
        streakDays = 1;
      }

      while (newXP >= currentLevel * 100) {
        currentLevel += 1;
      }

      const updateData: any = {
        total_xp: newXP,
        level: currentLevel,
        streak_days: streakDays,
        last_active_date: today,
      };

      if (activity_type === 'attendance') {
        updateData.daily_attendance_xp = (existingData?.daily_attendance_xp || 0) + xp_amount;
      } else if (activity_type === 'social_share') {
        updateData.social_share_xp = (existingData?.social_share_xp || 0) + xp_amount;
      } else if (activity_type === 'referral') {
        updateData.referral_xp = (existingData?.referral_xp || 0) + xp_amount;
      }

      const { data, error } = await supabase
        .from('student_gamification')
        .upsert(
          {
            student_id: user.id,
            ...updateData,
          },
          { onConflict: 'student_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Error updating Jhakkas Points:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            xp: data.total_xp,
            level: data.level,
            streak_days: data.streak_days,
            xp_earned: xp_amount
          },
          message: `Earned ${xp_amount} Jhakkas Points!`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'leaderboard') {
      const { data, error } = await supabase
        .from('student_gamification')
        .select(`
          student_id,
          total_xp,
          level,
          streak_days,
          profiles!inner (
            full_name,
            avatar_url
          )
        `)
        .order('total_xp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});