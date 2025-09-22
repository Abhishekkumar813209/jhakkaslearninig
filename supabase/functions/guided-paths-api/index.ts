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
        
        // Get all active guided paths
        const { data: activePaths, error: activePathsError } = await supabase
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
              is_completed
            )
          `)
          .eq('is_active', true)
          .eq('student_guided_paths.student_id', currentUser?.id)

        const { data: availablePaths, error: availablePathsError } = await supabase
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
          .not('id', 'in', `(${activePaths?.map(p => p.id).join(',') || 'null'})`)

        if (activePathsError || availablePathsError) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch guided paths' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Normalize the data to ensure arrays are properly initialized
        const normalizedActivePaths = activePaths?.map(path => ({
          ...path,
          objectives: path.objectives || [],
          guided_path_chapters: path.guided_path_chapters || []
        })) || []

        const normalizedAvailablePaths = availablePaths?.map(path => ({
          ...path,
          objectives: path.objectives || [],
          guided_path_chapters: path.guided_path_chapters || []
        })) || []

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