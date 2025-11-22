import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { renderMath } from '@/lib/mathRendering';
import { cn } from '@/lib/utils';

interface AnswerComparisonProps {
  questionType: string;
  options: any[];
  correctAnswer: string;
  studentAnswer: string | null;
  isCorrect: boolean | null;
}

export const AnswerComparison: React.FC<AnswerComparisonProps> = ({
  questionType,
  options,
  correctAnswer,
  studentAnswer,
  isCorrect
}) => {
  const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

  // MCQ and True/False - Show all options with highlights
  if (questionType === 'mcq' || questionType === 'true_false') {
    return (
      <div className="space-y-2">
        {options.map((opt, idx) => {
          const optionText = opt.text || opt.option_text || opt;
          const isCorrectOption = opt.is_correct === true || opt.isCorrect === true;
          const isStudentOption = studentAnswer === optionText || studentAnswer === String(idx);
          
          return (
            <div 
              key={idx}
              className={cn(
                "p-4 rounded-lg border-2 transition-colors",
                isCorrectOption && "bg-green-50 border-green-500",
                isStudentOption && !isCorrect && "bg-red-50 border-red-500",
                !isCorrectOption && !isStudentOption && "bg-muted border-border"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {isCorrectOption && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {isStudentOption && !isCorrect && <XCircle className="h-5 w-5 text-red-600" />}
                  {!isCorrectOption && !isStudentOption && (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-semibold mr-2">{getOptionLabel(idx)}.</span>
                  <span dangerouslySetInnerHTML={{ __html: renderMath(optionText) }} />
                  <div className="flex gap-2 mt-2">
                    {isCorrectOption && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        ✓ Correct Answer
                      </Badge>
                    )}
                    {isStudentOption && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                        Your Answer
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Subjective and Fill-in-the-blanks - Side by side comparison
  if (questionType === 'subjective' || questionType === 'fill_blanks') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-blue-900 mb-2">Your Answer:</p>
          <p className="text-foreground" dangerouslySetInnerHTML={{ 
            __html: renderMath(studentAnswer || "Not attempted") 
          }} />
        </div>
        
        {correctAnswer && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-semibold text-green-900 mb-2">Correct Answer:</p>
            <p className="text-foreground" dangerouslySetInnerHTML={{ 
              __html: renderMath(correctAnswer) 
            }} />
          </div>
        )}
      </div>
    );
  }

  return null;
};
