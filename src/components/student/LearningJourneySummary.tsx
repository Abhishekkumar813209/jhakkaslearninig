import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Award, Target, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const LearningJourneySummary = () => {
  const { data: journeyData, isLoading } = useQuery({
    queryKey: ["learning-journey-summary"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get quiz/test stats
      const { data: testStats } = await supabase
        .from("test_attempts")
        .select("percentage, status")
        .eq("student_id", user.id)
        .in("status", ["submitted", "auto_submitted"]);

      const totalTests = testStats?.length || 0;
      const avgScore = totalTests > 0
        ? Math.round(testStats.reduce((sum, t) => sum + (t.percentage || 0), 0) / totalTests)
        : 0;

      // Get flashcards/topic mastery stats (using completed topics)
      const { data: topicStats } = await supabase
        .from("student_topic_progress")
        .select("status, completed_at")
        .eq("student_id", user.id);

      const masteredTopics = topicStats?.filter(t => 
        t.status === 'completed' && t.completed_at
      ).length || 0;
      const totalTopics = topicStats?.length || 0;
      const masteryPercent = totalTopics > 0 
        ? Math.round((masteredTopics / totalTopics) * 100)
        : 0;

      // Get syllabus progress
      const { data: chapterStats } = await supabase
        .from("student_chapter_progress")
        .select("status")
        .eq("student_id", user.id);

      const completedChapters = chapterStats?.filter(c => 
        c.status === 'completed'
      ).length || 0;
      const totalChapters = chapterStats?.length || 0;
      const syllabusPercent = totalChapters > 0 
        ? Math.round((completedChapters / totalChapters) * 100)
        : 0;

      return {
        quiz: {
          total: totalTests,
          avgScore,
          trend: avgScore >= 75 ? 'up' : avgScore >= 50 ? 'neutral' : 'down'
        },
        flashcards: {
          mastered: masteredTopics,
          total: totalTopics,
          percentage: masteryPercent,
          trend: masteryPercent >= 60 ? 'up' : masteryPercent >= 35 ? 'neutral' : 'down'
        },
        syllabus: {
          completed: completedChapters,
          total: totalChapters,
          percentage: syllabusPercent,
          trend: syllabusPercent >= 50 ? 'up' : syllabusPercent >= 25 ? 'neutral' : 'down'
        }
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Learning Journey</CardTitle>
          <CardDescription>Your overall progress summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend === 'down') return <TrendingUp className="h-4 w-4 text-destructive rotate-180" />;
    return <TrendingUp className="h-4 w-4 text-muted-foreground rotate-90" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Journey</CardTitle>
        <CardDescription>Your overall progress summary</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quiz Card */}
          <div className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              {getTrendIcon(journeyData?.quiz.trend || 'neutral')}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Quiz</h3>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{journeyData?.quiz.avgScore}%</span>
                <span className="text-sm text-muted-foreground">avg score</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {journeyData?.quiz.total} tests completed
              </p>
            </div>
          </div>

          {/* Flashcards Card */}
          <div className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-success" />
              </div>
              {getTrendIcon(journeyData?.flashcards.trend || 'neutral')}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Topics Mastery</h3>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{journeyData?.flashcards.percentage}%</span>
                <span className="text-sm text-muted-foreground">mastered</span>
              </div>
              <Progress value={journeyData?.flashcards.percentage || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {journeyData?.flashcards.mastered} of {journeyData?.flashcards.total} topics
              </p>
            </div>
          </div>

          {/* Syllabus Card */}
          <div className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-warning" />
              </div>
              {getTrendIcon(journeyData?.syllabus.trend || 'neutral')}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Syllabus</h3>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{journeyData?.syllabus.percentage}%</span>
                <span className="text-sm text-muted-foreground">completed</span>
              </div>
              <Progress value={journeyData?.syllabus.percentage || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {journeyData?.syllabus.completed} of {journeyData?.syllabus.total} chapters
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
