import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Trophy, Coins, Star, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundEffects";

interface Exercise {
  id: string;
  exercise_type: string;
  exercise_data: any;
  correct_answer: any;
  explanation: string;
  xp_reward: number;
}

export const GamifiedExercise = ({ exercise, onComplete }: { exercise: Exercise; onComplete: () => void }) => {
  const [answer, setAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!answer.trim()) {
      toast({
        title: "Please provide an answer",
        variant: "destructive"
      });
      return;
    }

    const correct = checkAnswer();
    setIsCorrect(correct);
    setSubmitted(true);

    if (correct) {
      // Play success sound
      playSound('correct');
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Show XP popup
      setShowXpPopup(true);
      setTimeout(() => setShowXpPopup(false), 2000);

      toast({
        title: "🎉 Correct!",
        description: `+${exercise.xp_reward} XP`,
        duration: 3000
      });
    } else {
      // Play wrong sound
      playSound('wrong');

      // Shake animation
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      toast({
        title: "Not quite right",
        description: "Review the explanation and try again",
        variant: "destructive"
      });
    }
  };

  const checkAnswer = (): boolean => {
    switch (exercise.exercise_type) {
      case "mcq":
        return answer === exercise.correct_answer;
      case "true_false":
        return answer.toLowerCase() === exercise.correct_answer.toLowerCase();
      case "fill_blank":
        return answer.toLowerCase().trim() === exercise.correct_answer.toLowerCase().trim();
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isCorrect) {
      onComplete();
    } else {
      setSubmitted(false);
      setAnswer("");
    }
  };

  const renderExercise = () => {
    switch (exercise.exercise_type) {
      case "mcq":
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{exercise.exercise_data.question}</p>
            <RadioGroup value={answer} onValueChange={setAnswer} disabled={submitted}>
              {exercise.exercise_data.options.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case "true_false":
        return (
          <div className="space-y-6">
            <p className="text-lg font-medium">{exercise.exercise_data.statement}</p>
            <div className="flex gap-4">
              {/* TRUE Option */}
              <motion.div
                whileHover={!submitted ? { scale: 1.02 } : {}}
                whileTap={!submitted ? { scale: 0.98 } : {}}
                onClick={() => !submitted && setAnswer("true")}
                className={`flex-1 flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                  answer === "true"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                } ${submitted ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <Switch checked={answer === "true"} disabled={submitted} />
                <span className="text-lg font-medium">True</span>
              </motion.div>

              {/* FALSE Option */}
              <motion.div
                whileHover={!submitted ? { scale: 1.02 } : {}}
                whileTap={!submitted ? { scale: 0.98 } : {}}
                onClick={() => !submitted && setAnswer("false")}
                className={`flex-1 flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                  answer === "false"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                } ${submitted ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <Switch checked={answer === "false"} disabled={submitted} />
                <span className="text-lg font-medium">False</span>
              </motion.div>
            </div>
          </div>
        );

      case "fill_blank":
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{exercise.exercise_data.text}</p>
            <Input
              placeholder="Type your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={submitted}
            />
          </div>
        );

      case "short_answer":
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{exercise.exercise_data.question}</p>
            <Textarea
              placeholder="Type your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={submitted}
              rows={4}
            />
          </div>
        );

      default:
        return <p className="text-muted-foreground">Unsupported exercise type</p>;
    }
  };

  return (
    <>
      {/* XP Popup Animation */}
      <AnimatePresence>
        {showXpPopup && (
          <motion.div
            initial={{ scale: 0, y: 50, opacity: 0 }}
            animate={{ 
              scale: [0, 1.3, 1],
              y: [50, -20, 0],
              opacity: [0, 1, 1]
            }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.6 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-8 py-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-white fill-white animate-pulse" />
                <span className="text-3xl font-bold text-white">+{exercise.xp_reward} XP</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className={isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Exercise</CardTitle>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              {exercise.xp_reward} XP
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderExercise()}

          {submitted && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border ${isCorrect ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"}`}
            >
              <div className="flex items-start gap-2">
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div>
                  <p className="font-medium mb-1">
                    {isCorrect ? "Correct!" : "Not quite right"}
                  </p>
                  <p className="text-sm">{exercise.explanation}</p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex gap-2">
            {!submitted ? (
              <Button onClick={handleSubmit} className="flex-1">
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} className="flex-1">
                {isCorrect ? "Next Exercise" : "Try Again"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
