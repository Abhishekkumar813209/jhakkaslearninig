import { useState, useEffect } from "react";
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, TouchSensor, MouseSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundEffects";

interface BlankAnswer {
  correctAnswer: string;
  distractors: string[];
}

interface SubQuestion {
  text: string;
  correctAnswer: string;
  distractors: string[];
}

interface DragDropBlanksGameData {
  question?: string; // Legacy single blank (deprecated)
  blanks?: BlankAnswer[];
  sub_questions?: SubQuestion[]; // Multi-part with numbering (preferred)
  explanation?: string;
  marks?: number;
  difficulty?: string;
}

interface DragDropBlanksProps {
  gameData: DragDropBlanksGameData;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: () => void;
  onNext?: () => void;
  hasMoreQuestions?: boolean;
}

interface DraggableWordProps {
  word: string;
  id: string;
  isPlaced: boolean;
}

function DraggableWord({ word, id, isPlaced }: DraggableWordProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: isPlaced,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "px-4 py-2 rounded-lg font-medium text-sm cursor-grab active:cursor-grabbing transition-all",
        isPlaced && "opacity-30 cursor-not-allowed",
        isDragging && "opacity-50 shadow-lg scale-110 z-50",
        !isPlaced && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
      )}
      whileHover={!isPlaced ? { scale: 1.05 } : {}}
      whileTap={!isPlaced ? { scale: 0.95 } : {}}
    >
      <div className="flex items-center gap-2">
        {!isPlaced && <GripVertical className="w-3 h-3" />}
        {word}
      </div>
    </motion.div>
  );
}

interface DroppableBlankProps {
  id: string;
  children: React.ReactNode;
  isCorrect?: boolean | null;
  hasSubmitted: boolean;
}

function DroppableBlank({ id, children, isCorrect, hasSubmitted }: DroppableBlankProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <motion.div
      ref={setNodeRef}
      className={cn(
        "inline-flex items-center justify-center min-w-[120px] px-3 py-2 mx-1 my-1 rounded-lg border-2 border-dashed transition-all",
        isOver && "border-primary bg-primary/10 scale-105",
        !children && "bg-muted/30 border-muted-foreground/30",
        children && !hasSubmitted && "bg-primary/10 border-primary",
        hasSubmitted && isCorrect && "bg-green-500/20 border-green-500",
        hasSubmitted && isCorrect === false && "bg-destructive/20 border-destructive"
      )}
      animate={{
        scale: isOver ? 1.05 : 1,
      }}
    >
      {children || <span className="text-muted-foreground text-xs">Drop here</span>}
    </motion.div>
  );
}

