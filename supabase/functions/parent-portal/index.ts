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

    const { action } = await req.json();

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

      case 'getStudentProgress': {
        const { studentId } = await req.json();
        
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
        const { studentId } = await req.json();
        
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
        const { studentId } = await req.json();
        
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
