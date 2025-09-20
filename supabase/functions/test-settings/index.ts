import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { testId, action, settings } = await req.json()

    switch (action) {
      case 'getSettings':
        const { data: test, error } = await supabase
          .from('tests')
          .select('*')
          .eq('id', testId)
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Test not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            settings: {
              duration_minutes: test.duration_minutes,
              passing_marks: test.passing_marks,
              allow_retakes: test.allow_retakes,
              max_attempts: test.max_attempts,
              scheduled_at: test.scheduled_at,
              expires_at: test.expires_at,
              instructions: test.instructions
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'updateSettings':
        const { data: updatedTest, error: updateError } = await supabase
          .from('tests')
          .update({
            duration_minutes: settings.duration_minutes,
            passing_marks: settings.passing_marks,
            allow_retakes: settings.allow_retakes,
            max_attempts: settings.max_attempts,
            scheduled_at: settings.scheduled_at,
            expires_at: settings.expires_at,
            instructions: settings.instructions
          })
          .eq('id', testId)
          .select()
          .single()

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, test: updatedTest }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Test settings error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})