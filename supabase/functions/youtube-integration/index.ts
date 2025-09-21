import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...data } = await req.json();

    switch (action) {
      case 'getAuthUrl':
        return handleGetAuthUrl();
      
      case 'exchangeCodeForToken':
        return handleExchangeCode(data.code);
      
      case 'createPlaylist':
        return handleCreatePlaylist(data);
      
      case 'uploadVideo':
        return handleUploadVideo(data);
      
      case 'addVideoToPlaylist':
        return handleAddVideoToPlaylist(data);
      
      case 'getPlaylists':
        return handleGetPlaylists(data.accessToken);
      
      case 'getPlaylistVideos':
        return handleGetPlaylistVideos(data);
      
      case 'deleteVideo':
        return handleDeleteVideo(data);
      
      case 'updateVideo':
        return handleUpdateVideo(data);

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('YouTube API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function handleGetAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent('postmessage')}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `prompt=consent`;

  return new Response(
    JSON.stringify({ authUrl }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleExchangeCode(code: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: 'postmessage'
    })
  });

  const tokens = await response.json();
  
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);
  }

  return new Response(
    JSON.stringify(tokens),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCreatePlaylist(data: any) {
  const { title, description, accessToken } = data;
  
  const response = await fetch('https://www.googleapis.com/youtube/v3/playlists', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      part: 'snippet,status',
      resource: {
        snippet: {
          title: title,
          description: description
        },
        status: {
          privacyStatus: 'public'
        }
      }
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to create playlist: ${result.error?.message || 'Unknown error'}`);
  }

  return new Response(
    JSON.stringify({ playlist: result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUploadVideo(data: any) {
  const { title, description, videoData, accessToken } = data;
  
  // Convert base64 to binary
  const binaryData = Uint8Array.from(atob(videoData), c => c.charCodeAt(0));
  
  // First, upload the video
  const uploadResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream'
    },
    body: JSON.stringify({
      snippet: {
        title: title,
        description: description
      },
      status: {
        privacyStatus: 'public'
      }
    })
  });

  const result = await uploadResponse.json();
  
  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload video: ${result.error?.message || 'Unknown error'}`);
  }

  return new Response(
    JSON.stringify({ video: result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleAddVideoToPlaylist(data: any) {
  const { playlistId, videoId, accessToken } = data;
  
  const response = await fetch('https://www.googleapis.com/youtube/v3/playlistItems', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      part: 'snippet',
      resource: {
        snippet: {
          playlistId: playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId: videoId
          }
        }
      }
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to add video to playlist: ${result.error?.message || 'Unknown error'}`);
  }

  return new Response(
    JSON.stringify({ playlistItem: result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetPlaylists(accessToken: string) {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to get playlists: ${result.error?.message || 'Unknown error'}`);
  }

  return new Response(
    JSON.stringify({ playlists: result.items }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetPlaylistVideos(data: any) {
  const { playlistId, accessToken } = data;
  
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to get playlist videos: ${result.error?.message || 'Unknown error'}`);
  }

  return new Response(
    JSON.stringify({ videos: result.items }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleDeleteVideo(data: any) {
  const { videoId, accessToken } = data;
  
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) {
    const result = await response.json();
    throw new Error(`Failed to delete video: ${result.error?.message || 'Unknown error'}`);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUpdateVideo(data: any) {
  const { videoId, title, description, accessToken } = data;
  
  const response = await fetch('https://www.googleapis.com/youtube/v3/videos', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      part: 'snippet',
      id: videoId,
      snippet: {
        title: title,
        description: description
      }
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to update video: ${result.error?.message || 'Unknown error'}`);
  }

  return new Response(
    JSON.stringify({ video: result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}