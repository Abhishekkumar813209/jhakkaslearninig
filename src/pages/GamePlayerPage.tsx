import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StudentAppLayout } from "@/components/student/StudentAppLayout";
import { MCQGame } from "@/components/student/games/MCQGame";
import { MatchPairsGame } from "@/components/student/games/MatchPairsGame";
import { LineMatchingGame } from "@/components/student/games/LineMatchingGame";
import { InteractiveBlanks } from "@/components/student/games/InteractiveBlanks";
import { DragDropSequence } from "@/components/student/games/DragDropSequence";
import { TypingRaceGame } from "@/components/student/games/TypingRaceGame";
import { TrueFalseGame } from "@/components/student/games/TrueFalseGame";
import { DragDropBlanks } from "@/components/student/games/DragDropBlanks";
import { GameFloatingChatbot } from "@/components/student/GameFloatingChatbot";
import { getAdjacentGames, loadGameById, GameNavigationInfo } from "@/lib/gameNavigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Home } from "lucide-react";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundEffects";
import { XP_MULTIPLIERS, SubQuestionResult } from "@/lib/xpConfig";
import { validateGameData, parseBoolean } from "@/lib/gameValidation";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { Switch as DebugSwitch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  parseMCQData,
  parseFillBlankData,
  parseTrueFalseData,
  parseMatchPairsData
} from "@/lib/questionDataHelpers";

interface GameXPAwardResponse {
  success: boolean;
  xp_awarded: number;
  attempt_number: number;
  is_practice_mode: boolean;
  fraction_correct: number;
  total_sub_questions: number;
  correct_count: number;
}

interface GetAttemptsResponse {
  attempt_count: number;
  has_correct_attempt: boolean;
}

