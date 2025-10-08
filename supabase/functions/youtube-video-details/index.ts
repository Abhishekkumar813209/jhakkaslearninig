import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not configured');
    }

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching video details for:', videoId);

    // Fetch video details from YouTube API
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    if (!videoResponse.ok) {
      throw new Error('Failed to fetch video details from YouTube');
    }

    const videoData = await videoResponse.json();

    if (!videoData.items || videoData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Video not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const video = videoData.items[0];
    
    // Parse duration (PT format: PT4M13S -> 253 seconds)
    const durationMatch = video.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(durationMatch[1] || '0');
    const minutes = parseInt(durationMatch[2] || '0');
    const seconds = parseInt(durationMatch[3] || '0');
    const durationSeconds = hours * 3600 + minutes * 60 + seconds;

    const videoDetails = {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
      duration_seconds: durationSeconds,
    };

    console.log('Video details fetched successfully');

    return new Response(
      JSON.stringify(videoDetails),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Video details fetch error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch video details' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
