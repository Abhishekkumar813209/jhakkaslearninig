import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AnswerComparison } from './AnswerComparison';
import { renderMath } from '@/lib/mathRendering';

interface QuestionCardProps {
  questionNumber: number;
  questionText: string;
  questionType: string;
  options: any[];
  correctAnswer: string;
  studentAnswer: string | null;
  isCorrect: boolean | null;
  marksAwarded: number;
  maxMarks: number;
  explanation: string | null;
  difficulty: string | null;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  questionNumber,
  questionText,
  questionType,
  options,
  correctAnswer,
  studentAnswer,
  isCorrect,
  marksAwarded,
  maxMarks,
  explanation,
  difficulty
}) => {
  const [explanationOpen, setExplanationOpen] = useState(false);

  const getStatusBadge = () => {
    if (isCorrect === true) {
      return <Badge className="bg-green-600">Correct ✓</Badge>;
    }
    if (isCorrect === false) {
      return <Badge variant="destructive">Wrong ✗</Badge>;
    }
    return <Badge variant="secondary">Not Attempted</Badge>;
  };

  const getDifficultyColor = () => {
    const lower = difficulty?.toLowerCase() || 'medium';
    if (lower === 'easy') return 'bg-green-500';
    if (lower === 'hard') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg">
            <Badge variant="outline" className="mr-2">Q{questionNumber}</Badge>
            {getStatusBadge()}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {marksAwarded}/{maxMarks} marks
            </Badge>
            {difficulty && (
              <Badge className={getDifficultyColor()}>
                {difficulty}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Question Text */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Question:</h3>
          <div 
            className="text-base font-medium leading-relaxed" 
            dangerouslySetInnerHTML={{ __html: renderMath(questionText) }} 
          />
        </div>

        {/* Answer Comparison */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            {questionType === 'mcq' || questionType === 'true_false' ? 'Options:' : 'Answer:'}
          </h3>
          <AnswerComparison
            questionType={questionType}
            options={options}
            correctAnswer={correctAnswer}
            studentAnswer={studentAnswer}
            isCorrect={isCorrect}
          />
        </div>

        {/* Explanation */}
        {explanation && (
          <Collapsible open={explanationOpen} onOpenChange={setExplanationOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <span className="mr-2">💡 Explanation</span>
                {explanationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div 
                className="bg-muted p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap" 
                dangerouslySetInnerHTML={{ __html: renderMath(explanation) }} 
              />
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};
