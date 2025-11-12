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
  const [xpGain, setXpGain] = useState<number | null>(null);
  const [showFly, setShowFly] = useState(false);


  useEffect(() => {
    const fetchXP = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;

        const { data, error } = await supabase.functions.invoke("jhakkas-points-system", {
          body: { action: "get" },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
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

  // Subscribe to realtime updates with user filter
  const channel = supabase
    .channel('jhakkas-updates')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'student_gamification',
        filter: studentId ? `student_id=eq.${studentId}` : undefined
      },
      () => {
        console.log('Realtime XP update detected');
        fetchXP();
      }
    )
    .subscribe();

  // Listen for manual XP update events with immediate re-fetch
  const handleXPUpdate = () => {
    console.log('Manual XP update triggered - immediate refresh');
    setTimeout(() => fetchXP(), 100); // Small delay to ensure DB update completes
  };
  window.addEventListener('xp-updated', handleXPUpdate);

  // Listen for XP fly animation events
  const handleXPFly = (e: any) => {
    if (e?.detail?.amount) {
      setXpGain(Number(e.detail.amount));
      setShowFly(true);
      setTimeout(() => setShowFly(false), 1200);
      setTimeout(() => setXpGain(null), 1500);
    }
  };
  window.addEventListener('xp-fly', handleXPFly);

  return () => {
    supabase.removeChannel(channel);
    window.removeEventListener('xp-updated', handleXPUpdate);
    window.removeEventListener('xp-fly', handleXPFly);
  };
  }, [studentId]);

  if (!xpData) return null;

  const FlyBadge = () => (
    <div className={`pointer-events-none absolute -top-3 right-0 transition-all duration-700 ${showFly ? 'opacity-100 -translate-y-3' : 'opacity-0'}`}>
      <div className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-soft">
        +{Number(xpGain || 0).toFixed(2)} XP
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="relative flex items-center gap-3">
        {xpData.streak_days > 0 && (
          <div className="flex items-center gap-1 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20">
            <span className="text-sm font-semibold">🔥 {xpData.streak_days}</span>
          </div>
        )}
        <div className="relative">
          <FlyBadge />
          <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
            <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">🪙 {Number(xpData.xp).toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-3">
      <FlyBadge />
      <div className="flex items-center justify-between">
        {xpData.streak_days > 0 && (
          <div className="flex items-center gap-2 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20">
            <span className="text-lg">🔥</span>
            <span className="font-semibold">{xpData.streak_days} day streak</span>
          </div>
        )}
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-3 py-1 rounded-lg border border-yellow-500/20">
          <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <span className="font-semibold text-yellow-700 dark:text-yellow-300">🪙 {Number(xpData.xp).toFixed(2)} Jhakkas Points</span>
        </div>
      </div>

      {/* Share Button */}
      <ShareXPButton 
        xp={xpData.xp} 
        streak={xpData.streak_days} 
        level={xpData.level} 
      />
    </div>
  );
};
