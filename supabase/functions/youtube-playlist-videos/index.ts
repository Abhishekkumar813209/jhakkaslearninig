import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { playlistId } = await req.json()

    if (!playlistId) {
      return new Response(
        JSON.stringify({ error: 'Playlist ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('YOUTUBE_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching videos for playlist:', playlistId)

    // Fetch playlist items from YouTube API
    const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`
    
    const playlistResponse = await fetch(playlistItemsUrl)
    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text()
      console.error('YouTube API Error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch playlist videos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const playlistData = await playlistResponse.json()
    console.log('Playlist data:', JSON.stringify(playlistData, null, 2))

    if (!playlistData.items || playlistData.items.length === 0) {
      return new Response(
        JSON.stringify({ videos: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract video IDs for duration lookup
    const videoIds = playlistData.items
      .map((item: any) => item.contentDetails?.videoId)
      .filter(Boolean)
      .join(',')

    // Fetch video details including duration
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`
    
    const videosResponse = await fetch(videosUrl)
    const videosData = await videosResponse.json()

    // Create a map of video durations
    const videoDurations: { [key: string]: string } = {}
    if (videosData.items) {
      videosData.items.forEach((video: any) => {
        videoDurations[video.id] = video.contentDetails.duration
      })
    }

    // Convert YouTube duration format (PT4M13S) to seconds
    const parseDuration = (duration: string): number => {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return 0
      
      const hours = parseInt(match[1] || '0')
      const minutes = parseInt(match[2] || '0')
      const seconds = parseInt(match[3] || '0')
      
      return hours * 3600 + minutes * 60 + seconds
    }

    // Transform to our format
    const videos = playlistData.items.map((item: any, index: number) => {
      const videoId = item.contentDetails?.videoId
      const duration = videoDurations[videoId] || 'PT0S'
      const durationSeconds = parseDuration(duration)

      return {
        id: `${playlistId}-${index + 1}`,
        title: item.snippet?.title || 'Untitled Video',
        youtube_video_id: videoId,
        duration_seconds: durationSeconds,
        order_num: index + 1,
        description: item.snippet?.description || '',
        chapter: `Video ${index + 1}`,
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url
      }
    })

    console.log('Processed videos:', videos.length)

    return new Response(
      JSON.stringify({ videos }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching playlist videos:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})