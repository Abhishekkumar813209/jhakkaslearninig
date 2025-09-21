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
    const videoId = url.pathname.split('/')[1]
    const action = url.pathname.split('/')[2]

    // Get auth token and set session
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      const { data, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      if (error) {
        console.error('Auth error:', error)
      }
    }

    switch (req.method) {
      case 'GET':
        if (videoId && videoId !== 'videos-api') {
          // Get single video
          const { data: video, error } = await supabase
            .from('videos')
            .select(`
              *,
              courses (title, subject)
            `)
            .eq('id', videoId)
            .single()

          if (error) {
            return new Response(
              JSON.stringify({ error: 'Video not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ video }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Get all videos
          const { data: videos, error } = await supabase
            .from('videos')
            .select(`
              *,
              courses (title, subject)
            `)
            .order('created_at', { ascending: false })

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ videos }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'POST':
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (action === 'track_progress') {
          // Track video progress
          const { lecture_id, watch_time_seconds, is_completed } = await req.json()
          
          // Get current user
          const { data: { user } } = await supabase.auth.getUser()

          // Update or insert progress (simplified for demo)
          const progressData = {
            lecture_id,
            watch_time_seconds,
            is_completed,
            last_watched_at: new Date().toISOString()
          }

          console.log('Progress tracked:', progressData)

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Progress tracked successfully',
              data: progressData 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Create new video
          const body = await req.json()
          const { data: newVideo, error: createError } = await supabase
            .from('videos')
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
            JSON.stringify({ video: newVideo }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Videos API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})