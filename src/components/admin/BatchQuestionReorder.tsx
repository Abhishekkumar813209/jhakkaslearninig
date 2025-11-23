import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GripVertical, Save } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BatchQuestionReorderProps {
  topicId: string;
  topicName: string;
  batchId: string;
  onReorderComplete: () => void;
}

interface AssignedQuestion {
  assignment_id: string;
  assignment_order: number;
  question_id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  marks: number;
}

const SortableQuestionCard = ({ question, index }: { question: AssignedQuestion; index: number }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: question.assignment_id 
  });

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'short_answer': return 'Short Answer';
      case 'true_false': return 'True/False';
      case 'mcq': return 'MCQ';
      case 'match_pair': return 'Match Pair';
      case 'match_column': return 'Match Column';
      case 'fill_blank': return 'Fill in the Blanks';
      default: return type;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ 
        transform: CSS.Transform.toString(transform), 
        transition,
        zIndex: isDragging ? 999 : 1
      }}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-4 p-4 bg-card border rounded-lg cursor-move hover:border-primary transition-all ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <Badge variant="outline" className="font-mono text-sm px-2 py-1">
          {index + 1}
        </Badge>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium line-clamp-2 text-sm mb-2">{question.question_text}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {getTypeLabel(question.question_type)}
          </Badge>
          <Badge 
            variant={question.difficulty === 'hard' ? 'destructive' : question.difficulty === 'medium' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {question.difficulty}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {question.marks}m
          </Badge>
        </div>
      </div>
    </div>
  );
};

export const BatchQuestionReorder = ({ topicId, topicName, batchId, onReorderComplete }: BatchQuestionReorderProps) => {
  const [questions, setQuestions] = useState<AssignedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchAssignedQuestions();
  }, [topicId]);

  const fetchAssignedQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('batch_question_assignments')
        .select(`
          id,
          assignment_order,
          question_id,
          question_bank!inner (
            question_data,
            question_type,
            difficulty,
            marks
          )
        `)
        .eq('roadmap_topic_id', topicId)
        .eq('is_active', true)
        .order('assignment_order', { ascending: true });

      if (error) throw error;

      const formattedQuestions: AssignedQuestion[] = (data || []).map((item: any) => {
        const qData = item.question_bank.question_data || {};
        
        // Robust question text parser (Bug #4)
        let questionText = 'No question text';
        
        if (qData.text) {
          questionText = qData.text;
        } else if (qData.question) {
          questionText = qData.question;
        } else if (qData.sub_questions && qData.sub_questions.length > 0) {
          // Fill-in-Blanks: show first sub-question
          questionText = qData.sub_questions[0].text || qData.sub_questions[0].question || 'No question text';
        } else if (qData.pairs && qData.pairs.length > 0) {
          // Match Pairs: show first pair
          questionText = `Match: ${qData.pairs[0].left} → ${qData.pairs[0].right}`;
        } else if (qData.items && qData.items.length > 0) {
          // Drag-Drop Sequence: show first item
          questionText = `Sequence: ${qData.items[0]}`;
        } else if (qData.statements && qData.statements.length > 0) {
          // True/False: show first statement
          questionText = qData.statements[0].text || qData.statements[0];
        } else if (qData.options && qData.options.length > 0) {
          // MCQ without explicit question text
          questionText = `Multiple Choice (${qData.options.length} options)`;
        }

        return {
          assignment_id: item.id,
          assignment_order: item.assignment_order,
          question_id: item.question_id,
          question_text: questionText,
          question_type: item.question_bank.question_type,
          difficulty: item.question_bank.difficulty || 'medium',
          marks: item.question_bank.marks || 2
        };
      });

      setQuestions(formattedQuestions);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching assigned questions:', error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.assignment_id === active.id);
        const newIndex = items.findIndex((item) => item.assignment_id === over.id);
        setHasChanges(true);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveOrder = async () => {
    try {
      setSaving(true);
      
      // Update assignment_order for each question
      const updates = questions.map((q, idx) => 
        supabase
          .from('batch_question_assignments')
          .update({ assignment_order: idx })
          .eq('id', q.assignment_id)
      );

      await Promise.all(updates);

      toast.success("Game order updated successfully");
      setHasChanges(false);
      onReorderComplete();
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error("Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading assigned questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No questions assigned to this topic yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Assign questions from the "Centralized" tab first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Reorder Games for: {topicName}</h3>
          <p className="text-sm text-muted-foreground">
            Drag and drop to customize the game sequence for students
          </p>
        </div>
        <Button
          onClick={handleSaveOrder}
          disabled={!hasChanges || saving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Order"}
        </Button>
      </div>

      <div className="text-sm text-muted-foreground mb-2">
        Total Games: <span className="font-semibold">{questions.length}</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={questions.map(q => q.assignment_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {questions.map((question, index) => (
              <SortableQuestionCard
                key={question.assignment_id}
                question={question}
                index={index}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {hasChanges && (
        <div className="flex items-center justify-center p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You have unsaved changes. Click "Save Order" to apply them.
          </p>
        </div>
      )}
    </div>
  );
};
