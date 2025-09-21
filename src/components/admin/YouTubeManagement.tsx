import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Upload, Youtube, Play, Edit, Trash2, Link, Folder, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface YouTubePlaylist {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: any;
  };
  contentDetails: {
    itemCount: number;
  };
}

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    resourceId: {
      videoId: string;
    };
    thumbnails: any;
    publishedAt: string;
  };
}

const YouTubeManagement = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("");
  const [playlistVideos, setPlaylistVideos] = useState<YouTubeVideo[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreatePlaylistDialog, setShowCreatePlaylistDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    description: '',
    file: null as File | null
  });

  const [playlistFormData, setPlaylistFormData] = useState({
    title: '',
    description: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('youtube_access_token');
    if (token) {
      setAccessToken(token);
      fetchPlaylists(token);
    }
  }, []);

  useEffect(() => {
    if (selectedPlaylist && accessToken) {
      fetchPlaylistVideos();
    }
  }, [selectedPlaylist, accessToken]);

  const connectYouTube = async () => {
    try {
      // For now, we'll use a simpler approach - direct token input
      // This avoids the popup OAuth issues
      const token = prompt(`
YouTube OAuth Setup - Step by Step:

STEP 1: First add this Redirect URI in Google Cloud Console:
📋 REDIRECT URI: https://developers.google.com/oauthplayground

Go to Google Cloud Console → APIs & Services → Credentials → Your OAuth Client → Add this URL to "Authorized redirect URIs"

STEP 2: Get Access Token:
1. Go to: https://developers.google.com/oauthplayground
2. Click gear icon (top right) → "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. Select scopes:
   - https://www.googleapis.com/auth/youtube
   - https://www.googleapis.com/auth/youtube.upload
5. Click "Authorize APIs" → "Exchange authorization code for tokens"
6. Copy the "Access token"

Please paste your ACCESS TOKEN here:`);

      if (token && token.trim()) {
        localStorage.setItem('youtube_access_token', token.trim());
        setAccessToken(token.trim());
        await fetchPlaylists(token.trim());
        toast({
          title: "Success",
          description: "YouTube connected successfully!",
        });
      }
    } catch (error) {
      console.error('YouTube connection failed:', error);
      toast({
        title: "Error",
        description: "Failed to connect to YouTube. Please check your access token.",
        variant: "destructive",
      });
    }
  };

  const troubleshootConnection = () => {
    toast({
      title: "YouTube Connection Troubleshooting",
      description: "Check console for detailed troubleshooting steps",
      duration: 5000,
    });
    
    console.log(`
🔧 YouTube API Troubleshooting Guide:

1. CHANNEL VERIFICATION:
   - Your YouTube channel must be verified with a phone number
   - Go to: https://www.youtube.com/verify
   - Complete phone verification if not done

2. CHANNEL SETUP:
   - Ensure your channel is fully set up (not a brand account)
   - Upload at least one video or create a channel banner
   - Channel must be in good standing (no strikes)

3. ACCESS TOKEN SCOPES:
   - Your token must have 'https://www.googleapis.com/auth/youtube' scope
   - Or 'https://www.googleapis.com/auth/youtube.force-ssl' scope
   - Regenerate token if scopes are missing

4. GOOGLE CLOUD PROJECT:
   - YouTube Data API v3 must be enabled
   - Check quota limits in Google Cloud Console
   - Ensure project is not suspended

5. COMMON FIXES:
   - Try creating a playlist directly on YouTube first
   - Wait 24-48 hours after channel verification
   - Use a personal Google account (not workspace/organization)

Current Error: "Precondition check failed" usually means channel verification issues.
    `);
  };

  const fetchPlaylists = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('youtube-integration', {
        body: { 
          action: 'getPlaylists',
          accessToken: token
        }
      });

      if (error) throw error;
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
      toast({
        title: "Error",
        description: "Failed to fetch playlists",
        variant: "destructive",
      });
    }
  };

  const fetchPlaylistVideos = async () => {
    if (!selectedPlaylist || !accessToken) return;

    try {
      const { data, error } = await supabase.functions.invoke('youtube-integration', {
        body: { 
          action: 'getPlaylistVideos',
          playlistId: selectedPlaylist,
          accessToken: accessToken
        }
      });

      if (error) throw error;
      setPlaylistVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to fetch playlist videos:', error);
      toast({
        title: "Error",
        description: "Failed to fetch playlist videos",
        variant: "destructive",
      });
    }
  };

  const createPlaylist = async () => {
    if (!accessToken) return;

    try {
      const { data, error } = await supabase.functions.invoke('youtube-integration', {
        body: { 
          action: 'createPlaylist',
          title: playlistFormData.title,
          description: playlistFormData.description,
          accessToken: accessToken
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        const err = (data as any).error as { message?: string; code?: any };
        let errorMsg = err?.message || 'Failed to create playlist';
        
        // Add specific guidance for common errors
        if (err?.message?.includes('Precondition check failed')) {
          errorMsg += '\n\n💡 This usually means your YouTube channel needs verification. Check the troubleshooting guide.';
        }
        
        toast({
          title: "YouTube Error",
          description: `${errorMsg}${err?.code ? ` (code: ${err.code})` : ''}`,
          variant: "destructive",
          duration: 8000,
        });
        
        // Log detailed error for debugging
        console.error('YouTube API Error Details:', err);
        return;
      }

      toast({
        title: "Success",
        description: "Playlist created successfully!",
      });

      setShowCreatePlaylistDialog(false);
      setPlaylistFormData({ title: '', description: '' });
      fetchPlaylists(accessToken);
    } catch (error: any) {
      console.error('Failed to create playlist:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create playlist",
        variant: "destructive",
      });
    }
  };

  const uploadVideo = async () => {
    if (!uploadFormData.file || !accessToken) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        const { data, error } = await supabase.functions.invoke('youtube-integration', {
          body: { 
            action: 'uploadVideo',
            title: uploadFormData.title,
            description: uploadFormData.description,
            videoData: base64,
            accessToken: accessToken
          }
        });

        if (error) throw error;

        // If a playlist is selected, add the video to it
        if (selectedPlaylist && data.video?.id) {
          await supabase.functions.invoke('youtube-integration', {
            body: { 
              action: 'addVideoToPlaylist',
              playlistId: selectedPlaylist,
              videoId: data.video.id,
              accessToken: accessToken
            }
          });
        }

        toast({
          title: "Success",
          description: "Video uploaded successfully!",
        });

        setShowUploadDialog(false);
        setUploadFormData({ title: '', description: '', file: null });
        if (selectedPlaylist) {
          fetchPlaylistVideos();
        }
      };

      reader.readAsArrayBuffer(uploadFormData.file);
    } catch (error) {
      console.error('Failed to upload video:', error);
      toast({
        title: "Error",
        description: "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!accessToken) return;

    if (window.confirm('Are you sure you want to delete this video from YouTube?')) {
      try {
        const { error } = await supabase.functions.invoke('youtube-integration', {
          body: { 
            action: 'deleteVideo',
            videoId: videoId,
            accessToken: accessToken
          }
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Video deleted successfully!",
        });

        fetchPlaylistVideos();
      } catch (error) {
        console.error('Failed to delete video:', error);
        toast({
          title: "Error",
          description: "Failed to delete video",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">YouTube Management</h2>
          <p className="text-muted-foreground">Manage YouTube playlists and upload videos directly</p>
        </div>
        
        {!accessToken ? (
          <div className="flex flex-col gap-2">
            <Button onClick={connectYouTube} className="flex items-center gap-2">
              <Youtube className="h-4 w-4" />
              Connect YouTube
            </Button>
            <Button variant="outline" size="sm" onClick={troubleshootConnection}>
              🛠️ Troubleshooting Guide
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Youtube className="h-3 w-3 mr-1" />
              Connected
            </Badge>
            <Button variant="outline" size="sm" onClick={troubleshootConnection}>
              Help
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                localStorage.removeItem('youtube_access_token');
                setAccessToken(null);
                setPlaylists([]);
                setPlaylistVideos([]);
              }}
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {accessToken && (
        <>
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Dialog open={showCreatePlaylistDialog} onOpenChange={setShowCreatePlaylistDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Create Playlist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create YouTube Playlist</DialogTitle>
                  <DialogDescription>Create a public playlist on your YouTube channel.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="playlist-title">Playlist Title *</Label>
                    <Input 
                      id="playlist-title"
                      value={playlistFormData.title}
                      onChange={(e) => setPlaylistFormData({...playlistFormData, title: e.target.value})}
                      placeholder="Enter playlist title" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="playlist-description">Description</Label>
                    <Textarea 
                      id="playlist-description"
                      value={playlistFormData.description}
                      onChange={(e) => setPlaylistFormData({...playlistFormData, description: e.target.value})}
                      placeholder="Enter playlist description" 
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={createPlaylist}>Create Playlist</Button>
                    <Button variant="outline" onClick={() => setShowCreatePlaylistDialog(false)}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Video
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Video to YouTube</DialogTitle>
                  <DialogDescription>Upload a video to your YouTube channel.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="video-title">Video Title *</Label>
                    <Input 
                      id="video-title"
                      value={uploadFormData.title}
                      onChange={(e) => setUploadFormData({...uploadFormData, title: e.target.value})}
                      placeholder="Enter video title" 
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="video-description">Description</Label>
                    <Textarea 
                      id="video-description"
                      value={uploadFormData.description}
                      onChange={(e) => setUploadFormData({...uploadFormData, description: e.target.value})}
                      placeholder="Enter video description" 
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="video-file">Video File *</Label>
                    <Input 
                      id="video-file"
                      type="file"
                      accept="video/*"
                      onChange={(e) => setUploadFormData({...uploadFormData, file: e.target.files?.[0] || null})}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Supported formats: MP4, MOV, AVI, WMV, FLV, WebM
                    </div>
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={uploadVideo}
                      disabled={!uploadFormData.title || !uploadFormData.file || isUploading}
                    >
                      {isUploading ? 'Uploading...' : 'Upload Video'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Playlist Selection */}
          <Card className="card-gradient shadow-soft">
            <CardHeader>
              <CardTitle>YouTube Playlists</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Select a playlist to manage" />
                  </SelectTrigger>
                  <SelectContent>
                    {playlists.map(playlist => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        {playlist.snippet.title} ({playlist.contentDetails.itemCount} videos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {playlists.map(playlist => (
                    <Card key={playlist.id} className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedPlaylist(playlist.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                            <Folder className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{playlist.snippet.title}</h3>
                            <p className="text-xs text-muted-foreground">
                              {playlist.contentDetails.itemCount} videos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Playlist Videos */}
          {selectedPlaylist && (
            <Card className="card-gradient shadow-soft">
              <CardHeader>
                <CardTitle>Playlist Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Video</TableHead>
                        <TableHead>Published</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {playlistVideos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            No videos in this playlist. Upload your first video!
                          </TableCell>
                        </TableRow>
                      ) : (
                        playlistVideos.map((video) => (
                          <TableRow key={video.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-20 h-12 bg-muted rounded flex items-center justify-center">
                                  <Video className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">{video.snippet.title}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {video.snippet.description?.substring(0, 100)}...
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {new Date(video.snippet.publishedAt).toLocaleDateString()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" asChild>
                                  <a 
                                    href={`https://youtube.com/watch?v=${video.snippet.resourceId.videoId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Play className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600"
                                  onClick={() => deleteVideo(video.snippet.resourceId.videoId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!accessToken && (
        <Card className="card-gradient shadow-soft">
          <CardContent className="p-12 text-center">
            <Youtube className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Connect YouTube Account</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your YouTube account to upload videos directly and manage playlists. 
              You'll need to get an access token from Google OAuth 2.0 Playground.
            </p>
            <div className="space-y-4">
              <Button onClick={connectYouTube} className="flex items-center gap-2 mx-auto">
                <Youtube className="h-4 w-4" />
                Connect YouTube
              </Button>
              <div className="text-xs text-muted-foreground">
                <p>Quick Setup Guide:</p>
                <p>1. Go to developers.google.com/oauthplayground</p>
                <p>2. Select YouTube Data API v3 scopes</p>
                <p>3. Authorize and get access token</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default YouTubeManagement;