import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Sparkles, Trophy } from "lucide-react";
import { GamifiedExercise } from "./GamifiedExercise";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface TopicContent {
  id: string;
  content_text?: string;
  content_html?: string;
  content_type: string;
  exercises: Array<{
    id: string;
    exercise_type: string;
    exercise_data: any;
    correct_answer: any;
    explanation: string;
    xp_reward: number;
    coin_reward: number;
  }>;
}

interface TopicStudyViewProps {
  topicId: string;
  topicName: string;
  onBack: () => void;
}

export const TopicStudyView = ({ topicId, topicName, onBack }: TopicStudyViewProps) => {
  const [content, setContent] = useState<TopicContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showExercises, setShowExercises] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, [topicId]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      
      // Fetch topic content
      const { data: contentData, error: contentError } = await supabase
        .from("topic_content_mapping")
        .select("*")
        .eq("topic_id", topicId)
        .maybeSingle();

      if (contentError) throw contentError;

      if (!contentData) {
        // No content exists, generate it
        await generateContent();
        return;
      }

      // Fetch exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from("gamified_exercises")
        .select("*")
        .eq("topic_content_id", contentData.id);

      if (exercisesError) throw exercisesError;

      setContent({
        ...contentData,
        exercises: exercisesData || []
      });
    } catch (error: any) {
      console.error("Error fetching content:", error);
      toast({
        title: "Error",
        description: "Failed to load topic content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async () => {
    try {
      setGeneratingContent(true);
      toast({
        title: "Generating Content",
        description: "AI is creating study material for this topic..."
      });

      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: { 
          topic_id: topicId,
          topic_name: topicName,
          content_type: "theory"
        }
      });

      if (error) throw error;

      if (data?.success) {
        await fetchContent();
        toast({
          title: "Content Generated",
          description: "Study material is ready!"
        });
      }
    } catch (error: any) {
      console.error("Error generating content:", error);
      toast({
        title: "Error",
        description: "Failed to generate content",
        variant: "destructive"
      });
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleStartExercises = () => {
    setShowExercises(true);
    setCurrentExerciseIndex(0);
  };

  const handleExerciseComplete = async (exerciseId: string, xpReward: number, coinReward: number) => {
    setCompletedExercises(prev => new Set(prev).add(exerciseId));

    // Award XP and coins
    try {
      await supabase.functions.invoke("xp-coin-reward-system", {
        body: { 
          action: "add",
          xp_amount: xpReward,
          coin_amount: coinReward,
          activity_type: "exercise_completed"
        }
      });
    } catch (error) {
      console.error("Error awarding XP:", error);
    }

    if (content && currentExerciseIndex < content.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      // All exercises completed, mark topic as completed
      await markTopicComplete();
    }
  };

  const markTopicComplete = async () => {
    try {
      const { error } = await supabase.functions.invoke("student-roadmap-api", {
        body: { 
          action: "update_progress",
          topic_id: topicId,
          progress_percentage: 100,
          status: "completed"
        }
      });

      if (error) throw error;

      toast({
        title: "🎉 Topic Completed!",
        description: "Great job! Moving to next topic...",
      });

      setTimeout(() => onBack(), 2000);
    } catch (error) {
      console.error("Error marking topic complete:", error);
    }
  };

  if (loading || generatingContent) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">
            {generatingContent ? "AI is generating content..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (!content && !generatingContent) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-primary" />
            <div>
              <h3 className="font-semibold mb-2">No Content Available</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Let AI generate study material for {topicName}
              </p>
              <Button onClick={generateContent}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showExercises && content && content.exercises.length > 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setShowExercises(false)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Study Material
        </Button>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Exercise {currentExerciseIndex + 1} of {content.exercises.length}
          </h3>
          <Badge>
            {completedExercises.size} / {content.exercises.length} Completed
          </Badge>
        </div>

        <GamifiedExercise
          exercise={content.exercises[currentExerciseIndex]}
          onComplete={() => handleExerciseComplete(
            content.exercises[currentExerciseIndex].id,
            content.exercises[currentExerciseIndex].xp_reward,
            content.exercises[currentExerciseIndex].coin_reward
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Roadmap
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {topicName}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScrollArea className="h-[400px] pr-4">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content?.content_html || content?.content_text || "" }}
            />
          </ScrollArea>

          {content && content.exercises.length > 0 && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Practice Exercises</h3>
                  <p className="text-sm text-muted-foreground">
                    Test your understanding with {content.exercises.length} exercises
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
              
              <Button onClick={handleStartExercises} className="w-full">
                Start Exercises
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
