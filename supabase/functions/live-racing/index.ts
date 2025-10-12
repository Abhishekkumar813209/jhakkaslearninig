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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create service client (for profile lookups without RLS restrictions)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create auth client to get user from request token
    const authSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          'Authorization': req.headers.get('Authorization') || ''
        }
      }
    });

    const url = new URL(req.url);
    let raceType = url.searchParams.get('race_type') || undefined;
    let userId = url.searchParams.get('user_id') || undefined;

    // Try to parse JSON body (ignore errors and empty bodies)
    try {
      const body = await req.json();
      if (body && typeof body === 'object') {
        raceType = (body.race_type as string) ?? raceType;
        userId = (body.user_id as string) ?? userId;
      }
    } catch (_e) {
      // No JSON body provided
    }

    // Fallback to JWT if user_id still missing
    if (!userId) {
      const { data: authData, error: authErr } = await authSupabase.auth.getUser();
      if (authErr) console.log('auth.getUser error', authErr.message);
      userId = authData?.user?.id || userId;
    }

    // Defaults
    raceType = (raceType as string) || 'class';

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'user_id is required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        // Step 1: Query student_gamification
        let classQuery = supabase
          .from('student_gamification')
          .select('student_id, total_xp, level, exam_domain, exam_name, student_class')
          .eq('exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (userProfile.target_exam) {
          classQuery = classQuery.eq('exam_name', userProfile.target_exam);
        }
        if (userProfile.student_class) {
          classQuery = classQuery.eq('student_class', userProfile.student_class);
        }

        const { data: classGamification, error: classError } = await classQuery;
        if (classError) throw classError;

        // Step 2: Get student IDs and fetch profiles
        const classStudentIds = (classGamification || []).map(g => g.student_id);
        console.log(`[class] Fetched ${classStudentIds.length} gamification records`);

        const { data: classProfiles, error: classProfileError } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, student_class')
          .in('id', classStudentIds);

        if (classProfileError) {
          console.error('[class] Error fetching public_profiles:', classProfileError);
          throw classProfileError;
        }
        console.log(`[class] Fetched ${classProfiles?.length || 0} profiles`);

        // Step 3: Optionally fetch batch names
        const classBatchIds = [...new Set((classProfiles || []).map(p => p.batch_id).filter(Boolean))];
        let classBatchMap: Record<string, string> = {};
        if (classBatchIds.length > 0) {
          const { data: classBatches } = await supabase
            .from('batches')
            .select('id, name')
            .in('id', classBatchIds);
          if (classBatches) {
            classBatchMap = Object.fromEntries(classBatches.map(b => [b.id, b.name]));
          }
        }

        // Step 4: Merge and process
        const classProfileMap = Object.fromEntries((classProfiles || []).map(p => [p.id, p]));
        racingData = processRacingDataV2(classGamification || [], userId, limit, classProfileMap, classBatchMap);
        const classTitle = userProfile.student_class ? `Class ${userProfile.student_class}` : userProfile.target_exam;
        racingData.title = `${classTitle} Racing`;
        racingData.description = `${userProfile.exam_domain?.toUpperCase()} - ${userProfile.target_exam || 'All Students'}`;
        break;

      case 'batch':
        // Batch racing: Same batch
        if (!userProfile.batch_id) {
          racingData = { title: 'Batch Racing', description: 'No batch assigned', topRacers: [], userPosition: null, totalRacers: 0 };
          break;
        }

        // Step 1: Get all student IDs in this batch
        const { data: batchProfiles, error: batchProfileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('batch_id', userProfile.batch_id);

        if (batchProfileError) throw batchProfileError;
        const batchStudentIds = (batchProfiles || []).map(p => p.id);
        console.log(`[batch] Found ${batchStudentIds.length} students in batch`);

        if (batchStudentIds.length === 0) {
          racingData = { title: 'Batch Racing', description: 'No students in batch', topRacers: [], userPosition: null, totalRacers: 0 };
          break;
        }

        // Step 2: Query student_gamification for these IDs
        const { data: batchGamification, error: batchGamError } = await supabase
          .from('student_gamification')
          .select('student_id, total_xp, level, exam_domain, exam_name, student_class')
          .in('student_id', batchStudentIds)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (batchGamError) throw batchGamError;
        console.log(`[batch] Fetched ${batchGamification?.length || 0} gamification records`);

        // Step 3: Fetch full profiles for the gamification records
        const batchGamStudentIds = (batchGamification || []).map(g => g.student_id);
        const { data: batchFullProfiles, error: batchFullProfileError } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, student_class')
          .in('id', batchGamStudentIds);

        if (batchFullProfileError) {
          console.error('[batch] Error fetching public_profiles:', batchFullProfileError);
          throw batchFullProfileError;
        }

        // Fetch batch name
        const { data: batchData } = await supabase
          .from('batches')
          .select('name')
          .eq('id', userProfile.batch_id)
          .maybeSingle();

        const batchProfileMap = Object.fromEntries((batchFullProfiles || []).map(p => [p.id, p]));
        const batchMap = batchData ? { [userProfile.batch_id]: batchData.name } : {};
        racingData = processRacingDataV2(batchGamification || [], userId, limit, batchProfileMap, batchMap);
        racingData.title = `${batchData?.name || 'Batch'} Racing`;
        racingData.description = 'Batch members competing';
        break;

      case 'school':
        // School racing: Same school + class + exam_domain
        if (!userProfile.school_id) {
          racingData = { title: 'School Racing', description: 'No school assigned', topRacers: [], userPosition: null, totalRacers: 0 };
          break;
        }

        // Step 1: Get all student IDs in this school
        const { data: schoolProfiles, error: schoolProfileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('school_id', userProfile.school_id);

        if (schoolProfileError) throw schoolProfileError;
        const schoolStudentIds = (schoolProfiles || []).map(p => p.id);
        console.log(`[school] Found ${schoolStudentIds.length} students in school`);

        if (schoolStudentIds.length === 0) {
          racingData = { title: 'School Racing', description: 'No students in school', topRacers: [], userPosition: null, totalRacers: 0 };
          break;
        }

        // Step 2: Query student_gamification for these IDs with filters
        let schoolGamQuery = supabase
          .from('student_gamification')
          .select('student_id, total_xp, level, exam_domain, exam_name, student_class')
          .in('student_id', schoolStudentIds)
          .eq('exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (userProfile.target_exam) {
          schoolGamQuery = schoolGamQuery.eq('exam_name', userProfile.target_exam);
        }
        if (userProfile.student_class) {
          schoolGamQuery = schoolGamQuery.eq('student_class', userProfile.student_class);
        }

        const { data: schoolGamification, error: schoolGamError } = await schoolGamQuery;
        if (schoolGamError) throw schoolGamError;
        console.log(`[school] Fetched ${schoolGamification?.length || 0} gamification records`);

        // Step 3: Fetch full profiles
        const schoolGamStudentIds = (schoolGamification || []).map(g => g.student_id);
        const { data: schoolFullProfiles, error: schoolFullProfileError } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, student_class')
          .in('id', schoolGamStudentIds);

        if (schoolFullProfileError) {
          console.error('[school] Error fetching public_profiles:', schoolFullProfileError);
          throw schoolFullProfileError;
        }

        const schoolProfileMap = Object.fromEntries((schoolFullProfiles || []).map(p => [p.id, p]));
        racingData = processRacingDataV2(schoolGamification || [], userId, limit, schoolProfileMap, {});
        racingData.title = 'School Racing';
        const schoolDesc = userProfile.student_class ? `Class ${userProfile.student_class}` : userProfile.target_exam;
        racingData.description = `${schoolDesc} at your school - ${userProfile.exam_domain?.toUpperCase()}`;
        break;

      case 'zone':
        // Zone racing: Same zone + class + exam_domain
        if (!userProfile.zone_id) {
          racingData = { title: 'Zone Racing', description: 'No zone assigned', topRacers: [], userPosition: null, totalRacers: 0 };
          break;
        }

        // Step 1: Get all student IDs in this zone
        const { data: zoneProfiles, error: zoneProfileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('zone_id', userProfile.zone_id);

        if (zoneProfileError) throw zoneProfileError;
        const zoneStudentIds = (zoneProfiles || []).map(p => p.id);
        console.log(`[zone] Found ${zoneStudentIds.length} students in zone`);

        if (zoneStudentIds.length === 0) {
          racingData = { title: 'Zone Racing', description: 'No students in zone', topRacers: [], userPosition: null, totalRacers: 0 };
          break;
        }

        // Step 2: Query student_gamification for these IDs with filters
        let zoneGamQuery = supabase
          .from('student_gamification')
          .select('student_id, total_xp, level, exam_domain, exam_name, student_class')
          .in('student_id', zoneStudentIds)
          .eq('exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (userProfile.target_exam) {
          zoneGamQuery = zoneGamQuery.eq('exam_name', userProfile.target_exam);
        }
        if (userProfile.student_class) {
          zoneGamQuery = zoneGamQuery.eq('student_class', userProfile.student_class);
        }

        const { data: zoneGamification, error: zoneGamError } = await zoneGamQuery;
        if (zoneGamError) throw zoneGamError;
        console.log(`[zone] Fetched ${zoneGamification?.length || 0} gamification records`);

        // Step 3: Fetch full profiles
        const zoneGamStudentIds = (zoneGamification || []).map(g => g.student_id);
        const { data: zoneFullProfiles, error: zoneFullProfileError } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, student_class')
          .in('id', zoneGamStudentIds);

        if (zoneFullProfileError) {
          console.error('[zone] Error fetching public_profiles:', zoneFullProfileError);
          throw zoneFullProfileError;
        }

        const zoneProfileMap = Object.fromEntries((zoneFullProfiles || []).map(p => [p.id, p]));
        racingData = processRacingDataV2(zoneGamification || [], userId, limit, zoneProfileMap, {});
        racingData.title = 'Zone Racing';
        const zoneDesc = userProfile.student_class ? `Class ${userProfile.student_class}` : userProfile.target_exam;
        racingData.description = `${zoneDesc} in your zone - ${userProfile.exam_domain?.toUpperCase()}`;
        break;

      case 'overall':
        // Overall racing: Same exam_domain + exam_name + class (nationwide)
        let overallQuery = supabase
          .from('student_gamification')
          .select('student_id, total_xp, level, exam_domain, exam_name, student_class')
          .eq('exam_domain', userProfile.exam_domain)
          .order('total_xp', { ascending: false })
          .limit(100);

        if (userProfile.target_exam) {
          overallQuery = overallQuery.eq('exam_name', userProfile.target_exam);
        }
        if (userProfile.student_class) {
          overallQuery = overallQuery.eq('student_class', userProfile.student_class);
        }

        const { data: overallGamification, error: overallError } = await overallQuery;
        if (overallError) throw overallError;

        const overallStudentIds = (overallGamification || []).map(g => g.student_id);
        console.log(`[overall] Fetched ${overallStudentIds.length} gamification records`);

        const { data: overallProfiles, error: overallProfileError } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, student_class')
          .in('id', overallStudentIds);

        if (overallProfileError) {
          console.error('[overall] Error fetching public_profiles:', overallProfileError);
          throw overallProfileError;
        }
        console.log(`[overall] Fetched ${overallProfiles?.length || 0} profiles`);

        const overallProfileMap = Object.fromEntries((overallProfiles || []).map(p => [p.id, p]));
        racingData = processRacingDataV2(overallGamification || [], userId, limit, overallProfileMap, {});
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

function processRacingDataV2(
  gamificationRecords: any[],
  userId: string,
  topLimit: number,
  profileMap: Record<string, any>,
  batchMap: Record<string, string>
) {
  // Merge gamification data with profile data
  const racersWithPositions = gamificationRecords.map((gam, index) => {
    const profile = profileMap[gam.student_id] || {};
    const batchName = profile.batch_id ? batchMap[profile.batch_id] : null;

    return {
      position: index + 1,
      student_id: gam.student_id,
      name: profile.full_name || 'Unknown Student',
      avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${gam.student_id}`,
      total_xp: gam.total_xp || 0,
      level: gam.level || 1,
      class: profile.student_class,
      batch: batchName || null,
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
