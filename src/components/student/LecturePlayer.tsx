import React, { useState, useEffect, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
      controls: 1,
      modestbranding: 1,
      rel: 0,
      fs: 1,
      cc_load_policy: 0,
      iv_load_policy: 3,
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
    
    // Start progress tracking
    progressIntervalRef.current = setInterval(() => {
      if (event.target && event.target.getCurrentTime) {
        const time = event.target.getCurrentTime();
        setCurrentTime(time);
        updateProgress(time);
      }
    }, 2000);
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
      setLoading(true);
      // In real implementation, load from Supabase
      // For now, use sample data with some progress
      const sampleWatchTime = Math.floor(Math.random() * lecture.duration_seconds * 0.7);
      setProgress({
        watch_time_seconds: sampleWatchTime,
        is_completed: Math.random() > 0.7,
        last_watched_at: new Date()
      });
      setCurrentTime(sampleWatchTime);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (watchTime: number) => {
    try {
      const newProgress = {
        ...progress,
        watch_time_seconds: Math.max(watchTime, progress.watch_time_seconds),
        is_completed: watchTime >= lecture.duration_seconds * 0.8, // 80% completion threshold
        last_watched_at: new Date()
      };

      setProgress(newProgress);

      // Update progress via API
      await supabase.functions.invoke('videos-api', {
        body: {
          action: 'track_progress',
          lecture_id: lecture.id,
          watch_time_seconds: newProgress.watch_time_seconds,
          is_completed: newProgress.is_completed
        }
      });

      if (newProgress.is_completed && !progress.is_completed) {
        toast({
          title: "🎉 Lecture Completed!",
          description: `Great job completing "${lecture.title}"`,
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading lecture...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col z-50">
      {/* Header */}
      <div className="bg-background border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roadmap
          </Button>
          <div>
            <h1 className="font-semibold">{lecture.title}</h1>
            <p className="text-sm text-muted-foreground">{playlistTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={progress.is_completed ? "default" : "secondary"}>
            {progress.is_completed ? "Completed" : `${Math.round(progressPercentage)}% watched`}
          </Badge>
          {progress.is_completed && <CheckCircle className="h-5 w-5 text-green-500" />}
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
          <div className="bg-black p-4 text-white">
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <Progress 
                value={duration > 0 ? (currentTime / duration) * 100 : 0} 
                className="cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                  handleSeek(percentage);
                }}
              />
              <div className="mt-1">
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Progress: {Math.round(progressPercentage)}% • Watch time: {formatTime(progress.watch_time_seconds)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={goToPreviousLecture}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={togglePlay}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToNextLecture}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Volume2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
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
                          {lectureItem.title}
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