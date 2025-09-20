import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const url = new URL(req.url)
    const path = url.pathname
    const studentId = path.split('/').filter(Boolean).pop()

    // Get auth token
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set auth for requests that need user context
    const token = authHeader.replace('Bearer ', '')
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
    const { data: { user }, error: userError } = await userSupabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle seeding endpoint
    if (req.method === 'POST' && path.includes('/seed-students')) {
      console.log('Creating 50 students...')
      
      // Get available batches
      const { data: batches } = await supabase
        .from('batches')
        .select('id, name')
        .eq('is_active', true)
        .limit(10)

      if (!batches || batches.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No active batches found. Please create batches first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const createdStudents = []
      const studentNames = [
        'Rahul Sharma', 'Priya Singh', 'Amit Kumar', 'Sneha Patel', 'Ravi Gupta',
        'Anjali Verma', 'Suresh Yadav', 'Kavita Joshi', 'Manoj Tiwari', 'Pooja Agarwal',
        'Vikash Mishra', 'Neha Sharma', 'Deepak Singh', 'Sunita Kumari', 'Rajesh Pandey',
        'Meera Jain', 'Arun Kumar', 'Shruti Saxena', 'Nitin Gupta', 'Rekha Devi',
        'Sanjay Rai', 'Anita Singh', 'Rohit Sharma', 'Kiran Patel', 'Ashish Kumar',
        'Swati Verma', 'Ramesh Yadav', 'Geeta Joshi', 'Vinod Tiwari', 'Mamta Agarwal',
        'Sunil Mishra', 'Rashmi Sharma', 'Narayan Singh', 'Usha Kumari', 'Dinesh Pandey',
        'Seema Jain', 'Lalit Kumar', 'Pushpa Saxena', 'Gopal Gupta', 'Radha Devi',
        'Mahesh Rai', 'Nirmala Singh', 'Pankaj Sharma', 'Sudha Patel', 'Pramod Kumar',
        'Sarita Verma', 'Raghav Yadav', 'Lata Joshi', 'Santosh Tiwari', 'Bharti Agarwal'
      ]

      // Create 50 students
      for (let i = 0; i < 50; i++) {
        try {
          const email = `student${i + 1}@example.com`
          const password = 'student123'
          const name = studentNames[i]
          
          // Create user in auth
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            user_metadata: {
              full_name: name
            }
          })

          if (authError) {
            console.log(`Failed to create user ${email}:`, authError.message)
            continue
          }

          // Wait a bit for trigger to create profile
          await new Promise(resolve => setTimeout(resolve, 100))

          // Assign to batch (round-robin)
          const assignedBatch = batches[i % batches.length]
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ batch_id: assignedBatch.id })
            .eq('id', authUser.user.id)

          if (updateError) {
            console.log(`Failed to assign batch to ${email}:`, updateError.message)
          }

          // Create student role
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({
              user_id: authUser.user.id,
              role: 'student'
            })

          if (roleError) {
            console.log(`Failed to assign role to ${email}:`, roleError.message)
          }

          createdStudents.push({
            id: authUser.user.id,
            email,
            name,
            batch: assignedBatch.name
          })

          console.log(`Created student ${i + 1}/50: ${name} (${email}) -> ${assignedBatch.name}`)
        } catch (err) {
          console.log(`Error creating student ${i + 1}:`, err)
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Created ${createdStudents.length} students`,
          students: createdStudents 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
    console.log(error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})