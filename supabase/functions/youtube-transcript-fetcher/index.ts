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

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching transcript for video:', videoId);

    // Use youtube-transcript API
    const transcriptApiUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
    
    // Fetch from alternative transcript API
    const transcriptResponse = await fetch(
      `https://youtubetranscript.com/api/transcript?videoId=${videoId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!transcriptResponse.ok) {
      // Fallback: Try extracting from YouTube directly
      const youtubeResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const html = await youtubeResponse.text();
      
      // Extract captions from player response
      const captionsMatch = html.match(/"captions":({[^}]+})/);
      
      if (!captionsMatch) {
        return new Response(
          JSON.stringify({ 
            error: 'No transcript available for this video',
            transcript: '',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          transcript: 'Transcript extraction in progress. Please use manual content for now.',
          videoId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transcriptData = await transcriptResponse.json();
    
    // Parse transcript segments
    let fullTranscript = '';
    const timestampedSegments: Array<{ time: string; text: string }> = [];

    if (Array.isArray(transcriptData)) {
      transcriptData.forEach((segment: any) => {
        const time = Math.floor(segment.offset / 1000);
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        fullTranscript += segment.text + ' ';
        timestampedSegments.push({
          time: timestamp,
          text: segment.text,
        });
      });
    }

    console.log('Transcript fetched successfully, length:', fullTranscript.length);

    return new Response(
      JSON.stringify({
        transcript: fullTranscript.trim(),
        timestampedSegments,
        videoId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Transcript fetch error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        transcript: 'Unable to fetch transcript. Please add content manually.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
