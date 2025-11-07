import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Heart, Star, Flame, ArrowRight, SkipForward, Award, Trophy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundEffects";
import { MatchPairsGame } from "./games/MatchPairsGame";
import { DragDropSequence } from "./games/DragDropSequence";
import { TypingRaceGame } from "./games/TypingRaceGame";
import { InteractiveBlanks } from "./games/InteractiveBlanks";
import { DragDropBlanks } from "./games/DragDropBlanks";
import { ConceptPuzzle } from "./games/ConceptPuzzle";
import { PhysicsSimulator } from "./games/PhysicsSimulator";
import { MCQGame } from "./games/MCQGame";
import { MathGraphAnimation } from "./svg-animations/MathGraphAnimation";
import { PhysicsMotionAnimation } from "./svg-animations/PhysicsMotionAnimation";
import { ChemistryMoleculeAnimation } from "./svg-animations/ChemistryMoleculeAnimation";
import { AlgorithmVisualization } from "./svg-animations/AlgorithmVisualization";
import { 
  parseMCQData,
  parseFillBlankData,
  parseTrueFalseData,
  parseMatchPairsData,
  parseAssertionReasonData
} from "@/lib/questionDataHelpers";

interface Lesson {
  id: string;
  lesson_type: string;
  theory_text?: string;
  theory_html?: string;
  theory_language?: string;
  checkpoint_config?: any;
  svg_type?: string;
  svg_data?: any;
  game_type?: string;
  game_data?: any;
  playground_config?: any;
  estimated_time_minutes: number;
  xp_reward: number;
}

interface DuolingoStyleLearningProps {
  lesson: Lesson;
  topicId: string;
  onComplete: () => void;
  onExit: () => void;
}

