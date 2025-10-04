import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Check, X, Trophy } from 'lucide-react';

interface TypingRaceGameData {
  target: string;
  category?: string;
  difficulty?: string;
  time_limit?: number;
  auto_correct_suggestions?: boolean;
}

interface TypingRaceGameProps {
  gameData: TypingRaceGameData;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: () => void;
}

export const TypingRaceGame = ({ gameData, onCorrect, onWrong, onComplete }: TypingRaceGameProps) => {
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(gameData.time_limit || 30);
  const [isComplete, setIsComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setStartTime(Date.now());
  }, []);

  useEffect(() => {
    if (startTime && !isComplete && gameData.time_limit) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            onWrong();
            setIsComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [startTime, isComplete, gameData.time_limit, onWrong]);

  useEffect(() => {
    if (userInput === gameData.target) {
      setEndTime(Date.now());
      setIsComplete(true);
      onCorrect();
      setTimeout(() => onComplete(), 2000);
    }
  }, [userInput, gameData.target, onCorrect, onComplete]);

  const getCharacterStatus = (index: number) => {
    if (index >= userInput.length) return 'pending';
    return userInput[index] === gameData.target[index] ? 'correct' : 'incorrect';
  };

  const accuracy = userInput.length > 0
    ? (userInput.split('').filter((char, i) => char === gameData.target[i]).length / userInput.length) * 100
    : 0;

  const wpm = startTime && endTime
    ? Math.round((gameData.target.length / 5) / ((endTime - startTime) / 1000 / 60))
    : 0;

  const progress = (userInput.length / gameData.target.length) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <div className="text-sm text-muted-foreground">Accuracy</div>
          <div className="text-2xl font-bold text-primary">{Math.round(accuracy)}%</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-sm text-muted-foreground">Progress</div>
          <div className="text-2xl font-bold">{userInput.length}/{gameData.target.length}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-sm text-muted-foreground">Time Left</div>
          <div className="text-2xl font-bold">{timeLeft}s</div>
        </Card>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="mb-6" />

      {/* Target Display */}
      <Card className="p-6 mb-6 bg-accent/30">
        <div className="font-mono text-2xl tracking-wide flex flex-wrap">
          {gameData.target.split('').map((char, index) => {
            const status = getCharacterStatus(index);
            return (
              <motion.span
                key={index}
                initial={{ opacity: 0.5 }}
                animate={{
                  opacity: 1,
                  color: status === 'correct'
                    ? 'hsl(var(--primary))'
                    : status === 'incorrect'
                    ? 'hsl(var(--destructive))'
                    : 'hsl(var(--muted-foreground))',
                }}
                className="transition-colors"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            );
          })}
        </div>
      </Card>

      {/* Input Field */}
      <div className="mb-6">
        <Input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Start typing..."
          className="text-xl font-mono"
          disabled={isComplete}
        />
      </div>

      {/* Completion Message */}
      {isComplete && userInput === gameData.target && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Card className="p-8 bg-primary/10 border-primary">
            <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Perfect!</h2>
            {wpm > 0 && (
              <p className="text-lg text-muted-foreground">
                Speed: {wpm} WPM | Accuracy: {Math.round(accuracy)}%
              </p>
            )}
          </Card>
        </motion.div>
      )}

      {/* Time Up Message */}
      {isComplete && timeLeft === 0 && userInput !== gameData.target && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Card className="p-8 bg-destructive/10 border-destructive">
            <X className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Time's Up!</h2>
            <p className="text-muted-foreground">Better luck next time!</p>
          </Card>
        </motion.div>
      )}

      {/* Category Badge */}
      {gameData.category && (
        <div className="mt-4 text-center">
          <span className="inline-block px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm">
            {gameData.category}
          </span>
        </div>
      )}
    </div>
  );
};
