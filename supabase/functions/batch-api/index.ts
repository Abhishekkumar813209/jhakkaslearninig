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
    const batchId = last !== 'batch-api' ? last : undefined

    switch (req.method) {
      case 'GET':
        if (batchId) {
          // Get single batch with student count
          const { data: batch, error: batchError } = await supabase
            .from('batches')
            .select(`
              *,
              current_strength,
              profiles:profiles!batch_id(count)
            `)
            .eq('id', batchId)
            .maybeSingle()

          if (batchError) {
            return new Response(
              JSON.stringify({ error: batchError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          if (!batch) {
            return new Response(
              JSON.stringify({ error: 'Batch not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ batch }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Get all batches with actual student counts from profiles table
          const { data: batches, error } = await supabase
            .from('batches')
            .select(`
              *
            `)
            .order('created_at', { ascending: false })

          if (error) {
            console.log(error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // For each batch, get the actual student count from profiles table
          const processedBatches = await Promise.all(
            (batches || []).map(async (batch) => {
              // Count actual students assigned to this batch
              const { data: studentProfiles, error: countError } = await supabase
                .from('profiles')
                .select('id')
                .eq('batch_id', batch.id)

              const actualStudentCount = studentProfiles?.length || 0

              // Get average score from student_analytics for students in this batch
              const { data: analytics } = await supabase
                .from('student_analytics')
                .select('average_score')
                .in('student_id', studentProfiles?.map(p => p.id) || [])

              const avgScore = analytics?.length > 0 
                ? Math.round(analytics.reduce((sum, a) => sum + (a.average_score || 0), 0) / analytics.length)
                : 0

              return {
                ...batch,
                student_count: actualStudentCount,
                avg_score: avgScore
              }
            })
          )

          // Calculate total students across all batches
          const totalStudents = processedBatches.reduce((sum, batch) => sum + batch.student_count, 0)
          
          // Calculate average performance across all batches
          const totalAvgScore = processedBatches.length > 0
            ? Math.round(processedBatches.reduce((sum, batch) => sum + batch.avg_score, 0) / processedBatches.length)
            : 0

          return new Response(
            JSON.stringify({ 
              batches: processedBatches,
              totalStudents,
              avgPerformance: totalAvgScore
            }),
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
        console.log('Creating batch with data:', body)

        // Get current user to set as instructor
        const { data: userData, error: userErr } = await authedClient.auth.getUser(token)
        if (userErr || !userData?.user) {
          console.error('User authentication error:', userErr)
          return new Response(
            JSON.stringify({ error: 'Invalid user token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Prepare batch data
        const batchData = {
          name: body.name,
          description: body.description || '',
          level: body.level,
          start_date: body.start_date,
          end_date: body.end_date,
          max_capacity: body.max_capacity || 50,
          current_strength: 0,
          instructor_id: userData.user.id,
          is_active: body.is_active !== false
        }

        console.log('Inserting batch data:', batchData)

        const { data: newBatch, error: createError } = await authedClient
          .from('batches')
          .insert([batchData])
          .select()
          .single()

        if (createError) {
          console.error('Batch creation error:', createError)
          return new Response(
            JSON.stringify({ 
              error: createError.message,
              details: createError.details,
              hint: createError.hint 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Batch created successfully:', newBatch)
        return new Response(
          JSON.stringify({ batch: newBatch, success: true }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'PUT':
        // Handle batch updates
        if (!batchId) {
          return new Response(
            JSON.stringify({ error: 'Batch ID required for updates' }),
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
        
        const { data: updatedBatch, error: updateError } = await updateClient
          .from('batches')
          .update({
            name: updateBody.name,
            description: updateBody.description,
            level: updateBody.level,
            start_date: updateBody.start_date,
            end_date: updateBody.end_date,
            max_capacity: updateBody.max_capacity,
            is_active: updateBody.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', batchId)
          .select()
          .single()

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ batch: updatedBatch, success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'DELETE':
        // Handle batch deletion
        if (!batchId) {
          return new Response(
            JSON.stringify({ error: 'Batch ID required for deletion' }),
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

        // Check if batch has students assigned and reassign them to null
        const { data: studentsInBatch, error: studentsError } = await deleteClient
          .from('profiles')
          .select('id')
          .eq('batch_id', batchId)

        if (studentsError) {
          console.log(studentsError)
          return new Response(
            JSON.stringify({ error: studentsError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // If there are students in this batch, reassign them to null (no batch)
        if (studentsInBatch && studentsInBatch.length > 0) {
          const { error: reassignError } = await deleteClient
            .from('profiles')
            .update({ batch_id: null })
            .eq('batch_id', batchId)

          if (reassignError) {
            console.log(reassignError)
            return new Response(
              JSON.stringify({ error: 'Failed to reassign students: ' + reassignError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        const { error: deleteError } = await deleteClient
          .from('batches')
          .delete()
          .eq('id', batchId)

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Batch deleted successfully' }),
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