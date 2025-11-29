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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Generate request ID for tracking
    const requestId = crypto?.randomUUID?.() ?? Date.now().toString();
    
    // Defensive body parsing - read body as text first
    let bodyText = '';
    try {
      bodyText = await req.text();
    } catch (e) {
      console.error('[parent-portal]', requestId, 'Failed to read body:', e);
    }

    // Parse JSON safely
    let requestBody: any = {};
    try {
      requestBody = bodyText ? JSON.parse(bodyText) : {};
    } catch (e) {
      console.error('[parent-portal]', requestId, 'JSON parse error:', e, 'raw:', bodyText.substring(0, 100));
      requestBody = {};
    }

    const action = requestBody?.action;
    const studentId = requestBody?.studentId;

    console.log('[parent-portal]', requestId, 'Request:', {
      method: req.method,
      contentType: req.headers.get('content-type'),
      bodyLength: bodyText.length,
      action,
      studentId,
      userId: user.id
    });

    switch (action) {
      case 'getLinkedStudents': {
        // Fetch all students linked to this parent
        const { data: links, error: linksError } = await supabase
          .from('parent_student_links')
          .select(`
            student_id,
            relationship,
            is_primary_contact,
            profiles:student_id (
              id,
              full_name,
              email,
              avatar_url,
              student_class,
              batch_id
            )
          `)
          .eq('parent_id', user.id);

        if (linksError) throw linksError;

        return new Response(
          JSON.stringify({ students: links }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getTopicWiseAnalysis': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!link) throw new Error('Unauthorized access to student');

        // Fetch topic analytics grouped by subject
        const { data: topicAnalytics } = await supabase
          .from('student_topic_analytics')
          .select('*')
          .eq('student_id', studentId)
          .order('subject', { ascending: true })
          .order('average_score', { ascending: false });

        // Group by subject
        const subjectGroups = (topicAnalytics || []).reduce((acc: any, topic: any) => {
          if (!acc[topic.subject]) {
            acc[topic.subject] = [];
          }
          acc[topic.subject].push(topic);
          return acc;
        }, {});

        return new Response(
          JSON.stringify({ topicAnalytics: subjectGroups }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getWeeklyProgressReport': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!link) throw new Error('Unauthorized access to student');

        // Get last 4 weeks of daily targets
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const { data: weeklyData } = await supabase
          .from('student_daily_targets')
          .select('*')
          .eq('student_id', studentId)
          .gte('date', fourWeeksAgo.toISOString().split('T')[0])
          .order('date', { ascending: true });

        // Get test attempts for same period
        const { data: testsData } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('student_id', studentId)
          .gte('submitted_at', fourWeeksAgo.toISOString())
          .in('status', ['submitted', 'auto_submitted'])
          .order('submitted_at', { ascending: true });

        return new Response(
          JSON.stringify({ weeklyData, testsData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getDailyTargetsStatus': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!link) throw new Error('Unauthorized access to student');

        // Get last 30 days of targets
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: dailyTargets } = await supabase
          .from('student_daily_targets')
          .select('*')
          .eq('student_id', studentId)
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: false });

        return new Response(
          JSON.stringify({ dailyTargets }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getZoneStatus': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .maybeSingle();

        if (!link) throw new Error('Unauthorized access to student');

        // Calculate zone if not exists or outdated (> 1 hour)
        const { data: existingZone } = await supabase
          .from('student_zone_status')
          .select('*')
          .eq('student_id', studentId)
          .maybeSingle();

        console.log('[parent-portal] getZoneStatus:', { studentId, hadExisting: !!existingZone });

        const now = new Date();
        const shouldRecalculate = !existingZone || 
          (new Date(now.getTime() - new Date(existingZone.calculated_at).getTime()).getTime() > 3600000);

        if (shouldRecalculate) {
          // Recalculate zone
          await supabase.rpc('calculate_student_zone', {
            p_student_id: studentId
          });

          // Fetch updated zone with maybeSingle to handle missing rows
          const { data: zoneStatus } = await supabase
            .from('student_zone_status')
            .select('*')
            .eq('student_id', studentId)
            .maybeSingle();

          return new Response(
            JSON.stringify({ zoneStatus }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ zoneStatus: existingZone }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getStudentProgress': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access to this student
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!link) throw new Error('Unauthorized access to student');

        // Fetch student analytics
        let { data: analytics } = await supabase
          .from('student_analytics')
          .select('*')
          .eq('student_id', studentId)
          .single();

        // If rankings are missing but student has taken tests, recalculate
        if (analytics && !analytics.overall_rank && analytics.tests_attempted > 0) {
          console.log('Rankings missing for student with tests, recalculating...');
          await supabase.rpc('calculate_zone_rankings');
          
          // Re-fetch analytics
          const { data: updatedAnalytics } = await supabase
            .from('student_analytics')
            .select('*')
            .eq('student_id', studentId)
            .single();
          
          analytics = updatedAnalytics;
        }

        // Fetch subject analytics
        const { data: subjectAnalytics } = await supabase
          .from('subject_analytics')
          .select('*')
          .eq('student_id', studentId)
          .order('average_score', { ascending: false });

        // Fetch recent test attempts
        const { data: recentTests } = await supabase
          .from('test_attempts')
          .select(`
            id,
            score,
            percentage,
            submitted_at,
            test:test_id (
              title,
              subject,
              total_marks
            )
          `)
          .eq('student_id', studentId)
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false })
          .limit(5);

        return new Response(
          JSON.stringify({
            analytics,
            subjectAnalytics,
            recentTests
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getStudentActivity': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!link) throw new Error('Unauthorized access to student');

        // Fetch attendance records (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: attendance } = await supabase
          .from('daily_attendance')
          .select('*')
          .eq('student_id', studentId)
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: false });

        // Fetch gamification data
        const { data: gamification } = await supabase
          .from('student_gamification')
          .select('*')
          .eq('student_id', studentId)
          .single();

        // Fetch achievements
        const { data: achievements } = await supabase
          .from('achievements')
          .select(`
            id,
            achievement_type,
            achieved_at,
            score,
            subject
          `)
          .eq('student_id', studentId)
          .order('achieved_at', { ascending: false })
          .limit(10);

        return new Response(
          JSON.stringify({
            attendance,
            gamification,
            achievements
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getFeeSummary': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!link) throw new Error('Unauthorized access to student');

        // Fetch fee records
        const { data: feeRecords } = await supabase
          .from('fee_records')
          .select('*')
          .eq('student_id', studentId)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(12);

        // Fetch pending fees
        const { data: pendingFees } = await supabase
          .from('fee_records')
          .select('*')
          .eq('student_id', studentId)
          .eq('is_paid', false)
          .order('due_date', { ascending: true });

        return new Response(
          JSON.stringify({
            feeRecords,
            pendingFees
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getSubjectChapterTestAnalysis': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!link) throw new Error('Unauthorized access to student');

        // Fetch all test attempts with test details
        const { data: testAttempts } = await supabase
          .from('test_attempts')
          .select(`
            id,
            score,
            percentage,
            submitted_at,
            test:test_id (
              id,
              title,
              subject,
              total_marks
            )
          `)
          .eq('student_id', studentId)
          .in('status', ['submitted', 'auto_submitted'])
          .order('submitted_at', { ascending: false });

        // Group by subject
        const grouped = (testAttempts || []).reduce((acc: any, attempt: any) => {
          const subject = attempt.test?.subject || 'General';
          if (!acc[subject]) acc[subject] = [];
          
          acc[subject].push({
            test_id: attempt.test?.id,
            test_title: attempt.test?.title,
            score: attempt.score,
            total_marks: attempt.test?.total_marks,
            percentage: attempt.percentage,
            submitted_at: attempt.submitted_at,
            passed: attempt.percentage >= 60
          });
          
          return acc;
        }, {});

        return new Response(
          JSON.stringify({ testAnalysis: grouped }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getRoadmapDailyProgress': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!link) throw new Error('Unauthorized access to student');

        // Get student's active roadmap
        const { data: studentRoadmap } = await supabase
          .from('student_roadmaps')
          .select('batch_roadmap_id')
          .eq('student_id', studentId)
          .eq('is_active', true)
          .maybeSingle();

        if (!studentRoadmap) {
          return new Response(
            JSON.stringify({ dailyProgress: {} }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get roadmap details with start date
        const { data: roadmapDetails } = await supabase
          .from('batch_roadmaps')
          .select('start_date, end_date')
          .eq('id', studentRoadmap.batch_roadmap_id)
          .single();

        if (!roadmapDetails) {
          return new Response(
            JSON.stringify({ dailyProgress: {} }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get all chapters for this roadmap
        const { data: chapters } = await supabase
          .from('roadmap_chapters')
          .select('id')
          .eq('roadmap_id', studentRoadmap.batch_roadmap_id);

        if (!chapters || chapters.length === 0) {
          return new Response(
            JSON.stringify({ dailyProgress: {} }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const chapterIds = chapters.map(c => c.id);

        // Get all topics from these chapters
        const { data: roadmapTopics } = await supabase
          .from('roadmap_topics')
          .select(`
            id,
            topic_name,
            day_number,
            subject,
            chapter:chapter_id (
              chapter_name,
              subject
            )
          `)
          .in('chapter_id', chapterIds)
          .order('day_number', { ascending: true });

        const uniqueSubjects = [...new Set((roadmapTopics || []).map((t: any) => t.subject || t.chapter?.subject).filter(Boolean))];
        console.log(`[getRoadmapDailyProgress] Found ${roadmapTopics?.length || 0} topics`);
        console.log(`[getRoadmapDailyProgress] Unique subjects:`, uniqueSubjects);

        if (!roadmapTopics || roadmapTopics.length === 0) {
          return new Response(
            JSON.stringify({ dailyProgress: {} }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get completion status for all topics (including game totals)
        const topicIds = roadmapTopics.map(t => t.id);
        
        // Get game progress data
        const { data: completionData } = await supabase
          .from('student_topic_game_progress')
          .select('topic_id, is_completed, last_accessed_at, completed_game_ids')
          .eq('student_id', studentId)
          .in('topic_id', topicIds);
        
        // Get topic status (includes game_completion_rate and total_games)
        const { data: statusData } = await supabase
          .from('student_topic_status')
          .select('topic_id, game_completion_rate, total_games')
          .eq('student_id', studentId)
          .in('topic_id', topicIds);

        // Create completion map
        const completionMap = new Map(
          (completionData || []).map(c => [c.topic_id, c])
        );
        
        // Create status map
        const statusMap = new Map(
          (statusData || []).map(s => [s.topic_id, s])
        );

        // Build daily progress with dates
        const roadmapStart = new Date(roadmapDetails.start_date);
        const dailyProgress = roadmapTopics.map((topic: any) => {
          const completion = completionMap.get(topic.id);
          const status = statusMap.get(topic.id);
          const scheduledDate = new Date(roadmapStart);
          scheduledDate.setDate(scheduledDate.getDate() + (topic.day_number - 1));

          const subjectName = topic.subject || topic.chapter?.subject || 'General';

          return {
            date: scheduledDate.toISOString().split('T')[0],
            day_number: topic.day_number,
            subject: subjectName,
            chapter: topic.chapter?.chapter_name || 'Unknown',
            topic_name: topic.topic_name,
            is_completed: completion?.is_completed || false,
            completed_at: completion?.last_accessed_at || null,
            games_completed: completion?.completed_game_ids?.length || 0,
            total_games: status?.total_games || 0,
            game_completion_rate: status?.game_completion_rate || 0
          };
        });

        // Group by date then subject
        const groupedByDate = dailyProgress.reduce((acc: any, entry: any) => {
          if (!acc[entry.date]) acc[entry.date] = {};
          if (!acc[entry.date][entry.subject]) acc[entry.date][entry.subject] = [];
          acc[entry.date][entry.subject].push(entry);
          return acc;
        }, {});

        return new Response(
          JSON.stringify({ dailyProgress: groupedByDate }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getChapterTestCompletion': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access
        const { data: linkCheck } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!linkCheck) throw new Error('Unauthorized access to student');

        // Get all test attempts for this student with chapter info
        const { data: attempts, error: attemptsError } = await supabase
          .from('test_attempts')
          .select(`
            test_id,
            status,
            tests!inner (
              id,
              title,
              subject
            )
          `)
          .eq('student_id', studentId)
          .in('status', ['submitted', 'auto_submitted']);

        if (attemptsError) {
          console.error('Error fetching test attempts:', attemptsError);
          throw attemptsError;
        }

        // For each test, find the chapter_id via questions->topic->chapter AND centralized tests via chapter_library_id
        const chapterCompletionMap: Record<string, number> = {};
        
        if (attempts && attempts.length > 0) {
          const testIds = attempts.map(a => a.test_id);
          
          // METHOD 1: Old batch-specific tests (via questions->topic->chapter)
          const { data: questions } = await supabase
            .from('questions')
            .select(`
              test_id,
              topic_id,
              roadmap_topics!inner (
                chapter_id
              )
            `)
            .in('test_id', testIds)
            .not('topic_id', 'is', null);

          // Build map of test_id -> chapter_id (old method)
          const testToChapterMap: Record<string, Set<string>> = {};
          (questions || []).forEach((q: any) => {
            const chapterId = q.roadmap_topics?.chapter_id;
            if (chapterId) {
              if (!testToChapterMap[q.test_id]) {
                testToChapterMap[q.test_id] = new Set();
              }
              testToChapterMap[q.test_id].add(chapterId);
            }
          });

          // METHOD 2: New centralized tests (via tests.chapter_library_id -> roadmap_chapters.chapter_library_id)
          const { data: centralizedTests } = await supabase
            .from('tests')
            .select('id, chapter_library_id, is_centralized')
            .in('id', testIds)
            .eq('is_centralized', true)
            .not('chapter_library_id', 'is', null);

          console.log('[getChapterTestCompletion] Found centralized tests:', centralizedTests?.length || 0);

          // Get roadmap chapters to map chapter_library_id -> roadmap_chapter.id
          if (centralizedTests && centralizedTests.length > 0) {
            const { data: roadmapChapters } = await supabase
              .from('roadmap_chapters')
              .select('id, chapter_library_id')
              .eq('roadmap_id', studentRoadmap.batch_roadmap_id)
              .not('chapter_library_id', 'is', null);

            console.log('[getChapterTestCompletion] Roadmap chapters with library links:', roadmapChapters?.length || 0);

            // Build map of chapter_library_id -> roadmap_chapter.id
            const libraryToChapterMap: Record<string, string> = {};
            (roadmapChapters || []).forEach((rc: any) => {
              if (rc.chapter_library_id) {
                libraryToChapterMap[rc.chapter_library_id] = rc.id;
              }
            });

            // Add centralized tests to the testToChapterMap
            centralizedTests.forEach((test: any) => {
              const roadmapChapterId = libraryToChapterMap[test.chapter_library_id];
              if (roadmapChapterId) {
                if (!testToChapterMap[test.id]) {
                  testToChapterMap[test.id] = new Set();
                }
                testToChapterMap[test.id].add(roadmapChapterId);
                console.log(`[getChapterTestCompletion] Linked centralized test ${test.id} to chapter ${roadmapChapterId}`);
              }
            });
          }

          // Count tests per chapter (merged from both old and new methods)
          attempts.forEach(attempt => {
            const chapterIds = testToChapterMap[attempt.test_id];
            if (chapterIds) {
              chapterIds.forEach(chapterId => {
                chapterCompletionMap[chapterId] = (chapterCompletionMap[chapterId] || 0) + 1;
              });
            }
          });
        }

        console.log('Chapter completion map:', chapterCompletionMap);

        return new Response(
          JSON.stringify({ chapterCompletion: chapterCompletionMap }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getRoadmapCalendarView': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!link) throw new Error('Unauthorized access to student');

        // Get student's active roadmap
        const { data: studentRoadmap } = await supabase
          .from('student_roadmaps')
          .select('batch_roadmap_id')
          .eq('student_id', studentId)
          .eq('is_active', true)
          .maybeSingle();

        if (!studentRoadmap) {
          return new Response(
            JSON.stringify({ 
              startDate: new Date().toISOString(),
              totalDays: 0,
              subjectsData: []
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get roadmap details
        const { data: roadmapDetails } = await supabase
          .from('batch_roadmaps')
          .select('start_date, end_date, total_days')
          .eq('id', studentRoadmap.batch_roadmap_id)
          .single();

        if (!roadmapDetails) {
          return new Response(
            JSON.stringify({ 
              startDate: new Date().toISOString(),
              totalDays: 0,
              subjectsData: []
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get all chapters with topics
        const { data: chapters } = await supabase
          .from('roadmap_chapters')
          .select(`
            id,
            chapter_name,
            subject,
            day_start,
            day_end,
            estimated_days
          `)
          .eq('roadmap_id', studentRoadmap.batch_roadmap_id)
          .order('day_start', { ascending: true });

        if (!chapters || chapters.length === 0) {
          return new Response(
            JSON.stringify({ 
              startDate: roadmapDetails.start_date,
              totalDays: roadmapDetails.total_days || 0,
              subjectsData: []
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check for student-specific custom chapter days
        const { data: customDays } = await supabase
          .from('student_chapter_custom_days')
          .select('chapter_id, custom_days')
          .eq('student_id', studentId);

        const customDaysMap = new Map(
          (customDays || []).map(cd => [cd.chapter_id, cd.custom_days])
        );

        // Check for student-specific chapter orders
        const { data: customChapterOrders } = await supabase
          .from('student_chapter_order')
          .select('*')
          .eq('student_id', studentId)
          .eq('roadmap_id', studentRoadmap.batch_roadmap_id);

        // Apply custom chapter order and recalculate days if exists
        let processedChapters = chapters;
        if (customChapterOrders && customChapterOrders.length > 0) {
          console.log(`[getRoadmapCalendarView] Applying custom chapter orders for ${customChapterOrders.length} subjects`);
          
          // Group chapters by subject
          const chaptersBySubject = chapters.reduce((acc: any, ch: any) => {
            if (!acc[ch.subject]) acc[ch.subject] = [];
            acc[ch.subject].push(ch);
            return acc;
          }, {});

          // Apply custom order per subject
          processedChapters = [];
          for (const [subject, subjectChapters] of Object.entries(chaptersBySubject)) {
            const customOrder = customChapterOrders.find(co => co.subject === subject);
            
            if (customOrder && customOrder.chapter_order) {
              // Reorder chapters based on student's preference
              let currentDay = 1;
              const orderedChapters: any[] = [];
              
              customOrder.chapter_order.forEach((chapterId: string) => {
                const chapter = (subjectChapters as any[]).find((c: any) => c.id === chapterId);
                if (chapter) {
                  // Use custom days if available, otherwise estimated_days
                  const days = customDaysMap.get(chapter.id) || chapter.estimated_days || 3;
                  // Recalculate day_start and day_end for student's custom order
                  orderedChapters.push({
                    ...chapter,
                    day_start: currentDay,
                    day_end: currentDay + days - 1
                  });
                  currentDay += days;
                }
              });
              
              // Add any chapters not in custom order (safety check)
              (subjectChapters as any[]).forEach((c: any) => {
                if (!customOrder.chapter_order.includes(c.id)) {
                  const days = customDaysMap.get(c.id) || c.estimated_days || 3;
                  orderedChapters.push({
                    ...c,
                    day_start: currentDay,
                    day_end: currentDay + days - 1
                  });
                  currentDay += days;
                }
              });
              
              processedChapters.push(...orderedChapters);
            } else {
              // No custom order for this subject, keep original
              processedChapters.push(...(subjectChapters as any[]));
            }
          }
        }

        const chapterIds = processedChapters.map(c => c.id);

        // Get all topics for these chapters
        const { data: topics } = await supabase
          .from('roadmap_topics')
          .select('id, topic_name, chapter_id, day_number')
          .in('chapter_id', chapterIds)
          .order('day_number', { ascending: true });

        // Get topic completion status
        const topicIds = (topics || []).map(t => t.id);
        const { data: completionData } = await supabase
          .from('student_topic_status')
          .select('topic_id, status, game_completion_rate, games_completed, total_games')
          .eq('student_id', studentId)
          .in('topic_id', topicIds);

        const completionMap = new Map(
          (completionData || []).map(c => [c.topic_id, {
            status: c.status || 'grey',
            game_completion_rate: c.game_completion_rate || 0,
            games_completed: c.games_completed || 0,
            total_games: c.total_games || 0
          }])
        );

        // Group topics by chapter
        const topicsByChapter = (topics || []).reduce((acc: any, topic: any) => {
          if (!acc[topic.chapter_id]) acc[topic.chapter_id] = [];
          const completion = completionMap.get(topic.id);
          acc[topic.chapter_id].push({
            id: topic.id,
            topic_name: topic.topic_name,
            day_number: topic.day_number,
            status: completion?.status || 'grey',
            progress_percentage: completion?.game_completion_rate || 0,
            games_completed: completion?.games_completed || 0,
            total_games: completion?.total_games || 0
          });
          return acc;
        }, {});

        // Calculate chapter progress with auto-distributed topics
        const chaptersWithTopics = processedChapters.map((chapter: any) => {
          const chapterTopics = topicsByChapter[chapter.id] || [];
          const chapterDays = (chapter.day_end - chapter.day_start + 1);
          
          // Auto-distribute topics evenly across chapter days
          const topicsWithDistributedDays = chapterTopics.map((topic: any, index: number) => {
            const topicsPerDay = Math.max(1, Math.ceil(chapterTopics.length / chapterDays));
            const assignedDay = chapter.day_start + Math.floor(index / topicsPerDay);
            
            return {
              ...topic,
              day_number: assignedDay // Override with calculated day
            };
          });
          
          // Fix completion calculation - use game_completion_rate >= 70 instead of status
          const completedTopics = topicsWithDistributedDays.filter((t: any) => 
            t.progress_percentage >= 70
          ).length;
          const totalTopics = topicsWithDistributedDays.length;
          
          return {
            id: chapter.id,
            chapter_name: chapter.chapter_name,
            subject: chapter.subject,
            day_start: chapter.day_start,
            day_end: chapter.day_end,
            progress: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
            topics: topicsWithDistributedDays
          };
        });

        // Group by subject
        const subjectMap = chaptersWithTopics.reduce((acc: any, chapter: any) => {
          if (!acc[chapter.subject]) {
            acc[chapter.subject] = {
              name: chapter.subject,
              chapters: []
            };
          }
          acc[chapter.subject].chapters.push(chapter);
          return acc;
        }, {});

        const subjectsData = Object.values(subjectMap);

        return new Response(
          JSON.stringify({ 
            startDate: roadmapDetails.start_date,
            totalDays: roadmapDetails.total_days || 0,
            subjectsData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getChapterTestProgress': {
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'studentId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify parent has access to this student
        const { data: linkCheck } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .maybeSingle();

        if (!linkCheck) {
          throw new Error('Access denied: Not authorized to view this student');
        }

        // Get student's batch
        const { data: profileData } = await supabase
          .from('profiles')
          .select('batch_id')
          .eq('id', studentId)
          .single();

        if (!profileData?.batch_id) {
          return new Response(
            JSON.stringify({ chapterStatuses: {} }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get student's roadmap
        const { data: roadmap } = await supabase
          .from('batch_roadmaps')
          .select('id')
          .eq('batch_id', profileData.batch_id)
          .maybeSingle();

        if (!roadmap) {
          return new Response(
            JSON.stringify({ chapterStatuses: {} }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get all chapters from roadmap
        const { data: chapters } = await supabase
          .from('roadmap_chapters')
          .select('id, chapter_library_id')
          .eq('roadmap_id', roadmap.id);

        if (!chapters || chapters.length === 0) {
          return new Response(
            JSON.stringify({ chapterStatuses: {} }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // For each chapter, count total and completed tests
        const chapterStatuses: Record<string, { total: number; completed: number }> = {};

        for (const chapter of chapters) {
          // Count total tests assigned for this chapter
          const { data: assignedTests } = await supabase
            .from('batch_tests')
            .select('central_test_id')
            .eq('batch_id', profileData.batch_id);

          if (!assignedTests) continue;

          // Filter tests that belong to this chapter
          const { data: chapterTests } = await supabase
            .from('tests')
            .select('id')
            .eq('chapter_library_id', chapter.chapter_library_id)
            .in('id', assignedTests.map(t => t.central_test_id));

          const totalTests = chapterTests?.length || 0;

          // Count completed tests (student has submitted attempt)
          const testIds = chapterTests?.map(t => t.id) || [];
          const { data: completedAttempts } = await supabase
            .from('test_attempts')
            .select('test_id')
            .eq('student_id', studentId)
            .in('test_id', testIds)
            .in('status', ['submitted', 'auto_submitted']);

          const completedTests = completedAttempts?.length || 0;

          chapterStatuses[chapter.id] = {
            total: totalTests,
            completed: completedTests
          };
        }

        return new Response(
          JSON.stringify({ chapterStatuses }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Parent portal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
