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
    const studentId = url.pathname.split('/').pop()
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    supabase.auth.setAuth(authHeader.replace('Bearer ', ''))

    switch (req.method) {
      case 'GET':
        if (studentId && studentId !== 'student-management') {
          // Get single student with analytics
          const { data: student, error } = await supabase
            .from('profiles')
            .select(`
              *,
              user_roles!inner (role),
              batches (name, level, instructor_id),
              enrollments (
                id, progress, enrolled_at, is_completed,
                courses (title, subject)
              ),
              test_attempts (
                id, score, percentage, created_at,
                tests (title, total_marks)
              ),
              student_analytics (
                tests_attempted, average_score, streak_days,
                total_study_time_minutes, overall_rank, batch_rank
              )
            `)
            .eq('id', studentId)
            .eq('user_roles.role', 'student')
            .single()

          if (error) {
            return new Response(
              JSON.stringify({ error: 'Student not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ student }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Get all students with pagination and filters
          const page = parseInt(url.searchParams.get('page') || '1')
          const limit = parseInt(url.searchParams.get('limit') || '10')
          const search = url.searchParams.get('search') || ''
          const batchId = url.searchParams.get('batchId')
          const status = url.searchParams.get('status')

          let query = supabase
            .from('profiles')
            .select(`
              *,
              user_roles!inner (role),
              batches (name, level),
              student_analytics (
                tests_attempted, average_score, streak_days,
                overall_rank, batch_rank
              )
            `, { count: 'exact' })
            .eq('user_roles.role', 'student')
            .order('created_at', { ascending: false })

          if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
          }

          if (batchId) {
            query = query.eq('batch_id', batchId)
          }

          const from = (page - 1) * limit
          const to = from + limit - 1

          const { data: students, error, count } = await query.range(from, to)

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ 
              students,
              pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'PUT':
        if (!studentId || studentId === 'student-management') {
          return new Response(
            JSON.stringify({ error: 'Student ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const updateBody = await req.json()
        
        // Handle batch assignment separately
        if (updateBody.batch_id) {
          // Update batch assignment
          const { data: updatedStudent, error: updateError } = await supabase
            .from('profiles')
            .update({ batch_id: updateBody.batch_id })
            .eq('id', studentId)
            .select(`
              *,
              batches (name, level)
            `)
            .single()

          if (updateError) {
            return new Response(
              JSON.stringify({ error: updateError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ 
              message: 'Student batch updated successfully',
              student: updatedStudent 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Regular profile update
        const { data: updatedStudent, error: updateError } = await supabase
          .from('profiles')
          .update(updateBody)
          .eq('id', studentId)
          .select()
          .single()

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ student: updatedStudent }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'DELETE':
        if (!studentId || studentId === 'student-management') {
          return new Response(
            JSON.stringify({ error: 'Student ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Delete user from auth (this will cascade delete profile via trigger)
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(studentId)

        if (authDeleteError) {
          return new Response(
            JSON.stringify({ error: authDeleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ message: 'Student deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Student management error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})