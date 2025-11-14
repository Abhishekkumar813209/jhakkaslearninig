import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, X } from 'lucide-react';

interface ContinueWatchingData {
  lectureId: string;
  lectureTitle: string;
  thumbnailUrl: string | null;
  videoDurationSeconds: number;
  watchTimeSeconds: number;
  chapterId: string;
  chapterName: string;
}

export const ContinueWatchingCard = () => {
  const [data, setData] = useState<ContinueWatchingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem('continue-watching-dismissed');
    if (dismissed) {
      const dismissedData = JSON.parse(dismissed);
      if (Date.now() - dismissedData.timestamp < 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
        setIsLoading(false);
        return;
      }
    }

    fetchContinueWatching();
  }, []);

  const fetchContinueWatching = async () => {
    try {
      const { data: response, error } = await supabase.functions.invoke('chapter-lectures-api', {
        body: { action: 'get_continue_watching' }
      });

      if (error || !response?.success || !response?.data) {
        setData(null);
        return;
      }

      setData(response.data);
    } catch (err) {
      console.error('Error fetching continue watching:', err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('continue-watching-dismissed', JSON.stringify({
      timestamp: Date.now()
    }));
  };

  const handleContinue = () => {
    if (!data) return;
    navigate(`/lecture/${data.lectureId}`);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Skeleton className="w-full md:w-[280px] aspect-video rounded-lg" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </Card>
    );
  }

  if (!data || isDismissed) {
    return null;
  }

  const progressPercentage = (data.watchTimeSeconds / data.videoDurationSeconds) * 100;
  const timeRemaining = data.videoDurationSeconds - data.watchTimeSeconds;

  return (
    <Card className="relative p-6 mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 hover:shadow-lg transition-all">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-shrink-0">
          {data.thumbnailUrl ? (
            <img
              src={data.thumbnailUrl}
              alt={data.lectureTitle}
              className="w-full md:w-[280px] aspect-video object-cover rounded-lg"
            />
          ) : (
            <div className="w-full md:w-[280px] aspect-video bg-muted rounded-lg flex items-center justify-center">
              <Play className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Continue Watching</p>
            <h3 className="text-xl font-semibold mb-2 line-clamp-2">{data.lectureTitle}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {data.chapterName} • {formatTime(timeRemaining)} remaining
            </p>

            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{Math.round(progressPercentage)}% complete</span>
                <span>{formatTime(data.watchTimeSeconds)} / {formatTime(data.videoDurationSeconds)}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>

          <div>
            <Button onClick={handleContinue} className="gap-2">
              <Play className="h-4 w-4" />
              Continue Watching
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
