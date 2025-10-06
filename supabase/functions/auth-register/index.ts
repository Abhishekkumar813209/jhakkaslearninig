import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, full_name, role = 'student', student_class, education_board, exam_domain, exam_name, target_exam } = await req.json()

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and full_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for immediate login
      user_metadata: { full_name, role }
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Profile is automatically created via trigger
    // Set role
    await supabase.from('user_roles').insert({
      user_id: authData.user.id,
      role: role as any
    })

    // Auto-assign to batch if exam domain and name are provided
    let assignedBatchId = null;
    if (exam_domain && exam_name) {
      const { data: batchId, error: batchError } = await supabase.rpc('get_active_intake_batch', {
        p_exam_domain: exam_domain,
        p_exam_name: exam_name,
        p_student_class: student_class || 'general',
        p_signup_date: new Date().toISOString().split('T')[0]
      });

      if (!batchError && batchId) {
        assignedBatchId = batchId;
        console.log(`Auto-assigned student ${authData.user.id} to batch ${batchId}`);
      }
    }

    // Update profile with class, board, exam info and batch assignment
    const profileUpdates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (student_class) profileUpdates.student_class = student_class;
    if (education_board) profileUpdates.education_board = education_board;
    if (exam_domain) profileUpdates.exam_domain = exam_domain;
    if (target_exam) profileUpdates.target_exam = target_exam;
    if (assignedBatchId) profileUpdates.batch_id = assignedBatchId;

    await supabase.from('profiles').update(profileUpdates).eq('id', authData.user.id);

    // If batch has auto-assign roadmap, assign it to student
    if (assignedBatchId) {
      const { data: batch } = await supabase
        .from('batches')
        .select('linked_roadmap_id, auto_assign_roadmap')
        .eq('id', assignedBatchId)
        .maybeSingle();

      if (batch?.auto_assign_roadmap && batch.linked_roadmap_id) {
        await supabase.from('student_roadmaps').insert({
          student_id: authData.user.id,
          batch_roadmap_id: batch.linked_roadmap_id
        });
        console.log(`Auto-assigned roadmap ${batch.linked_roadmap_id} to student ${authData.user.id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'User registered successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})