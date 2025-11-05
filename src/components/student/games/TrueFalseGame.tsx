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
  question: string;
  correctAnswer?: boolean; // For single statement
  statements?: Statement[]; // For multi-part
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

        {/* Multi-Part Statements OR Single True/False */}
        {isMultiPart ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-medium">Select True or False for each statement:</p>
            <ol className="list-[lower-roman] pl-6 space-y-4">
              {gameData.statements!.map((stmt, idx) => (
                <li key={idx} className="space-y-2">
                  <p className="text-base leading-relaxed">{stmt.text}</p>
                  
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
        ) : (
          // Single True/False Toggle Switches
          <div className="flex gap-4">
            <motion.div
              onClick={() => !hasSubmitted && handleSelect(true)}
              className={cn(
                "flex-1 flex items-center gap-3 p-4 border-2 rounded-lg transition-all",
                !hasSubmitted && selectedAnswer === true && "border-primary bg-primary/10",
                !hasSubmitted && selectedAnswer !== true && "border-border hover:border-primary/50",
                !hasSubmitted && "cursor-pointer",
                hasSubmitted && selectedAnswer === true && isCorrect && "border-green-500 bg-green-500/10",
                hasSubmitted && selectedAnswer === true && !isCorrect && "border-red-500 bg-red-500/10",
                hasSubmitted && selectedAnswer !== true && parseBoolean(gameData.correctAnswer) === true && "border-green-500/40 bg-green-500/5",
                hasSubmitted && "cursor-default"
              )}
              whileHover={!hasSubmitted ? { scale: 1.02 } : {}}
              whileTap={!hasSubmitted ? { scale: 0.98 } : {}}
            >
              <Switch 
                checked={selectedAnswer === true}
                disabled={hasSubmitted}
                className={cn(
                  hasSubmitted && selectedAnswer === true && isCorrect && "data-[state=checked]:bg-green-500",
                  hasSubmitted && selectedAnswer === true && !isCorrect && "data-[state=checked]:bg-red-500",
                  hasSubmitted && selectedAnswer !== true && parseBoolean(gameData.correctAnswer) === true && "data-[state=checked]:bg-green-500"
                )}
              />
              <span className="text-lg font-medium">True</span>
            </motion.div>

            <motion.div
              onClick={() => !hasSubmitted && handleSelect(false)}
              className={cn(
                "flex-1 flex items-center gap-3 p-4 border-2 rounded-lg transition-all",
                !hasSubmitted && selectedAnswer === false && "border-primary bg-primary/10",
                !hasSubmitted && selectedAnswer !== false && "border-border hover:border-primary/50",
                !hasSubmitted && "cursor-pointer",
                hasSubmitted && selectedAnswer === false && isCorrect && "border-green-500 bg-green-500/10",
                hasSubmitted && selectedAnswer === false && !isCorrect && "border-red-500 bg-red-500/10",
                hasSubmitted && selectedAnswer !== false && parseBoolean(gameData.correctAnswer) === false && "border-green-500/40 bg-green-500/5",
                hasSubmitted && "cursor-default"
              )}
              whileHover={!hasSubmitted ? { scale: 1.02 } : {}}
              whileTap={!hasSubmitted ? { scale: 0.98 } : {}}
            >
              <Switch 
                checked={selectedAnswer === false}
                disabled={hasSubmitted}
                className={cn(
                  hasSubmitted && selectedAnswer === false && isCorrect && "data-[state=checked]:bg-green-500",
                  hasSubmitted && selectedAnswer === false && !isCorrect && "data-[state=checked]:bg-red-500",
                  hasSubmitted && selectedAnswer !== false && parseBoolean(gameData.correctAnswer) === false && "data-[state=checked]:bg-green-500"
                )}
              />
              <span className="text-lg font-medium">False</span>
            </motion.div>
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
