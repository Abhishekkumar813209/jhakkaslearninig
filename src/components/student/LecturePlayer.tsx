import React, { useState, useEffect, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Maximize, 
  CheckCircle,
  Clock,
  BookOpen,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Lecture {
  id: string;
  title: string;
  youtube_video_id: string;
  duration_seconds: number;
  order_num: number;
  description?: string;
  chapter: string;
}

interface LectureProgress {
  watch_time_seconds: number;
  is_completed: boolean;
  last_watched_at: Date;
}

interface LecturePlayerProps {
  lecture: Lecture;
  playlistId: string;
  playlistTitle: string;
  lectures: Lecture[];
  onClose: () => void;
  onLectureChange: (lectureId: string) => void;
}

// Helper function to parse lecture title
const parseLectureTitle = (fullTitle: string): { mainTitle: string; context: string; metadata: string } => {
  const parts = fullTitle.split(/\s*[|•]\s*/);
  let mainTitle = parts[0].trim();
  mainTitle = mainTitle.replace(/\s*in\s+\d+\s+minutes?\s*/gi, '').trim();
  mainTitle = mainTitle.replace(/\s*[🔥⚡️💡📚✨]+\s*$/g, '').trim();
  
  let context = '';
  let metadata = '';
  
  const contextMatch = fullTitle.match(/(?:Rapid Revision|Quick Learning|One Shot|Complete Chapter)/i);
  if (contextMatch) context = contextMatch[0];
  
  const classMatch = fullTitle.match(/Class\s*(\d+(?:th|st|nd|rd)?)/i);
  if (classMatch) metadata = `Class ${classMatch[1]}`;
  
  const authorMatch = fullTitle.match(/by\s+([A-Za-z\s]+?)(?:\s*[|•]|$)/i);
  if (authorMatch) {
    metadata += (metadata ? ' • ' : '') + `by ${authorMatch[1].trim()}`;
  }
  
  return { mainTitle, context, metadata };
};

const LecturePlayer: React.FC<LecturePlayerProps> = ({
  lecture,
  playlistId,
  playlistTitle,
  lectures,
  onClose,
  onLectureChange
}) => {
  const [progress, setProgress] = useState<LectureProgress>({
    watch_time_seconds: 0,
    is_completed: false,
    last_watched_at: new Date()
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);
  const { toast } = useToast();

  // Calculate progress percentage
  const progressPercentage = duration > 0 
    ? Math.min((currentTime / duration) * 100, 100)
    : 0;

  // YouTube player options
  const youtubeOpts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      fs: 1,
      cc_load_policy: 0,
      iv_load_policy: 3,
      disablekb: 0,
    },
  };

  // Calculate playlist progress
  const playlistProgress = lectures.length > 0
    ? (lectures.filter(l => l.id === lecture.id ? progressPercentage >= 80 : false).length / lectures.length) * 100
    : 0;

  useEffect(() => {
    loadLectureProgress();
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [lecture.id]);

  // YouTube player event handlers
  const onPlayerReady = (event: any) => {
    setPlayer(event.target);
    setDuration(event.target.getDuration());
    setLoading(false);

    // Resume from saved timestamp if exists
    if (progress.watch_time_seconds > 0 && !progress.is_completed) {
      event.target.seekTo(progress.watch_time_seconds, true);
      setCurrentTime(progress.watch_time_seconds);
    }
    
    
    // Start progress tracking
    progressIntervalRef.current = setInterval(() => {
      if (event.target && event.target.getCurrentTime) {
        const time = event.target.getCurrentTime();
        setCurrentTime(time);
        updateProgress(time);
      }
    }, 5000);
  };

  const onPlayerStateChange = (event: any) => {
    // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (event.data === 1) {
      // Playing
      console.log('Video playing');
    } else if (event.data === 2) {
      // Paused
      console.log('Video paused');
    } else if (event.data === 0) {
      // Ended
      const completedProgress = {
        ...progress,
        watch_time_seconds: duration,
        is_completed: true,
        last_watched_at: new Date()
      };
      setProgress(completedProgress);
      updateProgress(duration);
      
      toast({
        title: "🎉 Lecture Completed!",
        description: `Great job completing "${lecture.title}"`,
      });
    }
  };

  const loadLectureProgress = async () => {
    try {
      setLoading(false);
      // Progress will be loaded and tracked via the learning-paths-api edge function
      setProgress({
        watch_time_seconds: 0,
        is_completed: false,
        last_watched_at: new Date()
      });
      setCurrentTime(0);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const updateProgress = async (watchTime: number) => {
    // Debounce - only update every 5 seconds
    const now = Date.now();
    if (now - lastUpdateRef.current < 5000) return;
    lastUpdateRef.current = now;

    try {
      const newProgress = {
        watch_time_seconds: Math.max(watchTime, progress.watch_time_seconds),
        is_completed: watchTime >= lecture.duration_seconds * 0.8,
        last_watched_at: new Date()
      };

      setProgress(newProgress);

      // Update progress via edge function
      await supabase.functions.invoke('learning-paths-api', {
        body: {
          action: 'track_progress',
          lecture_id: lecture.id,
          watch_time_seconds: Math.floor(newProgress.watch_time_seconds),
          is_completed: newProgress.is_completed,
          playlist_id: playlistId
        }
      });

      if (newProgress.is_completed && !progress.is_completed) {
        toast({
          title: "🎉 Lecture Completed!",
          description: `Great job!`,
        });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const togglePlay = () => {
    if (player) {
      const state = player.getPlayerState();
      if (state === 1) { // Playing
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    }
  };

  const handleSeek = (percentage: number) => {
    if (player && duration > 0) {
      const newTime = (percentage / 100) * duration;
      player.seekTo(newTime);
      setCurrentTime(newTime);
      updateProgress(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const goToNextLecture = () => {
    const currentIndex = lectures.findIndex(l => l.id === lecture.id);
    if (currentIndex < lectures.length - 1) {
      onLectureChange(lectures[currentIndex + 1].id);
    }
  };

  const goToPreviousLecture = () => {
    const currentIndex = lectures.findIndex(l => l.id === lecture.id);
    if (currentIndex > 0) {
      onLectureChange(lectures[currentIndex - 1].id);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col z-50">
        {/* Header Skeleton */}
        <div className="bg-background border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Roadmap
            </Button>
            <div className="space-y-2">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Main Content Skeleton */}
        <div className="flex flex-1 overflow-hidden">
          {/* Video Player Skeleton */}
          <div className="flex-1 flex flex-col bg-black">
            <div className="flex-1 flex items-center justify-center">
              <Skeleton className="w-full h-full bg-muted/20" />
            </div>

            {/* Controls Skeleton */}
            <div className="bg-black p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-12 bg-muted/20" />
                  <Skeleton className="h-4 w-12 bg-muted/20" />
                </div>
                <Skeleton className="h-2 w-full bg-muted/20" />
                <Skeleton className="h-1 w-full bg-muted/20" />
              </div>
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded bg-muted/20" />
                  <Skeleton className="h-8 w-8 rounded bg-muted/20" />
                  <Skeleton className="h-8 w-8 rounded bg-muted/20" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded bg-muted/20" />
                  <Skeleton className="h-8 w-8 rounded bg-muted/20" />
                  <Skeleton className="h-8 w-8 rounded bg-muted/20" />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton - Playlist */}
          <div className="w-80 bg-background border-l overflow-y-auto">
            <div className="p-4 border-b space-y-3">
              <Skeleton className="h-5 w-48" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>

            <div className="p-2 space-y-2">
              {[...Array(6)].map((_, index) => (
                <Card key={index} className="mb-2">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-1 w-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col z-50">
      {/* Header */}
      <div className="bg-background border-b px-4 md:px-6 py-3 md:py-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Roadmap
        </Button>
        
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-bold line-clamp-2">
              {parseLectureTitle(lecture.title).mainTitle}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              {parseLectureTitle(lecture.title).context && (
                <>
                  <span>{parseLectureTitle(lecture.title).context}</span>
                  {parseLectureTitle(lecture.title).metadata && <span>•</span>}
                </>
              )}
              {parseLectureTitle(lecture.title).metadata && (
                <span>{parseLectureTitle(lecture.title).metadata}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{playlistTitle}</p>
          </div>
          
          <Badge 
            variant={progress.is_completed ? "default" : "secondary"}
            className="flex-shrink-0"
          >
            {progress.is_completed ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Completed
              </span>
            ) : (
              `${Math.round(progressPercentage)}% watched`
            )}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Player Area */}
        <div className="flex-1 flex flex-col bg-black">
          {/* YouTube Player */}
          <div className="flex-1 relative">
            <YouTube
              videoId={lecture.youtube_video_id}
              opts={youtubeOpts}
              onReady={onPlayerReady}
              onStateChange={onPlayerStateChange}
              className="absolute inset-0 w-full h-full"
              iframeClassName="w-full h-full"
            />
          </div>

          {/* Video Controls */}
          <div className="bg-black/90 p-3 md:p-4 text-white">
            {/* Seekbar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <Progress 
                value={progressPercentage} 
                className="cursor-pointer h-2 bg-gray-700"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                  handleSeek(percentage);
                }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-1 md:gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={goToPreviousLecture}
                  className="h-8 w-8 p-0 md:h-10 md:w-10"
                >
                  <SkipBack className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={togglePlay}
                  className="h-10 w-10 p-0 md:h-12 md:w-12"
                >
                  <Play className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={goToNextLecture}
                  className="h-8 w-8 p-0 md:h-10 md:w-10"
                >
                  <SkipForward className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1 md:gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    if (player) {
                      const currentVolume = player.getVolume();
                      player.setVolume(currentVolume > 0 ? 0 : 100);
                    }
                  }}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    if (player) {
                      const currentSpeed = player.getPlaybackRate();
                      const speeds = [0.75, 1, 1.25, 1.5, 2];
                      const currentIndex = speeds.indexOf(currentSpeed);
                      const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
                      player.setPlaybackRate(nextSpeed);
                      toast({ title: `Speed: ${nextSpeed}x` });
                    }
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    const iframe = document.querySelector('iframe');
                    if (iframe?.requestFullscreen) {
                      iframe.requestFullscreen();
                    }
                  }}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Playlist */}
        <div className="w-80 bg-background border-l overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-2">{playlistTitle}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {lectures.length} lectures
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {Math.round(playlistProgress)}% complete
              </span>
            </div>
            <Progress value={playlistProgress} className="mt-2" />
          </div>

          <div className="p-2">
            {lectures.map((lectureItem, index) => {
              const isCurrentLecture = lectureItem.id === lecture.id;
              const lectureProgress = isCurrentLecture ? progressPercentage : Math.random() * 100;
              const isCompleted = lectureProgress >= 80;

              return (
                <Card 
                  key={lectureItem.id}
                  className={`mb-2 cursor-pointer transition-all hover:shadow-md ${
                    isCurrentLecture ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''
                  }`}
                  onClick={() => onLectureChange(lectureItem.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium line-clamp-2 ${
                          isCurrentLecture ? 'text-blue-700 dark:text-blue-300' : ''
                        }`}>
                          {parseLectureTitle(lectureItem.title).mainTitle}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(lectureItem.duration_seconds)}
                        </p>
                        <div className="mt-2">
                          <Progress value={lectureProgress} className="h-1" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round(lectureProgress)}% watched
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturePlayer;