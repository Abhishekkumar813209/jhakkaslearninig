import { useState, useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Check, X, Lightbulb } from 'lucide-react';

interface DragDropSequenceData {
  question: string;
  correctSequence: string[];
  hint?: string;
  marks?: number;
  difficulty?: string;
}

interface DragDropSequenceProps {
  gameData: DragDropSequenceData;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: () => void;
}

const SortableItem = ({ id, text, isCorrect }: { id: string; text: string; isCorrect?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`p-4 mb-3 ${isCorrect !== undefined ? (isCorrect ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10') : ''}`}>
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="flex-1 font-medium">{text}</span>
          {isCorrect !== undefined && (
            isCorrect ? <Check className="w-5 h-5 text-primary" /> : <X className="w-5 h-5 text-destructive" />
          )}
        </div>
      </Card>
    </div>
  );
};

export const DragDropSequence = ({ gameData, onCorrect, onWrong, onComplete }: DragDropSequenceProps) => {
  const [items, setItems] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [correctness, setCorrectness] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // Shuffle items initially
    if (gameData.correctSequence && gameData.correctSequence.length > 0) {
      const shuffled = [...gameData.correctSequence].sort(() => Math.random() - 0.5);
      setItems(shuffled);
    }
  }, [gameData]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item, idx) => `item-${idx}` === active.id);
        const newIndex = items.findIndex((item, idx) => `item-${idx}` === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setChecked(false);
      setCorrectness({});
    }
  };

  const handleCheck = () => {
    const newCorrectness: Record<number, boolean> = {};
    let correctCount = 0;

    items.forEach((item, index) => {
      const isCorrect = gameData.correctSequence[index] === item;
      newCorrectness[index] = isCorrect;
      if (isCorrect) correctCount++;
    });

    setCorrectness(newCorrectness);
    setChecked(true);

    const percentage = (correctCount / items.length) * 100;
    
    if (percentage === 100) {
      onCorrect();
      setTimeout(() => onComplete(), 1500);
    } else if (percentage >= 50) {
      onWrong(); // Partial credit but still wrong
    } else {
      onWrong();
    }
  };

  const score = Object.values(correctness).filter(Boolean).length;

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Question */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">{gameData.question}</h2>
        <p className="text-muted-foreground">Drag and drop to arrange in correct order</p>
      </div>

      {/* Score Display */}
      {checked && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-accent rounded-lg"
        >
          <p className="text-lg font-semibold">
            Score: {score}/{items.length} correct ({Math.round((score / items.length) * 100)}%)
          </p>
        </motion.div>
      )}

      {/* Drag & Drop Area */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((_, idx) => `item-${idx}`)} strategy={verticalListSortingStrategy}>
          <div className="mb-6">
            {items.map((item, idx) => (
              <SortableItem
                key={`item-${idx}`}
                id={`item-${idx}`}
                text={item}
                isCorrect={checked ? correctness[idx] : undefined}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Hint Section */}
      {gameData.hint && (
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => setShowHint(!showHint)}
            className="w-full"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            {showHint ? 'Hide' : 'Show'} Hint
          </Button>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-4 bg-accent/50 rounded-lg"
            >
              <p className="text-sm">{gameData.hint}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Check Button */}
      <Button
        onClick={handleCheck}
        className="w-full"
        disabled={checked && score === items.length}
      >
        {checked ? (score === items.length ? 'Perfect! ✓' : 'Try Again') : 'Check Answer'}
      </Button>
    </div>
  );
};
