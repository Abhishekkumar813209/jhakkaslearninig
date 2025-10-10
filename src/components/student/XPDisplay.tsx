import { useEffect, useState } from "react";
import { Trophy, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShareXPButton } from "./ShareXPButton";

interface XPData {
  xp: number;
  level: number;
  streak_days: number;
}

export const XPDisplay = ({ studentId, compact = false }: { studentId?: string; compact?: boolean }) => {
  const [xpData, setXpData] = useState<XPData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchXP = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("jhakkas-points-system", {
          body: { action: "get" }
        });

        if (error) throw error;
        if (data?.success && data?.data) {
          setXpData(data.data);
        }
      } catch (error) {
        console.error("Error fetching Jhakkas Points:", error);
      }
    };

    fetchXP();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('jhakkas-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'student_gamification' },
        () => fetchXP()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  if (!xpData) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Lv {xpData.level}</span>
        </div>
        <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
          <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">🪙 {xpData.xp}</span>
        </div>
      </div>
    );
  }

  const xpForNextLevel = xpData.level * 100;
  const currentLevelXP = xpData.xp % 100;
  const progressPercent = (currentLevelXP / xpForNextLevel) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="font-semibold">Level {xpData.level}</span>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-3 py-1 rounded-lg border border-yellow-500/20">
          <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <span className="font-semibold text-yellow-700 dark:text-yellow-300">🪙 {xpData.xp} Jhakkas Points</span>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{currentLevelXP} XP</span>
          <span>{xpForNextLevel} XP</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {xpData.streak_days > 0 && (
        <div className="text-xs text-muted-foreground">
          🔥 {xpData.streak_days} day streak!
        </div>
      )}

      {/* Share Button */}
      <ShareXPButton 
        xp={xpData.xp} 
        streak={xpData.streak_days} 
        level={xpData.level} 
      />
    </div>
  );
};
