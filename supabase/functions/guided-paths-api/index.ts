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
    const authHeader = req.headers.get('Authorization') ?? ''
    
    console.log('guided-paths-api: received request with action:', req.url)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { action, ...body } = await req.json()
    console.log('guided-paths-api: processing action:', action)

    switch (action) {
      case 'get_guided_paths':
        const { data: paths, error: pathsError } = await supabase
          .from('guided_paths')
          .select(`
            *,
            guided_path_chapters (
              id,
              title,
              description,
              order_num,
              estimated_hours,
              topics,
              playlist_id,
              guided_path_resources (*)
            )
          `)
          .order('created_at', { ascending: false })

        if (pathsError) {
          return new Response(
            JSON.stringify({ error: pathsError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Ensure all arrays are properly initialized
        const normalizedPaths = paths?.map(path => ({
          ...path,
          objectives: path.objectives || [],
          guided_path_chapters: path.guided_path_chapters || []
        })) || []

        return new Response(
          JSON.stringify({ guided_paths: normalizedPaths }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'create_guided_path':
        const { title, description, subject, level, duration_weeks, target_students, objectives, exam_category } = body
        
        const { data: { user } } = await supabase.auth.getUser()
        
        const { data: newPath, error: createError } = await supabase
          .from('guided_paths')
          .insert([{
            title,
            description,
            subject,
            level,
            duration_weeks,
            target_students,
            objectives,
            exam_category,
            created_by: user?.id
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
          JSON.stringify({ guided_path: newPath }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'update_guided_path':
        const { id, ...updateData } = body
        
        const { data: updatedPath, error: updateError } = await supabase
          .from('guided_paths')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ guided_path: updatedPath }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'delete_guided_path':
        const { path_id } = body
        
        const { error: deleteError } = await supabase
          .from('guided_paths')
          .delete()
          .eq('id', path_id)

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'add_chapter':
        const { guided_path_id, chapter_title, chapter_description, playlist_id, estimated_hours, topics } = body
        
        // Get next order number
        const { data: existingChapters } = await supabase
          .from('guided_path_chapters')
          .select('order_num')
          .eq('guided_path_id', guided_path_id)
          .order('order_num', { ascending: false })
          .limit(1)

        const nextOrderNum = existingChapters?.[0]?.order_num ? existingChapters[0].order_num + 1 : 1

        const { data: newChapter, error: chapterError } = await supabase
          .from('guided_path_chapters')
          .insert([{
            guided_path_id,
            title: chapter_title,
            description: chapter_description,
            order_num: nextOrderNum,
            estimated_hours: estimated_hours || 0,
            topics: topics || [],
            playlist_id
          }])
          .select()
          .single()

        if (chapterError) {
          return new Response(
            JSON.stringify({ error: chapterError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ chapter: newChapter }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'search_youtube_playlists':
        const { query } = body
        const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')
        
        if (!youtubeApiKey) {
          return new Response(
            JSON.stringify({ error: 'YouTube API key not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist&q=${encodeURIComponent(query)}&key=${youtubeApiKey}&maxResults=10`
        
        const youtubeResponse = await fetch(youtubeUrl)
        const youtubeData = await youtubeResponse.json()

        if (!youtubeResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to search YouTube playlists' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const playlists = youtubeData.items?.map((item: any) => ({
          id: item.id.playlistId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          channelTitle: item.snippet.channelTitle
        })) || []

        return new Response(
          JSON.stringify({ playlists }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'get_student_guided_paths':
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        // 1) Enrolled (resilient to errors)
        let activePaths: any[] = []
        const { data: activeData, error: activeErr } = await supabase
          .from('guided_paths')
          .select(`
            *,
            guided_path_chapters (
              id,
              title,
              description,
              order_num,
              estimated_hours,
              topics,
              playlist_id
            ),
            student_guided_paths!inner (
              enrolled_at,
              progress,
              is_completed,
              student_id
            )
          `)
          .eq('is_active', true)
          .eq('student_guided_paths.student_id', currentUser?.id)

        if (activeErr) {
          console.error('get_student_guided_paths: activePaths error:', activeErr)
        } else {
          activePaths = activeData || []
        }

        // 2) All active paths (then exclude enrolled in code)
        let availablePathsAll: any[] = []
        const { data: availData, error: availErr } = await supabase
          .from('guided_paths')
          .select(`
            *,
            guided_path_chapters (
              id,
              title,
              description,
              order_num,
              estimated_hours,
              topics,
              playlist_id
            )
          `)
          .eq('is_active', true)

        if (availErr) {
          console.error('get_student_guided_paths: availablePaths error:', availErr)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch available guided paths' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          availablePathsAll = availData || []
        }

        // Exclude enrolled
        const enrolledIds = new Set(activePaths.map((p: any) => p.id))
        const availablePaths = availablePathsAll.filter((p: any) => !enrolledIds.has(p.id))

        // Helper function to fetch YouTube playlist details
        const fetchPlaylistDetails = async (playlistId: string) => {
          if (!playlistId) return { videoCount: 0, totalDuration: 0 }
          
          const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')
          if (!youtubeApiKey) return { videoCount: 0, totalDuration: 0 }

          try {
            // Get playlist videos
            const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&key=${youtubeApiKey}&maxResults=50`
            const videosResponse = await fetch(videosUrl)
            const videosData = await videosResponse.json()

            if (!videosResponse.ok || !videosData.items) {
              return { videoCount: 0, totalDuration: 0 }
            }

            const videoIds = videosData.items.map((item: any) => item.contentDetails.videoId).join(',')
            
            // Get video durations
            const durationsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${youtubeApiKey}`
            const durationsResponse = await fetch(durationsUrl)
            const durationsData = await durationsResponse.json()

            if (!durationsResponse.ok || !durationsData.items) {
              return { videoCount: 0, totalDuration: 0 }
            }

            // Parse durations and calculate total
            let totalSeconds = 0
            durationsData.items.forEach((video: any) => {
              const duration = video.contentDetails.duration // ISO 8601 format PT#M#S
              const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
              if (match) {
                const hours = parseInt(match[1] || '0')
                const minutes = parseInt(match[2] || '0')
                const seconds = parseInt(match[3] || '0')
                totalSeconds += hours * 3600 + minutes * 60 + seconds
              }
            })

            return {
              videoCount: videosData.items.length,
              totalDuration: Math.round(totalSeconds / 3600) // Convert to hours
            }
          } catch (error) {
            console.error('Error fetching playlist details:', error)
            return { videoCount: 0, totalDuration: 0 }
          }
        }

        // Enhance paths with YouTube data
        const enhancePathsWithYouTubeData = async (paths: any[]) => {
          const enhancedPaths = []
          
          for (const path of paths) {
            let totalPathHours = 0
            let totalVideoCount = 0
            const enhancedChapters = []

            for (const chapter of path.guided_path_chapters || []) {
              if (chapter.playlist_id) {
                const playlistDetails = await fetchPlaylistDetails(chapter.playlist_id)
                enhancedChapters.push({
                  ...chapter,
                  estimated_hours: playlistDetails.totalDuration,
                  video_count: playlistDetails.videoCount
                })
                totalPathHours += playlistDetails.totalDuration
                totalVideoCount += playlistDetails.videoCount
              } else {
                enhancedChapters.push({
                  ...chapter,
                  video_count: 0
                })
              }
            }

            enhancedPaths.push({
              ...path,
              objectives: path.objectives || [],
              guided_path_chapters: enhancedChapters,
              total_hours: totalPathHours,
              total_videos: totalVideoCount
            })
          }
          
          return enhancedPaths
        }

        // Enhance both enrolled and available paths with YouTube data
        const normalizedActivePaths = await enhancePathsWithYouTubeData(activePaths)
        const normalizedAvailablePaths = await enhancePathsWithYouTubeData(availablePaths)

        return new Response(
          JSON.stringify({
            enrolled_paths: normalizedActivePaths,
            available_paths: normalizedAvailablePaths
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'enroll_in_guided_path':
        const { guided_path_id: enrollPathId } = body
        const { data: { user: enrollUser } } = await supabase.auth.getUser()
        
        const { data: enrollment, error: enrollError } = await supabase
          .from('student_guided_paths')
          .insert([{
            student_id: enrollUser?.id,
            guided_path_id: enrollPathId
          }])
          .select()
          .single()

        if (enrollError) {
          return new Response(
            JSON.stringify({ error: enrollError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ enrollment }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Guided Paths API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})