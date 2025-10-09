import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const raceType = url.searchParams.get('race_type') || 'class';
    const userId = url.searchParams.get('user_id');
    const limit = 15; // Top 15 racers

    if (!userId) {
      throw new Error('user_id is required');
    }

    // Get user's profile to determine their context
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    let racingData: any = {};

    switch (raceType) {
      case 'class':
        // Class racing: Same class + exam_domain
        const { data: classRacers, error: classError } = await supabase
          .from('student_gamification')
          .select(`
            student_id,
            total_xp,
            level,
            profiles!inner (
              full_name,
              avatar_url,
              student_class,
              exam_domain,
              batch_id,
              batches (name)
            )
          `)
          .eq('profiles.student_class', userProfile.student_class)
          .eq('profiles.exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100); // Get more for context

        if (classError) throw classError;

        racingData = processRacingData(classRacers || [], userId, limit);
        racingData.title = `Class ${userProfile.student_class} Racing`;
        racingData.description = `${userProfile.exam_domain?.toUpperCase()} students competing`;
        break;

      case 'batch':
        // Batch racing: Same batch
        if (!userProfile.batch_id) {
          racingData = { title: 'Batch Racing', description: 'No batch assigned', racers: [], userPosition: null };
          break;
        }

        const { data: batchRacers, error: batchError } = await supabase
          .from('student_gamification')
          .select(`
            student_id,
            total_xp,
            level,
            profiles!inner (
              full_name,
              avatar_url,
              student_class,
              exam_domain,
              batch_id,
              batches (name)
            )
          `)
          .eq('profiles.batch_id', userProfile.batch_id)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (batchError) throw batchError;

        racingData = processRacingData(batchRacers || [], userId, limit);
        racingData.title = `${userProfile.batches?.name || 'Batch'} Racing`;
        racingData.description = 'Batch members competing';
        break;

      case 'school':
        // School racing: Same school + class + exam_domain
        if (!userProfile.school_id) {
          racingData = { title: 'School Racing', description: 'No school assigned', racers: [], userPosition: null };
          break;
        }

        const { data: schoolRacers, error: schoolError } = await supabase
          .from('student_gamification')
          .select(`
            student_id,
            total_xp,
            level,
            profiles!inner (
              full_name,
              avatar_url,
              student_class,
              exam_domain,
              school_id
            )
          `)
          .eq('profiles.school_id', userProfile.school_id)
          .eq('profiles.student_class', userProfile.student_class)
          .eq('profiles.exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (schoolError) throw schoolError;

        racingData = processRacingData(schoolRacers || [], userId, limit);
        racingData.title = 'School Racing';
        racingData.description = `Class ${userProfile.student_class} at your school`;
        break;

      case 'zone':
        // Zone racing: Same zone + class + exam_domain
        if (!userProfile.zone_id) {
          racingData = { title: 'Zone Racing', description: 'No zone assigned', racers: [], userPosition: null };
          break;
        }

        const { data: zoneRacers, error: zoneError } = await supabase
          .from('student_gamification')
          .select(`
            student_id,
            total_xp,
            level,
            profiles!inner (
              full_name,
              avatar_url,
              student_class,
              exam_domain,
              zone_id
            )
          `)
          .eq('profiles.zone_id', userProfile.zone_id)
          .eq('profiles.student_class', userProfile.student_class)
          .eq('profiles.exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (zoneError) throw zoneError;

        racingData = processRacingData(zoneRacers || [], userId, limit);
        racingData.title = 'Zone Racing';
        racingData.description = `Class ${userProfile.student_class} in your zone`;
        break;

      case 'overall':
        // Overall racing: Same class + exam_domain (nationwide)
        const { data: overallRacers, error: overallError } = await supabase
          .from('student_gamification')
          .select(`
            student_id,
            total_xp,
            level,
            profiles!inner (
              full_name,
              avatar_url,
              student_class,
              exam_domain
            )
          `)
          .eq('profiles.student_class', userProfile.student_class)
          .eq('profiles.exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (overallError) throw overallError;

        racingData = processRacingData(overallRacers || [], userId, limit);
        racingData.title = 'Overall Racing';
        racingData.description = `All Class ${userProfile.student_class} ${userProfile.exam_domain?.toUpperCase()} students`;
        break;

      default:
        throw new Error('Invalid race type');
    }

    console.log(`Live racing data fetched for ${raceType}:`, racingData);

    return new Response(JSON.stringify({
      success: true,
      data: racingData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in live-racing function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function processRacingData(racers: any[], userId: string, topLimit: number) {
  // Add positions
  const racersWithPositions = racers.map((racer, index) => ({
    position: index + 1,
    student_id: racer.student_id,
    name: racer.profiles?.full_name || 'Student',
    avatar: racer.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${racer.student_id}`,
    total_xp: racer.total_xp || 0,
    level: racer.level || 1,
    class: racer.profiles?.student_class,
    batch: racer.profiles?.batches?.name,
  }));

  // Get top racers
  const topRacers = racersWithPositions.slice(0, topLimit);

  // Find user's position
  const userIndex = racersWithPositions.findIndex(r => r.student_id === userId);
  const userPosition = userIndex !== -1 ? racersWithPositions[userIndex] : null;

  // Get nearby racers (±5 around user)
  let nearbyRacers: any[] = [];
  if (userPosition && userIndex >= topLimit) {
    const start = Math.max(0, userIndex - 5);
    const end = Math.min(racersWithPositions.length, userIndex + 6);
    nearbyRacers = racersWithPositions.slice(start, end);
  }

  // Calculate gaps
  const leaderXP = racersWithPositions[0]?.total_xp || 0;
  const gapFromLeader = userPosition ? leaderXP - userPosition.total_xp : 0;

  return {
    topRacers,
    userPosition,
    nearbyRacers,
    totalRacers: racersWithPositions.length,
    gapFromLeader,
    leaderXP,
  };
}
