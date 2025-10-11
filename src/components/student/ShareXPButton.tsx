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
  const [xpPending, setXpPending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkShareStatus();
    fetchStudentName();
    checkPendingXP();
  }, []);

  const checkPendingXP = async () => {
    try {
      const pending = localStorage.getItem('pendingXP');
      if (!pending) return;

      const { userId, code, timestamp } = JSON.parse(pending);
      const age = Date.now() - timestamp;

      // If pending for more than 5 minutes, try to process it
      if (age > 5 * 60 * 1000 && age < 30 * 60 * 1000) {
        console.log('Found pending XP award, attempting to process...');
        setXpPending(true);
        
        await awardShareXP(userId, code);
        localStorage.removeItem('pendingXP');
        
        toast({
          title: "✅ XP Awarded!",
          description: "Your pending share XP has been credited!"
        });
        
        setXpPending(false);
      } else if (age > 30 * 60 * 1000) {
        // Expired, clear it
        localStorage.removeItem('pendingXP');
      }
    } catch (error) {
      console.error("Error checking pending XP:", error);
      setXpPending(false);
    }
  };

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

      // Get the last share record (not just today's)
      const { data } = await supabase
        .from("daily_attendance")
        .select("social_share_done, social_share_at, last_share_date")
        .eq("student_id", user.id)
        .order("last_share_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.last_share_date) {
        const lastShareDate = new Date(data.last_share_date);
        const now = new Date();
        const hoursSinceShare = (now.getTime() - lastShareDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceShare < 24) {
          setSharedToday(true);
          setCooldownHours(Math.ceil(24 - hoursSinceShare));
        } else {
          setSharedToday(false);
          setCooldownHours(0);
        }
      } else {
        setSharedToday(false);
        setCooldownHours(0);
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
    if (sharedToday) {
      toast({
        title: "Already shared today!",
        description: `You can share again in ${cooldownHours} hours`,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please login to share", variant: "destructive" });
        setIsGenerating(false);
        return;
      }

      // Get session for authorization headers
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Session expired",
          description: "Please refresh the page and login again",
          variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      // Server-side cooldown check
      const { data: cooldownCheck } = await supabase
        .from("daily_attendance")
        .select("last_share_date, social_share_at")
        .eq("student_id", user.id)
        .order("last_share_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cooldownCheck?.last_share_date) {
        const lastShareDate = new Date(cooldownCheck.last_share_date);
        const now = new Date();
        const hoursSinceShare = (now.getTime() - lastShareDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceShare < 24) {
          const remaining = Math.ceil(24 - hoursSinceShare);
          setSharedToday(true);
          setCooldownHours(remaining);
          toast({
            title: "Already shared recently!",
            description: `Wait ${remaining} hours before sharing again`,
            variant: "destructive"
          });
          setIsGenerating(false);
          return;
        }
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

      console.log('Share completed, marking in database...');

      // Mark as shared IMMEDIATELY in database to prevent double-click
      const today = new Date().toISOString().split('T')[0];
      const { error: immediateMarkError } = await supabase
        .from("daily_attendance")
        .upsert({ 
          student_id: user.id,
          date: today,
          last_share_date: today,
          social_share_done: true,
          social_share_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,date'
        });

      if (immediateMarkError) {
        console.error("Failed to mark share:", immediateMarkError);
        toast({
          title: "Error",
          description: "Failed to process share. Please try again.",
          variant: "destructive"
        });
        
        // Reset UI state
        setSharedToday(false);
        setCooldownHours(0);
        setIsGenerating(false);
        return;
      }

      console.log('Share marked successfully, scheduling XP award...');

      // Store pending XP in localStorage as backup
      localStorage.setItem('pendingXP', JSON.stringify({
        userId: user.id,
        code: code,
        timestamp: Date.now()
      }));

      // Show immediate feedback
      toast({
        title: "🎉 Share successful!",
        description: "Your XP will be credited in 2 minutes!"
      });

      setSharedToday(true); // Disable button immediately
      setCooldownHours(24);
      setXpPending(true); // Show pending indicator

      // Trigger confetti immediately for engagement
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Award XP after 2 minutes (120,000 ms)
      setTimeout(async () => {
        try {
          await awardShareXP(user.id, code);
          localStorage.removeItem('pendingXP');
          setXpPending(false);
          
          toast({
            title: "🎁 +5 Jhakkas Points Earned!",
            description: "Thanks for sharing! Your XP has been added."
          });
        } catch (error) {
          console.error("XP award error:", error);
          // Don't remove from localStorage - will retry on next mount
          toast({
            title: "XP Pending",
            description: "Your XP will be credited when you refresh the page.",
            variant: "default"
          });
        }
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
    
    // Get fresh session for XP award
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error("❌ Session expired - XP award failed");
      
      // Keep in localStorage for retry
      toast({
        title: "Session Expired",
        description: "Please refresh the page to claim your pending 5 XP",
        variant: "default"
      });
      
      throw new Error("Session expired");
    }
    
    // Double-check cooldown before awarding XP
    const { data: finalCheck } = await supabase
      .from("daily_attendance")
      .select("last_share_date")
      .eq("student_id", userId)
      .order("last_share_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (finalCheck?.last_share_date) {
      const lastShareDate = new Date(finalCheck.last_share_date);
      const now = new Date();
      const hoursSinceShare = (now.getTime() - lastShareDate.getTime()) / (1000 * 60 * 60);

      // If less than 24 hours since last share, don't award XP
      if (hoursSinceShare < 24) {
        console.log("Cooldown active, XP not awarded");
        return;
      }
    }

    console.log('Awarding share XP to user:', userId);

    // Award XP with Authorization header
    const { data: xpResult, error: xpError } = await supabase.functions.invoke("jhakkas-points-system", {
      body: { 
        action: "add", 
        xp_amount: 5, 
        activity_type: "social_share" 
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (xpError) {
      console.error("❌ XP award API error:", xpError);
      
      // Check if it's a cooldown error
      if (xpError.message?.includes('Cooldown active') || xpError.message?.includes('24 hours')) {
        toast({
          title: "Already Claimed",
          description: "You've already earned share XP today. Try again tomorrow!",
          variant: "default"
        });
        return;
      }
      
      // Other errors - keep in localStorage for retry
      toast({
        title: "XP Award Pending",
        description: "Will retry when you refresh the page",
        variant: "default"
      });
      
      throw new Error(xpError.message || "Failed to award XP");
    }

    // Trigger XP display update
    window.dispatchEvent(new CustomEvent('xp-updated'));

    // Get current share count
    const { data: currentData } = await supabase
      .from("daily_attendance")
      .select("share_count")
      .eq("student_id", userId)
      .eq("date", today)
      .maybeSingle();

    // Update daily_attendance
    const { error: attendanceError } = await supabase
      .from("daily_attendance")
      .upsert({ 
        student_id: userId,
        date: today,
        social_share_done: true, 
        social_share_at: new Date().toISOString(),
        last_share_date: today,
        share_count: (currentData?.share_count || 0) + 1
      }, {
        onConflict: 'student_id,date'
      });

    if (attendanceError) {
      console.error("Failed to update share status:", attendanceError);
    }

    // Track share code
    const { error: shareError } = await supabase
      .from("social_shares")
      .insert({
        student_id: userId,
        share_code: code,
        platform: "social",
        shared_at: new Date().toISOString()
      });

    if (shareError) {
      console.error("Failed to log social share:", shareError);
    }
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
        disabled={sharedToday || isGenerating || xpPending}
        variant={sharedToday ? "outline" : "default"}
        className="w-full gap-2"
      >
        {isGenerating ? (
          <>🎨 Creating share image...</>
        ) : xpPending ? (
          <>
            <Clock className="h-5 w-5 animate-pulse" />
            ⏳ XP Pending...
          </>
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
