import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const segments = url.pathname.split('/').filter(Boolean)
    const last = segments[segments.length - 1]
    const courseId = last !== 'courses-api' ? last : undefined

    switch (req.method) {
      case 'GET':
        if (courseId) {
          // Get single course (avoid relational selects to prevent FK/column issues)
          const { data: baseCourse, error: courseError } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .eq('is_published', true)
            .maybeSingle()

          if (courseError || !baseCourse) {
            return new Response(
              JSON.stringify({ error: 'Course not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Fetch related videos separately
          const { data: videos, error: videosError } = await supabase
            .from('videos')
            .select('id, title, duration_seconds, order_num')
            .eq('course_id', courseId)
            .eq('is_published', true)
            .order('order_num', { ascending: true })

          // Fetch related tests separately
          const { data: tests, error: testsError } = await supabase
            .from('tests')
            .select('id, title, total_marks, duration_minutes')
            .eq('course_id', courseId)
            .eq('is_published', true)
            .order('created_at', { ascending: true })

          if (videosError) console.error('Error fetching videos for course', courseId, videosError)
          if (testsError) console.error('Error fetching tests for course', courseId, testsError)

          const course = {
            ...baseCourse,
            videos: videos ?? [],
            tests: tests ?? [],
          }

          return new Response(
            JSON.stringify({ course }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Get all courses
          const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false })

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ courses }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'POST':
        // Accept user token from standard Authorization header
        const userAuthHeader = req.headers.get('authorization')
        if (!userAuthHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const token = userAuthHeader.startsWith('Bearer ')
          ? userAuthHeader.slice(7)
          : userAuthHeader

        // Create a client that forwards the user JWT so RLS uses auth.uid()
        const authedClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: `Bearer ${token}` } } }
        )

        const body = await req.json().catch(() => ({}))
        console.log('Creating course with data:', body)

        // Get current user to set as instructor
        const { data: userData, error: userErr } = await authedClient.auth.getUser(token)
        if (userErr || !userData?.user) {
          console.error('User authentication error:', userErr)
          return new Response(
            JSON.stringify({ error: 'Invalid user token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Prepare course data
        const courseData = {
          title: body.title,
          description: body.description,
          subject: body.subject,
          level: body.level || 'beginner',
          price: body.price || 0,
          thumbnail: body.thumbnail || '',
          instructor_id: userData.user.id,
          is_published: false,
          enrollment_count: 0,
          rating: 0,
          duration_hours: 0,
          is_paid: (body.price || 0) > 0,
          total_videos: 0,
          tags: body.tags || []
        }

        console.log('Inserting course data:', courseData)

        const { data: newCourse, error: createError } = await authedClient
          .from('courses')
          .insert([courseData])
          .select()
          .single()

        if (createError) {
          console.error('Course creation error:', createError)
          return new Response(
            JSON.stringify({ 
              error: createError.message,
              details: createError.details,
              hint: createError.hint 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Course created successfully:', newCourse)
        return new Response(
          JSON.stringify({ course: newCourse, success: true }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'PUT':
        // Handle course updates
        if (!courseId) {
          return new Response(
            JSON.stringify({ error: 'Course ID required for updates' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const updateAuthHeader = req.headers.get('authorization')
        if (!updateAuthHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const updateToken = updateAuthHeader.startsWith('Bearer ')
          ? updateAuthHeader.slice(7)
          : updateAuthHeader

        const updateClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: `Bearer ${updateToken}` } } }
        )

        const updateBody = await req.json().catch(() => ({}))
        
        const { data: updatedCourse, error: updateError } = await updateClient
          .from('courses')
          .update({
            title: updateBody.title,
            description: updateBody.description,
            subject: updateBody.subject,
            level: updateBody.level,
            price: updateBody.price,
            thumbnail: updateBody.thumbnail,
            is_published: updateBody.is_published,
            updated_at: new Date().toISOString()
          })
          .eq('id', courseId)
          .select()
          .single()

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ course: updatedCourse, success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'DELETE':
        // Handle course deletion
        if (!courseId) {
          return new Response(
            JSON.stringify({ error: 'Course ID required for deletion' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const deleteAuthHeader = req.headers.get('authorization')
        if (!deleteAuthHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const deleteToken = deleteAuthHeader.startsWith('Bearer ')
          ? deleteAuthHeader.slice(7)
          : deleteAuthHeader

        const deleteClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: `Bearer ${deleteToken}` } } }
        )

        const { error: deleteError } = await deleteClient
          .from('courses')
          .delete()
          .eq('id', courseId)

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Course deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Courses API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})