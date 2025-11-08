import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundEffects";
import { parseBoolean } from "@/lib/gameValidation";

interface Statement {
  text: string;
  answer: boolean;
}

interface TrueFalseGameData {
  question?: string; // Legacy single statement (deprecated)
  correctAnswer?: boolean; // For single statement
  statements?: Statement[]; // For multi-part (preferred)
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
  
  // Multi-part states
  const [multiAnswers, setMultiAnswers] = useState<{ [key: number]: boolean }>({});
  const isMultiPart = gameData.statements && gameData.statements.length > 0;
  
  console.log('[TrueFalseGame Debug] gameData:', gameData);
  console.log('[TrueFalseGame Debug] isMultiPart:', isMultiPart);

  useEffect(() => {
    setSelectedAnswer(null);
    setHasSubmitted(false);
    setIsCorrect(false);
    setShowExplanation(false);
    setMultiAnswers({});
  }, [gameData]);

  const handleSelect = (value: boolean) => {
    if (hasSubmitted) return;
    setSelectedAnswer(value);
  };

  const handleSubmit = () => {
    if (isMultiPart) {
      // Check all statements answered
      if (Object.keys(multiAnswers).length !== gameData.statements!.length) return;
      
      setHasSubmitted(true);
      
      // Check all answers
      const allCorrect = gameData.statements!.every((stmt, idx) => 
        multiAnswers[idx] === stmt.answer
      );
      setIsCorrect(allCorrect);
      
      if (allCorrect) {
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
    } else {
      // Single statement
      if (selectedAnswer === null) return;

      setHasSubmitted(true);
      const parsedCorrect = parseBoolean(gameData.correctAnswer);
      const correct = selectedAnswer === parsedCorrect;
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
      <CardContent className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Badge variant="outline">True or False</Badge>
          {gameData.difficulty && (
            <Badge variant="secondary">{gameData.difficulty}</Badge>
          )}
        </div>

        {/* Multi-Part Statements OR Single True/False */}
        {isMultiPart ? (
          <div className="space-y-6">
            <ol className="list-[lower-roman] pl-6 space-y-4">
              {gameData.statements!.map((stmt, idx) => (
                <li key={idx} className="space-y-2">
                  <p className="text-lg font-medium leading-relaxed">{stmt.text}</p>
                  
                  {!hasSubmitted ? (
                    <div className="grid grid-cols-2 gap-3 ml-4">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setMultiAnswers({ ...multiAnswers, [idx]: true })}
                        className={cn(
                          "p-4 rounded-lg border-2 cursor-pointer transition-all",
                          multiAnswers[idx] === true
                            ? "border-green-500 bg-green-500/10"
                            : "border-border hover:border-green-500/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="font-semibold">True</span>
                        </div>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setMultiAnswers({ ...multiAnswers, [idx]: false })}
                        className={cn(
                          "p-4 rounded-lg border-2 cursor-pointer transition-all",
                          multiAnswers[idx] === false
                            ? "border-destructive bg-destructive/10"
                            : "border-border hover:border-destructive/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <X className="w-5 h-5 text-destructive" />
                          <span className="font-semibold">False</span>
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    <div className={cn(
                      "ml-4 p-3 rounded-lg border-2 flex items-center gap-2",
                      multiAnswers[idx] === stmt.answer 
                        ? "border-green-500 bg-green-500/10" 
                        : "border-destructive bg-destructive/10"
                    )}>
                      {multiAnswers[idx] === stmt.answer ? (
                        <>
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-700">
                            Correct: {stmt.answer ? 'True' : 'False'}
                          </span>
                        </>
                      ) : (
                        <>
                          <X className="w-5 h-5 text-destructive" />
                          <span className="font-semibold text-destructive">
                            Your answer: {multiAnswers[idx] ? 'True' : 'False'} | Correct: {stmt.answer ? 'True' : 'False'}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ) : gameData.question ? (
          // Single True/False with question text - using box-style buttons for consistency
          <div className="space-y-6">
            <div className="text-lg font-medium p-6 bg-muted/30 rounded-lg text-center">
              {gameData.question}
            </div>
            
            {/* Box-style True/False buttons (consistent with multi-statement) */}
            {!hasSubmitted ? (
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(true)}
                  className={cn(
                    "p-6 rounded-lg border-2 cursor-pointer transition-all",
                    selectedAnswer === true
                      ? "border-green-500 bg-green-500/10"
                      : "border-border hover:border-green-500/50"
                  )}
                >
                  <div className="flex items-center justify-center gap-3">
                    <Check className="w-6 h-6 text-green-600" />
                    <span className="text-xl font-semibold">True</span>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(false)}
                  className={cn(
                    "p-6 rounded-lg border-2 cursor-pointer transition-all",
                    selectedAnswer === false
                      ? "border-destructive bg-destructive/10"
                      : "border-border hover:border-destructive/50"
                  )}
                >
                  <div className="flex items-center justify-center gap-3">
                    <X className="w-6 h-6 text-destructive" />
                    <span className="text-xl font-semibold">False</span>
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={cn(
                  "p-4 rounded-lg border-2 flex items-center gap-3",
                  isCorrect 
                    ? "border-green-500 bg-green-500/10" 
                    : "border-destructive bg-destructive/10"
                )}>
                  {isCorrect ? (
                    <>
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">
                        Correct: {parseBoolean(gameData.correctAnswer) ? 'True' : 'False'}
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-destructive" />
                      <span className="font-semibold text-destructive">
                        Your answer: {selectedAnswer ? 'True' : 'False'} | Correct: {parseBoolean(gameData.correctAnswer) ? 'True' : 'False'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

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
            <Button 
              onClick={handleSubmit} 
              disabled={isMultiPart 
                ? Object.keys(multiAnswers).length !== gameData.statements!.length 
                : selectedAnswer === null
              } 
              className="flex-1" 
              size="lg"
            >
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
