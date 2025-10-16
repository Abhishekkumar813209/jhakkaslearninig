import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface QuestionAnswerInputProps {
  questionType: string;
  options?: string[];
  leftColumn?: string[];
  rightColumn?: string[];
  currentAnswer?: any;
  onChange: (answer: any) => void;
  blanksCount?: number;
}

export const QuestionAnswerInput = ({
  questionType,
  options = [],
  leftColumn = [],
  rightColumn = [],
  currentAnswer,
  onChange,
  blanksCount = 1
}: QuestionAnswerInputProps) => {
  const [localAnswer, setLocalAnswer] = useState<any>(currentAnswer);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    setLocalAnswer(currentAnswer);
  }, [currentAnswer]);

  useEffect(() => {
    // Validate answer
    let valid = false;
    const safeOptions = options || [];
    const safeLeftColumn = leftColumn || [];
    const safeRightColumn = rightColumn || [];
    
    switch (questionType) {
      case 'mcq':
        valid = typeof localAnswer?.index === 'number' && localAnswer.index >= 0 && localAnswer.index < safeOptions.length;
        break;
      case 'true_false':
        valid = typeof localAnswer?.value === 'boolean';
        break;
      case 'fill_blank':
        valid = !!localAnswer?.text && localAnswer.text.trim().length > 0;
        break;
      case 'match_column':
        valid = Array.isArray(localAnswer?.pairs) && localAnswer.pairs.length > 0;
        break;
      case 'assertion_reason':
        valid = typeof localAnswer?.index === 'number' && localAnswer.index >= 0 && localAnswer.index <= 3;
        break;
      case 'short_answer':
        valid = true; // Short answer questions don't need correct answers
        break;
      default:
        valid = false;
    }
    setIsValid(valid);
  }, [localAnswer, questionType, options, leftColumn, rightColumn]);

  const handleChange = (newAnswer: any) => {
    setLocalAnswer(newAnswer);
    onChange(newAnswer);
  };

  // MCQ Answer
  if (questionType === 'mcq' || questionType === 'assertion_reason') {
    const displayOptions = questionType === 'assertion_reason' 
      ? [
          'Both A and R are true, R is correct explanation of A',
          'Both A and R are true, R is not correct explanation of A',
          'A is true, R is false',
          'A is false, R is true'
        ]
      : (options || []);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Select Correct Answer</Label>
          {isValid ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Valid
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Required
            </Badge>
          )}
        </div>
        <RadioGroup
          value={localAnswer?.index?.toString()}
          onValueChange={(value) => handleChange({ index: parseInt(value) })}
        >
          {displayOptions.map((option, idx) => (
            <div key={idx} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent transition-colors">
              <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
              <Label htmlFor={`option-${idx}`} className="cursor-pointer flex-1 font-normal">
                <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  }

  // True/False Answer
  if (questionType === 'true_false') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Select Correct Answer</Label>
          {isValid ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Valid
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Required
            </Badge>
          )}
        </div>
        <div className="flex gap-4">
          <div 
            onClick={() => handleChange({ value: true })}
            className={`flex-1 border-2 rounded-lg p-4 cursor-pointer transition-all ${
              localAnswer?.value === true 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Switch checked={localAnswer?.value === true} />
              <span className="font-medium">True</span>
            </div>
          </div>
          <div 
            onClick={() => handleChange({ value: false })}
            className={`flex-1 border-2 rounded-lg p-4 cursor-pointer transition-all ${
              localAnswer?.value === false 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Switch checked={localAnswer?.value === false} />
              <span className="font-medium">False</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fill in the Blanks Answer
  if (questionType === 'fill_blank') {
    const answers = localAnswer?.answers || Array(blanksCount).fill('');
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Correct Answer(s) - Auto-lowercase</Label>
          {isValid ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Valid
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Required
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          {Array.from({ length: blanksCount }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Label className="w-20 text-sm">Blank {idx + 1}:</Label>
              <Input
                placeholder="Enter answer (will be lowercased)"
                value={answers[idx] || ''}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[idx] = e.target.value.toLowerCase();
                  handleChange({ 
                    text: newAnswers.join(', '),
                    answers: newAnswers 
                  });
                }}
                className="flex-1"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          ℹ️ All answers will be automatically converted to lowercase for consistent matching
        </p>
      </div>
    );
  }

  // Match Column Answer
  if (questionType === 'match_column') {
    const pairs = localAnswer?.pairs || [];
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Correct Pairs</Label>
          {isValid ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Valid
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Required
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          {(leftColumn || []).map((leftItem, leftIdx) => (
            <div key={leftIdx} className="flex items-center gap-2 border rounded-lg p-3">
              <div className="flex-1">
                <Badge variant="outline">{String.fromCharCode(65 + leftIdx)}</Badge>
                <span className="ml-2 text-sm">{leftItem}</span>
              </div>
              <span className="text-muted-foreground">→</span>
              <select
                className="flex-1 border rounded px-2 py-1 text-sm"
                value={pairs.find((p: any) => p.left === leftIdx)?.right ?? ''}
                onChange={(e) => {
                  const rightIdx = parseInt(e.target.value);
                  const newPairs = pairs.filter((p: any) => p.left !== leftIdx);
                  if (!isNaN(rightIdx)) {
                    newPairs.push({ left: leftIdx, right: rightIdx });
                  }
                  handleChange({ pairs: newPairs });
                }}
              >
                <option value="">Select match...</option>
                {(rightColumn || []).map((rightItem, rightIdx) => (
                  <option key={rightIdx} value={rightIdx}>
                    {String.fromCharCode(105 + rightIdx)}. {rightItem}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Short Answer (no correct answer needed)
  if (questionType === 'short_answer') {
    return (
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">No correct answer required for short answer questions</Label>
        <Badge variant="secondary">Subjective Question</Badge>
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      Answer input not available for this question type
    </div>
  );
};
