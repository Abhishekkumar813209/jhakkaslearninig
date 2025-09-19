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
        const authHeader = req.headers.get('authorization')
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Set auth header for user context
        supabase.auth.setAuth(authHeader.replace('Bearer ', ''))

        const body = await req.json()
        const { data: newCourse, error: createError } = await supabase
          .from('courses')
          .insert([body])
          .select()
          .single()

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ course: newCourse }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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