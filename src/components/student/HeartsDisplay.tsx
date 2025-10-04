import { useEffect, useState } from "react";
import { Heart, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface HeartsData {
  current_hearts: number;
  max_hearts: number;
  last_heart_refill_at: string;
}

export const HeartsDisplay = ({ compact = false }: { compact?: boolean }) => {
  const [heartsData, setHeartsData] = useState<HeartsData | null>(null);
  const [timeUntilRefill, setTimeUntilRefill] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchHearts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("student_hearts")
          .select("*")
          .eq("student_id", user.id)
          .single();

        if (error) throw error;
        if (data) setHeartsData(data);
      } catch (error) {
        console.error("Error fetching hearts:", error);
      }
    };

    fetchHearts();

    const channel = supabase
      .channel('hearts-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'student_hearts' },
        () => fetchHearts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!heartsData?.last_heart_refill_at) return;

    const updateTimer = () => {
      const lastRefill = new Date(heartsData.last_heart_refill_at);
      const now = new Date();
      const nextRefill = new Date(lastRefill.getTime() + 60 * 60 * 1000); // 1 hour
      const diff = nextRefill.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilRefill("Ready!");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeUntilRefill(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [heartsData]);

  const handlePracticeForHearts = () => {
    toast({
      title: "Practice Mode",
      description: "Complete exercises to earn hearts back!",
    });
  };

  if (!heartsData) return null;

  const heartPercentage = (heartsData.current_hearts / heartsData.max_hearts) * 100;
  const fullHearts = Math.floor(heartsData.current_hearts);
  const emptyHearts = heartsData.max_hearts - fullHearts;

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg">
        <div className="flex items-center gap-1">
          {Array.from({ length: fullHearts }).map((_, i) => (
            <Heart key={`full-${i}`} className="h-4 w-4 fill-red-500 text-red-500" />
          ))}
          {Array.from({ length: emptyHearts }).map((_, i) => (
            <Heart key={`empty-${i}`} className="h-4 w-4 text-muted-foreground/30" />
          ))}
        </div>
        <span className="text-sm font-medium">{heartsData.current_hearts}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Hearts
          </h3>
          <p className="text-sm text-muted-foreground">
            {heartsData.current_hearts} / {heartsData.max_hearts}
          </p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: fullHearts }).map((_, i) => (
            <Heart key={`full-${i}`} className="h-6 w-6 fill-red-500 text-red-500 animate-pulse" />
          ))}
          {Array.from({ length: emptyHearts }).map((_, i) => (
            <Heart key={`empty-${i}`} className="h-6 w-6 text-muted-foreground/20" />
          ))}
        </div>
      </div>

      <Progress value={heartPercentage} className="h-2" />

      {heartsData.current_hearts < heartsData.max_hearts && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Next heart in:</span>
            <span className="font-mono font-medium">{timeUntilRefill}</span>
          </div>
          <Button
            onClick={handlePracticeForHearts}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Zap className="h-4 w-4 mr-2" />
            Practice to Earn Hearts
          </Button>
        </div>
      )}

      {heartsData.current_hearts === 0 && (
        <div className="text-xs text-destructive text-center p-2 bg-destructive/10 rounded">
          Out of hearts! Practice or wait for refill.
        </div>
      )}
    </div>
  );
};
