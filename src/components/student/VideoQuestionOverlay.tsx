import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, Clock, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LectureQuestion {
  id: string;
  lecture_id: string;
  question_id: string;
  timestamp_seconds: number;
  timer_seconds: number;
  question: {
    id: string;
    question_text: string;
    question_type: string;
    options: any;
    correct_answer: string;
    explanation: string | null;
    xp_reward?: number;
  };
}

interface VideoQuestionOverlayProps {
  lectureQuestion: LectureQuestion;
  onComplete: (isCorrect: boolean, xpEarned: number) => void;
  onTimeout: () => void;
}

export default function VideoQuestionOverlay({
  lectureQuestion,
  onComplete,
  onTimeout
}: VideoQuestionOverlayProps) {
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState(lectureQuestion.timer_seconds);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const question = lectureQuestion.question;
  const xpReward = question.xp_reward || 5;

  // Parse options based on question type
  const getOptions = (): string[] => {
    if (!question.options) return [];
    
    if (Array.isArray(question.options)) {
      return question.options.map((opt: any) => 
        typeof opt === 'string' ? opt : opt.text || opt.option_text || String(opt)
      );
    }
    
    if (typeof question.options === 'object') {
      return Object.values(question.options).map((opt: any) => 
        typeof opt === 'string' ? opt : String(opt)
      );
    }
    
    return [];
  };

  const options = getOptions();

  // Timer countdown
  useEffect(() => {
    startTimeRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!isAnswered) {
            handleTimeout();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleTimeout = async () => {
    setIsAnswered(true);
    setIsCorrect(false);
    
    // Save response as timeout
    await saveResponse(null, false, lectureQuestion.timer_seconds);
    
    toast({
      title: "⏰ Time's up!",
      description: `The correct answer was: ${question.correct_answer}`,
      variant: "destructive"
    });

    setShowExplanation(true);
    
    setTimeout(() => {
      onTimeout();
    }, 2500);
  };

  const handleSelectAnswer = async (answer: string) => {
    if (isAnswered) return;

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    setSelectedAnswer(answer);
    setIsAnswered(true);

    // Check if correct
    const correct = checkAnswer(answer);
    setIsCorrect(correct);

    // Save response
    const xpEarned = correct ? xpReward : 0;
    await saveResponse(answer, correct, timeTaken);

    if (correct) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#10b981', '#34d399']
      });

      toast({
        title: `🎉 +${xpEarned} XP!`,
        description: "Correct answer! Keep it up!",
      });
    } else {
      // Shake animation handled via CSS
      toast({
        title: "❌ Wrong!",
        description: `Correct: ${question.correct_answer}`,
        variant: "destructive"
      });
    }

    setShowExplanation(true);

    // Auto-resume after feedback
    setTimeout(() => {
      onComplete(correct, xpEarned);
    }, correct ? 2000 : 2500);
  };

  const checkAnswer = (answer: string): boolean => {
    const correctAnswer = question.correct_answer?.toLowerCase().trim();
    const userAnswer = answer?.toLowerCase().trim();

    // Direct match
    if (userAnswer === correctAnswer) return true;

    // For MCQ, check if the answer matches the option letter (A, B, C, D)
    const optionIndex = options.findIndex(opt => 
      opt.toLowerCase().trim() === userAnswer
    );
    
    if (optionIndex !== -1) {
      const letter = String.fromCharCode(65 + optionIndex); // A, B, C, D
      if (letter.toLowerCase() === correctAnswer) return true;
    }

    // Check if correct answer is an index
    const correctIndex = parseInt(correctAnswer);
    if (!isNaN(correctIndex) && optionIndex === correctIndex) return true;

    return false;
  };

  const saveResponse = async (answer: string | null, correct: boolean, timeTaken: number) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      await supabase.from("student_lecture_question_responses").upsert({
        student_id: userData.user.id,
        lecture_question_id: lectureQuestion.id,
        response: { selected: answer },
        is_correct: correct,
        time_taken_seconds: timeTaken,
        xp_earned: correct ? xpReward : 0
      }, {
        onConflict: 'student_id,lecture_question_id'
      });

      // Award XP if correct
      if (correct) {
        await supabase.functions.invoke("jhakkas-points-system", {
          body: {
            action: "add",
            student_id: userData.user.id,
            amount: xpReward,
            source: "lecture_question"
          }
        });
      }
    } catch (error) {
      console.error("Error saving response:", error);
    }
  };

  // Strip HTML tags for display
  const stripHtml = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const timerPercentage = (timeRemaining / lectureQuestion.timer_seconds) * 100;
  const isUrgent = timeRemaining <= 5;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className={`max-w-2xl w-full bg-background shadow-2xl ${
        isAnswered && !isCorrect ? 'animate-shake' : ''
      }`}>
        <CardContent className="p-6 space-y-6">
          {/* Timer Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant={isUrgent ? "destructive" : "secondary"} className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeRemaining}s
              </Badge>
              {!isAnswered && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  +{xpReward} XP
                </Badge>
              )}
            </div>
            <Progress 
              value={timerPercentage} 
              className={`h-2 transition-all ${isUrgent ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`}
            />
          </div>

          {/* Question Text */}
          <div className="text-center">
            <h3 className="text-xl font-semibold leading-relaxed">
              {stripHtml(question.question_text)}
            </h3>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const isSelected = selectedAnswer === option;
              const isCorrectOption = checkAnswer(option) || 
                question.correct_answer?.toLowerCase() === letter.toLowerCase() ||
                question.correct_answer?.toLowerCase() === option.toLowerCase();

              let optionStyle = "border-2 transition-all duration-200 ";
              
              if (isAnswered) {
                if (isCorrectOption) {
                  optionStyle += "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                } else if (isSelected) {
                  optionStyle += "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
                } else {
                  optionStyle += "border-muted opacity-50";
                }
              } else {
                optionStyle += isSelected 
                  ? "border-primary bg-primary/10" 
                  : "border-muted hover:border-primary/50 hover:bg-muted/50";
              }

              return (
                <Button
                  key={index}
                  variant="outline"
                  className={`h-auto py-4 px-6 text-left justify-start ${optionStyle}`}
                  onClick={() => handleSelectAnswer(option)}
                  disabled={isAnswered}
                >
                  <div className="flex items-center gap-4 w-full">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isAnswered && isCorrectOption
                        ? "bg-green-500 text-white"
                        : isAnswered && isSelected
                        ? "bg-red-500 text-white"
                        : "bg-muted"
                    }`}>
                      {isAnswered && isCorrectOption ? (
                        <Check className="h-4 w-4" />
                      ) : isAnswered && isSelected ? (
                        <X className="h-4 w-4" />
                      ) : (
                        letter
                      )}
                    </span>
                    <span className="flex-1 text-base">{stripHtml(option)}</span>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && question.explanation && (
            <div className="p-4 bg-muted/50 rounded-lg border animate-in slide-in-from-bottom-4">
              <p className="text-sm font-medium mb-1">Explanation:</p>
              <p className="text-sm text-muted-foreground">{stripHtml(question.explanation)}</p>
            </div>
          )}

          {/* Result Badge */}
          {isAnswered && (
            <div className="flex justify-center">
              <Badge 
                variant={isCorrect ? "default" : "destructive"} 
                className={`text-lg py-2 px-6 ${isCorrect ? 'bg-green-500' : ''}`}
              >
                {isCorrect ? `🎉 +${xpReward} XP!` : "Try again next time!"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
