import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

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

export const MatchPairsGame = ({ gameData, onCorrect, onWrong, onComplete }: MatchPairsGameProps) => {
  const [leftItems, setLeftItems] = useState<{ id: string; text: string; matched: boolean }[]>([]);
  const [rightItems, setRightItems] = useState<{ id: string; text: string; matched: boolean }[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(gameData?.time_limit || 60);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  useEffect(() => {
    // Initialize and shuffle items
    if (!gameData?.pairs || !Array.isArray(gameData.pairs)) {
      console.warn('MatchPairsGame: Invalid or missing pairs data');
      return;
    }
    
    const left = gameData.pairs.map(p => ({ id: p.id, text: p.left, matched: false }));
    const right = gameData.pairs.map(p => ({ id: p.id, text: p.right, matched: false }))
      .sort(() => Math.random() - 0.5);
    
    setLeftItems(left);
    setRightItems(right);
  }, [gameData]);

  useEffect(() => {
    if (gameStatus !== 'playing') return;
    
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

  useEffect(() => {
    if (selectedLeft && selectedRight) {
      const isMatch = selectedLeft === selectedRight;
      setAttempts(prev => prev + 1);

      if (isMatch) {
        setLeftItems(prev => prev.map(item => 
          item.id === selectedLeft ? { ...item, matched: true } : item
        ));
        setRightItems(prev => prev.map(item => 
          item.id === selectedRight ? { ...item, matched: true } : item
        ));
        setScore(prev => prev + 1);
        onCorrect();

        // Check if all matched
        const allMatched = leftItems.filter(i => i.id === selectedLeft || i.matched).length === leftItems.length;
        if (allMatched) {
          setGameStatus('won');
          setTimeout(() => onComplete(), 1000);
        }
      } else {
        onWrong();
      }

      // Check max attempts
      if (gameData?.max_attempts && attempts + 1 >= gameData.max_attempts) {
        setGameStatus('lost');
      }

      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 800);
    }
  }, [selectedLeft, selectedRight]);

  const handleLeftClick = (id: string, matched: boolean) => {
    if (matched || selectedLeft || selectedRight) return;
    setSelectedLeft(id);
  };

  const handleRightClick = (id: string, matched: boolean) => {
    if (matched || selectedRight || !selectedLeft) return;
    setSelectedRight(id);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg font-semibold">
          Score: {score}/{gameData?.pairs?.length || 0}
        </div>
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
      <div className="grid grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-3">
          <AnimatePresence>
            {leftItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    item.matched
                      ? 'bg-primary/20 border-primary cursor-not-allowed'
                      : selectedLeft === item.id
                      ? 'bg-accent border-accent-foreground'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleLeftClick(item.id, item.matched)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.text}</span>
                    {item.matched && <Check className="w-5 h-5 text-primary" />}
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <AnimatePresence>
            {rightItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    item.matched
                      ? 'bg-primary/20 border-primary cursor-not-allowed'
                      : selectedRight === item.id
                      ? 'bg-accent border-accent-foreground'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleRightClick(item.id, item.matched)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.text}</span>
                    {item.matched && <Check className="w-5 h-5 text-primary" />}
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Game Over States */}
      <AnimatePresence>
        {gameStatus === 'won' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <Card className="p-8 text-center">
              <Check className="w-16 h-16 text-primary mx-auto mb-4" />
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
            <Card className="p-8 text-center">
              <X className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Time's Up!</h2>
              <p className="text-muted-foreground">Try again to improve your score.</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
