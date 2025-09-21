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

    // Get auth token and set session
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      const { data, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      if (error) {
        console.error('Auth error:', error)
      }
    }

    const { action, ...body } = await req.json()

    switch (action) {
      case 'get_learning_paths':
        const { data: learningPaths, error: pathsError } = await supabase
          .from('learning_paths')
          .select(`
            *,
            playlists (
              id,
              title,
              youtube_playlist_id,
              chapter,
              video_count,
              total_duration_minutes,
              order_num,
              thumbnail_url
            )
          `)
          .order('created_at', { ascending: false })

        if (pathsError) {
          return new Response(
            JSON.stringify({ error: pathsError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ learning_paths: learningPaths }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'create_learning_path':
        const { subject, teacher_name, title } = body
        
        const { data: newPath, error: createError } = await supabase
          .from('learning_paths')
          .insert([{
            subject,
            teacher_name,
            title: title || `${teacher_name} - ${subject}`,
            description: `Learning path for ${subject} with ${teacher_name}`,
            student_id: (await supabase.auth.getUser()).data.user?.id
          }])
          .select()
          .single()

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ learning_path: newPath }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'add_playlist':
        const { learning_path_id, playlist_data, videos } = body

        // Insert playlist
        const { data: newPlaylist, error: playlistError } = await supabase
          .from('playlists')
          .insert([{
            learning_path_id,
            title: playlist_data.title,
            youtube_playlist_id: playlist_data.id,
            chapter: playlist_data.title,
            video_count: playlist_data.videoCount,
            total_duration_minutes: Math.round(playlist_data.videoCount * 30), // Estimate
            thumbnail_url: playlist_data.thumbnailUrl,
            order_num: 1
          }])
          .select()
          .single()

        if (playlistError) {
          return new Response(
            JSON.stringify({ error: playlistError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Insert videos/lectures
        if (videos && videos.length > 0) {
          const lectureData = videos.map((video: any, index: number) => ({
            playlist_id: newPlaylist.id,
            title: video.title,
            youtube_video_id: video.youtube_video_id,
            duration_seconds: video.duration_seconds,
            order_num: index + 1,
            description: video.description,
            thumbnail_url: video.thumbnail,
            chapter: video.chapter
          }))

          const { error: lecturesError } = await supabase
            .from('lectures')
            .insert(lectureData)

          if (lecturesError) {
            console.error('Error inserting lectures:', lecturesError)
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            playlist: newPlaylist,
            message: 'Playlist added successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'get_playlist_lectures':
        const { playlist_id } = body
        
        const { data: lectures, error: lecturesError } = await supabase
          .from('lectures')
          .select('*')
          .eq('playlist_id', playlist_id)
          .order('order_num', { ascending: true })

        if (lecturesError) {
          return new Response(
            JSON.stringify({ error: lecturesError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ lectures }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'track_progress':
        const { lecture_id, watch_time_seconds, is_completed, playlist_id } = body
        const userId = (await supabase.auth.getUser()).data.user?.id

        // Get enrollment_id first (for compatibility with existing video_progress table)
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .limit(1)
          .single()

        const progressData = {
          enrollment_id: enrollment?.id || '00000000-0000-0000-0000-000000000000', // Fallback UUID
          lecture_id,
          watch_time_seconds,
          is_completed,
          last_watched_at: new Date().toISOString(),
          playlist_id,
          student_id: userId
        }

        const { error: progressError } = await supabase
          .from('video_progress')
          .upsert(progressData, {
            onConflict: 'enrollment_id,lecture_id'
          })

        if (progressError) {
          console.error('Progress tracking error:', progressError)
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Progress tracked successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Learning Path API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})