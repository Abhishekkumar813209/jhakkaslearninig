import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { MCQGame } from "@/components/student/games/MCQGame";
import { MatchPairsGame } from "@/components/student/games/MatchPairsGame";
import { InteractiveBlanks } from "@/components/student/games/InteractiveBlanks";
import { DragDropSequence } from "@/components/student/games/DragDropSequence";
import { TypingRaceGame } from "@/components/student/games/TypingRaceGame";
import { getAdjacentGames, loadGameById, GameNavigationInfo } from "@/lib/gameNavigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import confetti from "canvas-confetti";
import { ATTEMPT_XP } from "@/lib/xpConfig";

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
    
    // Listen for game deletion while student is playing
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'gamified_exercises',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          console.log('Current game was deleted:', payload);
          
          toast({
            title: "Game Removed",
            description: "This game was deleted. Redirecting to next available game...",
            variant: "destructive"
          });
          
          // Try to navigate to next game, or back to topic if none available
          setTimeout(async () => {
            if (navInfo?.nextGameId) {
              navigate(`/student/roadmap/${roadmapId}/topic/${topicId}/game/${navInfo.nextGameId}`);
            } else {
              navigate(`/student/roadmap/${roadmapId}/topic/${topicId}`);
            }
          }, 2000);
        }
      )
      .subscribe();
    
    return () => {
      if (autoAdvanceTimeout) {
        clearTimeout(autoAdvanceTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const loadGameData = async () => {
    if (!gameId || !topicId) return;

    setLoading(true);
    try {
      let game = await loadGameById(gameId);
      
      // Fallback: If gameId is actually a topic_content_mapping.id, try to find the game
      if (!game) {
        const { data: exerciseData } = await supabase
          .from('gamified_exercises')
          .select('*')
          .eq('topic_content_id', gameId)
          .order('game_order', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (exerciseData) {
          game = exerciseData;
          // Navigate to correct game ID to update URL
          navigate(`/student/roadmap/${roadmapId}/topic/${topicId}/game/${exerciseData.id}`, { replace: true });
        }
      }

      if (!game) {
        toast({
          title: "Game not found",
          description: "This game doesn't exist or hasn't been created yet.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const navigation = await getAdjacentGames(topicId, game.id);
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

  // Auto-redirect when game not found
  useEffect(() => {
    if (!loading && !gameData && topicId && roadmapId) {
      const findNextGame = async () => {
        // Try to find the first available game in this topic
        const { data: mapping } = await supabase
          .from('topic_content_mapping')
          .select('id')
          .eq('topic_id', topicId)
          .maybeSingle();
        
        if (mapping) {
          const { data: games } = await supabase
            .from('gamified_exercises')
            .select('id, game_order')
            .eq('topic_content_id', mapping.id)
            .order('game_order', { ascending: true })
            .limit(1);
          
          if (games && games.length > 0) {
            toast({
              title: "Game Not Found",
              description: "Redirecting to next available game...",
            });
            
            setTimeout(() => {
              navigate(`/student/roadmap/${roadmapId}/topic/${topicId}/game/${games[0].id}`, { replace: true });
            }, 1500);
            return;
          }
        }
        
        // No games found, go back to topic
        toast({
          title: "No Games Available",
          description: "Returning to topic view...",
          variant: "destructive"
        });
        
        setTimeout(() => {
          handleExit();
        }, 1500);
      };
      
      findNextGame();
    }
  }, [loading, gameData, topicId, roadmapId]);

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

      // Check existing attempts to determine XP award
      const { data: existingAttempts } = await supabase
        .from('student_question_attempts')
        .select('xp_awarded, is_correct')
        .eq('student_id', user.id)
        .eq('question_id', gameData.id);

      const hasCorrectAttempt = existingAttempts?.some(a => a.is_correct);
      const hasWrongAttempts = existingAttempts?.some(a => !a.is_correct);
      
      // Determine XP amount: first correct = 10, correct after wrong = 5
      let xpAmount = 0;
      if (!hasCorrectAttempt) {
        xpAmount = hasWrongAttempts ? ATTEMPT_XP.correct_retry : ATTEMPT_XP.correct_first;
      }
      
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
        xp_awarded: true,
        attempt_number: attemptNumber
      });

      // Award XP
      if (xpAmount > 0) {
        await supabase.rpc('increment_student_xp', {
          student_id: user.id,
          xp_amount: xpAmount
        });

        // Trigger XP refresh
        window.dispatchEvent(new Event('xp-updated'));
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

      // Insert wrong attempt
      await supabase.from('student_question_attempts').insert({
        student_id: user.id,
        question_id: gameData.id,
        topic_id: topicId!,
        is_correct: false,
        status: 'attempted',
        time_spent_seconds: 0,
        xp_awarded: true,
        attempt_number: attemptNumber
      });

      // Award participation XP for wrong attempt (2 XP)
      await supabase.rpc('increment_student_xp', {
        student_id: user.id,
        xp_amount: ATTEMPT_XP.wrong_attempt
      });

      // Trigger XP refresh
      window.dispatchEvent(new Event('xp-updated'));

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

  const renderGame = () => {
    if (!gameData) return null;

    const exerciseType = gameData.exercise_type;
    
    // For MCQ: prefer direct columns, fallback to exercise_data
    if (exerciseType === 'mcq') {
      // Get raw correct answer with multiple fallbacks
      let rawCorrectAnswer = (typeof gameData.correct_answer_index === 'number')
        ? gameData.correct_answer_index
        : (gameData.correct_answer?.correctAnswerIndex ?? 
           gameData.exercise_data?.correct_answer ?? 
           gameData.exercise_data?.correctAnswerIndex ?? 
           0);

      // Safeguard: Parse numeric strings and validate
      let correctAnswerIndex = 0;
      if (typeof rawCorrectAnswer === 'number') {
        correctAnswerIndex = rawCorrectAnswer;
      } else if (typeof rawCorrectAnswer === 'string' && /^\d+$/.test(rawCorrectAnswer)) {
        correctAnswerIndex = parseInt(rawCorrectAnswer, 10);
      } else if (typeof rawCorrectAnswer === 'object' && rawCorrectAnswer?.correctAnswerIndex !== undefined) {
        correctAnswerIndex = rawCorrectAnswer.correctAnswerIndex;
      }

      const mcqData = {
        question: gameData.question_text || gameData.exercise_data?.question || "",
        options: (gameData.options && gameData.options.length > 0) 
          ? gameData.options 
          : (gameData.exercise_data?.options || []),
        correct_answer: correctAnswerIndex,
        explanation: gameData.explanation || gameData.exercise_data?.explanation,
        marks: gameData.marks || gameData.exercise_data?.marks || 1,
        difficulty: gameData.difficulty || gameData.exercise_data?.difficulty
      };

      console.log('[GamePlayerPage] MCQ Data prepared:', {
        hasOptions: mcqData.options.length > 0,
        optionsCount: mcqData.options.length,
        correctAnswer: mcqData.correct_answer,
        rawAnswer: rawCorrectAnswer,
        question: mcqData.question.substring(0, 50) + '...'
      });

      return (
        <MCQGame
          gameData={mcqData}
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
      );
    }

    // For other game types: use exercise_data
    const commonProps = {
      onCorrect: handleCorrectAnswer,
      onWrong: handleWrongAnswer,
      onComplete: handleGameComplete,
    };

    switch (exerciseType) {
      case 'match_pairs':
        return (
          <MatchPairsGame
            gameData={gameData.exercise_data}
            {...commonProps}
          />
        );
      
      case 'fill_blank':
      case 'interactive_blanks':
        return (
          <InteractiveBlanks
            gameData={gameData.exercise_data}
            {...commonProps}
          />
        );
      
      case 'drag_drop_sort':
        return (
          <DragDropSequence
            gameData={gameData.exercise_data}
            {...commonProps}
          />
        );
      
      case 'typing_race':
        return (
          <TypingRaceGame
            gameData={gameData.exercise_data}
            {...commonProps}
          />
        );
      
      default:
        return (
          <div className="text-center p-8">
            <p className="text-muted-foreground">
              Game type "{exerciseType}" is not yet supported.
            </p>
            <Button onClick={handleExit} className="mt-4">
              Back to Topic
            </Button>
          </div>
        );
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
        <div className="container py-8 text-center">
          <div className="animate-pulse">
            <p className="text-lg mb-4">Game not found. Searching for next available game...</p>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
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

        {renderGame()}
      </div>
    </div>
  );
};

export default GamePlayerPage;
