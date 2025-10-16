import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Sparkles, Trophy, Gamepad2, Brain, CheckCircle2 } from "lucide-react";
import { GamifiedExercise } from "./GamifiedExercise";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import confetti from 'canvas-confetti';
import { calculateXP, getDifficultyColor, getDifficultyBadgeVariant, type Difficulty } from "@/lib/xpConfig";
import { useQuestionQueue } from "@/hooks/useQuestionQueue";
import { MCQGame } from "./games/MCQGame";

interface TopicContent {
  id: string;
  content_text?: string;
  content_html?: string;
  content_type: string;
  difficulty?: Difficulty;
  svg_animation?: string;
  games?: Array<{
    title: string;
    description: string;
    game_type: string;
    game_data: any;
    difficulty?: Difficulty;
  }>;
  exercises: Array<{
    id: string;
    exercise_type: string;
    exercise_data: any;
    correct_answer: any;
    explanation: string;
    xp_reward: number;
    difficulty?: Difficulty;
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
  const [completedGames, setCompletedGames] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  
  // Phase 3: Question Queue System
  const questionQueue = useQuestionQueue(topicId);

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
        difficulty: contentData.difficulty as Difficulty,
        exercises: (exercisesData || []).map(ex => ({
          ...ex,
          difficulty: ex.difficulty as Difficulty
        }))
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

  const handleCorrectAnswer = async () => {
    if (!questionQueue.currentQuestion) return;
    
    const difficulty = (questionQueue.currentQuestion.difficulty || 'medium') as Difficulty;
    const xpAmount = calculateXP('exercise', difficulty);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      await supabase.functions.invoke("jhakkas-points-system", {
        body: { 
          action: "add",
          xp_amount: xpAmount,
          activity_type: "exercise_completed",
          metadata: { difficulty, topic_id: topicId }
        },
        headers
      });
      
      toast({
        title: `✅ Correct! +${xpAmount} XP`,
        description: `${difficulty.toUpperCase()} question completed!`,
      });
    } catch (error) {
      console.error("Error awarding XP:", error);
    }
  };
  
  const handleWrongAnswer = () => {
    // Wrong answers don't award XP, just for tracking
  };
  
  const handleNextQuestion = () => {
    questionQueue.nextQuestion();
    // Don't auto-complete, let user click "Complete" button from MCQGame
  };
  