const GamePlayerPage = () => {
  const { roadmapId, topicId, gameId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [gameData, setGameData] = useState<any>(null);
  const [navInfo, setNavInfo] = useState<GameNavigationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoAdvanceTimeout, setAutoAdvanceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showDebugData, setShowDebugData] = useState(false);
  const [initialAttemptCount, setInitialAttemptCount] = useState<number>(0);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [viewCount, setViewCount] = useState<number>(0);

  useEffect(() => {
    // Guard against invalid params
    if (!roadmapId || roadmapId === "undefined" || !topicId || !gameId) {
      navigate("/roadmap");
      return;
    }
    loadGameData();
    trackGameView();
    
    // Listen for game deletion/deactivation while student is playing
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'batch_question_assignments',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          const newRow = (payload as any).new;
          if (newRow && !newRow.is_active) {
            console.log('Current game was deactivated:', payload);
            
            toast({
              title: "Game Removed",
              description: "This game was removed. Redirecting to next available game...",
              variant: "destructive"
            });
            
            // Try to navigate to next game, or back to topic if none available
            setTimeout(async () => {
              if (navInfo?.nextGameId) {
                navigate(`/roadmap/${roadmapId}/topic/${topicId}/game/${navInfo.nextGameId}`);
              } else {
                navigate(`/roadmap/${roadmapId}/topic/${topicId}`);
              }
            }, 2000);
          }
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
      const { data: { user } } = await supabase.auth.getUser();
      
      let game = await loadGameById(gameId);
      
      // Game not found, will be handled by auto-redirect useEffect

      if (!game) {
        toast({
          title: "Game not found",
          description: "This game doesn't exist or hasn't been created yet.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Fetch initial attempt count from backend
      if (user) {
        try {
          const attemptData = await invokeWithAuth<any, GetAttemptsResponse>({
            name: 'game-xp-award',
            body: {
              action: 'get_attempts',
              game_id: game.id
            }
          });
          
          if (attemptData) {
            setInitialAttemptCount(attemptData.attempt_count || 0);
          }
        } catch (error) {
          console.error('Error fetching attempt count:', error);
          setInitialAttemptCount(0);
        }

        // Fetch progress percentage from navigation info (already calculated)
        const { data: progress } = await supabase
          .from('student_topic_game_progress')
          .select('completed_game_ids')
          .eq('student_id', user.id)
          .eq('topic_id', topicId)
          .maybeSingle();

        const completedCount = progress?.completed_game_ids?.length || 0;
        const navigation = await getAdjacentGames(topicId, game.id);
        const percentage = navigation.totalGames > 0 ? (completedCount / navigation.totalGames) * 100 : 0;
        setProgressPercentage(Math.round(percentage));
        setNavInfo(navigation);
      }

      setGameData(game);
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

  // Auto-redirect when game not found (using reference-based navigation)
  useEffect(() => {
    if (!loading && !gameData && topicId && roadmapId) {
      const findNextGame = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get student's batch
        const { data: profile } = await supabase
          .from('profiles')
          .select('batch_id')
          .eq('id', user.id)
          .single();

        if (!profile?.batch_id) {
          handleExit();
          return;
        }

        // Fetch first assigned game
        const { data: assignments } = await supabase
          .from('batch_question_assignments')
          .select('id')
          .eq('batch_id', profile.batch_id)
          .eq('roadmap_topic_id', topicId)
          .eq('is_active', true)
          .order('assignment_order', { ascending: true })
          .limit(1);
        
        if (assignments && assignments.length > 0) {
          toast({
            title: "Game Not Found",
            description: "Redirecting to next available game...",
          });
          
          setTimeout(() => {
            navigate(`/roadmap/${roadmapId}/topic/${topicId}/game/${assignments[0].id}`, { replace: true });
          }, 1500);
          return;
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
    // Get total count from navigation info (already calculated from batch_question_assignments)
    const totalGames = navInfo?.totalGames || 0;
    
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

  const trackGameView = async () => {
    if (!gameData?.id) return;
    
    try {
      const result = await invokeWithAuth<{ game_id: string }, { view_count: number; is_struggling: boolean }>({
        name: 'game-view-track',
        body: { game_id: gameData.id }
      });

      if (result) {
        setViewCount(result.view_count);
        console.log(`[Game View] View #${result.view_count}`, result.is_struggling ? '(Student is struggling)' : '');
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleSubmitAnswer = async (answer: any, result?: SubQuestionResult): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !gameData) return false;

      // Extract correctness data (FRONTEND DECIDES CORRECTNESS)
      const totalSubQuestions = result?.totalSubQuestions || 1;
      const correctCount = result?.correctCount || (result ? 0 : 1);
      const isCorrect = correctCount === totalSubQuestions;

      // Call backend to handle XP award and attempt tracking
      const awardResult = await invokeWithAuth<any, GameXPAwardResponse>({
        name: 'game-xp-award',
        body: {
          action: 'award_xp',
          game_id: gameData.id,
          topic_id: topicId!,
          is_correct: isCorrect,
          total_sub_questions: totalSubQuestions,
          correct_count: correctCount
        }
      });

      // Check for success response
      if (!awardResult.success) {
        throw new Error('Backend returned failure');
      }

      // Backend succeeded - show appropriate toast
      if (awardResult.xp_awarded > 0) {
        const attemptText = awardResult.attempt_number === 1 
          ? '1st attempt' 
          : awardResult.attempt_number === 2 
            ? '2nd attempt' 
            : `${awardResult.attempt_number}th attempt`;
        
        const partialText = totalSubQuestions > 1
          ? ` (${correctCount}/${totalSubQuestions} correct)`
          : '';
        
        toast({
          title: "Correct Answer! 🎉",
          description: `+${awardResult.xp_awarded.toFixed(2)} XP${partialText} (${attemptText})`,
          duration: 3000
        });

        window.dispatchEvent(new CustomEvent('xp-fly', { detail: { amount: awardResult.xp_awarded } }));
        window.dispatchEvent(new Event('xp-updated'));
      } else if (awardResult.is_practice_mode) {
        toast({
          title: "✓ Correct!",
          description: "Practice Mode - Keep practicing! 💪",
          duration: 3000
        });
      } else if (correctCount < totalSubQuestions) {
        toast({
          title: "Partial Credit",
          description: `${correctCount}/${totalSubQuestions} correct. ${awardResult.xp_awarded > 0 ? `+${awardResult.xp_awarded.toFixed(2)} XP` : 'No XP awarded'}`,
          duration: 3000
        });
      }

      // Mark game as completed
      await markGameCompleted(user.id, topicId!, gameData.id);

      // Update progress percentage
      const { data: progress } = await supabase
        .from('student_topic_game_progress')
        .select('completed_game_ids')
        .eq('student_id', user.id)
        .eq('topic_id', topicId)
        .maybeSingle();

      const completedCount = progress?.completed_game_ids?.length || 0;
      const totalGames = navInfo?.totalGames || 0;
      const percentage = totalGames > 0 ? (completedCount / totalGames) * 100 : 0;
      setProgressPercentage(Math.round(percentage));

      // ✅ Always advance after successful backend save, regardless of correctness
      handleGameComplete();

      return true; // Success

    } catch (error) {
      console.error("Error saving progress:", error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive"
      });
      return false; // Failure
    }
  };

  const handleCorrectAnswer = async (result?: SubQuestionResult) => {
    await handleSubmitAnswer(null, result);
  };

  const handleWrongAnswer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !gameData) return;

      // Call backend to track wrong attempt
      try {
        await invokeWithAuth<any, GameXPAwardResponse>({
          name: 'game-xp-award',
          body: {
            action: 'award_xp',
            game_id: gameData.id,
            topic_id: topicId!,
            is_correct: false
          }
        });
      } catch (error) {
        console.error('Error tracking wrong answer:', error);
      }

      // Auto-advance to next game after 200ms
      setTimeout(() => {
        if (navInfo?.nextGameId) {
          handleNext();
        } else {
          handleExit();
        }
      }, 200);

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
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 }
      });

      const timeout = setTimeout(() => {
        navigate(`/roadmap/${roadmapId}/topic/${topicId}/game/${navInfo.nextGameId}`);
      }, 200);
      
      setAutoAdvanceTimeout(timeout);
      
      toast({
        title: "🎉 Correct!",
        description: `Moving to next game... (${navInfo.currentGameNumber}/${navInfo.totalGames})`,
      });
    } else {
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { y: 0.6 }
      });
      
      toast({
        title: "🎊 All Games Completed!",
        description: "Great job! You've completed all exercises for this topic.",
      });
      
      setTimeout(() => {
        navigate(`/roadmap/${roadmapId}/topic/${topicId}`);
      }, 200);
    }
  };

  const handleNext = () => {
    if (navInfo?.nextGameId) {
      navigate(`/roadmap/${roadmapId}/topic/${topicId}/game/${navInfo.nextGameId}`);
    }
  };

  const handlePrevious = () => {
    if (navInfo?.previousGameId) {
      navigate(`/roadmap/${roadmapId}/topic/${topicId}/game/${navInfo.previousGameId}`);
    }
  };

  const handleExit = () => {
    if (!roadmapId || roadmapId === "undefined") {
      navigate("/roadmap");
    } else {
      navigate(`/roadmap/${roadmapId}/topic/${topicId}`);
    }
  };

  // Normalize exercise_type to handle variations, synonyms, and database inconsistencies
  const normalizeExerciseType = (type: string): string => {
    if (!type) {
      console.warn('⚠️ Empty or undefined question_type received:', {
        gameId: gameData?.id,
        availableFields: gameData ? Object.keys(gameData) : []
      });
      return '';
    }
    
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
      
      // Match column variants (singular)
      'match_columns': 'match_column',
      
      // Match pairs variants - normalize to match_pair (singular)
      'match_pairs': 'match_pair',
      'matching': 'match_pair',
      'match_pair': 'match_pair', // ✅ Ensure singular is preserved
      
      // Drag drop variants
      'drag_drop_sequence': 'drag_drop_sort',
      'sequence_order': 'drag_drop_sort',
      
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

    const rawType = gameData.question_type;
    const exerciseType = normalizeExerciseType(rawType);
    
    console.log('🎮 Game Type Debug:', {
      rawType,
      normalizedType: exerciseType,
      gameId: gameData.id,
      hasQuestionData: !!gameData.question_data,
      hasAnswerData: !!gameData.answer_data,
      availableFields: Object.keys(gameData)
    });
    
    // For MCQ: Use parser to extract from JSONB columns
    if (exerciseType === 'mcq') {
      const parsedData = parseMCQData(gameData);
      
      const mcqData = {
        question: parsedData.text,
        options: parsedData.options,
        correct_answer: parsedData.correctIndex,
        explanation: parsedData.explanation,
        marks: gameData.question_data?.marks || gameData.marks || 1,
        difficulty: gameData.question_data?.difficulty || gameData.difficulty
      };

      console.log('[GamePlayerPage] MCQ Data (parsed):', {
        hasOptions: mcqData.options.length > 0,
        optionsCount: mcqData.options.length,
        correctAnswer: mcqData.correct_answer,
        question: mcqData.question.substring(0, 50) + '...'
      });

      return (
        <MCQGame
          gameData={mcqData}
          onSubmit={handleSubmitAnswer}
          onComplete={handleGameComplete}
          onNext={navInfo?.nextGameId ? handleNext : undefined}
          onPrevious={navInfo?.previousGameId ? handlePrevious : undefined}
          onExit={handleExit}
          hasMoreQuestions={!!navInfo?.nextGameId}
          currentQuestionNum={navInfo?.currentGameNumber || 1}
          totalQuestions={navInfo?.totalGames || 1}
          initialAttemptCount={initialAttemptCount}
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
      case 'match_column':
        // Use parser to extract from JSONB columns
        const parsedMatchColumn = parseMatchPairsData(gameData);
        
        const matchColumnData = {
          question: parsedMatchColumn.question,
          leftColumn: parsedMatchColumn.leftColumn,
          rightColumn: parsedMatchColumn.rightColumn,
          correctPairs: parsedMatchColumn.correctPairs,
          explanation: parsedMatchColumn.explanation,
          marks: gameData.question_data?.marks || gameData.marks || 1,
          difficulty: gameData.question_data?.difficulty || gameData.difficulty
        };
        
        console.log('[GamePlayerPage] Match Column Data (parsed):', {
          hasLeftColumn: matchColumnData.leftColumn.length > 0,
          hasRightColumn: matchColumnData.rightColumn.length > 0,
          hasCorrectPairs: matchColumnData.correctPairs.length > 0,
          leftLength: matchColumnData.leftColumn.length,
          rightLength: matchColumnData.rightColumn.length,
          correctPairsLength: matchColumnData.correctPairs.length
        });
        
        if (!matchColumnData.leftColumn.length || !matchColumnData.rightColumn.length || !matchColumnData.correctPairs.length) {
          console.error('[GamePlayerPage] Match column data missing:', matchColumnData);
          return (
            <div className="text-center p-8">
              <p className="text-destructive">Match column data is missing or invalid</p>
              <Button onClick={handleExit} className="mt-4">Back to Topic</Button>
            </div>
          );
        }
        
        return (
          <LineMatchingGame
            gameData={matchColumnData}
            onCorrect={handleCorrectAnswer}
            onWrong={handleWrongAnswer}
            onComplete={handleGameComplete}
            onNext={navInfo?.nextGameId ? handleNext : undefined}
            hasMoreQuestions={!!navInfo?.nextGameId}
            initialAttemptCount={initialAttemptCount}
          />
        );

      case 'match_pair': // ✅ Use singular to match normalization
        const parsedMatchPairs = parseMatchPairsData(gameData);
        
        let pairs: { id: string; left: string; right: string }[] = [];
        
        // ✅ Priority 1: Use pairs array directly (match_pair format)
        if (parsedMatchPairs.pairs && parsedMatchPairs.pairs.length > 0) {
          pairs = parsedMatchPairs.pairs.map((pair: any, index: number) => ({
            id: pair.id || `pair-${index}`,
            left: pair.left || '',
            right: pair.right || ''
          }));
        }
        // ✅ Priority 2: Fallback - build from answer_data.pairs if question_data.pairs missing
        else if (gameData.answer_data?.pairs && gameData.answer_data.pairs.length > 0) {
          pairs = gameData.answer_data.pairs.map((pair: any, index: number) => ({
            id: pair.id || `pair-${index}`,
            left: pair.left || '',
            right: pair.right || ''
          }));
        }
        // ✅ Priority 3: Convert from leftColumn/rightColumn/correctPairs (match_column format)
        else if (parsedMatchPairs.leftColumn?.length && parsedMatchPairs.correctPairs?.length) {
          pairs = parsedMatchPairs.correctPairs.map((pair, index) => ({
            id: `pair-${index}`,
            left: parsedMatchPairs.leftColumn[pair.left] || '',
            right: parsedMatchPairs.rightColumn[pair.right] || ''
          }));
        }
        
        console.log('[GamePlayerPage] Match Pairs Data (parsed):', { pairsCount: pairs.length, pairs });
        
        if (!pairs.length) {
          console.error('[GamePlayerPage] Match pairs data missing');
          return (
            <div className="text-center p-8">
              <p className="text-destructive">Match pairs data is missing or invalid</p>
              <Button onClick={handleExit} className="mt-4">Back to Topic</Button>
            </div>
          );
        }
        
        const matchPairsData = {
          pairs,
          time_limit: 180,
          max_attempts: 3
        };
        
        return (
          <MatchPairsGame
            gameData={matchPairsData}
            onCorrect={handleCorrectAnswer}
            onWrong={handleWrongAnswer}
            onComplete={handleGameComplete}
            initialAttemptCount={initialAttemptCount}
          />
        );
      
      case 'fill_blank':
        // Use parser to extract from JSONB columns
        const parsedFB = parseFillBlankData(gameData);
        
        // Ensure distractors is always an array (never undefined)
        const fillBlankData = {
          question: parsedFB.text,
          blanks: parsedFB.blanks || [],
          sub_questions: Array.isArray(parsedFB.sub_questions) 
            ? parsedFB.sub_questions.map(sq => ({
                text: sq.text,
                correctAnswer: sq.correctAnswer,
                distractors: sq.distractors || []
              }))
            : undefined,
          numbering_style: parsedFB.numbering_style,
          use_word_bank: parsedFB.use_word_bank !== undefined ? parsedFB.use_word_bank : true, // Pass flag to component
          explanation: parsedFB.explanation,
          marks: gameData.question_data?.marks || gameData.marks || 1,
          difficulty: gameData.question_data?.difficulty || gameData.difficulty
        };
        
        console.log('[GamePlayerPage] Fill Blank Data (parsed):', {
          hasBlanks: Array.isArray(fillBlankData.blanks) && fillBlankData.blanks.length > 0,
          hasSubQuestions: Array.isArray(fillBlankData.sub_questions) && fillBlankData.sub_questions.length > 0,
          gameId: gameData.id,
          rawData: fillBlankData
        });
        
        // Validate: Must have either blanks or sub_questions
        const hasBlanks = Array.isArray(fillBlankData.blanks) && fillBlankData.blanks.length > 0;
        const hasSubQuestions = Array.isArray(fillBlankData.sub_questions) && fillBlankData.sub_questions.length > 0;
        
        if (!hasBlanks && !hasSubQuestions) {
          console.error('[GamePlayerPage] Fill blank has no valid data:', gameData);
          return (
            <div className="text-center p-8">
              <p className="text-destructive">Fill blank data is missing or invalid</p>
              <Button onClick={handleExit} className="mt-4">Back to Topic</Button>
            </div>
          );
        }
        
        return (
          <DragDropBlanks
            gameData={fillBlankData}
            onCorrect={handleCorrectAnswer}
            onWrong={handleWrongAnswer}
            onComplete={handleGameComplete}
            onNext={navInfo?.nextGameId ? handleNext : undefined}
            hasMoreQuestions={!!navInfo?.nextGameId}
            initialAttemptCount={initialAttemptCount}
          />
        );

      case 'short_answer':
        const shortAnswerData = {
          question: gameData.question_text || gameData.question_data?.text || '',
          correctAnswer: gameData.answer_data?.correct_answer || gameData.answer_data?.answer || '',
          explanation: gameData.question_data?.explanation || gameData.answer_data?.explanation || '',
          marks: gameData.question_data?.marks || gameData.marks || 2,
          difficulty: gameData.question_data?.difficulty || gameData.difficulty || 'medium'
        };
        
        console.log('[GamePlayerPage] Short Answer Data:', shortAnswerData);
        
        if (!shortAnswerData.question) {
          return (
            <div className="text-center p-8">
              <p className="text-destructive">Short answer question text is missing</p>
              <Button onClick={handleExit} className="mt-4">Back to Topic</Button>
            </div>
          );
        }
        
        return (
          <Card className="max-w-3xl mx-auto p-6">
            <CardContent>
              <h2 className="text-2xl font-bold mb-4">Short Answer Question</h2>
              <p className="text-lg mb-6">{shortAnswerData.question}</p>
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-semibold mb-2">Expected Answer:</h3>
                <p className="whitespace-pre-wrap">{shortAnswerData.correctAnswer}</p>
              </div>
              {shortAnswerData.explanation && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <h3 className="font-semibold mb-2">Explanation:</h3>
                  <p>{shortAnswerData.explanation}</p>
                </div>
              )}
              <div className="flex gap-4 mt-6">
                {navInfo?.previousGameId && (
                  <Button onClick={handlePrevious} variant="outline">
                    Previous
                  </Button>
                )}
                {navInfo?.nextGameId ? (
                  <Button onClick={handleNext} className="ml-auto">
                    Next Question
                  </Button>
                ) : (
                  <Button onClick={handleExit} className="ml-auto">
                    Back to Topic
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'interactive_blanks':
        // Keep InteractiveBlanks for its own type
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
        // Use parser to extract from JSONB columns
        const parsedTF = parseTrueFalseData(gameData);
        
        // Check if multi-part or single statement
        const tfData = parsedTF.statements?.length > 0 
          ? {
              // Multi-part format
              statements: parsedTF.statements,
              numbering_style: parsedTF.numbering_style,
              explanation: parsedTF.explanation,
              marks: gameData.question_data?.marks || gameData.marks || 1,
              difficulty: gameData.question_data?.difficulty || gameData.difficulty
            }
          : {
              // Single statement format (legacy or if only 1 statement)
              question: parsedTF.statement,
              correctAnswer: parsedTF.correctValue,
              explanation: parsedTF.explanation,
              marks: gameData.question_data?.marks || gameData.marks || 1,
              difficulty: gameData.question_data?.difficulty || gameData.difficulty
            };
        
        console.log('[GamePlayerPage] True/False Data (parsed):', tfData);
        
        return (
          <TrueFalseGame
            gameData={tfData}
            onSubmit={handleSubmitAnswer}
            onComplete={handleGameComplete}
            onNext={navInfo?.nextGameId ? handleNext : undefined}
            hasMoreQuestions={!!navInfo?.nextGameId}
            initialAttemptCount={initialAttemptCount}
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
            onSubmit={handleSubmitAnswer}
            onComplete={handleGameComplete}
            onNext={navInfo?.nextGameId ? handleNext : undefined}
            onPrevious={navInfo?.previousGameId ? handlePrevious : undefined}
            onExit={handleExit}
            hasMoreQuestions={!!navInfo?.nextGameId}
            currentQuestionNum={navInfo?.currentGameNumber || 1}
            totalQuestions={navInfo?.totalGames || 1}
          />
        );
      
      default:
        // Log for debugging
        console.error('❌ Unsupported game type:', {
          exerciseType,
          rawType,
          gameId: gameData.id,
          supportedTypes: ['mcq', 'match_column', 'match_pair', 'fill_blank', 'true_false', 'short_answer', 'assertion_reason', 'interactive_blanks', 'drag_drop_sort']
        });
        
        return (
          <div className="text-center p-8">
            <p className="text-muted-foreground mb-4">
              Game type "{exerciseType}" is not yet supported.
            </p>
            <div className="bg-muted p-4 rounded-md text-left max-w-md mx-auto">
              <p className="text-sm font-semibold mb-2">Debug Info:</p>
              <pre className="text-xs overflow-auto">
                {JSON.stringify({ 
                  type: exerciseType, 
                  rawType: rawType,
                  gameId: gameData.id 
                }, null, 2)}
              </pre>
            </div>
            <Button onClick={handleExit} className="mt-4">
              Back to Topic
            </Button>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <StudentAppLayout>
        <div className="container py-8">
          <div>Loading game...</div>
        </div>
      </StudentAppLayout>
    );
  }

  if (!gameData) {
    return (
      <StudentAppLayout>
        <div className="container py-8 text-center">
          <div className="animate-pulse">
            <p className="text-lg mb-4">Game not found. Searching for next available game...</p>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </StudentAppLayout>
    );
  }

  return (
    <StudentAppLayout>
      <div className="container px-3 py-8">
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
            Game {navInfo?.currentGameNumber}/{navInfo?.totalGames}
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
        
        {/* Floating AI Chatbot - Only shows after 2+ attempts */}
        {gameData && gameId && (
          <GameFloatingChatbot
            gameId={gameId}
            questionText={gameData.question_text || 'Game question'}
            gameType={gameData.exercise_type || 'Unknown'}
            subject={gameData.subject}
            topic={topicId}
            correctAnswer={gameData.correct_answer}
            explanation={gameData.explanation}
          />
        )}
      </div>
    </div>
  );
};

export default GamePlayerPage;
