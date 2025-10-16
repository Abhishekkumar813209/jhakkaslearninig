import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { MCQGame } from "@/components/student/games/MCQGame";
import { getAdjacentGames, loadGameById, GameNavigationInfo } from "@/lib/gameNavigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import confetti from "canvas-confetti";

const GamePlayerPage = () => {
  const { roadmapId, topicId, gameId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [gameData, setGameData] = useState<any>(null);
  const [navInfo, setNavInfo] = useState<GameNavigationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoAdvanceTimeout, setAutoAdvanceTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Guard against invalid params
    if (!roadmapId || roadmapId === "undefined" || !topicId || !gameId) {
      navigate("/student");
      return;
    }
    loadGameData();
    return () => {
      if (autoAdvanceTimeout) {
        clearTimeout(autoAdvanceTimeout);
      }
    };
  }, [gameId]);

  const loadGameData = async () => {
    if (!gameId || !topicId) return;

    setLoading(true);
    try {
      const [game, navigation] = await Promise.all([
        loadGameById(gameId),
        getAdjacentGames(topicId, gameId)
      ]);

      setGameData(game);
      setNavInfo(navigation);
    } catch (error) {
      console.error("Error loading game:", error);
      toast({
        title: "Error",
        description: "Failed to load game",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markGameCompleted = async (studentId: string, topicId: string, gameId: string) => {
    const { data: progress } = await supabase
      .from('student_topic_game_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('topic_id', topicId)
      .maybeSingle();

    if (!progress) {
      // Create new progress record
      await supabase.from('student_topic_game_progress').insert({
        student_id: studentId,
        topic_id: topicId,
        completed_game_ids: [gameId],
        questions_completed: 1,
        questions_correct: 1,
        total_questions: 1
      });
    } else {
      // Update existing progress
      const completedIds = progress.completed_game_ids || [];
      if (!completedIds.includes(gameId)) {
        await supabase
          .from('student_topic_game_progress')
          .update({
            completed_game_ids: [...completedIds, gameId],
            questions_completed: progress.questions_completed + 1,
            questions_correct: progress.questions_correct + 1
          })
          .eq('id', progress.id);
      }
    }
  };

  const handleCorrectAnswer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !gameData) return;

      // Check if this is first correct attempt (for XP)
      const { data: existingAttempts } = await supabase
        .from('student_question_attempts')
        .select('xp_awarded, is_correct')
        .eq('student_id', user.id)
        .eq('question_id', gameData.id);

      const hasCorrectAttempt = existingAttempts?.some(a => a.is_correct && a.xp_awarded);
      const isFirstCorrect = !hasCorrectAttempt;
      
      // Get attempt number
      const attemptNumber = (existingAttempts?.length || 0) + 1;
      
      // Insert attempt record
      await supabase.from('student_question_attempts').insert({
        student_id: user.id,
        question_id: gameData.id,
        topic_id: topicId!,
        is_correct: true,
        status: 'completed',
        time_spent_seconds: 0,
        xp_awarded: isFirstCorrect,
        attempt_number: attemptNumber
      });

      // Award XP only if first time correct
      if (isFirstCorrect) {
        const xpAmount = gameData.xp_reward || 10;
        
        // Update student XP in profiles table
        await supabase.rpc('increment_student_xp', {
          student_id: user.id,
          xp_amount: xpAmount
        });
      }

      // Mark game as completed in progress table
      await markGameCompleted(user.id, topicId!, gameData.id);

    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleWrongAnswer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !gameData) return;

      // Get attempt number
      const { data: existingAttempts } = await supabase
        .from('student_question_attempts')
        .select('id')
        .eq('student_id', user.id)
        .eq('question_id', gameData.id);

      const attemptNumber = (existingAttempts?.length || 0) + 1;

      await supabase.from('student_question_attempts').insert({
        student_id: user.id,
        question_id: gameData.id,
        topic_id: topicId!,
        is_correct: false,
        status: 'attempted',
        time_spent_seconds: 0,
        xp_awarded: false,
        attempt_number: attemptNumber
      });
    } catch (error) {
      console.error("Error tracking wrong answer:", error);
    }
  };

  const handleGameComplete = () => {
    if (navInfo?.nextGameId) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      const timeout = setTimeout(() => {
        navigate(`/student/roadmap/${roadmapId}/topic/${topicId}/game/${navInfo.nextGameId}`);
      }, 2000);
      
      setAutoAdvanceTimeout(timeout);
      
      toast({
        title: "🎉 Correct!",
        description: `Moving to next game... (${navInfo.currentGameNum}/${navInfo.totalGames})`,
      });
    } else {
      confetti({
        particleCount: 150,
        spread: 120,
        origin: { y: 0.6 }
      });
      
      toast({
        title: "🎊 All Games Completed!",
        description: "Great job! You've completed all exercises for this topic.",
      });
      
      setTimeout(() => {
        navigate(`/student/roadmap/${roadmapId}/topic/${topicId}`);
      }, 3000);
    }
  };

  const handleNext = () => {
    if (navInfo?.nextGameId) {
      navigate(`/student/roadmap/${roadmapId}/topic/${topicId}/game/${navInfo.nextGameId}`);
    }
  };

  const handlePrevious = () => {
    if (navInfo?.prevGameId) {
      navigate(`/student/roadmap/${roadmapId}/topic/${topicId}/game/${navInfo.prevGameId}`);
    }
  };

  const handleExit = () => {
    if (!roadmapId || roadmapId === "undefined") {
      navigate("/student");
    } else {
      navigate(`/student/roadmap/${roadmapId}/topic/${topicId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-8">
          <div>Loading game...</div>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-8">
          <div>Game not found</div>
          <Button onClick={handleExit} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Topic
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="container py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/student")}>
            <Home className="h-4 w-4" />
          </Button>
          <span>/</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => roadmapId && roadmapId !== "undefined" ? navigate(`/student/roadmap/${roadmapId}`) : navigate("/student")}
          >
            Roadmap
          </Button>
          <span>/</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => roadmapId && roadmapId !== "undefined" ? navigate(`/student/roadmap/${roadmapId}/topic/${topicId}`) : navigate("/student")}
          >
            Topic
          </Button>
          <span>/</span>
          <span className="font-medium">
            Game {navInfo?.currentGameNum}/{navInfo?.totalGames}
          </span>
        </div>

        <MCQGame
          gameData={{
            question: gameData.exercise_data?.question || "Question text",
            options: gameData.exercise_data?.options || [],
            correct_answer: gameData.exercise_data?.correctAnswerIndex || 0,
            explanation: gameData.explanation,
            marks: gameData.exercise_data?.marks || 1,
            difficulty: gameData.difficulty
          }}
          onCorrect={handleCorrectAnswer}
          onWrong={handleWrongAnswer}
          onComplete={handleGameComplete}
          onNext={navInfo?.nextGameId ? handleNext : undefined}
          onPrevious={navInfo?.prevGameId ? handlePrevious : undefined}
          onExit={handleExit}
          hasMoreQuestions={!!navInfo?.nextGameId}
          currentQuestionNum={navInfo?.currentGameNum || 1}
          totalQuestions={navInfo?.totalGames || 1}
        />
      </div>
    </div>
  );
};

export default GamePlayerPage;
