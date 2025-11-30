import React, { useState, useEffect, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  CheckCircle,
  Clock,
  BookOpen,
  ArrowLeft,
  Settings,
  Monitor,
  Gauge,
  Keyboard,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { supabase } from '@/integrations/supabase/client';
import LectureNotes from './LectureNotes';
import { Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [allLecturesProgress, setAllLecturesProgress] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const lastQualityRef = useRef<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [availableRates, setAvailableRates] = useState<number[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Smart controls visibility
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  
  // Auto-play next lecture states
  const [showAutoplayCountdown, setShowAutoplayCountdown] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState(5);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [showNotes, setShowNotes] = useState(true);
  
  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Memoize title parsing to prevent blinking
  const parsedTitle = React.useMemo(() => parseLectureTitle(lecture.title), [lecture.title]);

  // Smart controls: show on interaction, auto-hide in fullscreen when playing
  const showAndMaybeAutoHide = React.useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isFullscreen && isPlaying && !isSeeking) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isFullscreen, isPlaying, isSeeking]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = () => {
      showAndMaybeAutoHide();
    };

    if (isFullscreen) {
      container.addEventListener('mousemove', onMove);
      container.addEventListener('click', onMove);
      container.addEventListener('touchstart', onMove);
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }

    return () => {
      if (isFullscreen && container) {
        container.removeEventListener('mousemove', onMove);
        container.removeEventListener('click', onMove);
        container.removeEventListener('touchstart', onMove);
      }
    };
  }, [isFullscreen, isPlaying, isSeeking, showAndMaybeAutoHide]);

  useEffect(() => {
    if (!isPlaying || isSeeking) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [isPlaying, isSeeking]);

  // Handle fullscreen changes and orientation lock on mobile
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Unlock orientation when exiting fullscreen on mobile
      if (!isCurrentlyFullscreen && isMobile && (screen.orientation as any)?.unlock) {
        try {
          (screen.orientation as any).unlock();
        } catch (err) {
          console.log('Orientation unlock not supported:', err);
        }
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isMobile]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Calculate progress percentage
  const progressPercentage = duration > 0 
    ? Math.min((currentTime / duration) * 100, 100)
    : 0;

  // YouTube player options
  const youtubeOpts = React.useMemo<YouTubeProps['opts']>(() => ({
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
      // Note: we intentionally do not set `vq` here; quality is controlled imperatively
    },
  }), []);

  // Calculate playlist progress
  const playlistProgress = lectures.length > 0
    ? (lectures.filter(l => l.id === lecture.id ? progressPercentage >= 80 : false).length / lectures.length) * 100
    : 0;

  // Load progress when lecture changes
  useEffect(() => {
    loadLectureProgress();
  }, [lecture.id]);

  // Setup keyboard shortcuts when player is ready
  useEffect(() => {
    if (!player) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        
        case 'arrowleft':
          e.preventDefault();
          player.getCurrentTime((time: number) => {
            const newTime = Math.max(0, time - 10);
            player.seekTo(newTime);
            setCurrentTime(newTime);
            toast({ title: `⏪ -10s` });
          });
          break;
        
        case 'arrowright':
          e.preventDefault();
          player.getCurrentTime((time: number) => {
            player.getDuration((dur: number) => {
              const newTime = Math.min(dur, time + 10);
              player.seekTo(newTime);
              setCurrentTime(newTime);
              toast({ title: `⏩ +10s` });
            });
          });
          break;
        
        case 'arrowup':
          e.preventDefault();
          const newVolumeUp = Math.min(100, player.getVolume() + 10);
          player.setVolume(newVolumeUp);
          setVolume(newVolumeUp);
          setIsMuted(false);
          toast({ title: `🔊 Volume: ${newVolumeUp}%` });
          break;
        
        case 'arrowdown':
          e.preventDefault();
          const newVolumeDown = Math.max(0, player.getVolume() - 10);
          player.setVolume(newVolumeDown);
          setVolume(newVolumeDown);
          setIsMuted(newVolumeDown === 0);
          toast({ title: `🔉 Volume: ${newVolumeDown}%` });
          break;
        
        case 'm':
          e.preventDefault();
          if (isMuted) {
            player.unMute();
            player.setVolume(100);
            setVolume(100);
            setIsMuted(false);
            toast({ title: `🔊 Unmuted` });
          } else {
            player.mute();
            setVolume(0);
            setIsMuted(true);
            toast({ title: `🔇 Muted` });
          }
          break;
        
        case 'f':
          e.preventDefault();
          const container = document.getElementById('video-container');
          if (container) {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              container.requestFullscreen();
            }
          }
          break;
        
        case ',':
        case '<':
          e.preventDefault();
          goToPreviousLecture();
          break;
        
        case '.':
        case '>':
          e.preventDefault();
          goToNextLecture();
          break;
        
        case 'escape':
          e.preventDefault();
          onClose();
          break;
        
        case '1': case '2':
          e.preventDefault();
          const speed = parseInt(e.key);
          if (speed >= 1 && speed <= 2) {
            player.setPlaybackRate(speed);
            setPlaybackSpeed(speed);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [player, onClose, toast]);

  // Cleanup intervals when lecture changes
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [lecture.id]);

  // YouTube player event handlers
  const onPlayerReady = (event: any) => {
    setPlayer(event.target);
    playerRef.current = event.target;
    
    // Initialize volume state from player
    const vol = Math.round(event.target.getVolume?.() ?? 100);
    setVolume(vol);
    setIsMuted(vol === 0 || event.target.isMuted?.());
    
    // Get available playback rates from YouTube
    const rates = event.target.getAvailablePlaybackRates() || [];
    setAvailableRates(rates);
    console.log('Available playback rates:', rates);
    
    // Get available quality levels from YouTube
    const qualities = event.target.getAvailableQualityLevels() || [];
    setAvailableQualities(qualities);
    console.log('Available quality levels:', qualities);
    
    if (qualities.length === 0) {
      console.warn('⚠️ No quality options available for this video. Quality selector will be disabled.');
      console.info('💡 This is a YouTube API limitation - not all videos support quality selection in embedded players.');
    }
    
    // Sync current values
    setPlaybackSpeed(event.target.getPlaybackRate() || 1);
    setCurrentQuality(event.target.getPlaybackQuality() || 'auto');
    
    const videoDuration = event.target.getDuration();
    setDuration(videoDuration);
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
      setIsPlaying(true);
      console.log('Video playing');
    } else if (event.data === 2) {
      // Paused
      setIsPlaying(false);
      console.log('Video paused');
    } else if (event.data === 0) {
      // Ended
      setIsPlaying(false);
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

      // Check if there's a next lecture and show auto-play countdown
      const currentIndex = lectures.findIndex(l => l.id === lecture.id);
      if (currentIndex < lectures.length - 1) {
        setShowAutoplayCountdown(true);
        setAutoplayCountdown(5);
        
        let count = 5;
        autoplayTimerRef.current = setInterval(() => {
          count--;
          setAutoplayCountdown(count);
          
          if (count === 0) {
            clearInterval(autoplayTimerRef.current!);
            setShowAutoplayCountdown(false);
            const nextLectureId = lectures[currentIndex + 1].id;
            onLectureChange(nextLectureId);
          }
        }, 1000);
      }
    }
  };

  const onPlaybackRateChange = (event: any) => {
    const newRate = event.target.getPlaybackRate();
    setPlaybackSpeed(newRate);
    console.log('Playback rate changed to:', newRate);
  };

  const onPlaybackQualityChange = (event: any) => {
    const newQuality = event?.data || event?.target?.getPlaybackQuality?.();
    if (!newQuality) return;
    if (lastQualityRef.current !== newQuality) {
      lastQualityRef.current = newQuality;
      setCurrentQuality(newQuality);
      console.log('Quality changed to:', newQuality);
    }
  };

  const loadLectureProgress = async () => {
    try {
      // Load progress for all lectures in playlist
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: progressData } = await supabase
          .from("student_lecture_progress")
          .select("*")
          .in("chapter_lecture_id", lectures.map(l => l.id))
          .eq("student_id", user.id);
        
        setAllLecturesProgress(progressData || []);
      }
      
      setLoading(false);
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

  const handleQualityChange = (quality: string) => {
    if (!player) return;
    
    try {
      if (quality === 'auto') {
        // For auto, let YouTube decide - set to highest available as a hint
        const qualities = player.getAvailableQualityLevels();
        if (qualities && qualities.length > 0) {
          player.setPlaybackQuality(qualities[0]);
        }
      } else {
        // For specific quality, set it directly
        player.setPlaybackQuality(quality);
      }
      
      // Update UI state optimistically
      setCurrentQuality(quality);
      
      // Note: We rely on onPlaybackQualityChange event to show actual quality
      // No toast here - silent operation for better UX
    } catch (error) {
      console.error('Quality change error:', error);
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
      toast({ title: "⏭️ Next Lecture" });
    } else {
      toast({ 
        title: "Last Lecture", 
        description: "You've completed all lectures!",
        variant: "default"
      });
    }
  };

  const goToPreviousLecture = () => {
    const currentIndex = lectures.findIndex(l => l.id === lecture.id);
    if (currentIndex > 0) {
      onLectureChange(lectures[currentIndex - 1].id);
      toast({ title: "⏮️ Previous Lecture" });
    } else {
      toast({ 
        title: "First Lecture", 
        description: "You're already at the first lecture",
        variant: "default"
      });
    }
  };

  const cancelAutoplay = () => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setShowAutoplayCountdown(false);
    setAutoplayCountdown(5);
    toast({ title: "Auto-play cancelled" });
  };

  const skipToNextNow = () => {
    cancelAutoplay();
    goToNextLecture();
  };

  const handleSeekFromNote = (seconds: number) => {
    if (player) {
      player.seekTo(seconds, true);
      if (!isPlaying) {
        player.playVideo();
      }
      toast({ title: `Jumped to ${formatTime(seconds)}` });
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
              {parsedTitle.mainTitle}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              {parsedTitle.context && (
                <>
                  <span>{parsedTitle.context}</span>
                  {parsedTitle.metadata && <span>•</span>}
                </>
              )}
              {parsedTitle.metadata && (
                <span>{parsedTitle.metadata}</span>
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
          
          {/* Speed Indicator Badge */}
          {playbackSpeed !== 1 && (
            <Badge variant="outline" className="flex-shrink-0">
              <Gauge className="h-3 w-3 mr-1" />
              {playbackSpeed}x
            </Badge>
          )}
          
          {/* Keyboard Shortcuts Help */}
          <div className="hidden md:block">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  <Keyboard className="h-3 w-3 mr-1" />
                  Shortcuts
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Keyboard Shortcuts</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd> Play/Pause</div>
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">M</kbd> Mute</div>
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">←</kbd> -10s</div>
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">→</kbd> +10s</div>
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">↑</kbd> Volume +</div>
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">↓</kbd> Volume -</div>
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">F</kbd> Fullscreen</div>
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">P</kbd> PiP Mode</div>
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">1-2</kbd> Speed</div>
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> Exit</div>
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">&lt;</kbd> Prev</div>
                    <div><kbd className="px-2 py-1 bg-muted rounded text-xs">&gt;</kbd> Next</div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex flex-1 overflow-hidden ${
        isMobile ? 'flex-col' : 'flex-row'
      }`}>
        {/* Video Player Area */}
        <div 
          ref={containerRef}
          id="video-container"
          className={`${
            isMobile ? 'flex-none' : 'flex-1'
          } flex flex-col bg-black relative overflow-hidden${isFullscreen && !showControls ? ' cursor-none' : ''}`}
          style={{ isolation: 'isolate' }}
        >
          {/* YouTube Player */}
          <div className={`${
            isMobile ? 'aspect-video' : 'flex-1'
          } relative${isFullscreen ? ' pointer-events-none' : ''}`}>
            <YouTube
              videoId={lecture.youtube_video_id}
              opts={youtubeOpts}
              onReady={onPlayerReady}
              onStateChange={onPlayerStateChange}
              onPlaybackRateChange={onPlaybackRateChange}
              onPlaybackQualityChange={onPlaybackQualityChange}
              className="absolute inset-0 w-full h-full"
              iframeClassName="w-full h-full"
            />

            {/* Auto-play Countdown Overlay */}
            {showAutoplayCountdown && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-background rounded-lg p-6 md:p-8 max-w-md w-full mx-4 text-center space-y-4">
                  <h3 className="text-lg md:text-xl font-semibold">Next Lecture Starting In</h3>
                  
                  <div className="text-5xl md:text-6xl font-bold text-primary">
                    {autoplayCountdown}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm md:text-base text-muted-foreground">
                      Up next: {lectures[lectures.findIndex(l => l.id === lecture.id) + 1]?.title}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={cancelAutoplay}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={skipToNextNow}
                    >
                      Play Now
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Controls */}
          <div className={`p-3 md:p-4 text-white transition-all duration-300 ${
            isFullscreen ? `absolute bottom-0 left-0 right-0 z-[100] bg-gradient-to-t from-black/90 via-black/60 to-transparent pb-6 pt-16 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}` : 'bg-black/90'
          }`}>

            {/* Seekbar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <Slider
                value={[progressPercentage]}
                min={0}
                max={100}
                step={0.1}
                className="cursor-pointer [&_[data-radix-slider-track]]:h-2 [&_[data-radix-slider-track]]:bg-gray-700/50 [&_[data-radix-slider-range]]:bg-blue-500 [&_[data-radix-slider-thumb]]:h-4 [&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:border-2 [&_[data-radix-slider-thumb]]:border-blue-500"
                onValueChange={(value) => {
                  setIsSeeking(true);
                  setShowControls(true);
                  if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                  // Real-time preview while dragging
                  const newTime = (value[0] / 100) * duration;
                  setCurrentTime(newTime);
                }}
                onValueCommit={(value) => {
                  // Seek when drag ends
                  handleSeek(value[0]);
                  setIsSeeking(false);
                  // Auto-hide controls after seeking
                  setTimeout(() => {
                    if (isPlaying && isFullscreen) {
                      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
                    }
                  }, 1000);
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
                  {isPlaying ? (
                    <Pause className="h-5 w-5 md:h-6 md:w-6" />
                  ) : (
                    <Play className="h-5 w-5 md:h-6 md:w-6" />
                  )}
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
              {/* Volume Control with Slider */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {volume === 0 || isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : volume < 50 ? (
                      <Volume1 className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent container={containerRef.current} className="w-12 h-40 p-2" align="end" side="top">
                  <div className="flex flex-col items-center h-full">
                    <span className="text-xs mb-2 text-foreground">{volume}%</span>
                    <Slider
                      orientation="vertical"
                      value={[volume]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(val) => {
                        const newVolume = val[0];
                        setVolume(newVolume);
                        setIsMuted(newVolume === 0);
                        if (player) {
                          player.setVolume(newVolume);
                        }
                      }}
                      className="h-full"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Speed Control with Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 px-2 flex items-center gap-1"
                  >
                    <Gauge className="h-4 w-4" />
                    <span className="text-xs hidden md:inline">{playbackSpeed}x</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-32 p-2" align="end">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold mb-2 text-muted-foreground">Speed</div>
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => {
                      const isAvailable = availableRates.length === 0 || availableRates.includes(speed);
                      return (
                        <Button
                          key={speed}
                          variant={playbackSpeed === speed ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-xs"
                          disabled={!isAvailable}
                          onClick={() => {
                            if (player && isAvailable) {
                              player.setPlaybackRate(speed);
                              setPlaybackSpeed(speed);
                            }
                          }}
                        >
                          {speed}x {!isAvailable && '(N/A)'}
                        </Button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Quality Selector */}
              {availableQualities.length > 0 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-32 p-2" align="end">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold mb-2 text-muted-foreground">Quality</div>
                      {['auto', ...availableQualities].map((quality) => {
                        const qualityLabel = quality === 'auto' ? 'Auto' :
                                             quality === 'tiny' ? '144p' :
                                             quality === 'small' ? '240p' :
                                             quality === 'medium' ? '360p' :
                                             quality === 'large' ? '480p' :
                                             quality === 'hd720' ? '720p' :
                                             quality === 'hd1080' ? '1080p' :
                                             quality === 'highres' ? '4K' : quality;
                        
                        return (
                          <Button
                            key={quality}
                            variant={currentQuality === quality ? "default" : "ghost"}
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => handleQualityChange(quality)}
                          >
                            {qualityLabel} {currentQuality === quality && <Check className="ml-auto h-3 w-3" />}
                          </Button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0 opacity-40 cursor-not-allowed"
                        disabled
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Quality control unavailable</p>
                      <p className="text-xs text-muted-foreground">This video doesn't support quality selection</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Fullscreen */}
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                onClick={async () => {
                  const container = document.getElementById('video-container');
                  if (container) {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                      // Unlock orientation on mobile
                      if (isMobile && (screen.orientation as any)?.unlock) {
                        try {
                          (screen.orientation as any).unlock();
                        } catch (err) {
                          console.log('Orientation unlock not supported:', err);
                        }
                      }
                    } else {
                      await container.requestFullscreen();
                      // Lock to landscape on mobile
                      if (isMobile && (screen.orientation as any)?.lock) {
                        try {
                          await (screen.orientation as any).lock('landscape');
                        } catch (err) {
                          console.log('Orientation lock not supported:', err);
                        }
                      }
                    }
                  }
                }}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
            </div>
          </div>

        </div>

        {/* Lecture Description (Mobile Only) */}
        {isMobile && (
          <div className="p-4 border-b bg-background">
            <h2 className="font-semibold text-lg mb-2">
              {parsedTitle.mainTitle}
            </h2>
            {parsedTitle.context && (
              <Badge variant="secondary" className="mb-2">
                {parsedTitle.context}
              </Badge>
            )}
            {parsedTitle.metadata && (
              <p className="text-sm text-muted-foreground">
                {parsedTitle.metadata}
              </p>
            )}
            {lecture.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {lecture.description}
              </p>
            )}
          </div>
        )}

        {/* Sidebar/Playlist - Below video on mobile, right side on desktop */}
        <div className={`${
          isMobile 
            ? 'flex-1 bg-background overflow-y-auto' 
            : 'w-96 bg-background border-l flex flex-col overflow-hidden'
        }`}>
          {/* Lecture Notes Section - Top of Sidebar (Desktop Only) */}
          {!isMobile && (
            <div className="border-b">
              <Button 
                variant="ghost" 
                onClick={() => setShowNotes(!showNotes)}
                className="w-full justify-between p-4 h-auto hover:bg-muted/50"
              >
                <span className="font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  My Notes
                </span>
                {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {showNotes && (
                <div className="px-4 pb-4 max-h-64 overflow-y-auto">
                  <LectureNotes
                    lectureId={lecture.id}
                    currentTime={currentTime}
                    onSeekToTime={handleSeekFromNote}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Playlist Header */}
          <div className="p-4 border-b flex-shrink-0 bg-background">
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

          {/* Playlist Items */}
          <div className={`p-2 ${isMobile ? '' : 'flex-1 overflow-y-auto'}`}>
            {lectures.map((lectureItem, index) => {
              const isCurrentLecture = lectureItem.id === lecture.id;
              const lectureItemProgress = allLecturesProgress.find(p => p.chapter_lecture_id === lectureItem.id);
              const watchTimeSeconds = isCurrentLecture ? currentTime : (lectureItemProgress?.watch_time_seconds || 0);
              const lectureProgressPercent = Math.round((watchTimeSeconds / lectureItem.duration_seconds) * 100);
              const isCompleted = isCurrentLecture ? progress.is_completed : (lectureItemProgress?.is_completed || false);

              return (
                <Card 
                  key={lectureItem.id}
                  className={`mb-2 cursor-pointer transition-all hover:shadow-md ${
                    isCurrentLecture ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => onLectureChange(lectureItem.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 relative">
                        <div className="w-20 h-14 bg-muted rounded overflow-hidden">
                          <img
                            src={`https://img.youtube.com/vi/${lectureItem.youtube_video_id}/mqdefault.jpg`}
                            alt={lectureItem.title}
                            className="w-full h-full object-cover"
                          />
                          {/* Progress bar at bottom of thumbnail */}
                          {lectureProgressPercent > 0 && (
                            <div className="absolute bottom-0 left-0 right-0">
                              <Progress 
                                value={lectureProgressPercent} 
                                className="h-1 rounded-none" 
                              />
                            </div>
                          )}
                        </div>
                        {/* Status badges */}
                        {isCompleted && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {!isCompleted && lectureProgressPercent > 0 && lectureProgressPercent < 80 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Clock className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {lectureProgressPercent > 0 && (
                          <div className="absolute top-0 right-0 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                            {lectureProgressPercent}%
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium line-clamp-2 ${
                          isCurrentLecture ? 'text-primary' : ''
                        }`}>
                          {parseLectureTitle(lectureItem.title).mainTitle}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(lectureItem.duration_seconds)}
                        </p>
                        {lectureProgressPercent > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={lectureProgressPercent} className="h-1 flex-1" />
                            <span className="text-xs text-muted-foreground">
                              {lectureProgressPercent}%
                            </span>
                          </div>
                        )}
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