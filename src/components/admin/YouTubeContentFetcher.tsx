import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Youtube, Clock, Video, List } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface YouTubeVideo {
  id: string;
  title: string;
  duration_seconds: number;
  thumbnail: string;
  description: string;
  has_transcript: boolean;
}

interface YouTubeContentFetcherProps {
  onVideoSelect: (video: YouTubeVideo) => void;
}

export function YouTubeContentFetcher({ onVideoSelect }: YouTubeContentFetcherProps) {
  const { toast } = useToast();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isPlaylist, setIsPlaylist] = useState(false);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const extractPlaylistId = (url: string): string | null => {
    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchYouTubeContent = async () => {
    if (!youtubeUrl.trim()) {
      toast({ 
        title: "Error", 
        description: "Please enter a YouTube URL", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    const playlistId = extractPlaylistId(youtubeUrl);
    const videoId = extractVideoId(youtubeUrl);

    try {
      if (playlistId) {
        // Fetch playlist videos
        setIsPlaylist(true);
        const { data, error } = await supabase.functions.invoke('youtube-playlist-videos', {
          body: { playlistId }
        });

        if (error) throw error;

        const videosWithTranscript = data.videos.map((v: any) => ({
          id: v.youtube_video_id,
          title: v.title,
          duration_seconds: v.duration_seconds,
          thumbnail: v.thumbnail,
          description: v.description || '',
          has_transcript: true, // Will be checked during transcript fetch
        }));

        setVideos(videosWithTranscript);
        toast({ 
          title: "Success", 
          description: `Fetched ${videosWithTranscript.length} videos from playlist` 
        });
      } else if (videoId) {
        // Fetch single video
        setIsPlaylist(false);
        const { data, error } = await supabase.functions.invoke('youtube-video-details', {
          body: { videoId }
        });

        if (error) throw error;

        setVideos([{
          id: data.id,
          title: data.title,
          duration_seconds: data.duration_seconds,
          thumbnail: data.thumbnail,
          description: data.description || '',
          has_transcript: true,
        }]);

        toast({ title: "Success", description: "Video fetched successfully" });
      } else {
        throw new Error("Invalid YouTube URL");
      }
    } catch (error: any) {
      console.error('YouTube fetch error:', error);
      toast({ 
        title: "Fetch Failed", 
        description: error.message || "Failed to fetch YouTube content", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          YouTube Content Fetcher
        </CardTitle>
        <CardDescription>
          Enter a YouTube video or playlist URL to extract content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>YouTube URL</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://www.youtube.com/watch?v=... or playlist URL"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={loading}
            />
            <Button onClick={fetchYouTubeContent} disabled={loading}>
              {loading ? "Fetching..." : "Fetch"}
            </Button>
          </div>
        </div>

        {videos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                {isPlaylist ? (
                  <span className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Playlist ({videos.length} videos)
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Single Video
                  </span>
                )}
              </Label>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-4 space-y-3">
                {videos.map((video) => (
                  <Card key={video.id} className="overflow-hidden">
                    <div className="flex gap-3 p-3">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-32 h-20 object-cover rounded"
                      />
                      <div className="flex-1 space-y-2">
                        <h4 className="font-medium text-sm line-clamp-2">
                          {video.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(video.duration_seconds)}
                          </Badge>
                          {video.has_transcript && (
                            <Badge variant="secondary">Transcript Available</Badge>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => onVideoSelect(video)}
                          className="mt-2"
                        >
                          Generate Lessons
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
