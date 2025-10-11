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
    let raceType = url.searchParams.get('race_type');
    let userId = url.searchParams.get('user_id');

    // Fallback to body if not in URL params
    if (!raceType || !userId) {
      try {
        const body = await req.json();
        raceType = body.race_type || raceType || 'class';
        userId = body.user_id || userId;
      } catch (e) {
        console.log('No body data, using URL params only');
        raceType = raceType || 'class';
      }
    }

    if (!userId) {
      throw new Error('user_id is required');
    }

    const limit = 15; // Top 15 racers

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
        // Class racing: Same exam_domain + exam_name + class
        let classQuery = supabase
          .from('student_gamification')
          .select(`
            student_id,
            total_xp,
            level,
            exam_domain,
            exam_name,
            student_class,
            profiles!inner (
              full_name,
              avatar_url,
              student_class,
              exam_domain,
              target_exam,
              batch_id,
              batches (name)
            )
          `)
          .eq('exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100); // Get more for context

        if (userProfile.target_exam) {
          classQuery = classQuery.eq('exam_name', userProfile.target_exam);
        }
        if (userProfile.student_class) {
          classQuery = classQuery.eq('student_class', userProfile.student_class);
        }

        const { data: classRacers, error: classError } = await classQuery;

        if (classError) throw classError;

        racingData = processRacingData(classRacers || [], userId, limit);
        const classTitle = userProfile.student_class ? `Class ${userProfile.student_class}` : userProfile.target_exam;
        racingData.title = `${classTitle} Racing`;
        racingData.description = `${userProfile.exam_domain?.toUpperCase()} - ${userProfile.target_exam || 'All Students'}`;
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
            exam_domain,
            exam_name,
            student_class,
            profiles!inner (
              full_name,
              avatar_url,
              student_class,
              exam_domain,
              target_exam,
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

        let schoolQuery = supabase
          .from('student_gamification')
          .select(`
            student_id,
            total_xp,
            level,
            exam_domain,
            exam_name,
            student_class,
            profiles!inner (
              full_name,
              avatar_url,
              student_class,
              exam_domain,
              target_exam,
              school_id
            )
          `)
          .eq('profiles.school_id', userProfile.school_id)
          .eq('exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (userProfile.target_exam) {
          schoolQuery = schoolQuery.eq('exam_name', userProfile.target_exam);
        }
        if (userProfile.student_class) {
          schoolQuery = schoolQuery.eq('student_class', userProfile.student_class);
        }

        const { data: schoolRacers, error: schoolError } = await schoolQuery;

        if (schoolError) throw schoolError;

        racingData = processRacingData(schoolRacers || [], userId, limit);
        racingData.title = 'School Racing';
        const schoolDesc = userProfile.student_class ? `Class ${userProfile.student_class}` : userProfile.target_exam;
        racingData.description = `${schoolDesc} at your school - ${userProfile.exam_domain?.toUpperCase()}`;
        break;

      case 'zone':
        // Zone racing: Same zone + class + exam_domain
        if (!userProfile.zone_id) {
          racingData = { title: 'Zone Racing', description: 'No zone assigned', racers: [], userPosition: null };
          break;
        }

        let zoneQuery = supabase
          .from('student_gamification')
          .select(`
            student_id,
            total_xp,
            level,
            exam_domain,
            exam_name,
            student_class,
            profiles!inner (
              full_name,
              avatar_url,
              student_class,
              exam_domain,
              target_exam,
              zone_id
            )
          `)
          .eq('profiles.zone_id', userProfile.zone_id)
          .eq('exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (userProfile.target_exam) {
          zoneQuery = zoneQuery.eq('exam_name', userProfile.target_exam);
        }
        if (userProfile.student_class) {
          zoneQuery = zoneQuery.eq('student_class', userProfile.student_class);
        }

        const { data: zoneRacers, error: zoneError } = await zoneQuery;

        if (zoneError) throw zoneError;

        racingData = processRacingData(zoneRacers || [], userId, limit);
        racingData.title = 'Zone Racing';
        const zoneDesc = userProfile.student_class ? `Class ${userProfile.student_class}` : userProfile.target_exam;
        racingData.description = `${zoneDesc} in your zone - ${userProfile.exam_domain?.toUpperCase()}`;
        break;

      case 'overall':
        // Overall racing: Same exam_domain + exam_name + class (nationwide)
        let overallQuery = supabase
          .from('student_gamification')
          .select(`
            student_id,
            total_xp,
            level,
            exam_domain,
            exam_name,
            student_class,
            profiles!inner (
              full_name,
              avatar_url,
              student_class,
              exam_domain,
              target_exam
            )
          `)
          .eq('exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (userProfile.target_exam) {
          overallQuery = overallQuery.eq('exam_name', userProfile.target_exam);
        }
        if (userProfile.student_class) {
          overallQuery = overallQuery.eq('student_class', userProfile.student_class);
        }

        const { data: overallRacers, error: overallError } = await overallQuery;

        if (overallError) throw overallError;

        racingData = processRacingData(overallRacers || [], userId, limit);
        racingData.title = 'Overall Racing';
        const overallDesc = userProfile.student_class ? `Class ${userProfile.student_class}` : userProfile.target_exam;
        racingData.description = `All ${overallDesc} ${userProfile.exam_domain?.toUpperCase()} students`;
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
  // Add positions and extract profile data properly
  const racersWithPositions = racers.map((racer, index) => {
    // Handle nested profiles structure - could be array or object
    const profileData = Array.isArray(racer.profiles) ? racer.profiles[0] : racer.profiles;
    const batchData = profileData?.batches ? (Array.isArray(profileData.batches) ? profileData.batches[0] : profileData.batches) : null;
    
    return {
      position: index + 1,
      student_id: racer.student_id,
      name: profileData?.full_name || 'Unknown Student',
      avatar: profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${racer.student_id}`,
      total_xp: racer.total_xp || 0,
      level: racer.level || 1,
      class: profileData?.student_class,
      batch: batchData?.name || null,
    };
  });

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
