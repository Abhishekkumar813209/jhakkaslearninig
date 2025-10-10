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

    // Get user's exam domain and class for domain-aware operations
    const { data: profile } = await supabase
      .from('profiles')
      .select('exam_domain, student_class')
      .eq('id', user.id)
      .single();

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

      const xpData = data || { total_xp: 0, level: 1, current_streak_days: 0 };
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            xp: xpData.total_xp || 0,
            level: xpData.level || 1,
            streak_days: xpData.current_streak_days || 0
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
      let streakDays = existingData?.current_streak_days || 0;
      let lastActiveDate = existingData?.last_activity_date;

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
        current_streak_days: streakDays,
        last_activity_date: today,
      };

      if (activity_type === 'attendance') {
        updateData.daily_attendance_xp = (existingData?.daily_attendance_xp || 0) + xp_amount;
      } else if (activity_type === 'social_share') {
        updateData.social_share_xp = (existingData?.social_share_xp || 0) + xp_amount;
      } else if (activity_type === 'referral') {
        updateData.referral_xp = (existingData?.referral_xp || 0) + xp_amount;
      } else if (activity_type === 'theory_read') {
        // Phase 5: Track theory reading XP
        console.log('Theory read XP awarded:', xp_amount);
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
            streak_days: data.current_streak_days,
            xp_earned: xp_amount
          },
          message: `Earned ${xp_amount} Jhakkas Points!`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'leaderboard') {
      let query = supabase
        .from('student_gamification')
        .select(`
          student_id,
          total_xp,
          level,
          current_streak_days,
          exam_domain,
          exam_name,
          student_class,
          profiles!inner (
            full_name,
            avatar_url,
            exam_domain,
            target_exam,
            student_class
          )
        `)
        .order('total_xp', { ascending: false });

      // Filter by domain, exam_name, and class if profile has them
      if (profile?.exam_domain) {
        query = query.eq('exam_domain', profile.exam_domain);
      }
      if (profile?.target_exam) {
        query = query.eq('exam_name', profile.target_exam);
      }
      if (profile?.student_class) {
        query = query.eq('student_class', profile.student_class);
      }

      const { data, error } = await query.limit(100);

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