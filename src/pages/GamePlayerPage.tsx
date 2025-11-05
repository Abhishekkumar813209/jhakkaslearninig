import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { MCQGame } from "@/components/student/games/MCQGame";
import { MatchPairsGame } from "@/components/student/games/MatchPairsGame";
import { InteractiveBlanks } from "@/components/student/games/InteractiveBlanks";
import { DragDropSequence } from "@/components/student/games/DragDropSequence";
import { TypingRaceGame } from "@/components/student/games/TypingRaceGame";
import { TrueFalseGame } from "@/components/student/games/TrueFalseGame";
import { getAdjacentGames, loadGameById, GameNavigationInfo } from "@/lib/gameNavigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Home } from "lucide-react";
import confetti from "canvas-confetti";
import { XP_MULTIPLIERS } from "@/lib/xpConfig";
import { validateGameData, parseBoolean } from "@/lib/gameValidation";
import { Switch as DebugSwitch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const GamePlayerPage = () => {
  const { roadmapId, topicId, gameId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [gameData, setGameData] = useState<any>(null);
  const [navInfo, setNavInfo] = useState<GameNavigationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoAdvanceTimeout, setAutoAdvanceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showDebugData, setShowDebugData] = useState(false);

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
    // Step 1: Get the actual total count of games for this topic
    const { data: mapping } = await supabase
      .from('topic_content_mapping')
      .select('id')
      .eq('topic_id', topicId)
      .maybeSingle();
    
    if (!mapping) {
      console.error('No content mapping found for topic:', topicId);
      return;
    }
    
    const { count: totalGamesCount } = await supabase
      .from('gamified_exercises')
      .select('id', { count: 'exact' })
      .eq('topic_content_id', mapping.id);
    
    const totalGames = totalGamesCount || 0;
    
    // Step 2: Check for existing progress
    const { data: progress } = await supabase
      .from('student_topic_game_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('topic_id', topicId)
      .maybeSingle();

    if (!progress) {
      // Create new progress record with CORRECT total_questions
      await supabase.from('student_topic_game_progress').insert({
        student_id: studentId,
        topic_id: topicId,
        completed_game_ids: [gameId],
        questions_completed: 1,
        questions_correct: 1,
        total_questions: totalGames
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
            questions_correct: progress.questions_correct + 1,
            total_questions: totalGames
          })
          .eq('id', progress.id);
      }
    }
  };

  const handleCorrectAnswer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !gameData) return;

      // Fetch game's XP reward from database
      const { data: gameInfo } = await supabase
        .from('gamified_exercises')
        .select('xp_reward')
        .eq('id', gameData.id)
        .single();

      const baseXP = gameInfo?.xp_reward || 10;

      // Check existing attempts
      const { data: existingAttempts } = await supabase
        .from('student_question_attempts')
        .select('is_correct, attempt_number')
        .eq('student_id', user.id)
        .eq('question_id', gameData.id)
        .order('attempt_number', { ascending: true });

      const hasCorrectAttempt = existingAttempts?.some(a => a.is_correct);
      const attemptNumber = (existingAttempts?.length || 0) + 1;
      
      // Block if already completed
      if (hasCorrectAttempt) {
        return;
      }

      // Block if exceeded max attempts - but still redirect
      if (attemptNumber > XP_MULTIPLIERS.max_attempts) {
        setTimeout(() => {
          if (navInfo?.nextGameId) {
            handleNext();
          } else {
            handleExit();
          }
        }, 1500);
        return;
      }

      // Calculate XP: 100% on 1st correct, 30% on 2nd correct
      const multiplier = attemptNumber === 1 ? XP_MULTIPLIERS.first_correct : XP_MULTIPLIERS.second_correct;
      const xpAmount = Math.round(baseXP * multiplier);
      
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

      // Award XP via jhakkas-points-system edge function
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke("jhakkas-points-system", {
        body: { 
          action: "add",
          xp_amount: xpAmount,
          activity_type: "game_completed",
          metadata: { 
            game_id: gameData.id, 
            topic_id: topicId,
            attempt_number: attemptNumber,
            multiplier: multiplier
          }
        },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });

      // Trigger XP refresh
      window.dispatchEvent(new Event('xp-updated'));

      // Mark game as completed in progress table
      await markGameCompleted(user.id, topicId!, gameData.id);

    } catch (error) {
      console.error("Error saving progress:", error);
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive"
      });
    }
  };

  const handleWrongAnswer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !gameData) return;

      // Check existing attempts
      const { data: existingAttempts } = await supabase
        .from('student_question_attempts')
        .select('is_correct, attempt_number')
        .eq('student_id', user.id)
        .eq('question_id', gameData.id)
        .order('attempt_number', { ascending: true });

      const attemptNumber = (existingAttempts?.length || 0) + 1;
      const hasCorrectAttempt = existingAttempts?.some(a => a.is_correct);

      // Block if already completed correctly
      if (hasCorrectAttempt) {
        return;
      }

      // Insert wrong attempt record (no XP awarded)
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

      // Auto-advance to next game after 2 seconds
      setTimeout(() => {
        if (navInfo?.nextGameId) {
          handleNext();
        } else {
          handleExit();
        }
      }, 2000);

    } catch (error) {
      console.error("Error tracking wrong answer:", error);
      toast({
        title: "Error",
        description: "Failed to save attempt",
        variant: "destructive"
      });
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

  // Normalize exercise_type to handle variations, synonyms, and database inconsistencies
  const normalizeExerciseType = (type: string): string => {
    if (!type) return '';
    
    // Step 1: Basic cleanup
    let normalized = type.trim().toLowerCase();
    
    // Step 2: Convert spaces and hyphens to underscores
    normalized = normalized.replace(/[\s-]+/g, '_');
    
    // Step 3: Handle synonyms and variations
    const synonymMap: Record<string, string> = {
      // Fill blanks variants
      'fill_up': 'fill_blank',
      'fill_blanks': 'fill_blank',
      'interactive_label': 'interactive_blanks',
      
      // Drag drop variants
      'drag_drop_sequence': 'drag_drop_sort',
      'sequence_order': 'drag_drop_sort',
      
      // Match pairs variants
      'match_column': 'match_pairs',
      'matching': 'match_pairs',
      
      // True/False variants
      'boolean': 'true_false',
      'tf': 'true_false',
      't_f': 'true_false',
      'true-false': 'true_false',
      
      // Assertion-Reason variants
      'assertion-reason': 'assertion_reason',
      'assertion_and_reason': 'assertion_reason',
      'ar': 'assertion_reason',
    };
    
    return synonymMap[normalized] || normalized;
  };

  const renderGame = () => {
    if (!gameData) return null;

    const rawType = gameData.exercise_type;
    const exerciseType = normalizeExerciseType(rawType);
    
    console.log('[GamePlayerPage] Exercise Type Debug:', {
      rawType,
      normalizedType: exerciseType,
      gameId: gameData.id,
      hasExerciseData: !!gameData.exercise_data
    });
    
    // For MCQ: Extract correct answer with CORRECT priority order
    if (exerciseType === 'mcq') {
      let rawCorrectAnswer: any;
      let answerSource = '';
      
      // Priority 1: correct_answer.correctAnswerIndex (our new format)
      if (gameData.correct_answer?.correctAnswerIndex !== undefined) {
        rawCorrectAnswer = gameData.correct_answer.correctAnswerIndex;
        answerSource = 'correct_answer.correctAnswerIndex';
      }
      // Priority 2: exercise_data.correctAnswerIndex
      else if (gameData.exercise_data?.correctAnswerIndex !== undefined) {
        rawCorrectAnswer = gameData.exercise_data.correctAnswerIndex;
        answerSource = 'exercise_data.correctAnswerIndex';
      }
      // Priority 3: exercise_data.correct_answer
      else if (gameData.exercise_data?.correct_answer !== undefined) {
        rawCorrectAnswer = gameData.exercise_data.correct_answer;
        answerSource = 'exercise_data.correct_answer';
      }
      // Priority 4: LAST RESORT - legacy correct_answer_index column
      else if (typeof gameData.correct_answer_index === 'number') {
        rawCorrectAnswer = gameData.correct_answer_index;
        answerSource = 'correct_answer_index (legacy)';
      }
      // Final fallback
      else {
        rawCorrectAnswer = 0;
        answerSource = 'default fallback';
      }

      // Parse and validate the answer
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
        source: answerSource,
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
      
      case 'true_false':
        // Shape data properly - use robust boolean parser
        const rawTFAnswer = gameData.exercise_data?.correct_answer ?? gameData.correct_answer;
        const tfData = {
          question: gameData.exercise_data?.question || gameData.question_text || '',
          correctAnswer: parseBoolean(rawTFAnswer),
          explanation: gameData.exercise_data?.explanation || gameData.explanation,
          marks: gameData.exercise_data?.marks || gameData.marks,
          difficulty: gameData.exercise_data?.difficulty || gameData.difficulty
        };
        
        console.log('[GamePlayerPage] True/False Data:', {
          raw: rawTFAnswer,
          parsed: tfData.correctAnswer,
          question: tfData.question.substring(0, 50) + '...'
        });
        
        // Validate
        const tfValidation = validateGameData('true_false', tfData);
        if (!tfValidation.success) {
          console.error('[GamePlayerPage] True/False validation failed:', tfValidation.error);
        }
        
        return (
          <TrueFalseGame
            gameData={tfData}
            onCorrect={handleCorrectAnswer}
            onWrong={handleWrongAnswer}
            onComplete={handleGameComplete}
            onNext={navInfo?.nextGameId ? handleNext : undefined}
            hasMoreQuestions={!!navInfo?.nextGameId}
          />
        );
      
      case 'assertion_reason':
        // Auto-generate default options if missing
        const defaultAROptions = [
          "Both Assertion and Reason are correct, and Reason is the correct explanation of Assertion",
          "Both Assertion and Reason are correct, but Reason is NOT the correct explanation of Assertion",
          "Assertion is correct, but Reason is incorrect",
          "Both Assertion and Reason are incorrect"
        ];
        
        const arData = {
          question: `Assertion: ${gameData.exercise_data?.assertion || ''}\n\nReason: ${gameData.exercise_data?.reason || ''}`,
          options: gameData.exercise_data?.options || gameData.options || defaultAROptions,
          correct_answer: gameData.exercise_data?.correct_answer ?? gameData.correct_answer ?? 0,
          explanation: gameData.exercise_data?.explanation || gameData.explanation,
          marks: gameData.exercise_data?.marks || gameData.marks || 1,
          difficulty: gameData.exercise_data?.difficulty || gameData.difficulty
        };
        
        console.log('[GamePlayerPage] Assertion-Reason Data:', {
          hasOptions: arData.options.length > 0,
          correctAnswer: arData.correct_answer
        });
        
        // Validate
        const arValidation = validateGameData('assertion_reason', {
          assertion: gameData.exercise_data?.assertion || '',
          reason: gameData.exercise_data?.reason || '',
          options: arData.options,
          correct_answer: arData.correct_answer,
          explanation: arData.explanation,
          marks: arData.marks
        });
        
        if (!arValidation.success) {
          console.error('[GamePlayerPage] Assertion-Reason validation failed:', arValidation.error);
        }
        
        return (
          <MCQGame
            gameData={arData}
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

        {/* Debug Toggle (Dev Only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mb-4 border-yellow-500/50 bg-yellow-50/20 dark:bg-yellow-950/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DebugSwitch
                  checked={showDebugData}
                  onCheckedChange={setShowDebugData}
                  id="debug-toggle"
                />
                <Label htmlFor="debug-toggle" className="text-sm font-medium cursor-pointer">
                  Show Raw Data (Debug Mode)
                </Label>
              </div>
              
              {showDebugData && gameData && (
                <div className="mt-4 space-y-3">
                  <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg">
                    <p className="text-xs font-mono text-yellow-700 dark:text-yellow-400 mb-2">Raw Game Data:</p>
                    <pre className="text-xs overflow-auto max-h-64">
                      {JSON.stringify({
                        id: gameData.id,
                        exercise_type: gameData.exercise_type,
                        normalized_type: normalizeExerciseType(gameData.exercise_type),
                        question_text: gameData.question_text,
                        exercise_data: gameData.exercise_data,
                        correct_answer: gameData.correct_answer,
                        options: gameData.options
                      }, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {renderGame()}
      </div>
    </div>
  );
};

export default GamePlayerPage;