export function DuolingoStyleLearning({ lesson, topicId, onComplete, onExit }: DuolingoStyleLearningProps) {
  const { toast } = useToast();
  // ❌ REMOVED: Hearts system completely
  const [currentXP, setCurrentXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showWrongAnswer, setShowWrongAnswer] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  
  // Checkpoint states
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<number, any>>({});
  const [checkpointCorrect, setCheckpointCorrect] = useState<Record<number, boolean>>({});
  const [selectedCheckpointAnswer, setSelectedCheckpointAnswer] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
    initializeLesson();
  }, [lesson]);

  const fetchUserData = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    // ❌ REMOVED: Hearts fetching
    
    // Fetch XP and streak
    const { data: xpData } = await supabase
      .from('student_gamification')
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

  // ❌ REMOVED: loseHeart and handleSkip functions (heart system removed)

  const handleCorrectAnswer = async () => {
    // ✅ Play success sound
    playSound('correct');
    
    // ✅ Trigger confetti
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347']
    });

    // ✅ AWARD XP HERE (only on correct answer)
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const xpToAward = lesson.xp_reward || 10;
      
      await supabase.functions.invoke('xp-coin-reward-system', {
        body: {
          action: 'add',
          xp_earned: xpToAward,
          coins_earned: 0
        }
      });

      setEarnedXP(xpToAward);
      playSound('xp_gain');
    }

    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      handleContinue();
    }, 2000);
  };

  const handleWrongAnswer = async () => {
    // ❌ NO XP on wrong answer, just feedback
    playSound('wrong');
    
    setShowWrongAnswer(true);
    setTimeout(() => {
      setShowWrongAnswer(false);
      // ❌ Continue button still works, no heart penalty
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

    // ❌ REMOVED: XP awarding from here (now happens in handleCorrectAnswer only)

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

  const parseGameData = (gameType: string | undefined, rawGameData: any) => {
    // If game_data doesn't have question_data/answer_data, it's plain API format
    if (!rawGameData?.question_data && !rawGameData?.answer_data) {
      switch (gameType) {
        case 'mcq': {
          // Extract correct answer index from various possible formats
          let correctIndex = 0;
          if (typeof rawGameData?.correct_answer === 'number') {
            correctIndex = rawGameData.correct_answer;
          } else if (typeof rawGameData?.correct_answer?.index === 'number') {
            correctIndex = rawGameData.correct_answer.index;
          } else if (typeof rawGameData?.correctIndex === 'number') {
            correctIndex = rawGameData.correctIndex;
          }
          
          return {
            question: rawGameData?.text || rawGameData?.question || 'Question',
            options: rawGameData?.options || [],
            correct_answer: correctIndex,
            explanation: rawGameData?.explanation || '',
            marks: rawGameData?.marks || 1,
            difficulty: rawGameData?.difficulty,
          };
        }
        
        case 'true_false': {
          const statementText = rawGameData?.question
            ?? (Array.isArray(rawGameData?.statements) ? rawGameData.statements[0] : undefined)
            ?? rawGameData?.text
            ?? 'True or False?';

          // Determine correct answer index (0: True, 1: False)
          const correctBool = typeof rawGameData?.correct_answer === 'boolean'
            ? rawGameData.correct_answer
            : (typeof rawGameData?.correctValue === 'boolean' ? rawGameData.correctValue : undefined);
          const correctIndex = typeof correctBool === 'boolean' ? (correctBool ? 0 : 1) : 0;

          return {
            question: statementText,
            options: ['True', 'False'],
            correct_answer: correctIndex,
            explanation: rawGameData?.explanation || '',
            marks: rawGameData?.marks || 1,
            difficulty: rawGameData?.difficulty,
          };
        }
        
        case 'match_pairs':
        case 'match_column': {
          const leftCol = rawGameData?.leftColumn || [];
          const rightCol = rawGameData?.rightColumn || [];
          
          return {
            question: rawGameData?.text || '',
            pairs: leftCol.map((left: string, i: number) => ({
              id: String(i + 1),
              left,
              right: rightCol[i] || ''
            })),
            explanation: rawGameData?.explanation || '',
            marks: rawGameData?.marks || 1,
          };
        }
        
        case 'fill_blanks':
        case 'interactive_blanks': {
          // Multi-part format
          if (rawGameData?.sub_questions?.length > 0) {
            return {
              sub_questions: rawGameData.sub_questions,
              numbering_style: rawGameData.numbering_style || '1,2,3',
              explanation: rawGameData?.explanation || '',
              marks: rawGameData?.marks || 1,
              difficulty: rawGameData?.difficulty,
            };
          }
          // Single blank format
          if (rawGameData?.text && (rawGameData?.correct_answer?.blanks || rawGameData?.blanks)) {
            return {
              question: rawGameData.text,
              blanks: rawGameData.correct_answer?.blanks || rawGameData.blanks,
              explanation: rawGameData?.explanation || '',
              marks: rawGameData?.marks || 1,
            };
          }
          return rawGameData;
        }
        
        default:
          return rawGameData;
      }
    }

    // Parse JSONB format
    let parsed: any = {};
    
    switch (gameType) {
      case 'mcq':
      case 'assertion_reason':
        parsed = parseMCQData(rawGameData);
        return {
          question: parsed.text,
          options: parsed.options,
          correct_answer: parsed.correctIndex,
          explanation: parsed.explanation,
          marks: rawGameData.question_data?.marks || rawGameData.marks || 1,
          difficulty: rawGameData.question_data?.difficulty || rawGameData.difficulty
        };
        
      case 'true_false': {
        parsed = parseTrueFalseData(rawGameData);
        // Always map to MCQGame shape
        const statementText = parsed?.statement
          ?? parsed?.statements?.[0]?.text
          ?? rawGameData?.question_data?.text
          ?? rawGameData?.question
          ?? rawGameData?.statements?.[0]
          ?? 'True or False?';

        const correctBool = typeof parsed?.correctValue === 'boolean'
          ? parsed.correctValue
          : (typeof parsed?.statements?.[0]?.answer === 'boolean' ? parsed.statements[0].answer : undefined);
        const correctIndex = typeof correctBool === 'boolean' ? (correctBool ? 0 : 1) : 0;

        return {
          question: statementText,
          options: ['True', 'False'],
          correct_answer: correctIndex,
          explanation: parsed?.explanation,
          marks: rawGameData.question_data?.marks || rawGameData.marks || 1,
          difficulty: rawGameData.question_data?.difficulty || rawGameData.difficulty,
        };
      }
        
      case 'fill_blanks':
      case 'interactive_blanks':
        parsed = parseFillBlankData(rawGameData);
        return {
          question: parsed.text,
          blanks: parsed.blanks,
          sub_questions: parsed.sub_questions,
          numbering_style: parsed.numbering_style,
          explanation: parsed.explanation,
          marks: rawGameData.question_data?.marks || rawGameData.marks || 1
        };
        
      case 'match_pairs':
      case 'match_column':
        parsed = parseMatchPairsData(rawGameData);
        // Transform to pairs array format for MatchPairsGame
        const pairs = parsed.leftColumn.map((left: string, idx: number) => ({
          id: String(idx + 1),
          left,
          right: parsed.rightColumn[parsed.correctPairs.find((p: any) => p.left === idx)?.right || idx]
        }));
        return {
          question: parsed.question,
          pairs,
          explanation: parsed.explanation,
          marks: rawGameData.question_data?.marks || rawGameData.marks || 1
        };
        
      default:
        console.warn('Unknown game type for parsing:', gameType);
        return rawGameData;
    }
  };

  const getGameComponent = (gameType: string | undefined) => {
    switch (gameType) {
      case 'mcq':
      case 'true_false':
      case 'assertion_reason':
        return MCQGame;
      case 'match_pairs':
      case 'match_column':
        return MatchPairsGame;
      case 'drag_drop':
        return DragDropSequence;
      case 'typing_race':
        return TypingRaceGame;
      case 'fill_blanks':
      case 'interactive_blanks':
        return DragDropBlanks;
      case 'word_puzzle':
        return ConceptPuzzle;
      case 'physics_simulator':
        return PhysicsSimulator;
      default:
        return null;
    }
  };

  const renderGameContent = () => {
    const GameComponent = getGameComponent(lesson.game_type);
    
    if (!GameComponent || !lesson.game_data) {
      return (
        <Card className="p-8 bg-accent/30">
          <p className="text-center text-muted-foreground">
            Game configuration missing or invalid game type: {lesson.game_type}
          </p>
        </Card>
      );
    }

    // Parse JSONB data before passing to component
    const parsedGameData = parseGameData(lesson.game_type, lesson.game_data);
    
    console.log('[DuolingoStyleLearning] Parsed game data:', {
      gameType: lesson.game_type,
      raw: lesson.game_data,
      parsed: parsedGameData
    });

    return (
      <GameComponent
        gameData={parsedGameData}
        onCorrect={handleCorrectAnswer}
        onWrong={handleWrongAnswer}
        onComplete={completeLesson}
      />
    );
  };

  const getSvgComponent = (svgType: string | undefined) => {
    switch (svgType) {
      case 'math_graph':
        return MathGraphAnimation;
      case 'physics_motion':
        return PhysicsMotionAnimation;
      case 'chemistry_molecule':
        return ChemistryMoleculeAnimation;
      case 'algorithm_viz':
        return AlgorithmVisualization;
      default:
        return null;
    }
  };

  const renderSvgContent = () => {
    const SvgComponent = getSvgComponent(lesson.svg_type);
    
    if (!SvgComponent || !lesson.svg_data) {
      return (
        <Card className="p-8 bg-accent/30">
          <p className="text-center text-muted-foreground">
            SVG configuration missing or invalid SVG type: {lesson.svg_type}
          </p>
        </Card>
      );
    }

    return (
        <div className="space-y-6">
          <SvgComponent
            svgData={lesson.svg_data}
            onComplete={() => {
              handleCorrectAnswer();
              setTimeout(completeLesson, 1000);
            }}
          />
          <div className="flex justify-end">
            <Button size="lg" onClick={handleCorrectAnswer} className="gap-2">
              I Understand <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
    );
  };

  const handleCheckpointAnswer = async (sectionIdx: number, answer: any) => {
    const sections = lesson.checkpoint_config?.sections || [];
    const checkpoint = sections[sectionIdx]?.checkpoint;
    if (!checkpoint) return;

    setSelectedCheckpointAnswer(answer);
    const isCorrect = answer === checkpoint.correct_answer;
    
    setCheckpointAnswers({ ...checkpointAnswers, [sectionIdx]: answer });
      setCheckpointCorrect({ ...checkpointCorrect, [sectionIdx]: isCorrect });

    if (isCorrect) {
      playSound('correct');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      
      // Save checkpoint progress
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase.from('student_checkpoint_progress').upsert({
          student_id: user.user.id,
          lesson_id: lesson.id,
          section_index: sectionIdx,
          checkpoint_answered: true,
          is_correct: true,
          attempts: (checkpointAnswers[sectionIdx] ? 1 : 0) + 1,
          completed_at: new Date().toISOString()
        });
      }

      setTimeout(() => {
        if (sectionIdx < sections.length - 1) {
          setCurrentSectionIndex(sectionIdx + 1);
          setSelectedCheckpointAnswer(null);
        } else {
          completeLesson();
        }
      }, 1500);
    } else {
      playSound('wrong');
      // ❌ REMOVED: loseHeart() - no heart penalty
    }
  };

  const renderTheoryWithCheckpoints = () => {
    const sections = lesson.checkpoint_config?.sections || [];
    
    if (sections.length === 0) {
      // Fallback to regular theory
      return (
        <div className="prose prose-lg max-w-none">
          <div className="bg-card rounded-lg p-6">
            <div dangerouslySetInnerHTML={{ __html: lesson.theory_html || lesson.theory_text || '' }} />
          </div>
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={handleContinue} className="gap-2">
              Continue <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      );
    }

    const currentSection = sections[currentSectionIndex];
    
    return (
      <div className="space-y-6">
        {/* Theory Section */}
        <Card className="p-6">
          <div className="prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: `<p>${currentSection.section_text}</p>` }} />
          </div>
        </Card>

        {/* Checkpoint Question */}
        {currentSection.checkpoint && (
          <Card className="border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-500 rounded-full">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                  Quick Check: Samajh mein aaya?
                </h3>
              </div>
              
              <p className="text-base font-medium mb-4">{currentSection.checkpoint.question_text}</p>

              {currentSection.checkpoint.question_type === 'mcq' && (
                <div className="space-y-2">
                  {currentSection.checkpoint.options?.map((opt: string, i: number) => {
                    const isSelected = selectedCheckpointAnswer === i;
                    const isAnswered = checkpointAnswers[currentSectionIndex] !== undefined;
                    const isCorrectAnswer = i === currentSection.checkpoint.correct_answer;
                    const showResult = isAnswered && isSelected;

                    return (
                      <Button
                        key={i}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "w-full text-left justify-start h-auto py-3 px-4",
                          showResult && checkpointCorrect[currentSectionIndex] && "bg-green-500 hover:bg-green-600",
                          showResult && !checkpointCorrect[currentSectionIndex] && "bg-red-500 hover:bg-red-600"
                        )}
                        onClick={() => !isAnswered && handleCheckpointAnswer(currentSectionIndex, i)}
                        disabled={isAnswered}
                      >
                        <span className="font-semibold mr-3">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Feedback */}
              {checkpointAnswers[currentSectionIndex] !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "mt-4 p-4 rounded-lg",
                    checkpointCorrect[currentSectionIndex]
                      ? "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400"
                  )}
                >
                  <p className="font-semibold flex items-center gap-2">
                    {checkpointCorrect[currentSectionIndex] ? "✅ Sahi hai!" : "❌ Galat, try again!"}
                  </p>
                  <p className="text-sm mt-1">{currentSection.checkpoint.explanation}</p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Continue button (only show if no checkpoint or checkpoint answered correctly) */}
        {(!currentSection.checkpoint || checkpointCorrect[currentSectionIndex]) && (
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={() => {
                if (currentSectionIndex < sections.length - 1) {
                  setCurrentSectionIndex(currentSectionIndex + 1);
                  setSelectedCheckpointAnswer(null);
                } else {
                  completeLesson();
                }
              }}
              className="gap-2"
            >
              {currentSectionIndex < sections.length - 1 ? "Next Section" : "Complete Lesson"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (lesson.lesson_type) {
      case 'theory':
        return lesson.checkpoint_config ? renderTheoryWithCheckpoints() : (
          <div className="prose prose-lg max-w-none">
            <div className="bg-card rounded-lg p-6">
              <div dangerouslySetInnerHTML={{ __html: lesson.theory_html || lesson.theory_text || '' }} />
            </div>
            <div className="mt-6 flex justify-end">
              <Button size="lg" onClick={handleContinue} className="gap-2">
                Continue <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        );

      case 'interactive_svg':
        return renderSvgContent();

      case 'game':
        return renderGameContent();

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
            {/* ❌ REMOVED: Hearts display */}

            {/* XP and Streak */}
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs font-semibold">
                Earn {lesson.xp_reward || 1} XP
              </Badge>
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
            <p className="text-muted-foreground">Try again! (No XP for wrong answers)</p>
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
