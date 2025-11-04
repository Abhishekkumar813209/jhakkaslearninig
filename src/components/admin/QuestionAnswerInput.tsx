import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { renderWithImages } from '@/lib/mathRendering';

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
    // Handle legacy answer formats and normalize them
    if (currentAnswer === null || currentAnswer === undefined) {
      setLocalAnswer(null);
      return;
    }

    console.log('🔍 Answer Input - Received:', { questionType, currentAnswer });

    // For MCQ: convert legacy number to { index: number }
    if ((questionType === 'mcq' || questionType === 'assertion_reason') && typeof currentAnswer === 'number') {
      setLocalAnswer({ index: currentAnswer });
      return;
    }

    // For True/False: convert legacy boolean to { value: boolean }
    if (questionType === 'true_false' && typeof currentAnswer === 'boolean') {
      setLocalAnswer({ value: currentAnswer });
      return;
    }

    // For Fill Blank: convert legacy string to { text: string }
    if (questionType === 'fill_blank' && typeof currentAnswer === 'string') {
      setLocalAnswer({ text: currentAnswer });
      return;
    }

    // For Match Column: IMPROVED HANDLING - supports legacy formats
    if (questionType === 'match_column') {
      console.log('🔍 Match Column - Received:', currentAnswer);
      
      // Already in correct format: { pairs: [...] }
      if (typeof currentAnswer === 'object' && currentAnswer.pairs && Array.isArray(currentAnswer.pairs)) {
        console.log('✅ Match Column - Already correct format');
        setLocalAnswer(currentAnswer);
        return;
      }
      
      // Legacy array format: [{left: 0, right: 1}, ...]
      if (Array.isArray(currentAnswer)) {
        console.log('✅ Match Column - Converting array to pairs object');
        setLocalAnswer({ pairs: currentAnswer });
        return;
      }
      
      // Legacy object map: {"A":"2", "B":"1"} or {"0":1, "1":2}
      if (typeof currentAnswer === 'object' && currentAnswer !== null) {
        const keys = Object.keys(currentAnswer);
        if (keys.length > 0) {
          const pairs = [];
          
          for (const key of keys) {
            let leftIndex: number;
            let rightIndex: number;
            
            // Handle letter keys (A, B, C)
            if (/^[A-Z]$/i.test(key)) {
              leftIndex = key.toUpperCase().charCodeAt(0) - 65;
            } 
            // Handle numeric string keys
            else if (/^\d+$/.test(key)) {
              leftIndex = parseInt(key, 10);
            } else {
              continue;
            }
            
            // Parse right value
            const val = currentAnswer[key];
            if (typeof val === 'number') {
              rightIndex = val;
            } else if (typeof val === 'string' && /^\d+$/.test(val as string)) {
              rightIndex = parseInt(val as string, 10);
            } else {
              continue;
            }
            
            // Detect 1-based vs 0-based
            const allValues = Object.values(currentAnswer)
              .filter(v => typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v as string)))
              .map(v => typeof v === 'number' ? v : parseInt(v as string, 10));
            
            const hasZero = allValues.some(v => v === 0);
            const minValue = Math.min(...allValues);
            
            // Convert 1-based to 0-based
            if (!hasZero && minValue === 1) {
              rightIndex = rightIndex - 1;
            }
            
            pairs.push({ left: leftIndex, right: rightIndex });
          }
          
          if (pairs.length > 0) {
            console.log('✅ Match Column - Normalized legacy object to pairs:', pairs);
            setLocalAnswer({ pairs });
            return;
          }
        }
      }
      
      console.log('⚠️ Match Column - Unknown format, resetting to empty');
      setLocalAnswer({ pairs: [] });
      return;
    }

    // Otherwise, use as-is (already in correct format)
    setLocalAnswer(currentAnswer);
  }, [currentAnswer, questionType]);

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
                <span 
                  className="prose prose-sm max-w-none question-content inline"
                  dangerouslySetInnerHTML={{ __html: renderWithImages(option || '') }}
                />
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

  // Fill in the Blanks Answer - WITH DRAG & DROP SUPPORT
  if (questionType === 'fill_blank') {
    // Initialize blanks with distractor support
    const blanks = localAnswer?.blanks || Array.from({ length: blanksCount }, () => ({
      correctAnswer: '',
      distractors: ['', '', '']
    }));
    
    const handleBlankChange = (idx: number, field: 'correctAnswer' | 'distractors', value: string | string[]) => {
      const newBlanks = [...blanks];
      if (field === 'correctAnswer') {
        newBlanks[idx] = { ...newBlanks[idx], correctAnswer: value as string };
      } else {
        newBlanks[idx] = { ...newBlanks[idx], distractors: value as string[] };
      }
      handleChange({ blanks: newBlanks });
    };

    const handleDistractorChange = (blankIdx: number, distractorIdx: number, value: string) => {
      const newBlanks = [...blanks];
      const newDistractors = [...newBlanks[blankIdx].distractors];
      newDistractors[distractorIdx] = value;
      newBlanks[blankIdx] = { ...newBlanks[blankIdx], distractors: newDistractors };
      handleChange({ blanks: newBlanks });
    };
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">Fill in the Blanks - Drag & Drop Setup</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Students will drag words into blanks. Add correct answer + 3 distractors per blank.
            </p>
          </div>
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
        
        {Array.from({ length: blanksCount }).map((_, idx) => (
          <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Blank {idx + 1}</Label>
              <Badge variant="outline">Word Bank Item</Badge>
            </div>
            
            {/* Correct Answer */}
            <div className="space-y-1.5">
              <Label className="text-sm text-green-700 font-medium">✓ Correct Answer</Label>
              <Input
                value={blanks[idx]?.correctAnswer || ''}
                onChange={(e) => handleBlankChange(idx, 'correctAnswer', e.target.value)}
                placeholder="Enter the correct answer"
                className="border-green-500/50 bg-green-50/50"
              />
            </div>

            {/* Distractors */}
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground font-medium">× Distractor Options (wrong answers)</Label>
              <div className="grid gap-2">
                {[0, 1, 2].map((distractorIdx) => (
                  <Input
                    key={distractorIdx}
                    value={blanks[idx]?.distractors?.[distractorIdx] || ''}
                    onChange={(e) => handleDistractorChange(idx, distractorIdx, e.target.value)}
                    placeholder={`Distractor ${distractorIdx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Student word bank preview:</p>
              <div className="flex flex-wrap gap-2">
                {blanks[idx]?.correctAnswer && (
                  <Badge variant="default" className="bg-green-500">
                    {blanks[idx].correctAnswer}
                  </Badge>
                )}
                {blanks[idx]?.distractors?.filter(Boolean).map((distractor: string, dIdx: number) => (
                  <Badge key={dIdx} variant="secondary">
                    {distractor}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
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
                <span 
                  className="ml-2 text-sm prose prose-sm max-w-none question-content inline"
                  dangerouslySetInnerHTML={{ __html: renderWithImages(leftItem || '') }}
                />
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
                  console.log('🔄 Match Column - Updated pairs:', newPairs);
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
