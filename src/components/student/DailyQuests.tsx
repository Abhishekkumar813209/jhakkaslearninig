import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Gift, icons } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Quest {
  id: string;
  title: string;
  description: string;
  quest_type: string;
  target_value: number;
  xp_reward: number;
  icon: string;
}

interface QuestProgress {
  quest_id: string;
  current_value: number;
  is_completed: boolean;
}

export const DailyQuests = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [progress, setProgress] = useState<Map<string, QuestProgress>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    fetchQuests();
    fetchProgress();

    // Auto-refresh at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      fetchQuests();
      fetchProgress();
      toast({
        title: "New Daily Quests!",
        description: "Fresh quests are now available.",
      });
    }, timeUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  const fetchQuests = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_quests")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      if (data) setQuests(data);
    } catch (error) {
      console.error("Error fetching quests:", error);
    }
  };

  const fetchProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("student_quest_progress")
        .select("*")
        .eq("student_id", user.id)
        .eq("date", today);

      if (error) throw error;
      if (data) {
        const progressMap = new Map();
        data.forEach(p => progressMap.set(p.quest_id, p));
        setProgress(progressMap);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  };

  const claimReward = async (quest: Quest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const questProgress = progress.get(quest.id);
      if (!questProgress?.is_completed) return;

      // Award XP
      const { error } = await supabase.functions.invoke("jhakkas-points-system", {
        body: {
          action: "add",
          xp_amount: quest.xp_reward,
          activity_type: "quest_completion"
        }
      });

      if (error) throw error;

      toast({
        title: "Quest Completed!",
        description: `Earned ${quest.xp_reward} XP!`,
      });

      fetchProgress();
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast({
        title: "Error",
        description: "Failed to claim reward",
        variant: "destructive"
      });
    }
  };

  const getIconComponent = (iconName: string) => {
    const LucideIcon = icons[iconName as keyof typeof icons] as any;
    return LucideIcon ? <LucideIcon className="h-5 w-5" /> : <Circle className="h-5 w-5" />;
  };

  const completedCount = Array.from(progress.values()).filter(p => p.is_completed).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Daily Quests
            </CardTitle>
            <CardDescription>Complete quests to earn rewards</CardDescription>
          </div>
          <Badge variant="secondary">
            {completedCount}/{quests.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {quests.map(quest => {
          const questProgress = progress.get(quest.id);
          const currentValue = questProgress?.current_value || 0;
          const isCompleted = questProgress?.is_completed || false;
          const progressPercent = Math.min((currentValue / quest.target_value) * 100, 100);

          return (
            <div
              key={quest.id}
              className={`p-4 rounded-lg border transition-all ${
                isCompleted
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-card hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  isCompleted ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  {getIconComponent(quest.icon)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {quest.title}
                        {isCompleted && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {quest.description}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium text-primary">
                        +{quest.xp_reward} XP
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>
                        {currentValue} / {quest.target_value}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  {isCompleted && (
                    <Button
                      onClick={() => claimReward(quest)}
                      size="sm"
                      className="w-full"
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Claim Reward
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {quests.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No quests available today</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
