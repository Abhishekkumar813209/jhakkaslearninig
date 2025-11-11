import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, GripVertical, RotateCcw } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Pair {
  id: string;
  left: string;
  right: string;
}

interface MatchPairsGameData {
  pairs: Pair[];
  time_limit?: number;
  max_attempts?: number;
}

interface MatchPairsGameProps {
  gameData: MatchPairsGameData;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: () => void;
}

interface SortableItemProps {
  id: string;
  text: string;
  index: number;
  isCorrect?: boolean;
  isWrong?: boolean;
  checked?: boolean;
}

const SortableItem = ({ id, text, index, isCorrect, isWrong, checked }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={`p-4 transition-all cursor-grab active:cursor-grabbing ${
          isDragging ? 'opacity-50 shadow-lg' : ''
        } ${
          checked && isCorrect ? 'bg-green-500/20 border-green-500' : ''
        } ${
          checked && isWrong ? 'bg-destructive/20 border-destructive' : ''
        } ${
          !checked ? 'bg-card hover:bg-accent/50' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="touch-none flex gap-0.5">
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40"></div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40"></div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40"></div>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40"></div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40"></div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40"></div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-between">
            <span className="font-medium">{text}</span>
            {checked && isCorrect && <Check className="w-5 h-5 text-green-500" />}
            {checked && isWrong && <X className="w-5 h-5 text-destructive" />}
          </div>
        </div>
      </Card>
    </div>
  );
};

export const MatchPairsGame = ({ gameData, onCorrect, onWrong, onComplete }: MatchPairsGameProps) => {
  const [leftItems, setLeftItems] = useState<{ id: string; text: string }[]>([]);
  const [rightItems, setRightItems] = useState<{ id: string; text: string }[]>([]);
  const [initialShuffle, setInitialShuffle] = useState<{ id: string; text: string }[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(gameData?.time_limit || 60);
  const [gameStatus, setGameStatus] = useState<'playing' | 'checked' | 'won' | 'lost'>('playing');
  const [correctPairs, setCorrectPairs] = useState<Set<number>>(new Set());
  const [wrongPairs, setWrongPairs] = useState<Set<number>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!gameData?.pairs || !Array.isArray(gameData.pairs)) {
      console.warn('MatchPairsGame: Invalid or missing pairs data');
      return;
    }
    
    const left = gameData.pairs.map(p => ({ id: p.id, text: p.left }));
    const right = gameData.pairs.map(p => ({ id: p.id, text: p.right }))
      .sort(() => Math.random() - 0.5);
    
    setLeftItems(left);
    setRightItems(right);
    setInitialShuffle(right);
  }, [gameData]);

  useEffect(() => {
    if (gameStatus === 'lost' || gameStatus === 'won') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameStatus('lost');
          onWrong();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStatus, onWrong]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setRightItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleCheckAnswer = () => {
    setAttempts(prev => prev + 1);
    const correct = new Set<number>();
    const wrong = new Set<number>();
    let correctCount = 0;

    leftItems.forEach((leftItem, index) => {
      if (rightItems[index]?.id === leftItem.id) {
        correct.add(index);
        correctCount++;
      } else {
        wrong.add(index);
      }
    });

    setCorrectPairs(correct);
    setWrongPairs(wrong);
    setGameStatus('checked');

    if (correctCount === leftItems.length) {
      setGameStatus('won');
      onCorrect();
      setTimeout(() => onComplete(), 1500);
    } else {
      onWrong();
      if (gameData?.max_attempts && attempts + 1 >= gameData.max_attempts) {
        setGameStatus('lost');
      }
    }
  };

  const handleReset = () => {
    setRightItems(initialShuffle);
    setGameStatus('playing');
    setCorrectPairs(new Set());
    setWrongPairs(new Set());
  };

  const handleTryAgain = () => {
    setGameStatus('playing');
    setCorrectPairs(new Set());
    setWrongPairs(new Set());
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      {/* Instructions */}
      <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
        <p className="text-center font-medium text-primary">
          🎯 Drag items from the right column to match them with the left column
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="text-lg font-semibold">
          Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
        {gameData?.max_attempts && (
          <div className="text-lg font-semibold">
            Attempts: {attempts}/{gameData.max_attempts}
          </div>
        )}
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 min-w-0 min-w-[600px]">
        {/* Left Column (Fixed) */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Match These</h3>
          {leftItems.map((item, index) => (
            <Card
              key={item.id}
              className={`p-4 transition-all ${
                gameStatus === 'checked' && correctPairs.has(index)
                  ? 'bg-green-500/20 border-green-500'
                  : gameStatus === 'checked' && wrongPairs.has(index)
                  ? 'bg-destructive/20 border-destructive'
                  : 'bg-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-6">{index + 1}.</span>
                  <span className="font-medium">{item.text}</span>
                </div>
                {gameStatus === 'checked' && correctPairs.has(index) && (
                  <Check className="w-5 h-5 text-green-500" />
                )}
                {gameStatus === 'checked' && wrongPairs.has(index) && (
                  <X className="w-5 h-5 text-destructive" />
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Right Column (Draggable) */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Drag to Reorder
          </h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rightItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {rightItems.map((item, index) => (
                <SortableItem
                  key={item.id}
                  id={item.id}
                  text={item.text}
                  index={index}
                  isCorrect={gameStatus === 'checked' && correctPairs.has(index)}
                  isWrong={gameStatus === 'checked' && wrongPairs.has(index)}
                  checked={gameStatus === 'checked'}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {gameStatus === 'playing' && (
          <>
            <Button onClick={handleCheckAnswer} size="lg" className="min-w-[140px]">
              Check Answer
            </Button>
            <Button onClick={handleReset} variant="outline" size="lg">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </>
        )}
        {gameStatus === 'checked' && (
          <Button onClick={handleTryAgain} size="lg" className="min-w-[140px]">
            Try Again
          </Button>
        )}
      </div>

      {/* Game Over States */}
      <AnimatePresence>
        {gameStatus === 'won' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <Card className="p-8 text-center max-w-md mx-4">
              <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Perfect Match!</h2>
              <p className="text-muted-foreground">You matched all pairs correctly!</p>
            </Card>
          </motion.div>
        )}

        {gameStatus === 'lost' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <Card className="p-8 text-center max-w-md mx-4">
              <X className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Time's Up!</h2>
              <p className="text-muted-foreground mb-4">
                Correct: {correctPairs.size}/{leftItems.length}
              </p>
              <p className="text-muted-foreground text-sm">Keep practicing to improve!</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
