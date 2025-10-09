import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Sparkles, Trophy, Gamepad2, Brain } from "lucide-react";
import { GamifiedExercise } from "./GamifiedExercise";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TopicContent {
  id: string;
  content_text?: string;
  content_html?: string;
  content_type: string;
  svg_animation?: string;
  games?: Array<{
    title: string;
    description: string;
    game_type: string;
    game_data: any;
  }>;
  exercises: Array<{
    id: string;
    exercise_type: string;
    exercise_data: any;
    correct_answer: any;
    explanation: string;
    xp_reward: number;
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
  const [scrollPercent, setScrollPercent] = useState(0);
  const [theoryCompleted, setTheoryCompleted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, [topicId]);

  // Phase 4: Real-time content availability
  useEffect(() => {
    const channel = supabase
      .channel(`topic-content-${topicId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'topic_content_mapping', 
          filter: `topic_id=eq.${topicId}` 
        },
        (payload) => {
          toast({
            title: "✨ New Content Available!",
            description: "Admin has added new learning materials"
          });
          fetchContent();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleExerciseComplete = async (exerciseId: string, xpReward: number) => {
    setCompletedExercises(prev => new Set(prev).add(exerciseId));

    // Award XP
    try {
      await supabase.functions.invoke("jhakkas-points-system", {
        body: { 
          action: "add",
          xp_amount: xpReward,
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

  // Phase 5: Theory reading XP tracking
  const handleTheoryScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    const scrollTop = target.scrollTop;
    
    if (scrollHeight > clientHeight) {
      const percent = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      setScrollPercent(percent);
      
      if (percent >= 80 && !theoryCompleted) {
        markTheoryComplete();
      }
    }
  };

  const markTheoryComplete = async () => {
    setTheoryCompleted(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Award XP
      await supabase.functions.invoke("jhakkas-points-system", {
        body: { 
          action: "add", 
          xp_amount: 20, 
          activity_type: "theory_read",
          metadata: { topic_id: topicId, topic_name: topicName }
        }
      });
      
      // Update progress
      await supabase
        .from("student_roadmap_progress")
        .update({ 
          theory_completed: true,
          theory_xp_earned: 20,
          theory_completed_at: new Date().toISOString()
        })
        .eq("topic_id", topicId)
        .eq("student_id", user.id);
      
      toast({
        title: "🎉 Theory Complete!",
        description: "+20 Jhakkas Points earned!",
      });
    } catch (error) {
      console.error("Error marking theory complete:", error);
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
            <div className="animate-pulse">
              <Sparkles className="h-12 w-12 mx-auto text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">⏳ Admin is preparing content for you...</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Study material will appear here once it's ready
              </p>
              <p className="text-xs text-muted-foreground">
                Or generate it yourself with AI
              </p>
              <Button onClick={generateContent} className="mt-4">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content Now
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
            content.exercises[currentExerciseIndex].xp_reward
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
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {topicName}
          </CardTitle>
          <CardDescription>Explore different learning modes</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="theory" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="theory" className="gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Theory</span>
              </TabsTrigger>
              <TabsTrigger value="svg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Animations</span>
              </TabsTrigger>
              <TabsTrigger value="games" className="gap-2">
                <Gamepad2 className="h-4 w-4" />
                <span className="hidden sm:inline">Games</span>
              </TabsTrigger>
              <TabsTrigger value="quiz" className="gap-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Quiz</span>
              </TabsTrigger>
            </TabsList>

            {/* Theory Tab */}
            <TabsContent value="theory" className="space-y-4">
              {/* Progress Indicator */}
              {scrollPercent < 80 && !theoryCompleted && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary font-medium">
                      📖 Read {scrollPercent}% to earn +20 XP
                    </span>
                    <Badge variant="outline">{80 - scrollPercent}% remaining</Badge>
                  </div>
                  <Progress value={scrollPercent} max={80} className="h-2" />
                </div>
              )}
              
              {theoryCompleted && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700 font-medium flex items-center gap-2">
                    ✅ Theory Completed! +20 XP Earned
                  </p>
                </div>
              )}
              
              <ScrollArea 
                className="h-[500px] rounded-md border p-4"
                onScrollCapture={handleTheoryScroll}
              >
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: content?.content_html || content?.content_text || "" }}
                />
              </ScrollArea>
            </TabsContent>

            {/* SVG Animations Tab */}
            <TabsContent value="svg" className="space-y-4">
              {content?.svg_animation ? (
                <div className="rounded-md border p-8 bg-gradient-to-br from-primary/5 to-secondary/5">
                  <div dangerouslySetInnerHTML={{ __html: content.svg_animation }} />
                </div>
              ) : (
                <div className="text-center p-12 rounded-md border border-dashed">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    No SVG animations available for this topic yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Coming soon with AI-generated visualizations!
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Interactive Games Tab */}
            <TabsContent value="games" className="space-y-4">
              {content?.games && content.games.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {content.games.map((game, idx) => (
                    <Card key={idx} className="hover:border-primary/50 transition-colors cursor-pointer group">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 group-hover:text-primary transition-colors">
                          <Gamepad2 className="h-5 w-5" />
                          {game.title}
                        </CardTitle>
                        <CardDescription>{game.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full">
                          <Trophy className="h-4 w-4 mr-2" />
                          Play Game
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 rounded-md border border-dashed">
                  <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    No interactive games available for this topic yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Coming soon with gamified learning experiences!
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Quiz Tab */}
            <TabsContent value="quiz" className="space-y-4">
              {content && content.exercises.length > 0 ? (
                <div className="space-y-4">
                  <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Practice Quiz</CardTitle>
                          <CardDescription>
                            Test your knowledge with {content.exercises.length} interactive questions
                          </CardDescription>
                        </div>
                        <Trophy className="h-10 w-10 text-yellow-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 rounded-lg bg-card">
                          <p className="text-2xl font-bold text-primary">{content.exercises.length}</p>
                          <p className="text-xs text-muted-foreground">Questions</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-card">
                          <p className="text-2xl font-bold text-primary">
                            {content.exercises.reduce((acc, ex) => acc + (ex.xp_reward || 0), 0)} XP
                          </p>
                          <p className="text-xs text-muted-foreground">Total Rewards</p>
                        </div>
                      </div>
                      <Button onClick={handleStartExercises} size="lg" className="w-full">
                        <Brain className="h-4 w-4 mr-2" />
                        Start Quiz
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center p-12 rounded-md border border-dashed">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    No quiz questions available for this topic yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    AI will generate practice questions soon!
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
