import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X } from 'lucide-react';
import { SubQuestionResult } from '@/lib/xpConfig';

interface Blank {
  id: number;
  position: number;
  type: 'dropdown';
  options: string[];
  correct: string;
}

interface InteractiveBlanksData {
  text: string;
  blanks: Blank[];
}

interface InteractiveBlanksProps {
  gameData: InteractiveBlanksData;
  onCorrect: (result?: SubQuestionResult) => void;
  onWrong: () => void;
  onComplete: () => void;
}

export const InteractiveBlanks = ({ gameData, onCorrect, onWrong, onComplete }: InteractiveBlanksProps) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, boolean>>({});
  const [attemptCount, setAttemptCount] = useState(0);

  const handleAnswerChange = (blankId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [blankId]: value }));
    setChecked(false);
    setFeedback({});
  };

  const handleCheck = () => {
    const currentAttempt = attemptCount + 1;
    setAttemptCount(currentAttempt);
    
    const newFeedback: Record<number, boolean> = {};
    let correctCount = 0;

    gameData.blanks.forEach(blank => {
      const isCorrect = answers[blank.id] === blank.correct;
      newFeedback[blank.id] = isCorrect;
      if (isCorrect) correctCount++;
    });

    const totalSubQuestions = gameData.blanks.length;
    const percentage = correctCount / totalSubQuestions;
    
    console.log('[InteractiveBlanks] Partial Credit:', { correctCount, totalSubQuestions, percentage, attemptNumber: currentAttempt });

    setFeedback(newFeedback);
    setChecked(true);

    if (correctCount > 0) {
      onCorrect({ 
        totalSubQuestions, 
        correctCount, 
        percentage,
        attemptNumber: currentAttempt
      });
      if (correctCount === totalSubQuestions) {
        setTimeout(() => onComplete(), 1500);
      }
    } else {
      onWrong();
    }
  };

  const renderTextWithBlanks = () => {
    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    // Sort blanks by position
    const sortedBlanks = [...gameData.blanks].sort((a, b) => a.position - b.position);

    sortedBlanks.forEach((blank, idx) => {
      // Add text before blank
      if (blank.position > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {gameData.text.substring(lastIndex, blank.position)}
          </span>
        );
      }

      // Add blank select
      parts.push(
        <span key={`blank-${blank.id}`} className="inline-block mx-1 align-middle">
          <Select
            value={answers[blank.id] || ''}
            onValueChange={(value) => handleAnswerChange(blank.id, value)}
            disabled={checked && feedback[blank.id]}
          >
            <SelectTrigger 
              className={`w-[200px] ${
                checked
                  ? feedback[blank.id]
                    ? 'border-primary bg-primary/10'
                    : 'border-destructive bg-destructive/10'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <SelectValue placeholder="Select..." />
                {checked && (
                  feedback[blank.id] 
                    ? <Check className="w-4 h-4 text-primary" />
                    : <X className="w-4 h-4 text-destructive" />
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {blank.options.map((option, i) => (
                <SelectItem key={i} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      );

      lastIndex = blank.position + 4; // Skip "____"
    });

    // Add remaining text
    if (lastIndex < gameData.text.length) {
      parts.push(
        <span key="text-end">
          {gameData.text.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  const allAnswered = gameData.blanks.every(blank => answers[blank.id]);
  const correctCount = Object.values(feedback).filter(Boolean).length;

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Attempt Counter */}
      <div className="mb-4 flex justify-center">
        <Badge 
          variant={attemptCount < 2 ? "default" : "secondary"}
          className="text-sm px-4 py-2"
        >
          {attemptCount === 0 
            ? "First Attempt - Full XP"
            : attemptCount === 1
              ? "Attempt 1 of 2 - Full XP"
              : attemptCount === 2
                ? "Attempt 2 of 2 - 30% XP"
                : "Practice Mode - No XP"}
        </Badge>
      </div>

      {/* Instructions */}
      <Card className="p-4 mb-6 bg-accent/30">
        <p className="text-sm text-muted-foreground">
          Fill in the blanks by selecting the correct options from the dropdowns.
        </p>
      </Card>

      {/* Score Display */}
      {checked && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-accent rounded-lg"
        >
          <p className="text-lg font-semibold">
            Score: {correctCount}/{gameData.blanks.length} correct
          </p>
        </motion.div>
      )}

      {/* Text with Blanks */}
      <Card className="p-8 mb-6 bg-card">
        <div className="text-xl leading-relaxed">
          {renderTextWithBlanks()}
        </div>
      </Card>

      {/* Check Button */}
      <Button
        onClick={handleCheck}
        className="w-full"
        disabled={!allAnswered || (checked && correctCount === gameData.blanks.length)}
      >
        {checked
          ? correctCount === gameData.blanks.length
            ? 'Perfect! ✓'
            : 'Try Again'
          : 'Check Answers'
        }
      </Button>

      {/* Success Message */}
      {checked && correctCount === gameData.blanks.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 p-6 bg-primary/10 border border-primary rounded-lg text-center"
        >
          <Check className="w-12 h-12 text-primary mx-auto mb-2" />
          <p className="text-lg font-semibold">All correct! Well done!</p>
        </motion.div>
      )}
    </div>
  );
};
