import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundEffects";
import { Progress } from "@/components/ui/progress";

interface MCQGameData {
  question: string;
  options: string[];
  correct_answer: number; // Index of correct option
  explanation?: string;
  marks?: number;
  difficulty?: string;
}

interface MCQGameProps {
  gameData: MCQGameData;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: () => void;
  onNext?: () => void; // Optional: called when Continue is clicked
  onPrevious?: () => void; // Optional: called when Previous is clicked
  hasMoreQuestions?: boolean; // If true, shows "Next" instead of completing
  currentQuestionNum?: number; // For progress display
  totalQuestions?: number; // For progress display
}

export function MCQGame({ 
  gameData, 
  onCorrect, 
  onWrong, 
  onComplete,
  onNext,
  onPrevious,
  hasMoreQuestions = false,
  currentQuestionNum,
  totalQuestions
}: MCQGameProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    // Reset state when gameData changes
    setSelectedAnswer(null);
    setHasSubmitted(false);
    setIsCorrect(false);
    setShowExplanation(false);
  }, [gameData]);

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    setHasSubmitted(true);
    
    // Phase 2: Defensive check for correct answer normalization
    let correctAnswerIndex: number = gameData.correct_answer;
    if (typeof gameData.correct_answer === 'object' && gameData.correct_answer !== null) {
      const answerObj = gameData.correct_answer as any;
      correctAnswerIndex = answerObj.value ?? answerObj.index ?? 0;
    } else if (typeof gameData.correct_answer !== 'number') {
      correctAnswerIndex = 0;
    }
    
    const correct = selectedAnswer === correctAnswerIndex;
    setIsCorrect(correct);

    if (correct) {
      playSound('correct');
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });
      onCorrect();
    } else {
      playSound('wrong');
      onWrong();
    }

    // Show explanation after a brief delay
    setTimeout(() => {
      setShowExplanation(true);
    }, 500);
  };

  // Derive hasMore from currentQuestionNum and totalQuestions if available
  const derivedHasMore = (typeof currentQuestionNum === 'number' && typeof totalQuestions === 'number')
    ? currentQuestionNum < totalQuestions
    : hasMoreQuestions;

  const handleContinue = () => {
    console.log('[MCQGame] handleContinue - derivedHasMore:', derivedHasMore, 'currentQ:', currentQuestionNum, 'total:', totalQuestions);
    if (derivedHasMore && onNext) {
      onNext();
    } else {
      onComplete();
    }
  };

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, D...
  };

  const canGoPrevious = (currentQuestionNum ?? 1) > 1;
  const canGoNext = (currentQuestionNum ?? 1) < (totalQuestions ?? 1);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Progress Bar & Navigation (Phase 4) */}
      {totalQuestions && totalQuestions > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              Question {currentQuestionNum || 1} of {totalQuestions}
            </span>
            <span className="text-primary font-semibold">
              {Math.round(((currentQuestionNum || 1) / totalQuestions) * 100)}% Complete
            </span>
          </div>
          <Progress value={((currentQuestionNum || 1) / totalQuestions) * 100} className="h-2" />
          
          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={!canGoPrevious || !onPrevious}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={!canGoNext || !onNext}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Question Card */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1 max-h-[400px] overflow-y-auto pr-4">
              <h3 className="text-xl font-semibold text-foreground whitespace-pre-wrap break-words">
                {gameData.question}
              </h3>
            </div>
            <div className="flex gap-2 ml-4 flex-shrink-0">
              {gameData.marks && (
                <>
                  <Badge variant="outline" className="bg-primary/10">
                    {gameData.marks} {gameData.marks === 1 ? 'Mark' : 'Marks'}
                  </Badge>
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">
                    {gameData.marks} XP
                  </Badge>
                </>
              )}
              {gameData.difficulty && (
                <Badge 
                  variant={
                    gameData.difficulty === 'easy' ? 'default' : 
                    gameData.difficulty === 'medium' ? 'secondary' : 
                    'destructive'
                  }
                >
                  {gameData.difficulty}
                </Badge>
              )}
            </div>
          </div>

          {/* Options */}
          <RadioGroup
            value={selectedAnswer?.toString()}
            onValueChange={(value) => !hasSubmitted && setSelectedAnswer(parseInt(value))}
            className="space-y-3"
            disabled={hasSubmitted}
          >
            {gameData.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = index === gameData.correct_answer;
              const showAsCorrect = hasSubmitted && isCorrectOption;
              const showAsWrong = hasSubmitted && isSelected && !isCorrect;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Label
                    htmlFor={`option-${index}`}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      "hover:bg-accent/50",
                      isSelected && !hasSubmitted && "border-primary bg-primary/10",
                      showAsCorrect && "border-green-500 bg-green-50 dark:bg-green-950/30",
                      showAsWrong && "border-red-500 bg-red-50 dark:bg-red-950/30",
                      hasSubmitted && "cursor-default"
                    )}
                  >
                    <RadioGroupItem
                      value={index.toString()}
                      id={`option-${index}`}
                      disabled={hasSubmitted}
                      className={cn(
                        showAsCorrect && "border-green-500 text-green-500",
                        showAsWrong && "border-red-500 text-red-500"
                      )}
                    />
                    <span className="font-semibold text-lg min-w-[2rem]">
                      {getOptionLabel(index)}.
                    </span>
                    <span className="flex-1 text-base">{option}</span>
                    
                    {/* Result Icons */}
                    {showAsCorrect && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto"
                      >
                        <Check className="h-6 w-6 text-green-600" />
                      </motion.div>
                    )}
                    {showAsWrong && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto"
                      >
                        <X className="h-6 w-6 text-red-600" />
                      </motion.div>
                    )}
                  </Label>
                </motion.div>
              );
            })}
          </RadioGroup>

          {/* Submit/Continue Button */}
          <div className="mt-6 flex justify-end">
            {!hasSubmitted ? (
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                className="min-w-[150px]"
              >
                Submit Answer
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleContinue}
                className="min-w-[150px]"
              >
                {derivedHasMore ? (
                  <>
                    Next Question
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  'Complete'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Explanation Card */}
      <AnimatePresence>
        {showExplanation && gameData.explanation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className={cn(
              "border-2",
              isCorrect ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
            )}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-full mt-1",
                    isCorrect ? "bg-green-500" : "bg-blue-500"
                  )}>
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className={cn(
                      "font-semibold text-lg mb-2",
                      isCorrect ? "text-green-700 dark:text-green-400" : "text-blue-700 dark:text-blue-400"
                    )}>
                      {isCorrect ? "Perfect! ✅" : "Explanation 💡"}
                    </h4>
                    <p className="text-base text-foreground/80">
                      {gameData.explanation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Banner */}
      <AnimatePresence>
        {hasSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "fixed bottom-8 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-full shadow-lg z-50",
              isCorrect ? "bg-green-500" : "bg-red-500"
            )}
          >
            <p className="text-white font-bold text-lg">
              {isCorrect 
                ? `🎉 Correct! You earned ${gameData.marks || 1} XP!` 
                : "❌ Wrong Answer"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
