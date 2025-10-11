import { useEffect, useState } from "react";
import { Flame, ShieldCheck, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface StreakData {
  streak_days: number;
  total_xp: number;
}

interface StudentAnalytics {
  streak_days: number;
}

interface StudentGamification {
  total_xp: number;
}

export const StreakTracker = () => {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [hasStreakFreeze, setHasStreakFreeze] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch streak_days from student_analytics
        const { data: analyticsData, error: analyticsError } = await supabase
          .from("student_analytics")
          .select("streak_days")
          .eq("student_id", user.id)
          .maybeSingle();

        if (analyticsError) throw analyticsError;

        // Fetch total_xp from student_gamification
        const { data: gamificationData, error: gamificationError } = await supabase
          .from("student_gamification")
          .select("total_xp")
          .eq("student_id", user.id)
          .maybeSingle();

        if (gamificationError) throw gamificationError;

        if (analyticsData || gamificationData) {
          setStreakData({
            streak_days: analyticsData?.streak_days || 0,
            total_xp: gamificationData?.total_xp || 0
          });
        }
      } catch (error) {
        console.error("Error fetching streak:", error);
      }
    };

    fetchStreak();

    const channel = supabase
      .channel('streak-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'student_analytics' },
        () => fetchStreak()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'student_gamification' },
        () => fetchStreak()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const buyStreakFreeze = async () => {
    const cost = 100;
    if (!streakData || streakData.total_xp < cost) {
      toast({
        title: "Not enough Jhakkas Points",
        description: `You need ${cost} Jhakkas Points to buy a streak freeze.`,
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { error } = await supabase.functions.invoke("jhakkas-points-system", {
        body: { 
          action: "add",
          xp_amount: -cost,
          activity_type: "streak_freeze_purchase"
        },
        headers
      });

      if (error) throw error;

      setHasStreakFreeze(true);
      toast({
        title: "Streak Freeze Activated!",
        description: "Your streak is protected for today.",
      });
    } catch (error) {
      console.error("Error buying streak freeze:", error);
      toast({
        title: "Error",
        description: "Failed to purchase streak freeze.",
        variant: "destructive"
      });
    }
  };

  if (!streakData) return null;

  const dailyGoalProgress = 50; // Example: 50% towards daily goal
  const streakMilestone = Math.floor(streakData.streak_days / 7) * 7;
  const nextMilestone = streakMilestone + 7;
  const milestoneProgress = ((streakData.streak_days - streakMilestone) / 7) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Daily Streak
        </CardTitle>
        <CardDescription>
          Keep learning every day to maintain your streak!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Streak Display */}
        <div className="text-center">
          <div className="relative inline-block">
            <Flame className="h-20 w-20 text-orange-500 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white drop-shadow-lg">
                {streakData.streak_days}
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {streakData.streak_days === 1 ? 'day' : 'days'} streak
          </p>
        </div>

        {/* Daily Goal Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Daily goal</span>
            <span className="font-medium">{dailyGoalProgress}%</span>
          </div>
          <Progress value={dailyGoalProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Complete 3 lessons to reach your daily goal
          </p>
        </div>

        {/* Milestone Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Next milestone</span>
            <span className="font-medium">{nextMilestone} days</span>
          </div>
          <Progress value={milestoneProgress} className="h-2" />
        </div>

        {/* Streak Freeze */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`h-5 w-5 ${hasStreakFreeze ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm font-medium">Streak Freeze</p>
                <p className="text-xs text-muted-foreground">
                  {hasStreakFreeze ? 'Active' : 'Protect your streak for 1 day'}
                </p>
              </div>
            </div>
            {!hasStreakFreeze && (
              <Button
                onClick={buyStreakFreeze}
                size="sm"
                variant="outline"
                disabled={!streakData || streakData.total_xp < 100}
              >
                <Coins className="h-4 w-4 mr-1" />
                100 XP
              </Button>
            )}
          </div>
        </div>

        {/* Streak Tips */}
        <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg">
          💡 <strong>Tip:</strong> Complete at least one lesson each day to maintain your streak!
        </div>
      </CardContent>
    </Card>
  );
};
