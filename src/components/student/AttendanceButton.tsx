import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Flame, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

export const AttendanceButton = () => {
  const [marked, setMarked] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkTodayAttendance();
  }, []);

  const checkTodayAttendance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("daily_attendance")
        .select("streak_days")
        .eq("student_id", user.id)
        .eq("date", today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMarked(true);
        setStreak(data.streak_days);
      } else {
        // Check latest streak from previous days
        const { data: latestAttendance } = await supabase
          .from("daily_attendance")
          .select("streak_days, date")
          .eq("student_id", user.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestAttendance) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          // If last attendance was yesterday, current streak continues
          // Otherwise, streak will reset to 1 when marked
          if (latestAttendance.date === yesterdayStr) {
            setStreak(latestAttendance.streak_days);
          } else {
            setStreak(0);
          }
        }
      }
    } catch (error: any) {
      console.error("Error checking attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async () => {
    try {
      setMarking(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please log in to mark attendance",
          variant: "destructive"
        });
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Insert attendance record (streak is calculated by trigger)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("daily_attendance")
        .insert({
          student_id: user.id,
          date: today,
          xp_earned: 5
        })
        .select()
        .single();

      if (attendanceError) {
        if (attendanceError.code === '23505') {
          toast({
            title: "Already Marked",
            description: "You've already marked attendance today!",
            variant: "destructive"
          });
        } else {
          throw attendanceError;
        }
        return;
      }

      // Award XP
      await supabase.functions.invoke("jhakkas-points-system", {
        body: { 
          action: "add", 
          xp_amount: 5, 
          activity_type: "attendance",
          metadata: { date: today }
        }
      });

      setMarked(true);
      setStreak(attendanceData.streak_days);

      // Confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: "✅ Attendance Marked!",
        description: `+5 XP earned! ${attendanceData.streak_days > 1 ? `🔥 ${attendanceData.streak_days} day streak!` : 'Start your streak!'}`,
      });

    } catch (error: any) {
      console.error("Error marking attendance:", error);
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 animate-pulse" />
              <div className="h-4 w-32 bg-primary/10 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              {marked ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Calendar className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">Daily Attendance</p>
              {streak > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span>{streak} day streak</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Flame className="h-3 w-3 text-orange-500" />
                {streak}
              </Badge>
            )}
            <Button 
              onClick={markAttendance} 
              disabled={marked || marking}
              variant={marked ? "outline" : "default"}
              size="sm"
            >
              {marking ? (
                "Marking..."
              ) : marked ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Attended Today
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-1" />
                  Mark Attendance
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
