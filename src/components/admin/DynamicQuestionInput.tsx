import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

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

  // Fill Blanks states
  const [blanksCount, setBlanksCount] = useState(1);
  const [blanks, setBlanks] = useState([{ correctAnswer: '', distractors: ['', '', ''] }]);

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
          question: questionText,
          correctAnswer: correctAnswer === 0,
          marks,
          difficulty
        };
        break;

      case 'fill_blank':
        gameData = {
          question: questionText,
          blanks: blanks.filter(b => b.correctAnswer.trim()),
          marks,
          difficulty
        };
        break;

      case 'match_column':
        // Filter out empty items but preserve indices
        const filteredLeft = leftColumn.filter(item => item.trim());
        const filteredRight = rightColumn.filter(item => item.trim());
        
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
    } else if (gameType === 'fill_blank') {
      setBlanksCount(1);
      setBlanks([{ correctAnswer: '', distractors: ['', '', ''] }]);
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
        <div>
          <Label>Statement *</Label>
          <Textarea
            value={questionText}
            onChange={(e) => { 
              setQuestionText(e.target.value); 
              setTimeout(() => handleDataChange(), 0);
            }}
            placeholder="Enter a true/false statement..."
            rows={2}
          />
        </div>

        <div className="flex gap-4">
          <div
            onClick={() => { 
              setCorrectAnswer(0); 
              setTimeout(() => handleDataChange(), 0);
            }}
            className={`flex-1 border-2 rounded-lg p-4 cursor-pointer ${correctAnswer === 0 ? 'border-primary bg-primary/10' : 'border-border'}`}
          >
            <Switch checked={correctAnswer === 0} />
            <span className="ml-2 font-medium">True</span>
          </div>
          <div
            onClick={() => { 
              setCorrectAnswer(1); 
              setTimeout(() => handleDataChange(), 0);
            }}
            className={`flex-1 border-2 rounded-lg p-4 cursor-pointer ${correctAnswer === 1 ? 'border-primary bg-primary/10' : 'border-border'}`}
          >
            <Switch checked={correctAnswer === 1} />
            <span className="ml-2 font-medium">False</span>
          </div>
        </div>

        <div>
          <Label>Explanation</Label>
          <Textarea 
            value={explanation} 
            onChange={(e) => { 
              setExplanation(e.target.value); 
              setTimeout(() => handleDataChange(), 0);
            }} 
            placeholder="Explain why..." 
            rows={2} 
          />
        </div>
      </div>
    );
  }

  // Fill Blanks Input
  if (gameType === 'fill_blank') {
    return (
      <div className="space-y-4">
        <div>
          <Label>Question with blanks (use __ for blanks) *</Label>
          <Textarea
            value={questionText}
            onChange={(e) => { 
              setQuestionText(e.target.value); 
              setTimeout(() => handleDataChange(), 0);
            }}
            placeholder="Water is made of __ and __"
            rows={2}
          />
        </div>

        <div>
          <Label>Number of Blanks</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={blanksCount}
            onChange={(e) => {
              const count = parseInt(e.target.value);
              setBlanksCount(count);
              const newBlanks = Array.from({ length: count }, (_, i) => 
                blanks[i] || { correctAnswer: '', distractors: ['', '', ''] }
              );
              setBlanks(newBlanks);
              setTimeout(() => handleDataChange(), 0);
            }}
          />
        </div>

        {blanks.map((blank, idx) => (
          <Card key={idx} className="p-4 space-y-2">
            <Label className="font-semibold">Blank {idx + 1}</Label>
            <Input
              placeholder="Correct answer"
              value={blank.correctAnswer}
              onChange={(e) => {
                const newBlanks = [...blanks];
                newBlanks[idx] = { ...newBlanks[idx], correctAnswer: e.target.value };
                setBlanks(newBlanks);
                setTimeout(() => handleDataChange(), 0);
              }}
            />
            <Label className="text-sm text-muted-foreground">Distractors (wrong options)</Label>
            {blank.distractors.map((dist, dIdx) => (
              <Input
                key={dIdx}
                placeholder={`Distractor ${dIdx + 1}`}
                value={dist}
                onChange={(e) => {
                  const newBlanks = [...blanks];
                  newBlanks[idx].distractors[dIdx] = e.target.value;
                  setBlanks(newBlanks);
                  setTimeout(() => handleDataChange(), 0);
                }}
              />
            ))}
          </Card>
        ))}

        <div>
          <Label>Explanation</Label>
          <Textarea value={explanation} onChange={(e) => { setExplanation(e.target.value); handleDataChange(); }} rows={2} />
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
