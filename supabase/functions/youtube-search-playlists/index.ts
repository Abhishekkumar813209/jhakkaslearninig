import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoCount: number;
  channelTitle: string;
  channelId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!youtubeApiKey) {
      console.error('YouTube API key not found');
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Searching YouTube for: ${query}`);

    // Search for playlists on YouTube
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist&q=${encodeURIComponent(query)}&maxResults=20&key=${youtubeApiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error('YouTube API error:', searchData);
      return new Response(
        JSON.stringify({ error: 'YouTube API request failed', details: searchData }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get playlist details to fetch video counts
    const playlistIds = searchData.items?.map((item: any) => item.id.playlistId).join(',');
    
    let playlists: YouTubePlaylist[] = [];
    
    if (playlistIds) {
      const playlistDetailsUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistIds}&key=${youtubeApiKey}`;
      
      const detailsResponse = await fetch(playlistDetailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsResponse.ok && detailsData.items) {
        playlists = detailsData.items.map((item: any) => ({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description || '',
          thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
          videoCount: item.contentDetails?.itemCount || 0,
          channelTitle: item.snippet.channelTitle,
          channelId: item.snippet.channelId
        }));
      }
    }

    console.log(`Found ${playlists.length} playlists`);

    return new Response(
      JSON.stringify({ 
        playlists,
        query,
        totalResults: playlists.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in youtube-search-playlists function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: (error as Error).message || 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});