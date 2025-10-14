import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";

interface SubjectProgress {
  subject: string;
  completedChapters: number;
  totalChapters: number;
  percentage: number;
}

export const SubjectProgressCircles = () => {
  const { data: subjectProgress, isLoading } = useQuery({
    queryKey: ["subject-progress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get student's roadmap
      const { data: roadmapData } = await supabase
        .from("student_roadmaps")
        .select("batch_roadmap_id")
        .eq("student_id", user.id)
        .maybeSingle();

      if (!roadmapData?.batch_roadmap_id) return [];

      // Get roadmap plan
      const { data: roadmap } = await supabase
        .from("batch_roadmaps")
        .select("ai_generated_plan")
        .eq("id", roadmapData.batch_roadmap_id)
        .single();

      if (!roadmap?.ai_generated_plan) return [];

      const plan = roadmap.ai_generated_plan as any;
      const subjectMap = new Map<string, SubjectProgress>();

      // Process roadmap data
      if (plan.days && Array.isArray(plan.days)) {
        plan.days.forEach((day: any) => {
          if (day.subject) {
            if (!subjectMap.has(day.subject)) {
              subjectMap.set(day.subject, {
                subject: day.subject,
                completedChapters: 0,
                totalChapters: 0,
                percentage: 0
              });
            }
            const progress = subjectMap.get(day.subject)!;
            progress.totalChapters++;
          }
        });
      }

      // Get completion data (status = 'completed')
      const { data: completionData } = await supabase
        .from("student_chapter_progress")
        .select("chapter_id, status, completed_at")
        .eq("student_id", user.id)
        .eq("status", "completed");

      // Calculate completed chapters per subject
      if (completionData && plan.days) {
        completionData.forEach((completion) => {
          if (completion.completed_at) {
            const day = plan.days.find((d: any) => d.chapter_id === completion.chapter_id);
            if (day?.subject) {
              const progress = subjectMap.get(day.subject);
              if (progress) {
                progress.completedChapters++;
              }
            }
          }
        });
      }

      // Calculate percentages
      const results: SubjectProgress[] = [];
      subjectMap.forEach((progress) => {
        progress.percentage = progress.totalChapters > 0
          ? Math.round((progress.completedChapters / progress.totalChapters) * 100)
          : 0;
        results.push(progress);
      });

      return results;
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Subject Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (!subjectProgress || subjectProgress.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Subject Progress</h3>
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No subject progress data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Subject Progress</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {subjectProgress.map((subject) => (
          <div key={subject.subject} className="flex flex-col items-center">
            {/* Circular Progress */}
            <div className="relative h-24 w-24">
              <svg className="transform -rotate-90 h-24 w-24">
                {/* Background circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - subject.percentage / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              {/* Percentage text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">
                  {subject.percentage}%
                </span>
              </div>
            </div>
            
            {/* Subject name */}
            <p className="mt-3 text-sm font-medium text-center text-foreground">
              {subject.subject}
            </p>
            <p className="text-xs text-muted-foreground">
              {subject.completedChapters}/{subject.totalChapters} chapters
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};
