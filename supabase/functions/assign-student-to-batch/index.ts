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

    const { studentId, batchId, roadmapId } = await req.json()

    console.log('Assigning student to batch:', { studentId, batchId, roadmapId })

    // Update student's batch
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ batch_id: batchId })
      .eq('id', studentId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      throw profileError
    }

    // Create student_roadmap entry if roadmapId provided
    if (roadmapId) {
      const { error: roadmapError } = await supabaseAdmin
        .from('student_roadmaps')
        .insert({
          student_id: studentId,
          batch_roadmap_id: roadmapId,
          current_chapter_index: 0
        })

      if (roadmapError && roadmapError.code !== '23505') { // Ignore duplicate error
        console.error('Roadmap assignment error:', roadmapError)
        throw roadmapError
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Student assigned successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
