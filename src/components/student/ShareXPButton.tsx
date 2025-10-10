import { useState, useEffect } from "react";
import { Share2, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShareCard } from "./ShareCard";
import html2canvas from "html2canvas";
import confetti from "canvas-confetti";

interface ShareXPButtonProps {
  xp: number;
  streak: number;
  level: number;
  compact?: boolean;
}

export const ShareXPButton = ({ xp, streak, level, compact = false }: ShareXPButtonProps) => {
  const [sharedToday, setSharedToday] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cooldownHours, setCooldownHours] = useState(0);
  const [studentName, setStudentName] = useState("Student");
  const [shareCode, setShareCode] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    checkShareStatus();
    fetchStudentName();
  }, []);

  const fetchStudentName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) {
        setStudentName(profile.full_name);
      }
    } catch (error) {
      console.error("Error fetching student name:", error);
    }
  };

  const checkShareStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      const { data } = await supabase
        .from("daily_attendance")
        .select("social_share_done, social_share_at")
        .eq("student_id", user.id)
        .eq("date", today)
        .maybeSingle();

      if (data?.social_share_done) {
        setSharedToday(true);
        
        // Calculate cooldown
        if (data.social_share_at) {
          const shareTime = new Date(data.social_share_at);
          const now = new Date();
          const hoursSinceShare = (now.getTime() - shareTime.getTime()) / (1000 * 60 * 60);
          const remaining = Math.max(0, 24 - hoursSinceShare);
          setCooldownHours(Math.ceil(remaining));
        }
      }
    } catch (error) {
      console.error("Error checking share status:", error);
    }
  };

  const generateShareCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const generateShareImage = async (): Promise<Blob | null> => {
    const shareCardElement = document.getElementById('share-card');
    if (!shareCardElement) return null;

    try {
      const canvas = await html2canvas(shareCardElement, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      });
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  };

  const handleShare = async () => {
    try {
      setIsGenerating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please login to share", variant: "destructive" });
        return;
      }

      // Generate unique share code
      const code = generateShareCode();
      setShareCode(code);

      // Wait for ShareCard to render with new code
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate image
      const imageBlob = await generateShareImage();
      
      const shareText = `🔥 I earned ${xp} Jhakkas Points today on Jhakkas Learning!\n⚡ ${streak} day streak • Level ${level}\n\nGet your rank and gamify your learning experience!\nJoin me: https://jhakkaslearning.com?ref=${code}\n\n#JhakkasLearning #GamifiedEducation #StudySmart`;

      // Try native share API
      if (navigator.share && imageBlob) {
        const file = new File([imageBlob], 'jhakkas-points.png', { type: 'image/png' });
        
        try {
          await navigator.share({
            title: 'My Jhakkas Learning Progress',
            text: shareText,
            files: [file],
          });
        } catch (shareError: any) {
          if (shareError.name !== 'AbortError') {
            // Fallback to text-only share
            await navigator.share({
              title: 'My Jhakkas Learning Progress',
              text: shareText,
            });
          }
        }
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareText);
        toast({ 
          title: "Copied to clipboard!", 
          description: "Share it on your social media now!" 
        });
      }

      // Show immediate feedback
      toast({
        title: "🎉 Sharing in progress...",
        description: "Your XP will be credited in 2 minutes!"
      });

      setSharedToday(true); // Disable button immediately
      setCooldownHours(24);

      // Trigger confetti immediately for engagement
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Award XP after 2 minutes (120,000 ms)
      setTimeout(async () => {
        await awardShareXP(user.id, code);
        
        toast({
          title: "🎁 +5 Jhakkas Points Earned!",
          description: "Thanks for sharing! Your XP has been added."
        });
      }, 120000); // 2 minutes = 120,000 milliseconds
      
    } catch (error) {
      console.error("Error sharing:", error);
      toast({ 
        title: "Share failed", 
        description: "Please try again",
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const awardShareXP = async (userId: string, code: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Award XP
    await supabase.functions.invoke("jhakkas-points-system", {
      body: { 
        action: "add", 
        xp_amount: 5, 
        activity_type: "social_share" 
      }
    });

    // Get current share count
    const { data: currentData } = await supabase
      .from("daily_attendance")
      .select("share_count")
      .eq("student_id", userId)
      .eq("date", today)
      .single();

    // Update daily_attendance
    await supabase
      .from("daily_attendance")
      .update({ 
        social_share_done: true, 
        social_share_at: new Date().toISOString(),
        last_share_date: today,
        share_count: (currentData?.share_count || 0) + 1
      })
      .eq("student_id", userId)
      .eq("date", today);

    // Track share code
    await supabase
      .from("social_shares")
      .insert({
        student_id: userId,
        share_code: code,
      });
  };

  if (compact) {
    return (
      <>
        <Button
          onClick={handleShare}
          disabled={sharedToday || isGenerating}
          size="sm"
          variant={sharedToday ? "outline" : "default"}
          className="gap-2"
        >
          {isGenerating ? (
            "🎨"
          ) : sharedToday ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Shared
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              +5 XP
            </>
          )}
        </Button>
        
        {/* Hidden share card for image generation */}
        <div className="fixed -left-[9999px]">
          <ShareCard 
            xp={xp} 
            streak={streak} 
            level={level} 
            studentName={studentName}
            shareCode={shareCode}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleShare}
        disabled={sharedToday || isGenerating}
        variant={sharedToday ? "outline" : "default"}
        className="w-full gap-2"
      >
        {isGenerating ? (
          <>🎨 Creating share image...</>
        ) : sharedToday ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            ✓ Shared Today! {cooldownHours > 0 && `Next in ${cooldownHours}h`}
          </>
        ) : (
          <>
            <Share2 className="h-5 w-5" />
            📱 Share & Earn +5 XP
          </>
        )}
      </Button>

      {!sharedToday && cooldownHours > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
          <Clock className="h-3 w-3" />
          Available in {cooldownHours}h
        </p>
      )}

      {/* Hidden share card for image generation */}
      <div className="fixed -left-[9999px]">
        <ShareCard 
          xp={xp} 
          streak={streak} 
          level={level} 
          studentName={studentName}
          shareCode={shareCode}
        />
      </div>
    </>
  );
};
