import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Heart, Star, Flame, ArrowRight, SkipForward, Award, Trophy, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  lesson_type: string;
  theory_text?: string;
  theory_html?: string;
  svg_type?: string;
  svg_data?: any;
  game_type?: string;
  game_data?: any;
  playground_config?: any;
  estimated_time_minutes: number;
  xp_reward: number;
  coin_reward: number;
}

interface DuolingoStyleLearningProps {
  lesson: Lesson;
  topicId: string;
  onComplete: () => void;
  onExit: () => void;
}

export function DuolingoStyleLearning({ lesson, topicId, onComplete, onExit }: DuolingoStyleLearningProps) {
  const { toast } = useToast();
  const [hearts, setHearts] = useState(5);
  const [currentXP, setCurrentXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showWrongAnswer, setShowWrongAnswer] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);

  useEffect(() => {
    fetchUserData();
    initializeLesson();
  }, [lesson]);

  const fetchUserData = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    // Fetch hearts
    const { data: heartsData } = await supabase
      .from('student_hearts')
      .select('current_hearts')
      .eq('student_id', user.user.id)
      .single();
    
    if (heartsData) {
      setHearts(heartsData.current_hearts);
    }

    // Fetch XP and streak
    const { data: xpData } = await supabase
      .from('student_xp_coins')
      .select('total_xp')
      .eq('student_id', user.user.id)
      .single();

    const { data: analyticsData } = await supabase
      .from('student_analytics')
      .select('streak_days')
      .eq('student_id', user.user.id)
      .single();

    if (xpData) setCurrentXP(xpData.total_xp);
    if (analyticsData) setStreak(analyticsData.streak_days);
  };

  const initializeLesson = () => {
    // Set total steps based on lesson type
    if (lesson.lesson_type === 'theory') {
      setTotalSteps(1);
    } else if (lesson.lesson_type === 'interactive_svg') {
      setTotalSteps(3); // Introduction, Interaction, Summary
    } else if (lesson.lesson_type === 'game') {
      setTotalSteps(1);
    } else if (lesson.lesson_type === 'quiz') {
      setTotalSteps(5); // Example: 5 questions
    }
  };

  const loseHeart = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const newHearts = Math.max(0, hearts - 1);
    setHearts(newHearts);

    await supabase
      .from('student_hearts')
      .update({ 
        current_hearts: newHearts,
        last_heart_lost_at: new Date().toISOString()
      })
      .eq('student_id', user.user.id);

    if (newHearts === 0) {
      toast({
        title: "Out of Hearts!",
        description: "Practice or wait for hearts to refill",
        variant: "destructive"
      });
    }
  };

  const handleSkip = async () => {
    if (hearts <= 0) {
      toast({
        title: "No Hearts Left",
        description: "You need hearts to skip",
        variant: "destructive"
      });
      return;
    }

    await loseHeart();
    handleContinue();
  };

  const handleCorrectAnswer = () => {
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      handleContinue();
    }, 2000);
  };

  const handleWrongAnswer = async () => {
    setShowWrongAnswer(true);
    await loseHeart();
    setTimeout(() => {
      setShowWrongAnswer(false);
    }, 2000);
  };

  const handleContinue = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeLesson();
    }
  };

  const completeLesson = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    // Award XP and coins
    const { data: xpData } = await supabase
      .from('student_xp_coins')
      .select('*')
      .eq('student_id', user.user.id)
      .single();

    if (xpData) {
      const newXP = xpData.total_xp + lesson.xp_reward;
      const newCoins = xpData.total_coins + lesson.coin_reward;

      await supabase
        .from('student_xp_coins')
        .update({
          total_xp: newXP,
          total_coins: newCoins,
        })
        .eq('student_id', user.user.id);

      setEarnedXP(lesson.xp_reward);
      setEarnedCoins(lesson.coin_reward);

      // Check for level up
      const oldLevel = Math.floor(xpData.total_xp / 100);
      const newLevel = Math.floor(newXP / 100);
      if (newLevel > oldLevel) {
        setShowLevelUp(true);
      }
    }

    // Mark lesson as complete
    await supabase
      .from('student_lesson_progress')
      .upsert({
        student_id: user.user.id,
        topic_id: topicId,
        lesson_content_id: lesson.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        steps_completed: totalSteps,
        total_steps: totalSteps,
      });

    // Unlock next lesson
    const { data: nextLesson } = await supabase
      .from('topic_learning_content')
      .select('id')
      .eq('topic_id', topicId)
      .gt('content_order', (await supabase
        .from('topic_learning_content')
        .select('content_order')
        .eq('id', lesson.id)
        .single()).data?.content_order || 0)
      .order('content_order', { ascending: true })
      .limit(1)
      .single();

    if (nextLesson) {
      await supabase
        .from('student_lesson_progress')
        .upsert({
          student_id: user.user.id,
          topic_id: topicId,
          lesson_content_id: nextLesson.id,
          status: 'unlocked',
          total_steps: 1,
        });
    }

    setShowCelebration(true);
    setTimeout(() => {
      onComplete();
    }, 3000);
  };

  const renderContent = () => {
    switch (lesson.lesson_type) {
      case 'theory':
        return (
          <div className="prose prose-lg max-w-none">
            <div className="bg-card rounded-lg p-6">
              <p className="text-lg leading-relaxed">{lesson.theory_text}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button size="lg" onClick={handleContinue} className="gap-2">
                Continue <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        );

      case 'interactive_svg':
        return (
          <div className="space-y-6">
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p className="text-center">Interactive SVG Viewer<br/>({lesson.svg_type})</p>
              </div>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleSkip} disabled={hearts <= 0}>
                <SkipForward className="h-4 w-4 mr-2" /> Skip (-1 ❤️)
              </Button>
              <Button size="lg" onClick={handleCorrectAnswer} className="gap-2">
                I Understand <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        );

      case 'game':
        return (
          <div className="space-y-6">
            <Card className="p-8 bg-gradient-to-br from-blue-500/5 to-purple-500/10">
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p className="text-center">Game Zone<br/>({lesson.game_type})</p>
              </div>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleWrongAnswer}>
                Wrong Answer (Test)
              </Button>
              <Button size="lg" onClick={handleCorrectAnswer} className="gap-2">
                Submit Answer
              </Button>
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-6">
            <Card className="p-8">
              <h3 className="text-xl font-semibold mb-4">Quiz Question {currentStep + 1}</h3>
              <div className="space-y-3">
                {['Option A', 'Option B', 'Option C', 'Option D'].map((option, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-4"
                    onClick={() => idx === 0 ? handleCorrectAnswer() : handleWrongAnswer()}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        );

      default:
        return <div>Unknown lesson type</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Header */}
      <div className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            {/* Hearts */}
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Heart
                  key={i}
                  className={cn(
                    "h-6 w-6",
                    i < hearts ? "fill-red-500 text-red-500" : "text-gray-300"
                  )}
                />
              ))}
            </div>

            {/* XP and Streak */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm font-semibold">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span>{currentXP} XP</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold">
                <Flame className="h-5 w-5 text-orange-500 fill-orange-500" />
                <span>{streak} day streak</span>
              </div>
            </div>

            {/* Exit */}
            <Button variant="ghost" size="sm" onClick={onExit}>
              Exit
            </Button>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Lesson {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
            </div>
            <Progress value={((currentStep + 1) / totalSteps) * 100} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Celebration Modal */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="sm:max-w-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Trophy className="h-20 w-20 mx-auto text-yellow-500 fill-yellow-500 mb-4" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-2">Awesome!</h2>
            <div className="flex items-center justify-center gap-4 text-lg">
              <span className="flex items-center gap-1">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                +{earnedXP} XP
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-5 w-5 text-blue-500 fill-blue-500" />
                +{earnedCoins} Coins
              </span>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Wrong Answer Modal */}
      <Dialog open={showWrongAnswer} onOpenChange={setShowWrongAnswer}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">😢</div>
            <h2 className="text-2xl font-bold mb-2">Not quite right</h2>
            <p className="text-muted-foreground">-1 Heart. Try again!</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Level Up Modal */}
      <Dialog open={showLevelUp} onOpenChange={setShowLevelUp}>
        <DialogContent className="sm:max-w-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Award className="h-24 w-24 mx-auto text-purple-500 fill-purple-500 mb-4" />
            </motion.div>
            <h2 className="text-4xl font-bold mb-2">Level Up!</h2>
            <p className="text-xl text-muted-foreground">
              You've reached Level {Math.floor(currentXP / 100)}
            </p>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
