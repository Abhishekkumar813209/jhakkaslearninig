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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const courseId = url.searchParams.get('courseId')
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Auth header will be handled automatically by RLS policies
    const { data: { user } } = await supabase.auth.getUser()

    switch (req.method) {
      case 'GET':
        if (courseId) {
          // Get enrollment for specific course
          const { data: enrollment, error } = await supabase
            .from('enrollments')
            .select(`
              *,
              courses (title, instructor_id, total_videos),
              profiles:student_id (full_name, email)
            `)
            .eq('course_id', courseId)
            .eq('student_id', user?.id)
            .single()

          if (error) {
            return new Response(
              JSON.stringify({ error: 'Enrollment not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ enrollment }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Get all enrollments for user
          const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select(`
              *,
              courses (
                id, title, description, thumbnail, subject, level, 
                instructor_id, total_videos, duration_hours,
                profiles:instructor_id (full_name)
              )
            `)
            .eq('student_id', user?.id)
            .order('enrolled_at', { ascending: false })

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ enrollments }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'POST':
        const { course_id } = await req.json()
        
        if (!course_id) {
          return new Response(
            JSON.stringify({ error: 'Course ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if already enrolled
        const { data: existingEnrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', user?.id)
          .eq('course_id', course_id)
          .single()

        if (existingEnrollment) {
          return new Response(
            JSON.stringify({ error: 'Already enrolled in this course' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create enrollment
        const { data: newEnrollment, error: enrollError } = await supabase
          .from('enrollments')
          .insert([{
            student_id: user?.id,
            course_id: course_id,
            enrolled_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (enrollError) {
          return new Response(
            JSON.stringify({ error: enrollError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update course enrollment count
        await supabase.rpc('increment_enrollment_count', { course_id })

        return new Response(
          JSON.stringify({ 
            message: 'Enrolled successfully',
            enrollment: newEnrollment 
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'PUT':
        if (!courseId) {
          return new Response(
            JSON.stringify({ error: 'Course ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const updateBody = await req.json()
        const { data: updatedEnrollment, error: updateError } = await supabase
          .from('enrollments')
          .update(updateBody)
          .eq('student_id', user?.id)
          .eq('course_id', courseId)
          .select()
          .single()

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ enrollment: updatedEnrollment }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Enrollment API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})