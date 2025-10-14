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

    const { data: profile } = await supabase
      .from('profiles')
      .select('exam_domain, student_class')
      .eq('id', user.id)
      .single();

    const body = await req.json();
    const { action, xp_amount, activity_type, share_id } = body;

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
      console.log('=== XP AWARD REQUEST ===');
      console.log('User ID:', user.id);
      console.log('Activity Type:', activity_type);
      console.log('Share ID:', share_id);
      console.log('XP Amount:', xp_amount);
      console.log('Timestamp:', new Date().toISOString());

      // SOCIAL SHARE LOGIC - Idempotent and correct
      if (activity_type === 'social_share') {
        // Step 1: Check if this share_id was already awarded XP
        if (share_id) {
          const { data: existingShare } = await supabase
            .from('daily_attendance')
            .select('share_id, xp_awarded, last_share_date')
            .eq('share_id', share_id)
            .maybeSingle();

          if (existingShare) {
            if (existingShare.xp_awarded === true) {
              // Already fully processed - idempotent success
              console.log('✅ Share already processed (xp_awarded=true):', share_id);
              return new Response(
                JSON.stringify({ 
                  success: true,
                  xp_awarded: true,
                  reason: 'already_processed',
                  message: 'This share has already been credited'
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else {
              // xp_awarded=false means stuck/pending - proceed to award
              console.log('⚠️ Share exists but not awarded (xp_awarded=false), proceeding to award:', share_id);
            }
          }
        }

        // Step 2: Check 24h cooldown (only if no share_id or share doesn't exist yet)
        const { data: recentShares } = await supabase
          .from('daily_attendance')
          .select('last_share_date, share_id')
          .eq('student_id', user.id)
          .eq('xp_awarded', true)
          .order('last_share_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentShares?.last_share_date) {
          const lastShareTime = new Date(recentShares.last_share_date).getTime();
          const now = new Date().getTime();
          const hoursSinceLastShare = (now - lastShareTime) / (1000 * 60 * 60);

          if (hoursSinceLastShare < 24) {
            console.log(`❌ Cooldown active: ${Math.ceil(24 - hoursSinceLastShare)} hours remaining`);
            return new Response(
              JSON.stringify({ 
                success: false,
                xp_awarded: false,
                reason: 'cooldown',
                message: `Please wait ${Math.ceil(24 - hoursSinceLastShare)} hours before sharing again`,
                hours_remaining: Math.ceil(24 - hoursSinceLastShare)
              }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // Validate XP amount
      if (!xp_amount || xp_amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid XP amount' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 3: Award XP - update student_gamification
      const { data: existingData } = await supabase
        .from('student_gamification')
        .select('*')
        .eq('student_id', user.id)
        .maybeSingle();

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
      }

      const { data: gamificationData, error: gamificationError } = await supabase
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

      if (gamificationError) {
        console.error('❌ Error updating student_gamification:', gamificationError);
        throw gamificationError;
      }

      // Step 4: Update daily_attendance for social_share (mark xp_awarded=true)
      if (activity_type === 'social_share' && share_id) {
        const { error: attendanceError } = await supabase
          .from('daily_attendance')
          .upsert({
            student_id: user.id,
            date: today,
            share_id: share_id,
            xp_awarded: true,
            social_share_done: true,
            last_share_date: today,
            social_share_at: new Date().toISOString(),
            xp_earned: xp_amount,
          }, { 
            onConflict: 'share_id',
            ignoreDuplicates: false 
          });

        if (attendanceError) {
          console.error('❌ Error updating daily_attendance:', attendanceError);
          // Non-fatal: XP was awarded, attendance tracking is secondary
        } else {
          console.log('✅ Updated daily_attendance: xp_awarded=true for share_id:', share_id);
        }
      }

      console.log('=== XP AWARD SUCCESS ===');
      console.log('New Total XP:', gamificationData.total_xp);
      console.log('New Level:', gamificationData.level);
      console.log('Social Share XP:', gamificationData.social_share_xp);
      console.log('Streak Days:', gamificationData.current_streak_days);

      return new Response(
        JSON.stringify({ 
          success: true, 
          xp_awarded: true,
          reason: 'awarded',
          data: {
            xp: gamificationData.total_xp,
            level: gamificationData.level,
            streak_days: gamificationData.current_streak_days,
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
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        xp_awarded: false,
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