  const handleExerciseComplete = async (exerciseId: string, xpReward: number, difficulty?: Difficulty) => {
    setCompletedExercises(prev => new Set(prev).add(exerciseId));

    const actualDifficulty = difficulty || 'medium';
    const xpAmount = calculateXP('exercise', actualDifficulty);

    // Award XP
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      await supabase.functions.invoke("jhakkas-points-system", {
        body: { 
          action: "add",
          xp_amount: xpAmount,
          activity_type: "exercise_completed",
          metadata: { difficulty: actualDifficulty, topic_id: topicId }
        },
        headers
      });
      
      toast({
        title: `✅ Correct! +${xpAmount} XP`,
        description: `${actualDifficulty.toUpperCase()} exercise completed!`,
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
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { error } = await supabase.functions.invoke("student-roadmap-api", {
        body: { 
          action: "update_progress",
          topic_id: topicId,
          progress_percentage: 100,
          status: "completed"
        },
        headers
      });

      if (error) throw error;

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

      toast({
        title: "🎉 Topic Completed!",
        description: `You earned ${questionQueue.totalQuestions * 30} XP from all questions!`,
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

      const theoryDifficulty = (content?.difficulty || 'medium') as Difficulty;
      const xpAmount = calculateXP('theory', theoryDifficulty);
      
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      // Award XP
      await supabase.functions.invoke("jhakkas-points-system", {
        body: { 
          action: "add", 
          xp_amount: xpAmount,
          activity_type: "theory_read",
          metadata: { 
            topic_id: topicId, 
            topic_name: topicName,
            difficulty: theoryDifficulty 
          }
        },
        headers
      });
      
      // Update progress
      await supabase
        .from("student_roadmap_progress")
        .update({ 
          theory_completed: true,
          theory_xp_earned: xpAmount,
          theory_completed_at: new Date().toISOString()
        })
        .eq("topic_id", topicId)
        .eq("student_id", user.id);
      
      toast({
        title: `🎉 Theory Complete! +${xpAmount} XP`,
        description: `${theoryDifficulty.toUpperCase()} difficulty mastered!`,
      });
    } catch (error) {
      console.error("Error marking theory complete:", error);
    }
  };

  // Phase 6: Game completion handler
  const handleGameComplete = async (gameIndex: number, gameDifficulty: Difficulty = 'medium') => {
    const xpAmount = calculateXP('game', gameDifficulty);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      // Award XP
      await supabase.functions.invoke("jhakkas-points-system", {
        body: { 
          action: "add", 
          xp_amount: xpAmount,
          activity_type: "game_completed",
          metadata: { 
            topic_id: topicId, 
            topic_name: topicName,
            difficulty: gameDifficulty,
            game_index: gameIndex
          }
        },
        headers
      });
      
      // Update progress
      const { data: progress } = await supabase
        .from("student_roadmap_progress")
        .select("games_completed, total_games_xp")
        .eq("topic_id", topicId)
        .eq("student_id", user.id)
        .maybeSingle();
      
      const completedGamesArray = Array.isArray(progress?.games_completed) 
        ? [...progress.games_completed, gameIndex]
        : [gameIndex];
      
      await supabase
        .from("student_roadmap_progress")
        .update({ 
          games_completed: completedGamesArray,
          total_games_xp: (progress?.total_games_xp || 0) + xpAmount,
          games_completed_at: new Date().toISOString()
        })
        .eq("topic_id", topicId)
        .eq("student_id", user.id);
      
      setCompletedGames(prev => new Set(prev).add(gameIndex));
      
      // Confetti animation
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      
      toast({ 
        title: `🎮 Game Complete! +${xpAmount} XP`,
        description: `${gameDifficulty.toUpperCase()} difficulty conquered!`
      });
    } catch (error) {
      console.error("Error completing game:", error);
      toast({
        title: "Error",
        description: "Failed to record game completion",
        variant: "destructive"
      });
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

  // Phase 3: Show Question Queue UI
  if (showExercises && questionQueue.currentQuestion) {
    const currentQ = questionQueue.currentQuestion;
    
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => {
          setShowExercises(false);
          questionQueue.reset();
        }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Study Material
        </Button>

        {/* Render different game types based on exercise_type */}
        {currentQ.exercise_type === 'mcq' && (
          <>
            {console.log('[TSV] Rendering MCQGame - index/total:', questionQueue.currentIndex, '/', questionQueue.totalQuestions)}
            <MCQGame
              gameData={currentQ.exercise_data}
              onCorrect={handleCorrectAnswer}
              onWrong={handleWrongAnswer}
              onNext={handleNextQuestion}
              onComplete={markTopicComplete}
              hasMoreQuestions={questionQueue.currentIndex < questionQueue.totalQuestions - 1}
              currentQuestionNum={questionQueue.currentIndex + 1}
              totalQuestions={questionQueue.totalQuestions}
            />
          </>
        )}
        
        {/* Fallback for other types */}
        {currentQ.exercise_type !== 'mcq' && (
          <GamifiedExercise
            exercise={currentQ}
            onComplete={() => {
              handleCorrectAnswer();
              handleNextQuestion();
            }}
          />
        )}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getDifficultyColor(content?.difficulty || 'medium')}>
                        {(content?.difficulty || 'medium').toUpperCase()}
                      </Badge>
                      <span className="text-primary font-medium text-sm">
                        📖 Read {scrollPercent}% to earn +{calculateXP('theory', content?.difficulty || 'medium')} XP
                      </span>
                    </div>
                    <Badge variant="outline">{80 - scrollPercent}% remaining</Badge>
                  </div>
                  <Progress value={scrollPercent} max={80} className="h-2" />
                </div>
              )}
              
              {theoryCompleted && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700 font-medium flex items-center gap-2">
                    ✅ Theory Completed! +{calculateXP('theory', content?.difficulty || 'medium')} XP Earned
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
                  {content.games.map((game, idx) => {
                    const isCompleted = completedGames.has(idx);
                    const gameDifficulty = (game.difficulty || 'medium') as Difficulty;
                    const xpReward = calculateXP('game', gameDifficulty);
                    
                    return (
                      <Card 
                        key={idx} 
                        className={`hover:border-primary/50 transition-colors ${isCompleted ? 'bg-green-50 border-green-200' : ''}`}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Gamepad2 className="h-5 w-5" />
                              {game.title}
                            </CardTitle>
                            <Badge variant={getDifficultyBadgeVariant(gameDifficulty)}>
                              {gameDifficulty.toUpperCase()} • {xpReward} XP
                            </Badge>
                          </div>
                          <CardDescription>{game.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            className="w-full" 
                            disabled={isCompleted}
                            onClick={() => handleGameComplete(idx, gameDifficulty)}
                          >
                            {isCompleted ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                                Completed ✓
                              </>
                            ) : (
                              <>
                                <Trophy className="h-4 w-4 mr-2" />
                                Play Game
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
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
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 rounded-lg bg-card">
                          <p className="text-2xl font-bold text-primary">{content.exercises.length}</p>
                          <p className="text-xs text-muted-foreground">Questions</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-card">
                          <p className="text-2xl font-bold text-primary">
                            {content.exercises.reduce((acc, ex) => 
                              acc + calculateXP('exercise', (ex.difficulty || 'medium') as Difficulty), 0
                            )} XP
                          </p>
                          <p className="text-xs text-muted-foreground">Total Rewards</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-card border-2 border-primary/20">
                          <p className="text-sm font-semibold text-muted-foreground mb-1">Difficulty Mix</p>
                          <div className="flex gap-1 justify-center flex-wrap">
                            {['easy', 'medium', 'hard'].map(diff => {
                              const count = content.exercises.filter(ex => ex.difficulty === diff).length;
                              return count > 0 && (
                                <Badge key={diff} variant="outline" className="text-xs">
                                  {count} {diff}
                                </Badge>
                              );
                            })}
                          </div>
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
