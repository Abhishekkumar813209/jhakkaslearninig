import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { renderWithImages } from '@/lib/mathRendering';
import { normalizeMatchColumnAnswer, formatMatchColumnDisplay } from '@/lib/answers';

interface QuestionAnswerInputProps {
  questionType: string;
  options?: string[];
  leftColumn?: string[];
  rightColumn?: string[];
  currentAnswer?: any;
  onChange: (answer: any) => void;
  blanksCount?: number;
  useWordBank?: boolean;
}

export const QuestionAnswerInput = ({
  questionType,
  options = [],
  leftColumn = [],
  rightColumn = [],
  currentAnswer,
  onChange,
  blanksCount = 1,
  useWordBank = true
}: QuestionAnswerInputProps) => {
  const [localAnswer, setLocalAnswer] = useState<any>(currentAnswer);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Handle legacy answer formats and normalize them
    if (currentAnswer === null || currentAnswer === undefined) {
      setLocalAnswer(null);
      return;
    }

    let normalized = currentAnswer;

    // 🔧 STRING PARSE: Handle JSON strings from backend
    if (typeof currentAnswer === 'string' && (currentAnswer.startsWith('{') || currentAnswer.startsWith('['))) {
      try {
        console.log('🔄 QAInput - Parsing JSON string:', currentAnswer.substring(0, 100));
        normalized = JSON.parse(currentAnswer);
        console.log('✅ QAInput - Parsed to:', normalized);
      } catch (err) {
        console.warn('⚠️ QAInput - JSON parse failed:', err);
      }
    }

    console.log('🔍 Answer Input - Received:', { questionType, normalized });

    // For MCQ: convert legacy number to { index: number }
    if ((questionType === 'mcq' || questionType === 'assertion_reason') && typeof normalized === 'number') {
      setLocalAnswer({ index: normalized });
      return;
    }

    // For True/False: convert legacy boolean to { value: boolean }
    if (questionType === 'true_false' && typeof normalized === 'boolean') {
      setLocalAnswer({ value: normalized });
      return;
    }

    // For Fill Blank: convert legacy string to { text: string }
    if (questionType === 'fill_blank' && typeof normalized === 'string') {
      setLocalAnswer({ text: normalized });
      return;
    }

    // For Match Column: use centralized normalizer (handles all legacy formats + string parsing)
    if (questionType === 'match_column') {
      const matchAnswer = normalizeMatchColumnAnswer(normalized);
      console.log('✅ Match Column - Normalized via lib/answers:', matchAnswer);
      setLocalAnswer(matchAnswer);
      return;
    }

    // Otherwise, use as-is (already in correct format)
    setLocalAnswer(normalized);
  }, [currentAnswer, questionType]);

  // Debug: log props for match_column to show actual vs expected
  useEffect(() => {
    if (questionType === 'match_column') {
      console.log('🎯 QAInput props', {
        leftLen: leftColumn?.length || 0,
        rightLen: rightColumn?.length || 0,
        leftSample: (leftColumn || []).slice(0, 3),
        rightSample: (rightColumn || []).slice(0, 3),
        currentAnswerType: typeof currentAnswer,
        currentAnswer
      });
    }
  }, [questionType, leftColumn, rightColumn, currentAnswer]);

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
        // Multi-statement mode
        if (Array.isArray(localAnswer?.statements)) {
          valid = localAnswer.statements.length > 0 &&
                  localAnswer.statements.every((s: any) => typeof s?.answer === 'boolean');
        } else {
          // Single statement mode
          valid = typeof localAnswer?.value === 'boolean';
        }
        break;
      case 'fill_blank':
        // New drag-drop format with blanks array
        if (localAnswer?.blanks && Array.isArray(localAnswer.blanks)) {
          // If word bank is OFF, distractors are optional
          if (useWordBank === false) {
            valid = localAnswer.blanks.length > 0 && localAnswer.blanks.every((b: any) => 
              b.correctAnswer?.trim().length > 0
            );
          } else {
            // Word bank ON: require at least 1 distractor per blank
            valid = localAnswer.blanks.length > 0 && localAnswer.blanks.every((b: any) => 
              b.correctAnswer?.trim().length > 0 && 
              Array.isArray(b.distractors) && 
              b.distractors.filter((d: string) => typeof d === 'string' && d.trim().length > 0).length >= 1
            );
          }
          
          // Log specific blank issues for debugging
          if (!valid) {
            console.warn('[fill_blank] Validation failed:', {
              useWordBank,
              blanks: localAnswer?.blanks,
              issues: localAnswer.blanks.map((b: any, idx: number) => ({
                blankIdx: idx,
                hasCorrect: !!b.correctAnswer?.trim(),
                validDistractors: b.distractors?.filter((d: string) => typeof d === 'string' && d.trim().length > 0).length || 0
              }))
            });
          }
        }
        // Sub-questions format (multi-part)
        else if (localAnswer?.sub_questions && Array.isArray(localAnswer.sub_questions)) {
          valid = localAnswer.sub_questions.length > 0;
        }
        // Legacy simple text format
        else if (localAnswer?.text) {
          valid = localAnswer.text.trim().length > 0;
        }
        else {
          valid = false;
        }
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

    // Debug log for fill_blank validation
    if (questionType === 'fill_blank') {
      console.log('🔍 Fill Blank Validation:', {
        localAnswer,
        hasText: !!localAnswer?.text,
        hasBlanks: !!localAnswer?.blanks,
        hasSubQuestions: !!localAnswer?.sub_questions,
        isValid: valid
      });
    }
  }, [localAnswer, questionType, options, leftColumn, rightColumn]);

  const handleChange = (newAnswer: any) => {
    console.log('🔄 [QAInput] onChange fired:', {
      questionType,
      answerType: typeof newAnswer,
      blanksLen: newAnswer?.blanks?.length || 0,
      pairsLen: newAnswer?.pairs?.length || 0,
      preview: JSON.stringify(newAnswer).substring(0, 100)
    });
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
    // Multi-statement mode: show editable toggles per statement
    if (Array.isArray(localAnswer?.statements)) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">True/False Statements</Label>
            <Badge variant={isValid ? 'default' : 'destructive'} className="gap-1">
              {isValid ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Valid
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Required
                </>
              )}
            </Badge>
          </div>
          <div className="space-y-2">
            {localAnswer.statements.map((stmt: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 border rounded-lg p-3 bg-muted/10">
                <Badge variant="outline" className="shrink-0 h-6 w-6 flex items-center justify-center p-0 text-xs font-mono mt-0.5">
                  {idx + 1}
                </Badge>
                <div 
                  className="flex-1 text-sm prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderWithImages(stmt.text || '') }}
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={stmt.answer === true}
                    onCheckedChange={(checked) => {
                      const updatedStatements = [...localAnswer.statements];
                      updatedStatements[idx] = { ...updatedStatements[idx], answer: checked };
                      handleChange({ statements: updatedStatements });
                    }}
                    className="data-[state=checked]:bg-blue-700"
                  />
                  <span className="text-sm font-medium w-12">
                    {stmt.answer ? 'True' : 'False'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Single statement mode: show True/False toggles
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
              <Label className="text-sm text-muted-foreground font-medium">
                × Distractor Options {useWordBank ? '(minimum 1, recommended 3)' : '(optional - Word Bank disabled)'}
              </Label>
              {!useWordBank && (
                <p className="text-xs text-muted-foreground mb-2">
                  💡 Word bank is disabled - distractors won't be shown to students
                </p>
              )}
              <div className="grid gap-2">
                {[0, 1, 2].map((distractorIdx) => {
                  const distractorValue = blanks[idx]?.distractors?.[distractorIdx] || '';
                  return (
                    <div key={distractorIdx} className="relative">
                      <Input
                        value={distractorValue}
                        onChange={(e) => handleDistractorChange(idx, distractorIdx, e.target.value)}
                        placeholder={`Distractor ${distractorIdx + 1} ${!useWordBank ? '(not needed)' : distractorIdx === 0 ? '(required)' : '(optional)'}`}
                        className={distractorIdx === 0 && !distractorValue && useWordBank ? 'border-orange-500/50' : ''}
                        disabled={!useWordBank}
                      />
                    </div>
                  );
                })}
              </div>
              {useWordBank && blanks[idx]?.distractors?.filter((d: string) => d && d.trim().length > 0).length < 3 && (
                <p className="text-xs text-orange-600">
                  ⚠️ At least 1 distractor required. Add 3 for best gameplay.
                </p>
              )}
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

    // Safe fallback: if rightColumn missing, create placeholder options based on detected pairs/left length
    const rightOptions = (rightColumn && rightColumn.length > 0)
      ? rightColumn
      : (() => {
          const maxRight = Math.max(-1, ...pairs.map((p: any) => (typeof p?.right === 'number' ? p.right : -1)));
          const len = Math.max(maxRight + 1, (leftColumn || []).length, 4);
          return Array.from({ length: len }, (_, i) => `Option ${i + 1}`);
        })();

    const previewStr = formatMatchColumnDisplay(localAnswer, leftColumn, rightColumn);
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Correct Pairs</Label>
            {(!rightColumn || rightColumn.length === 0) && (
              <Badge variant="outline">Right column missing (DB)</Badge>
            )}
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

        {previewStr && (
          <div className="text-xs text-muted-foreground">{previewStr}</div>
        )}

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
                className="flex-1 border rounded px-2 py-1 text-sm bg-popover text-foreground relative z-50"
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
                {rightOptions.map((rightItem: string, rightIdx: number) => (
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
