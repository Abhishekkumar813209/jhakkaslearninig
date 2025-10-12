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

    const requestBody = await req.json();
    const { action, studentId } = requestBody;

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
        // Verify parent has access
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!link) throw new Error('Unauthorized access to student');

        // Calculate zone if not exists or outdated (> 1 hour)
        const { data: existingZone } = await supabase
          .from('student_zone_status')
          .select('*')
          .eq('student_id', studentId)
          .single();

        const now = new Date();
        const shouldRecalculate = !existingZone || 
          (new Date(now.getTime() - new Date(existingZone.calculated_at).getTime()).getTime() > 3600000);

        if (shouldRecalculate) {
          // Recalculate zone
          const { data: zoneColor } = await supabase.rpc('calculate_student_zone', {
            p_student_id: studentId
          });

          // Fetch updated zone
          const { data: zoneStatus } = await supabase
            .from('student_zone_status')
            .select('*')
            .eq('student_id', studentId)
            .single();

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
        // Verify parent has access to this student
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
          .eq('student_id', studentId)
          .single();

        if (!link) throw new Error('Unauthorized access to student');

        // Fetch student analytics
        const { data: analytics } = await supabase
          .from('student_analytics')
          .select('*')
          .eq('student_id', studentId)
          .single();

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
