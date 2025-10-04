import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Trophy, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Exercise {
  id: string;
  exercise_type: string;
  exercise_data: any;
  correct_answer: any;
  explanation: string;
  xp_reward: number;
  coin_reward: number;
}

export const GamifiedExercise = ({ exercise, onComplete }: { exercise: Exercise; onComplete: () => void }) => {
  const [answer, setAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
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
      toast({
        title: "🎉 Correct!",
        description: `+${exercise.xp_reward} XP, +${exercise.coin_reward} Coins`
      });
    } else {
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
          <div className="space-y-4">
            <p className="text-lg font-medium">{exercise.exercise_data.statement}</p>
            <RadioGroup value={answer} onValueChange={setAnswer} disabled={submitted}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true" className="cursor-pointer">True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false" className="cursor-pointer">False</Label>
              </div>
            </RadioGroup>
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Exercise</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              {exercise.xp_reward} XP
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Coins className="h-3 w-3 text-yellow-500" />
              {exercise.coin_reward}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderExercise()}

        {submitted && (
          <div className={`p-4 rounded-lg border ${isCorrect ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"}`}>
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
          </div>
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
  );
};
