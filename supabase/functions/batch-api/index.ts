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

    // Service client to bypass RLS for aggregate counts only
    const service = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const last = segments[segments.length - 1]
    const batchId = last !== 'batch-api' ? last : undefined

    switch (req.method) {
      case 'GET':
        if (batchId) {
          // Get single batch with student count (using service role for counts)
          const { data: batchRow, error: batchError } = await supabase
            .from('batches')
            .select('*')
            .eq('id', batchId)
            .maybeSingle()

          if (batchError) {
            console.log(batchError)
            return new Response(
              JSON.stringify({ error: batchError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          if (!batchRow) {
            return new Response(
              JSON.stringify({ error: 'Batch not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data: studentProfiles, error: countErr } = await service
            .from('profiles')
            .select('id')
            .eq('batch_id', batchId)

          if (countErr) {
            console.log(countErr)
            return new Response(
              JSON.stringify({ error: countErr.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const ids = studentProfiles?.map((p: any) => p.id) || []

          const { data: analytics } = await service
            .from('student_analytics')
            .select('average_score')
            .in('student_id', ids)

          const avgScore = analytics && analytics.length > 0
            ? Math.round(analytics.reduce((sum: number, a: any) => sum + (a.average_score || 0), 0) / analytics.length)
            : 0

          const batch = { ...batchRow, student_count: ids.length, avg_score: avgScore }

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
              // Count actual students assigned to this batch (service role bypasses RLS for aggregate)
              const { data: studentProfiles, error: countError } = await service
                .from('profiles')
                .select('id')
                .eq('batch_id', batch.id)

              if (countError) {
                console.log(countError)
              }

              const actualStudentCount = studentProfiles?.length || 0

              // Get average score from student_analytics for students in this batch
              const { data: analytics } = await service
                .from('student_analytics')
                .select('average_score')
                .in('student_id', studentProfiles?.map((p: any) => p.id) || [])

              const avgScore = analytics && analytics.length > 0
                ? Math.round(analytics.reduce((sum: number, a: any) => sum + (a.average_score || 0), 0) / analytics.length)
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
        // Server-side deterministic batch name generation
        const generateBatchName = async (
          examType: string,
          examName: string,
          targetClass?: string,
          targetBoard?: string,
          year?: number
        ): Promise<string> => {
          const currentYear = year || new Date().getFullYear();
          
          // Count existing batches with matching criteria
          const { count } = await service
            .from('batches')
            .select('*', { count: 'exact', head: true })
            .eq('exam_type', examType)
            .eq('exam_name', examName || '')
            .eq('target_class', targetClass || null)
            .eq('target_board', targetBoard || null)
            .ilike('name', `%${currentYear}%`);

          const batchLetter = String.fromCharCode(65 + (count || 0)); // A, B, C...
          
          if (examType === 'school' && targetClass && targetBoard) {
            return `${targetBoard} Class ${targetClass} - Batch ${batchLetter} (${currentYear})`;
          } else if (targetClass) {
            return `${examName} Class ${targetClass} - Batch ${batchLetter} (${currentYear})`;
          } else {
            return `${examName} - Batch ${batchLetter} (${currentYear})`;
          }
        };

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

        // Calculate intake dates (default 15 days from start_date)
        const startDate = body.start_date || new Date().toISOString().split('T')[0];
        const intakeStart = body.intake_start_date || startDate;
        
        let intakeEnd = body.intake_end_date;
        if (!intakeEnd && intakeStart) {
          const endDate = new Date(intakeStart);
          endDate.setDate(endDate.getDate() + 15); // Default 15 days
          intakeEnd = endDate.toISOString().split('T')[0];
        }

        // Server-side batch name generation (ignore client-provided name)
        const year = new Date(intakeStart).getFullYear();
        const batchName = await generateBatchName(
          body.exam_type,
          body.exam_name,
          body.target_class,
          body.target_board,
          year
        );

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
          name: batchName,
          description: body.description || '',
          level: body.level,
          start_date: startDate,
          end_date: body.end_date,
          max_capacity: body.max_capacity || 50,
          current_strength: 0,
          instructor_id: userData.user.id,
          is_active: body.is_active !== false,
          exam_type: body.exam_type || null,
          exam_name: body.exam_name || null,
          target_class: body.target_class || null,
          target_board: body.target_board || null,
          auto_assign_roadmap: body.auto_assign_roadmap || false,
          linked_roadmap_id: body.linked_roadmap_id || null,
          intake_start_date: intakeStart,
          intake_end_date: intakeEnd,
          is_current_intake: true,
          auto_assign_enabled: body.auto_assign_enabled !== false
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
            linked_roadmap_id: updateBody.linked_roadmap_id,
            auto_assign_roadmap: updateBody.auto_assign_roadmap,
            exam_type: updateBody.exam_type,
            exam_name: updateBody.exam_name,
            target_class: updateBody.target_class,
            target_board: updateBody.target_board,
            intake_start_date: updateBody.intake_start_date,
            intake_end_date: updateBody.intake_end_date,
            is_current_intake: updateBody.is_current_intake,
            auto_assign_enabled: updateBody.auto_assign_enabled,
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
        // Handle batch deletion with proper permission checks
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

        // Get current user and check permissions
        const { data: deleteUser, error: deleteUserErr } = await deleteClient.auth.getUser(deleteToken)
        if (deleteUserErr || !deleteUser?.user) {
          return new Response(
            JSON.stringify({ error: 'Invalid user token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Fetch batch to check instructor
        const { data: batch, error: batchFetchErr } = await service
          .from('batches')
          .select('instructor_id')
          .eq('id', batchId)
          .maybeSingle()

        if (batchFetchErr || !batch) {
          return new Response(
            JSON.stringify({ error: 'Batch not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if user is admin or instructor
        const { data: userRole } = await service
          .from('user_roles')
          .select('role')
          .eq('user_id', deleteUser.user.id)
          .maybeSingle()

        const isAdmin = userRole?.role === 'admin'
        const isInstructor = batch.instructor_id === deleteUser.user.id

        if (!isAdmin && !isInstructor) {
          return new Response(
            JSON.stringify({ error: 'You do not have permission to delete this batch' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check for linked roadmaps before deletion
        const { data: linkedRoadmaps, error: roadmapError } = await service
          .from('batch_roadmaps')
          .select('id, title, description')
          .eq('batch_id', batchId)

        if (roadmapError) {
          console.log('Error checking linked roadmaps:', roadmapError)
          return new Response(
            JSON.stringify({ error: roadmapError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // If roadmaps exist, orphan them instead of deleting
        if (linkedRoadmaps && linkedRoadmaps.length > 0) {
          console.log(`🔗 Found ${linkedRoadmaps.length} roadmap(s) linked to batch. Orphaning them...`)
          
          // Set batch_id to NULL and mark as orphaned
          const { error: orphanError } = await service
            .from('batch_roadmaps')
            .update({ 
              batch_id: null, 
              status: 'orphaned',
            })
            .eq('batch_id', batchId)

          if (orphanError) {
            console.log('Failed to orphan roadmaps:', orphanError)
            return new Response(
              JSON.stringify({ 
                error: 'Failed to orphan roadmaps: ' + orphanError.message 
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          console.log('✅ Roadmaps orphaned successfully')
        }

        // Check if batch has students assigned and reassign them to null
        const { data: studentsInBatch, error: studentsError } = await service
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
          const { error: reassignError } = await service
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

        // Delete using service role since we've already checked permissions
        const { error: deleteError } = await service
          .from('batches')
          .delete()
          .eq('id', batchId)

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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