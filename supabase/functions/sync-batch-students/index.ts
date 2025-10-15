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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { batchId } = await req.json()

    console.log('🔄 Syncing students for batch:', batchId)

    // Get batch details
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('id, name, linked_roadmap_id, auto_assign_roadmap')
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      throw new Error('Batch not found')
    }

    if (!batch.linked_roadmap_id) {
      throw new Error('Batch has no linked roadmap')
    }

    if (!batch.auto_assign_roadmap) {
      throw new Error('Auto-assign is disabled for this batch')
    }

    // Get all students in this batch
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('batch_id', batchId)

    if (studentsError) {
      throw studentsError
    }

    const studentIds = students?.map(s => s.id) || []

    console.log(`📊 Found ${studentIds.length} students to sync`)

    // Deactivate old roadmap entries
    const { error: deactivateError } = await supabaseAdmin
      .from('student_roadmaps')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .in('student_id', studentIds)
      .neq('batch_roadmap_id', batch.linked_roadmap_id)
      .eq('is_active', true)

    if (deactivateError) {
      console.error('Error deactivating old roadmaps:', deactivateError)
    }

    // Insert or reactivate correct roadmap entries
    const upsertData = studentIds.map(studentId => ({
      student_id: studentId,
      batch_roadmap_id: batch.linked_roadmap_id,
      status: 'not_started' as const,
      progress: 0,
      is_active: true
    }))

    const { data: syncedRoadmaps, error: syncError } = await supabaseAdmin
      .from('student_roadmaps')
      .upsert(upsertData, {
        onConflict: 'student_id,batch_roadmap_id',
        ignoreDuplicates: false
      })
      .select()

    if (syncError) {
      throw syncError
    }

    console.log(`✅ Synced ${syncedRoadmaps?.length || 0} students successfully`)

    return new Response(
      JSON.stringify({ 
        success: true,
        updated_count: syncedRoadmaps?.length || 0,
        batch_name: batch.name,
        student_ids: studentIds
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error syncing students:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})