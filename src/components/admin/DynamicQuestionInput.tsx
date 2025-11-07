import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { getNumberingLabel } from '@/lib/questionParsing';

type GameType = "mcq" | "fill_blank" | "true_false" | "match_column" | "match_pairs" | "sequence_order" | "typing_race" | "interactive_blanks" | "card_memory";

interface DynamicQuestionInputProps {
  gameType: GameType;
  onChange: (data: {
    questionText: string;
    gameData: any;
    explanation: string;
    marks: number;
    difficulty: string;
    question_type: GameType;
  }) => void;
}

export const DynamicQuestionInput = ({ gameType, onChange }: DynamicQuestionInputProps) => {
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");

  // Fill Blanks states (multi-part for fill_blank game type)
  const [subQuestions, setSubQuestions] = useState<Array<{ text: string; correctAnswer: string; distractors: string[] }>>([]);
  const [fillBlankNumbering, setFillBlankNumbering] = useState('1,2,3');
  
  // Interactive Blanks states (for interactive_blanks game type)
  const [blanks, setBlanks] = useState([{ correctAnswer: '', distractors: ['', '', ''] }]);
  
  // True/False multi-statement states
  const [statements, setStatements] = useState([{ text: '', answer: true }]);
  const [trueFalseNumbering, setTrueFalseNumbering] = useState('i,ii,iii');

  // Match Column states
  const [leftColumn, setLeftColumn] = useState(['', '']);
  const [rightColumn, setRightColumn] = useState(['', '']);
  const [pairs, setPairs] = useState<{ left: number; right: number }[]>([]);

  // Match Pairs states
  const [pairItems, setPairItems] = useState([{ left: '', right: '' }, { left: '', right: '' }]);
  const [maxAttempts, setMaxAttempts] = useState<number | undefined>(undefined);

  // Sequence states
  const [sequenceItems, setSequenceItems] = useState(['', '', '']);

  // Typing Race states
  const [targetText, setTargetText] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [minAccuracy, setMinAccuracy] = useState(90);

  // Card Memory states
  const [memoryPairs, setMemoryPairs] = useState(['', '']);

  const handleDataChange = () => {
    let gameData: any = {};

    switch (gameType) {
      case 'mcq':
        gameData = {
          question: questionText,
          options: options.filter(opt => opt.trim()),
          correctAnswerIndex: correctAnswer,
          marks,
          difficulty
        };
        break;

      case 'true_false':
        gameData = {
          statements: statements
            .filter(s => s.text.trim())
            .map(s => ({
              text: s.text,
              answer: s.answer
            })),
          numbering_style: trueFalseNumbering,
          marks,
          difficulty
        };
        break;

      case 'fill_blank':
        gameData = {
          sub_questions: subQuestions.filter(sq => sq.text.trim()),
          blanks: subQuestions.filter(sq => sq.text.trim()).map(sq => ({
            correctAnswer: sq.correctAnswer,
            distractors: sq.distractors
          })),
          numbering_style: fillBlankNumbering,
          marks,
          difficulty
        };
        break;

      case 'match_column':
        // Filter out empty items but preserve indices
        const filteredLeft = leftColumn.filter(item => item.trim());
        const filteredRight = rightColumn.filter(item => item.trim());
        
        console.log('🔍 Match Column Data (DynamicQuestionInput):', {
          leftColumn: filteredLeft,
          rightColumn: filteredRight,
          pairs: pairs,
          pairsLength: pairs.length,
          leftColumnLength: filteredLeft.length,
          rightColumnLength: filteredRight.length
        });
        
        gameData = {
          question: questionText,
          leftColumn: filteredLeft,
          rightColumn: filteredRight,
          correctPairs: pairs,
          marks,
          difficulty
        };
        break;

      case 'match_pairs':
        gameData = {
          question: questionText,
          pairs: pairItems.map((pair, idx) => ({
            id: `pair_${idx + 1}`,
            left: pair.left,
            right: pair.right
          })),
          time_limit: timeLimit || 60,
          max_attempts: maxAttempts || undefined,
          marks,
          difficulty
        };
        break;

      case 'sequence_order':
        gameData = {
          question: questionText,
          correctSequence: sequenceItems,
          marks,
          difficulty
        };
        break;

      case 'typing_race':
        gameData = {
          question: questionText,
          targetText,
          timeLimit,
          minAccuracy,
          marks,
          difficulty
        };
        break;

      case 'interactive_blanks':
        gameData = {
          question: questionText,
          blanks: blanks.map(b => ({
            correctAnswer: b.correctAnswer,
            options: [b.correctAnswer, ...b.distractors]
          })),
          marks,
          difficulty
        };
        break;

      case 'card_memory':
        gameData = {
          question: questionText,
          pairs: memoryPairs.filter(p => p.trim()),
          marks,
          difficulty
        };
        break;
    }

    onChange({ questionText, gameData, explanation, marks, difficulty, question_type: gameType });
  };

  // Initialize data whenever gameType changes - but preserve existing data
  useEffect(() => {
    // Reset state based on game type
    setQuestionText('');
    setExplanation('');
    setMarks(1);
    setDifficulty('medium');
    
    // Reset game-specific states
    if (gameType === 'mcq') {
      setOptions(['', '', '', '']);
      setCorrectAnswer(0);
    } else if (gameType === 'true_false') {
      setStatements([{ text: '', answer: true }]);
    } else if (gameType === 'fill_blank') {
      setSubQuestions([{ text: '', correctAnswer: '', distractors: ['', '', ''] }]);
    } else if (gameType === 'match_column') {
      setLeftColumn(['', '']);
      setRightColumn(['', '']);
      setPairs([]);
    } else if (gameType === 'match_pairs') {
      setPairItems([{ left: '', right: '' }, { left: '', right: '' }]);
    } else if (gameType === 'sequence_order') {
      setSequenceItems(['', '', '']);
    } else if (gameType === 'card_memory') {
      setMemoryPairs(['', '']);
    }
    
    // Trigger data change only once after reset
    setTimeout(() => handleDataChange(), 0);
  }, [gameType]);

  // MCQ Input
  if (gameType === 'mcq') {
    return (
      <div className="space-y-4">
        <div>
          <Label>Question Text *</Label>
          <Textarea
            value={questionText}
            onChange={(e) => { 
              setQuestionText(e.target.value); 
              setTimeout(() => handleDataChange(), 0);
            }}
            placeholder="Enter your question..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Options * (4 required)</Label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <RadioGroup 
                value={correctAnswer.toString()} 
                onValueChange={(v) => { 
                  setCorrectAnswer(parseInt(v)); 
                  setTimeout(() => handleDataChange(), 0);
                }}
              >
                <RadioGroupItem value={idx.toString()} />
              </RadioGroup>
              <Input
                value={opt}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[idx] = e.target.value;
                  setOptions(newOpts);
                  setTimeout(() => handleDataChange(), 0);
                }}
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                className={opt.trim() ? '' : 'border-orange-300'}
              />
            </div>
          ))}
        </div>

        <div>
          <Label>Explanation</Label>
          <Textarea
            value={explanation}
            onChange={(e) => { 
              setExplanation(e.target.value); 
              setTimeout(() => handleDataChange(), 0);
            }}
            placeholder="Explain the correct answer..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Marks</Label>
            <Input 
              type="number" 
              value={marks} 
              onChange={(e) => { 
                setMarks(parseInt(e.target.value)); 
                setTimeout(() => handleDataChange(), 0);
              }} 
            />
          </div>
          <div>
            <Label>Difficulty</Label>
            <select 
              className="w-full border rounded px-3 py-2" 
              value={difficulty} 
              onChange={(e) => { 
                setDifficulty(e.target.value); 
                setTimeout(() => handleDataChange(), 0);
              }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // True/False Input
  if (gameType === 'true_false') {
    return (
      <div className="space-y-4">
        <Label>Question Type: True/False</Label>

        <div>
          <Label>Numbering Style</Label>
          <Select value={trueFalseNumbering} onValueChange={(value) => {
            setTrueFalseNumbering(value);
            setTimeout(() => handleDataChange(), 0);
          }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="i,ii,iii">i, ii, iii</SelectItem>
              <SelectItem value="1,2,3">1, 2, 3</SelectItem>
              <SelectItem value="a,b,c">a, b, c</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="font-semibold">Statements ({statements.filter(s => s.text.trim()).length})</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setStatements([...statements, { text: '', answer: true }]);
                setTimeout(() => handleDataChange(), 0);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Statement
            </Button>
          </div>

          {statements.map((stmt, idx) => (
            <Card key={idx} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">{getNumberingLabel(idx, trueFalseNumbering)}. Statement</Label>
                  {statements.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newStatements = statements.filter((_, i) => i !== idx);
                        setStatements(newStatements);
                        setTimeout(() => handleDataChange(), 0);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <Textarea
                  value={stmt.text}
                  onChange={(e) => {
                    const newStatements = [...statements];
                    newStatements[idx].text = e.target.value;
                    setStatements(newStatements);
                    setTimeout(() => handleDataChange(), 0);
                  }}
                  placeholder={`Enter statement ${idx + 1}...`}
                  rows={2}
                />

                <div className="flex gap-4">
                  <div
                    onClick={() => {
                      const newStatements = [...statements];
                      newStatements[idx].answer = true;
                      setStatements(newStatements);
                      setTimeout(() => handleDataChange(), 0);
                    }}
                    className={`flex-1 border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                      stmt.answer ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <Switch checked={stmt.answer} />
                    <span className="ml-2 font-medium">True</span>
                  </div>
                  <div
                    onClick={() => {
                      const newStatements = [...statements];
                      newStatements[idx].answer = false;
                      setStatements(newStatements);
                      setTimeout(() => handleDataChange(), 0);
                    }}
                    className={`flex-1 border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                      !stmt.answer ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <Switch checked={!stmt.answer} />
                    <span className="ml-2 font-medium">False</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <Label>Explanation</Label>
          <Textarea 
            value={explanation} 
            onChange={(e) => { 
              setExplanation(e.target.value); 
              setTimeout(() => handleDataChange(), 0);
            }} 
            placeholder="Explain the answers..." 
            rows={2} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Marks</Label>
            <Input 
              type="number" 
              value={marks} 
              onChange={(e) => { 
                setMarks(parseInt(e.target.value)); 
                setTimeout(() => handleDataChange(), 0);
              }} 
            />
          </div>
          <div>
            <Label>Difficulty</Label>
            <select 
              className="w-full border rounded px-3 py-2" 
              value={difficulty} 
              onChange={(e) => { 
                setDifficulty(e.target.value); 
                setTimeout(() => handleDataChange(), 0);
              }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // Fill Blank Input
  if (gameType === 'fill_blank') {
    return (
      <div className="space-y-4">
        <Label>Question Type: Fill in the Blanks (Drag & Drop)</Label>

        <div>
          <Label>Numbering Style</Label>
          <Select value={fillBlankNumbering} onValueChange={(value) => {
            setFillBlankNumbering(value);
            setTimeout(() => handleDataChange(), 0);
          }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1,2,3">1, 2, 3</SelectItem>
              <SelectItem value="i,ii,iii">i, ii, iii</SelectItem>
              <SelectItem value="a,b,c">a, b, c</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="font-semibold">Sub-Questions ({subQuestions.filter(sq => sq.text.trim()).length})</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSubQuestions([...subQuestions, { text: '', correctAnswer: '', distractors: ['', '', ''] }]);
                setTimeout(() => handleDataChange(), 0);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Sub-Question
            </Button>
          </div>

          {subQuestions.map((sq, idx) => (
            <Card key={idx} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">{getNumberingLabel(idx, fillBlankNumbering)}. Fill in the blank</Label>
                  {subQuestions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newSubs = subQuestions.filter((_, i) => i !== idx);
                        setSubQuestions(newSubs);
                        setTimeout(() => handleDataChange(), 0);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div>
                  <Label className="text-xs">Question Text (use ____ for blank)</Label>
                  <Textarea
                    value={sq.text}
                    onChange={(e) => {
                      const newSubs = [...subQuestions];
                      newSubs[idx].text = e.target.value;
                      setSubQuestions(newSubs);
                      setTimeout(() => handleDataChange(), 0);
                    }}
                    placeholder="E.g., A ____ has minute holes called pores"
                    rows={2}
                  />
                </div>

                <div>
                  <Label className="text-xs">Correct Answer</Label>
                  <Input
                    value={sq.correctAnswer}
                    onChange={(e) => {
                      const newSubs = [...subQuestions];
                      newSubs[idx].correctAnswer = e.target.value;
                      setSubQuestions(newSubs);
                      setTimeout(() => handleDataChange(), 0);
                    }}
                    placeholder="Enter correct answer"
                  />
                </div>

                <div>
                  <Label className="text-xs">Distractors (wrong options - 3 required)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {sq.distractors.map((dist, dIdx) => (
                      <Input
                        key={dIdx}
                        value={dist}
                        onChange={(e) => {
                          const newSubs = [...subQuestions];
                          newSubs[idx].distractors[dIdx] = e.target.value;
                          setSubQuestions(newSubs);
                          setTimeout(() => handleDataChange(), 0);
                        }}
                        placeholder={`Wrong ${dIdx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <Label>Explanation</Label>
          <Textarea 
            value={explanation} 
            onChange={(e) => { 
              setExplanation(e.target.value); 
              setTimeout(() => handleDataChange(), 0);
            }} 
            placeholder="Explain the answers..." 
            rows={2} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Marks</Label>
            <Input 
              type="number" 
              value={marks} 
              onChange={(e) => { 
                setMarks(parseInt(e.target.value)); 
                setTimeout(() => handleDataChange(), 0);
              }} 
            />
          </div>
          <div>
            <Label>Difficulty</Label>
            <select 
              className="w-full border rounded px-3 py-2" 
              value={difficulty} 
              onChange={(e) => { 
                setDifficulty(e.target.value); 
                setTimeout(() => handleDataChange(), 0);
              }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // Match Column Input
  if (gameType === 'match_column') {
    return (
      <div className="space-y-4">
        <div>
          <Label>Question *</Label>
          <Textarea 
            value={questionText} 
            onChange={(e) => { 
              setQuestionText(e.target.value); 
              setTimeout(() => handleDataChange(), 0);
            }} 
            rows={2} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Left Column Items ({leftColumn.filter(i => i.trim()).length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLeftColumn([...leftColumn, '']);
                  setTimeout(() => handleDataChange(), 0);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {leftColumn.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const newLeft = [...leftColumn];
                    newLeft[idx] = e.target.value;
                    setLeftColumn(newLeft);
                    setTimeout(() => handleDataChange(), 0);
                  }}
                  placeholder={`Item ${String.fromCharCode(65 + idx)}`}
                />
                {leftColumn.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newLeft = leftColumn.filter((_, i) => i !== idx);
                      setLeftColumn(newLeft);
                      // Reset pairs that reference removed index
                      setPairs(pairs.filter(p => p.left !== idx).map(p => ({
                        left: p.left > idx ? p.left - 1 : p.left,
                        right: p.right
                      })));
                      setTimeout(() => handleDataChange(), 0);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Right Column Items ({rightColumn.filter(i => i.trim()).length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRightColumn([...rightColumn, '']);
                  setTimeout(() => handleDataChange(), 0);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {rightColumn.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const newRight = [...rightColumn];
                    newRight[idx] = e.target.value;
                    setRightColumn(newRight);
                    setTimeout(() => handleDataChange(), 0);
                  }}
                  placeholder={`Item ${String.fromCharCode(105 + idx)}`}
                />
                {rightColumn.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newRight = rightColumn.filter((_, i) => i !== idx);
                      setRightColumn(newRight);
                      // Reset pairs that reference removed index
                      setPairs(pairs.filter(p => p.right !== idx).map(p => ({
                        left: p.left,
                        right: p.right > idx ? p.right - 1 : p.right
                      })));
                      setTimeout(() => handleDataChange(), 0);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Correct Pairs (match left to right) - {pairs.length} defined</Label>
          {leftColumn.filter(i => i.trim()).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <Badge>{String.fromCharCode(65 + idx)}</Badge>
              <span className="text-sm flex-1 truncate">{item || '...'}</span>
              <span>→</span>
              <select
                className="border rounded px-2 py-1"
                value={pairs.find(p => p.left === idx)?.right ?? ''}
                onChange={(e) => {
                  const rightIdx = parseInt(e.target.value);
                  const newPairs = pairs.filter(p => p.left !== idx);
                  if (!isNaN(rightIdx)) {
                    newPairs.push({ left: idx, right: rightIdx });
                  }
                  setPairs(newPairs);
                  setTimeout(() => handleDataChange(), 0);
                }}
              >
                <option value="">Select...</option>
                {rightColumn.filter(i => i.trim()).map((rItem, rIdx) => (
                  <option key={rIdx} value={rIdx}>
                    {String.fromCharCode(105 + rIdx)} - {rItem.substring(0, 20)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div>
          <Label>Explanation</Label>
          <Textarea value={explanation} onChange={(e) => { setExplanation(e.target.value); handleDataChange(); }} rows={2} />
        </div>
      </div>
    );
  }

  // Match Pairs Input
  if (gameType === 'match_pairs') {
    return (
      <div className="space-y-4">
        <div>
          <Label>Question *</Label>
          <Textarea value={questionText} onChange={(e) => { setQuestionText(e.target.value); handleDataChange(); }} rows={2} />
        </div>

        <div>
          <Label>Pairs (Left & Right items to match)</Label>
          {pairItems.map((pair, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <Input
                placeholder="Left item"
                value={pair.left}
                onChange={(e) => {
                  const newPairs = [...pairItems];
                  newPairs[idx].left = e.target.value;
                  setPairItems(newPairs);
                  handleDataChange();
                }}
              />
              <span className="flex items-center">↔</span>
              <Input
                placeholder="Right item"
                value={pair.right}
                onChange={(e) => {
                  const newPairs = [...pairItems];
                  newPairs[idx].right = e.target.value;
                  setPairItems(newPairs);
                  handleDataChange();
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPairItems(pairItems.filter((_, i) => i !== idx));
                  handleDataChange();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPairItems([...pairItems, { left: '', right: '' }]);
              handleDataChange();
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Pair
          </Button>
        </div>

        <div>
          <Label>Time Limit (seconds)</Label>
          <Input
            type="number"
            value={timeLimit}
            onChange={(e) => {
              setTimeLimit(parseInt(e.target.value) || 60);
              handleDataChange();
            }}
            min={10}
            max={300}
          />
        </div>

        <div>
          <Label>Max Attempts (optional)</Label>
          <Input
            type="number"
            placeholder="Leave empty for unlimited"
            value={maxAttempts || ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : undefined;
              setMaxAttempts(val);
              handleDataChange();
            }}
            min={1}
          />
        </div>

        <div>
          <Label>Explanation</Label>
          <Textarea
            value={explanation}
            onChange={(e) => {
              setExplanation(e.target.value);
              handleDataChange();
            }}
            rows={2}
            placeholder="Explain the correct pairs..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Marks</Label>
            <Input
              type="number"
              value={marks}
              onChange={(e) => {
                setMarks(parseInt(e.target.value) || 1);
                handleDataChange();
              }}
              min={1}
            />
          </div>
          <div>
            <Label>Difficulty</Label>
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                handleDataChange();
              }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // Sequence Order Input
  if (gameType === 'sequence_order') {
    return (
      <div className="space-y-4">
        <div>
          <Label>Question *</Label>
          <Textarea
            value={questionText}
            onChange={(e) => { setQuestionText(e.target.value); handleDataChange(); }}
            placeholder="Arrange these events in chronological order..."
            rows={2}
          />
        </div>

        <div>
          <Label>Items (in correct order)</Label>
          {sequenceItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <Badge variant="outline">{idx + 1}</Badge>
              <Input
                value={item}
                onChange={(e) => {
                  const newItems = [...sequenceItems];
                  newItems[idx] = e.target.value;
                  setSequenceItems(newItems);
                  handleDataChange();
                }}
                placeholder={`Item ${idx + 1}`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSequenceItems(sequenceItems.filter((_, i) => i !== idx));
                  handleDataChange();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSequenceItems([...sequenceItems, '']);
              handleDataChange();
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>
    );
  }

  // Card Memory Input
  if (gameType === 'card_memory') {
    return (
      <div className="space-y-4">
        <div>
          <Label>Question *</Label>
          <Textarea
            value={questionText}
            onChange={(e) => { setQuestionText(e.target.value); handleDataChange(); }}
            placeholder="Find matching pairs of..."
            rows={2}
          />
        </div>

        <div>
          <Label>Memory Pairs (Each pair will appear twice)</Label>
          {memoryPairs.map((pair, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <Badge variant="outline">{idx + 1}</Badge>
              <Input
                value={pair}
                onChange={(e) => {
                  const newPairs = [...memoryPairs];
                  newPairs[idx] = e.target.value;
                  setMemoryPairs(newPairs);
                  handleDataChange();
                }}
                placeholder={`Pair ${idx + 1}`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMemoryPairs(memoryPairs.filter((_, i) => i !== idx));
                  handleDataChange();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMemoryPairs([...memoryPairs, '']);
              handleDataChange();
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Pair
          </Button>
        </div>
      </div>
    );
  }

  // Typing Race Input
  if (gameType === 'typing_race') {
    return (
      <div className="space-y-4">
        <div>
          <Label>Question/Instruction *</Label>
          <Textarea
            value={questionText}
            onChange={(e) => { setQuestionText(e.target.value); handleDataChange(); }}
            placeholder="Type this text as fast as you can..."
            rows={2}
          />
        </div>

        <div>
          <Label>Target Text to Type *</Label>
          <Textarea
            value={targetText}
            onChange={(e) => { setTargetText(e.target.value); handleDataChange(); }}
            placeholder="Enter the text students need to type..."
            rows={4}
          />
        </div>

        <div>
          <Label>Time Limit (seconds)</Label>
          <Input
            type="number"
            value={timeLimit}
            onChange={(e) => { setTimeLimit(parseInt(e.target.value)); handleDataChange(); }}
            min={10}
            max={300}
          />
        </div>

        <div>
          <Label>Minimum Accuracy (%)</Label>
          <Input
            type="number"
            value={minAccuracy}
            onChange={(e) => { setMinAccuracy(parseInt(e.target.value)); handleDataChange(); }}
            min={0}
            max={100}
          />
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="text-sm text-muted-foreground">
      Input interface for {gameType} will be available soon.
    </div>
  );
};
