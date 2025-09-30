import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, accessToken, ...data } = await req.json();

    console.log(`YouTube API action: ${action}`);

    switch (action) {
      case 'createPlaylist':
        return await handleCreatePlaylist(data, accessToken);
      case 'uploadVideo':
        return await handleUploadVideo(data, accessToken);
      case 'addVideoToPlaylist':
        return await handleAddVideoToPlaylist(data, accessToken);
      case 'getPlaylists':
        return await handleGetPlaylists(accessToken);
      case 'getPlaylistVideos':
        return await handleGetPlaylistVideos(data, accessToken);
      case 'deleteVideo':
        return await handleDeleteVideo(data, accessToken);
      case 'updateVideo':
        return await handleUpdateVideo(data, accessToken);
      case 'diagnose':
        return await handleDiagnose(accessToken);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('YouTube API Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleCreatePlaylist(data: any, accessToken: string) {
  const { title, description } = data;
  
  const response = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      snippet: {
        title,
        description: description || ''
      },
      status: {
        privacyStatus: 'public'
      }
    })
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('Create playlist error:', result);
    const ytError = result?.error || {};
    return new Response(
      JSON.stringify({ 
        error: {
          message: ytError.message || 'Failed to create playlist',
          code: ytError.code,
          errors: ytError.errors,
          status: response.status
        }
      }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ playlist: result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUploadVideo(data: any, accessToken: string) {
  const { title, description, videoData, fileName } = data;
  
  console.log('Starting video upload process...', { 
    title, 
    description: description?.substring(0, 50) + '...', 
    fileName,
    dataSize: videoData?.length 
  });
  
  try {
    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(videoData), c => c.charCodeAt(0));
    console.log('Video data converted to binary, size:', binaryData.length, 'bytes');
    
    // Create form data for resumable upload
    const metadata = {
      snippet: {
        title: title,
        description: description || ''
      },
      status: {
        privacyStatus: 'public'
      }
    };

    console.log('Initiating resumable upload session...');
    
    // First, initiate the upload session
    const initiateResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/*',
        'X-Upload-Content-Length': binaryData.length.toString()
      },
      body: JSON.stringify(metadata)
    });

    if (!initiateResponse.ok) {
      const errorText = await initiateResponse.text();
      console.error('Failed to initiate upload:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      
      throw new Error(`Failed to initiate upload: ${errorData.error?.message || 'Unknown error'}`);
    }

    const uploadUrl = initiateResponse.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('No upload URL received from YouTube');
    }

    console.log('Upload session initiated, uploading video data...');

    // Upload the video data
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/*',
        'Content-Length': binaryData.length.toString()
      },
      body: binaryData
    });

    console.log('Upload response status:', uploadResponse.status);

    let result;
    try {
      const responseText = await uploadResponse.text();
      console.log('Upload response text:', responseText);
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse upload response:', parseError);
      throw new Error('Invalid response from YouTube upload API');
    }
    
    if (!uploadResponse.ok) {
      console.error('Upload failed with result:', result);
      throw new Error(`Failed to upload video: ${result.error?.message || 'Upload failed with status ' + uploadResponse.status}`);
    }

    console.log('Video upload successful:', result.id);

    return new Response(
      JSON.stringify({ video: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload video error:', error);
    throw error;
  }
}

async function handleAddVideoToPlaylist(data: any, accessToken: string) {
  const { playlistId, videoId } = data;
  
  const response = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      snippet: {
        playlistId: playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId: videoId
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
    console.error('Get playlists error:', result);
    throw new Error(`Failed to get playlists: ${result.error?.message || 'Unknown error'}`);
  }

  return new Response(
    JSON.stringify({ playlists: result.items || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetPlaylistVideos(data: any, accessToken: string) {
  const { playlistId } = data;
  
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
    JSON.stringify({ videos: result.items || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleDeleteVideo(data: any, accessToken: string) {
  const { videoId } = data;
  
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(`Failed to delete video: ${result.error?.message || 'Unknown error'}`);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUpdateVideo(data: any, accessToken: string) {
  const { videoId, title, description } = data;
  
  const response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
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

async function handleDiagnose(accessToken: string) {
  try {
    // Check token scopes
    const scopeRes = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    const scopeJson = await scopeRes.json().catch(() => ({}));
    const scopesStr: string = scopeJson?.scope || '';
    const scopes: string[] = scopesStr ? scopesStr.split(' ') : [];

    // Check channel status
    const channelsRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=status,snippet,contentDetails&mine=true',
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const channelsJson = await channelsRes.json().catch(() => ({}));
    const hasChannel = Array.isArray(channelsJson?.items) && channelsJson.items.length > 0;

    const recommendations: string[] = [];
    const hasPlaylistScope = scopes.includes('https://www.googleapis.com/auth/youtube')
      || scopes.includes('https://www.googleapis.com/auth/youtube.force-ssl')
      || scopes.includes('https://www.googleapis.com/auth/youtubepartner');

    if (!hasPlaylistScope) recommendations.push('Grant youtube or youtube.force-ssl scope to your token.');
    if (!hasChannel) recommendations.push('Create/activate a YouTube channel and complete verification at https://www.youtube.com/verify.');

    const channel = hasChannel ? channelsJson.items[0] : null;
    const status = channel?.status || {};
    if (status?.isLinked === false) recommendations.push('Complete channel setup (linking) in YouTube Studio.');

    return new Response(
      JSON.stringify({
        ok: true,
        scopes,
        hasPlaylistScope,
        hasChannel,
        channel: hasChannel ? {
          id: channel.id,
          title: channel.snippet?.title,
          country: channel.snippet?.country,
          status
        } : null,
        recommendations
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Diagnose error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to run diagnostics' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
