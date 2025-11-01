import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundEffects";

interface TrueFalseGameData {
  question: string;
  correctAnswer: boolean;
  explanation?: string;
  marks?: number;
  difficulty?: string;
}

interface TrueFalseGameProps {
  gameData: TrueFalseGameData;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: () => void;
  onNext?: () => void;
  hasMoreQuestions?: boolean;
}

export function TrueFalseGame({
  gameData,
  onCorrect,
  onWrong,
  onComplete,
  onNext,
  hasMoreQuestions = false,
}: TrueFalseGameProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    // Reset state when game data changes
    setSelectedAnswer(null);
    setHasSubmitted(false);
    setIsCorrect(false);
    setShowExplanation(false);
  }, [gameData]);

  const handleSelect = (value: boolean) => {
    if (hasSubmitted) return;
    setSelectedAnswer(value);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    setHasSubmitted(true);
    const correct = selectedAnswer === gameData.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      playSound("correct");
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#FFA500", "#FF6347"],
      });
      onCorrect();
    } else {
      playSound("wrong");
      onWrong();
    }

    setShowExplanation(true);
  };

  const handleContinue = () => {
    if (hasMoreQuestions && onNext) {
      onNext();
    } else {
      onComplete();
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Badge variant="outline">True or False</Badge>
          {gameData.difficulty && (
            <Badge variant="secondary">{gameData.difficulty}</Badge>
          )}
        </div>

        {/* Question */}
        <div className="text-lg font-medium p-6 bg-muted/30 rounded-lg text-center">
          {gameData.question}
        </div>

        {/* True/False Buttons */}
        {!hasSubmitted ? (
          <div className="grid grid-cols-2 gap-6">
            {/* TRUE Button */}
            <motion.button
              onClick={() => handleSelect(true)}
              className={cn(
                "group relative p-8 border-4 rounded-2xl transition-all",
                selectedAnswer === true
                  ? "border-green-500 bg-green-50 shadow-lg scale-105"
                  : "border-gray-200 hover:border-green-300 bg-background"
              )}
              whileHover={{ scale: selectedAnswer === true ? 1.05 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <CheckCircle
                className={cn(
                  "w-16 h-16 mx-auto mb-3 transition-colors",
                  selectedAnswer === true ? "text-green-600" : "text-green-400 group-hover:text-green-500"
                )}
              />
              <span className="text-2xl font-bold text-foreground">TRUE</span>
            </motion.button>

            {/* FALSE Button */}
            <motion.button
              onClick={() => handleSelect(false)}
              className={cn(
                "group relative p-8 border-4 rounded-2xl transition-all",
                selectedAnswer === false
                  ? "border-red-500 bg-red-50 shadow-lg scale-105"
                  : "border-gray-200 hover:border-red-300 bg-background"
              )}
              whileHover={{ scale: selectedAnswer === false ? 1.05 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <XCircle
                className={cn(
                  "w-16 h-16 mx-auto mb-3 transition-colors",
                  selectedAnswer === false ? "text-red-600" : "text-red-400 group-hover:text-red-500"
                )}
              />
              <span className="text-2xl font-bold text-foreground">FALSE</span>
            </motion.button>
          </div>
        ) : (
          /* Result Display */
          <div className="grid grid-cols-2 gap-6">
            {/* User's Answer */}
            <div
              className={cn(
                "p-8 border-4 rounded-2xl",
                selectedAnswer === true && isCorrect && "border-green-500 bg-green-50",
                selectedAnswer === true && !isCorrect && "border-red-500 bg-red-50",
                selectedAnswer === false && isCorrect && "border-green-500 bg-green-50",
                selectedAnswer === false && !isCorrect && "border-red-500 bg-red-50"
              )}
            >
              {selectedAnswer === true ? (
                <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-600" />
              ) : (
                <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600" />
              )}
              <span className="block text-2xl font-bold text-foreground mb-2">
                {selectedAnswer ? "TRUE" : "FALSE"}
              </span>
              <span className="text-sm text-muted-foreground">Your Answer</span>
              {isCorrect && <Check className="w-6 h-6 mx-auto mt-2 text-green-600" />}
              {!isCorrect && <X className="w-6 h-6 mx-auto mt-2 text-red-600" />}
            </div>

            {/* Correct Answer (if wrong) */}
            {!isCorrect && (
              <div className="p-8 border-4 border-green-500 bg-green-50 rounded-2xl opacity-70">
                {gameData.correctAnswer === true ? (
                  <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-600" />
                ) : (
                  <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600" />
                )}
                <span className="block text-2xl font-bold text-foreground mb-2">
                  {gameData.correctAnswer ? "TRUE" : "FALSE"}
                </span>
                <span className="text-sm text-muted-foreground">Correct Answer</span>
              </div>
            )}
          </div>
        )}

        {/* Result Message */}
        <AnimatePresence>
          {hasSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "p-4 rounded-lg flex items-start gap-3",
                isCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-destructive/10 border border-destructive/20"
              )}
            >
              {isCorrect ? (
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <X className="w-5 h-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1">
                <p className={cn("font-semibold", isCorrect ? "text-green-700" : "text-destructive")}>
                  {isCorrect ? "Correct! Well done! 🎉" : "Incorrect"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Explanation */}
        {hasSubmitted && showExplanation && gameData.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-700 mb-1">Explanation</p>
                <p className="text-sm text-foreground/80">{gameData.explanation}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!hasSubmitted ? (
            <Button onClick={handleSubmit} disabled={selectedAnswer === null} className="flex-1" size="lg">
              Submit Answer
            </Button>
          ) : (
            <Button onClick={handleContinue} className="flex-1" size="lg">
              {hasMoreQuestions ? "Next Question →" : "Complete"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
