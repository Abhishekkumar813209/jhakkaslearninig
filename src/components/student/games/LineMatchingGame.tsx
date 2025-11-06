import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundEffects";

interface MatchPair {
  left: number;
  right: number;
}

interface LineMatchingGameData {
  question: string;
  leftColumn: string[];
  rightColumn: string[];
  correctPairs: MatchPair[];
  explanation?: string;
  marks?: number;
  difficulty?: string;
}

interface LineMatchingGameProps {
  gameData: LineMatchingGameData;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: () => void;
  onNext?: () => void;
  hasMoreQuestions?: boolean;
}

export function LineMatchingGame({
  gameData,
  onCorrect,
  onWrong,
  onComplete,
  onNext,
  hasMoreQuestions = false,
}: LineMatchingGameProps) {
  console.log('[LMG] 🎯 Received gameData:', {
    hasGameData: !!gameData,
    gameDataType: typeof gameData,
    hasLeftColumn: !!gameData?.leftColumn,
    hasRightColumn: !!gameData?.rightColumn,
    hasCorrectPairs: !!gameData?.correctPairs,
    leftLength: gameData?.leftColumn?.length,
    rightLength: gameData?.rightColumn?.length,
    correctPairsLength: gameData?.correctPairs?.length,
    leftColumnSample: gameData?.leftColumn?.[0],
    rightColumnSample: gameData?.rightColumn?.[0],
    fullGameData: gameData
  });

  // 🛡️ Defensive checks - Show helpful error messages if data is missing
  if (!gameData) {
    console.error('[LMG] ❌ No game data received');
    return (
      <Card className="p-8 bg-destructive/10 border-destructive">
        <div className="text-center space-y-4">
          <X className="h-12 w-12 mx-auto text-destructive" />
          <p className="text-destructive font-semibold">❌ No game data received</p>
          <p className="text-sm text-muted-foreground">
            The match column game data is missing. Please try refreshing the page.
          </p>
        </div>
      </Card>
    );
  }

  if (!gameData.leftColumn || !gameData.rightColumn) {
    console.error('[LMG] ❌ Missing column data:', { 
      hasLeft: !!gameData.leftColumn, 
      hasRight: !!gameData.rightColumn 
    });
    return (
      <Card className="p-8 bg-yellow-50 border-yellow-200">
        <div className="text-center space-y-4">
          <Lightbulb className="h-12 w-12 mx-auto text-yellow-600" />
          <p className="text-yellow-700 font-semibold">⚠️ Missing column data</p>
          <p className="text-sm text-muted-foreground mb-4">
            The left or right column data is missing from the database.
          </p>
          <details className="text-left">
            <summary className="cursor-pointer text-sm font-medium mb-2">Debug Info</summary>
            <pre className="text-xs bg-white p-3 rounded overflow-auto">
              {JSON.stringify({
                hasLeftColumn: !!gameData.leftColumn,
                hasRightColumn: !!gameData.rightColumn,
                leftColumnLength: gameData.leftColumn?.length,
                rightColumnLength: gameData.rightColumn?.length,
                gameDataKeys: Object.keys(gameData)
              }, null, 2)}
            </pre>
          </details>
        </div>
      </Card>
    );
  }

  if (!gameData.correctPairs || gameData.correctPairs.length === 0) {
    console.error('[LMG] ❌ Missing correct pairs data');
    return (
      <Card className="p-8 bg-yellow-50 border-yellow-200">
        <div className="text-center space-y-4">
          <Lightbulb className="h-12 w-12 mx-auto text-yellow-600" />
          <p className="text-yellow-700 font-semibold">⚠️ Missing answer key</p>
          <p className="text-sm text-muted-foreground">
            The correct pairs data is missing. Cannot validate answers.
          </p>
        </div>
      </Card>
    );
  }

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [userPairs, setUserPairs] = useState<MatchPair[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [results, setResults] = useState<{ [key: number]: boolean }>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const leftRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rightRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Reset state when game data changes
    setSelectedLeft(null);
    setUserPairs([]);
    setHasSubmitted(false);
    setResults({});
    setShowExplanation(false);
  }, [gameData]);

  const handleLeftClick = (index: number) => {
    if (hasSubmitted) return;
    setSelectedLeft(index);
  };

  const handleRightClick = (rightIndex: number) => {
    if (hasSubmitted || selectedLeft === null) return;

    // Check if this left item already has a connection
    const existingPairIndex = userPairs.findIndex((p) => p.left === selectedLeft);

    if (existingPairIndex !== -1) {
      // Update existing pair
      const newPairs = [...userPairs];
      newPairs[existingPairIndex] = { left: selectedLeft, right: rightIndex };
      setUserPairs(newPairs);
    } else {
      // Add new pair
      setUserPairs([...userPairs, { left: selectedLeft, right: rightIndex }]);
    }

    setSelectedLeft(null);
  };

  const handleRemovePair = (leftIndex: number) => {
    setUserPairs(userPairs.filter((p) => p.left !== leftIndex));
  };

  const getLineCoordinates = (leftIndex: number, rightIndex: number) => {
    const leftEl = leftRefs.current[leftIndex];
    const rightEl = rightRefs.current[rightIndex];

    if (!leftEl || !rightEl || !svgRef.current) return null;

    const svgRect = svgRef.current.getBoundingClientRect();
    const leftRect = leftEl.getBoundingClientRect();
    const rightRect = rightEl.getBoundingClientRect();

    return {
      x1: leftRect.right - svgRect.left,
      y1: leftRect.top + leftRect.height / 2 - svgRect.top,
      x2: rightRect.left - svgRect.left,
      y2: rightRect.top + rightRect.height / 2 - svgRect.top,
    };
  };

  const handleSubmit = () => {
    if (userPairs.length !== gameData.leftColumn.length) {
      return; // Not all items matched
    }

    setHasSubmitted(true);

    const newResults: { [key: number]: boolean } = {};
    let allCorrect = true;

    userPairs.forEach((userPair) => {
      const isCorrect = gameData.correctPairs.some(
        (correctPair) => correctPair.left === userPair.left && correctPair.right === userPair.right
      );
      newResults[userPair.left] = isCorrect;
      if (!isCorrect) allCorrect = false;
    });

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

  const allMatched = userPairs.length === gameData.leftColumn.length;
  const isAllCorrect = Object.values(results).every((r) => r === true);

  const getLineColor = (leftIndex: number) => {
    if (!hasSubmitted) return "hsl(var(--primary))";
    return results[leftIndex] ? "hsl(142, 76%, 36%)" : "hsl(var(--destructive))";
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Badge variant="outline">Match the Pairs</Badge>
          <Badge variant="secondary">
            {userPairs.length}/{gameData.leftColumn.length} Matched
          </Badge>
        </div>

        {/* Question */}
        <div className="text-lg font-medium p-4 bg-muted/30 rounded-lg">
          {gameData.question}
        </div>

        {/* Instructions */}
        {!hasSubmitted && (
          <p className="text-sm text-muted-foreground text-center">
            Click an item on the left, then click its match on the right to draw a line
          </p>
        )}

        {/* Matching Area */}
        <div className="relative">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-3">
              {gameData.leftColumn.map((item, index) => {
                const isSelected = selectedLeft === index;
                const hasConnection = userPairs.some((p) => p.left === index);
                const isCorrectInResult = hasSubmitted ? results[index] : null;

                return (
                  <div key={`left-${index}`} className="relative">
                    <motion.div
                      ref={(el) => (leftRefs.current[index] = el)}
                      onClick={() => handleLeftClick(index)}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all text-center font-medium",
                        isSelected && "border-primary bg-primary/10 scale-105",
                        !isSelected && !hasConnection && "border-muted hover:border-primary/50 bg-blue-500/5",
                        hasConnection && !hasSubmitted && "border-primary/50 bg-primary/5",
                        hasSubmitted && isCorrectInResult && "border-green-500 bg-green-500/10",
                        hasSubmitted && isCorrectInResult === false && "border-destructive bg-destructive/10"
                      )}
                      whileHover={!hasSubmitted ? { scale: 1.02 } : {}}
                      whileTap={!hasSubmitted ? { scale: 0.98 } : {}}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex-1 text-sm">{item}</span>
                        {hasConnection && !hasSubmitted && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePair(index);
                            }}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {hasSubmitted && isCorrectInResult && <Check className="w-4 h-4 text-green-600" />}
                        {hasSubmitted && isCorrectInResult === false && <X className="w-4 h-4 text-destructive" />}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              {gameData.rightColumn.map((item, index) => {
                const isTargeted = selectedLeft !== null;

                return (
                  <motion.div
                    key={`right-${index}`}
                    ref={(el) => (rightRefs.current[index] = el)}
                    onClick={() => handleRightClick(index)}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all text-center font-medium",
                      isTargeted && "border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10",
                      !isTargeted && "border-muted bg-green-500/5"
                    )}
                    whileHover={isTargeted ? { scale: 1.02 } : {}}
                    whileTap={isTargeted ? { scale: 0.98 } : {}}
                  >
                    <span className="text-sm">{item}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* SVG Lines */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
          >
            {userPairs.map((pair, index) => {
              const coords = getLineCoordinates(pair.left, pair.right);
              if (!coords) return null;

              return (
                <motion.line
                  key={`line-${index}`}
                  x1={coords.x1}
                  y1={coords.y1}
                  x2={coords.x2}
                  y2={coords.y2}
                  stroke={getLineColor(pair.left)}
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3 }}
                />
              );
            })}
          </svg>
        </div>

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
                  {isAllCorrect ? "Perfect! All matches correct! 🎉" : "Some matches are incorrect"}
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
            <Button onClick={handleSubmit} disabled={!allMatched} className="flex-1" size="lg">
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
  );
}