export function DragDropBlanks({
  gameData,
  onCorrect,
  onWrong,
  onComplete,
  onNext,
  hasMoreQuestions = false,
}: DragDropBlanksProps) {
  const [blankAnswers, setBlankAnswers] = useState<{ [key: number]: string }>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [results, setResults] = useState<{ [key: number]: boolean }>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Create word bank with all options shuffled
  const [wordBank, setWordBank] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    // Reset state when game data changes
    setBlankAnswers({});
    setHasSubmitted(false);
    setResults({});
    setShowExplanation(false);

    // Create shuffled word bank from sub_questions or blanks
    const allWords: string[] = [];
    
    // Defensive: Check both arrays exist and have length
    if (gameData.sub_questions && gameData.sub_questions.length > 0) {
      gameData.sub_questions.forEach((subQ) => {
        allWords.push(subQ.correctAnswer);
        allWords.push(...(subQ.distractors || []));
      });
    } else if (gameData.blanks && gameData.blanks.length > 0) {
      gameData.blanks.forEach((blank) => {
        allWords.push(blank.correctAnswer);
        allWords.push(...(blank.distractors || []));
      });
    } else {
      console.error('[DragDropBlanks] No valid blanks or sub_questions data:', gameData);
    }
    
    setWordBank(allWords.sort(() => Math.random() - 0.5));
  }, [gameData]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const wordId = active.id as string;
    const blankId = parseInt((over.id as string).replace("blank-", ""));
    const word = wordId.replace("word-", "");

    setBlankAnswers((prev) => ({
      ...prev,
      [blankId]: word,
    }));
  };

  const handleRemoveWord = (blankId: number) => {
    setBlankAnswers((prev) => {
      const newAnswers = { ...prev };
      delete newAnswers[blankId];
      return newAnswers;
    });
  };

  const handleSubmit = () => {
    const expectedBlanks = gameData.sub_questions?.length || gameData.blanks?.length || 0;
    if (expectedBlanks === 0) {
      console.error('[DragDropBlanks] No blanks to validate');
      return;
    }
    if (Object.keys(blankAnswers).length !== expectedBlanks) {
      return; // Not all blanks filled
    }

    setHasSubmitted(true);

    const newResults: { [key: number]: boolean } = {};
    let allCorrect = true;

    if (gameData.sub_questions && gameData.sub_questions.length > 0) {
      gameData.sub_questions.forEach((subQ, index) => {
        const isCorrect = blankAnswers[index]?.toLowerCase() === subQ.correctAnswer.toLowerCase();
        newResults[index] = isCorrect;
        if (!isCorrect) allCorrect = false;
      });
    } else {
      gameData.blanks.forEach((blank, index) => {
        const isCorrect = blankAnswers[index]?.toLowerCase() === blank.correctAnswer.toLowerCase();
        newResults[index] = isCorrect;
        if (!isCorrect) allCorrect = false;
      });
    }

    setResults(newResults);

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

    setShowExplanation(true);
  };

  const handleContinue = () => {
    if (hasMoreQuestions && onNext) {
      onNext();
    } else {
      onComplete();
    }
  };

  const isWordPlaced = (word: string) => {
    return Object.values(blankAnswers).includes(word);
  };

  // Check if this is a multi-part question
  const isMultiPart = gameData.sub_questions && gameData.sub_questions.length > 0;

  // Parse question text and insert blanks (legacy single question)
  const renderQuestionWithBlanks = () => {
    const parts = gameData.question.split(/____+/);
    const result: JSX.Element[] = [];

    parts.forEach((part, index) => {
      result.push(<span key={`text-${index}`}>{part}</span>);

      if (index < gameData.blanks.length) {
        const placedWord = blankAnswers[index];
        result.push(
          <DroppableBlank
            key={`blank-${index}`}
            id={`blank-${index}`}
            isCorrect={hasSubmitted ? results[index] : null}
            hasSubmitted={hasSubmitted}
          >
            {placedWord && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">{placedWord}</span>
                {!hasSubmitted && (
                  <button
                    onClick={() => handleRemoveWord(index)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                {hasSubmitted && results[index] && <Check className="w-4 h-4 text-green-600" />}
                {hasSubmitted && !results[index] && <X className="w-4 h-4 text-destructive" />}
              </div>
            )}
          </DroppableBlank>
        );
      }
    });

    return result;
  };

  // Render multi-part questions with sub-numbering
  const renderMultiPartQuestion = () => {
    if (!gameData.sub_questions) return null;

    return (
      <ol className="list-decimal pl-6 space-y-3">
        {gameData.sub_questions.map((subQ, index) => {
          const parts = subQ.text.split(/____+/);
          const placedWord = blankAnswers[index];

          return (
            <li key={index} className="text-lg leading-relaxed">
              <div className="inline">
                {parts[0]}
                <DroppableBlank
                  id={`blank-${index}`}
                  isCorrect={hasSubmitted ? results[index] : null}
                  hasSubmitted={hasSubmitted}
                >
                  {placedWord && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{placedWord}</span>
                      {!hasSubmitted && (
                        <button
                          onClick={() => handleRemoveWord(index)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {hasSubmitted && results[index] && <Check className="w-4 h-4 text-green-600" />}
                      {hasSubmitted && !results[index] && <X className="w-4 h-4 text-destructive" />}
                    </div>
                  )}
                </DroppableBlank>
                {parts[1] || ""}
              </div>
            </li>
          );
        })}
      </ol>
    );
  };

  const expectedBlanks = gameData.sub_questions?.length || gameData.blanks.length;
  const allBlanksFilled = Object.keys(blankAnswers).length === expectedBlanks;
  const isAllCorrect = Object.values(results).every((r) => r === true);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Card className="w-full">
        <CardContent className="p-6 space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-between">
            <Badge variant="outline">Fill in the Blanks</Badge>
            <Badge variant="secondary">
              {Object.keys(blankAnswers).length}/{expectedBlanks} Filled
            </Badge>
          </div>

          {/* Question with blanks */}
          <div className="p-4 bg-muted/30 rounded-lg">
            {!isMultiPart && gameData.question && (
              <div className="text-lg font-medium leading-relaxed">
                {renderQuestionWithBlanks()}
              </div>
            )}
            {isMultiPart && (
              <div>
                {renderMultiPartQuestion()}
              </div>
            )}
          </div>

          {/* Word Bank */}
          {!hasSubmitted && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">Word Bank (Drag words to blanks):</p>
              <div className="flex flex-wrap gap-3 p-4 bg-secondary/20 rounded-lg min-h-[80px]">
                {wordBank.map((word, index) => (
                  <DraggableWord
                    key={`word-${word}-${index}`}
                    id={`word-${word}`}
                    word={word}
                    isPlaced={isWordPlaced(word)}
                  />
                ))}
              </div>
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
                  isAllCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-destructive/10 border border-destructive/20"
                )}
              >
                {isAllCorrect ? (
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <X className="w-5 h-5 text-destructive mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={cn("font-semibold", isAllCorrect ? "text-green-700" : "text-destructive")}>
                    {isAllCorrect ? "Perfect! All blanks correct! 🎉" : "Some blanks are incorrect"}
                  </p>
                  {!isAllCorrect && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Correct answers:{" "}
                      {isMultiPart
                        ? gameData.sub_questions?.map((sq, i) => `${i + 1}. ${sq.correctAnswer}`).join(", ")
                        : gameData.blanks.map((b, i) => `${i + 1}. ${b.correctAnswer}`).join(", ")}
                    </p>
                  )}
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
              <Button onClick={handleSubmit} disabled={!allBlanksFilled} className="flex-1" size="lg">
                Check Answer
              </Button>
            ) : (
              <Button onClick={handleContinue} className="flex-1" size="lg">
                {hasMoreQuestions ? "Next Question →" : "Complete"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DragOverlay>
        {activeId ? (
          <div className="px-4 py-2 rounded-lg font-medium text-sm bg-primary text-primary-foreground shadow-lg">
            {activeId.replace("word-", "")}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
