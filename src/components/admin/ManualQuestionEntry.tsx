import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Plus, Sparkles } from 'lucide-react';
import { DynamicQuestionInput } from './DynamicQuestionInput';

type GameType = "mcq" | "fill_blank" | "true_false" | "match_column" | "match_pairs" | "sequence_order" | "typing_race" | "interactive_blanks" | "card_memory";

interface ManualQuestionEntryProps {
  selectedTopic: { id: string; topic_name: string };
  selectedChapter: { id: string; chapter_name: string };
  selectedSubject: string;
  selectedBatch: string;
  selectedDomain: string | null;
  onComplete: () => void;
}

export const ManualQuestionEntry = ({
  selectedTopic,
  selectedChapter,
  selectedSubject,
  selectedBatch,
  selectedDomain,
  onComplete
}: ManualQuestionEntryProps) => {
  const [selectedGameType, setSelectedGameType] = useState<GameType>("mcq");
  const [questionData, setQuestionData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Reset questionData when game type changes - but only if user confirms
  useEffect(() => {
    if (questionData && questionData.questionText?.trim()) {
      // User has entered data - don't auto-reset to prevent data loss
      return;
    }
    
    setQuestionData({
      questionText: '',
      gameData: {},
      explanation: '',
      marks: 1,
      difficulty: 'medium',
      question_type: selectedGameType
    });
  }, [selectedGameType]);

  const gameTypeOptions = [
    { value: "mcq", label: "Multiple Choice (MCQ)", icon: "📝" },
    { value: "true_false", label: "True/False", icon: "✓✗" },
    { value: "fill_blank", label: "Fill in the Blanks (Drag & Drop)", icon: "🔤" },
    { value: "match_column", label: "Match the Column (Line Drawing)", icon: "↔️" },
    { value: "match_pairs", label: "Match Pairs", icon: "🃏" },
    { value: "card_memory", label: "Card Memory Game", icon: "🎴" },
    { value: "sequence_order", label: "Drag & Drop Sequence", icon: "🔢" },
    { value: "typing_race", label: "Typing Race", icon: "⌨️" },
    { value: "interactive_blanks", label: "Interactive Fill Blanks", icon: "✍️" },
  ];

  const handleSave = async () => {
    if (!questionData || !questionData.questionText?.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!questionData.question_type) {
      toast.error("Game type is required");
      return;
    }

    // Validate match_pairs has complete pairs
    if (questionData.question_type === 'match_pairs') {
      const pairs = questionData.gameData?.pairs;
      if (!pairs || pairs.length < 2) {
        toast.error("Add at least 2 pairs for Match Pairs game");
        return;
      }
      
      const hasEmptyPairs = pairs.some((p: any) => !p.left?.trim() || !p.right?.trim());
      if (hasEmptyPairs) {
        toast.error("All pairs must have both left and right items filled");
        return;
      }
    }

    // Validate match_column has complete columns
    if (questionData.question_type === 'match_column') {
      const leftColumn = questionData.gameData?.leftColumn || [];
      const rightColumn = questionData.gameData?.rightColumn || [];
      const pairs = questionData.gameData?.correctPairs || [];

      // Filter to non-empty items
      const filteredLeft = leftColumn.filter((item: string) => item.trim());
      const filteredRight = rightColumn.filter((item: string) => item.trim());

      if (filteredLeft.length === 0 || filteredRight.length === 0) {
        toast.error("Both left and right columns must have at least one filled item");
        return;
      }

      if (filteredLeft.length !== filteredRight.length) {
        toast.error("Left and right columns must have the same number of filled items");
        return;
      }

      if (pairs.length === 0) {
        toast.error("Please define at least one correct pair");
        return;
      }

      // Validate pair indices are in bounds of filtered arrays
      const invalidPair = pairs.find((p: any) => 
        p.left < 0 || p.left >= filteredLeft.length || 
        p.right < 0 || p.right >= filteredRight.length
      );
      if (invalidPair) {
        toast.error("Invalid pair indices detected. Please redefine pairs after editing columns.");
        return;
      }
    }

    setSaving(true);

    try {
      // Format correct_answer based on game type for proper validation
      let correctAnswerFormat: any = {};
      
      const gameType = questionData.question_type || selectedGameType;
      const gameData = questionData.gameData;
      
      switch (gameType) {
        case 'mcq':
          correctAnswerFormat = { index: gameData.correctAnswerIndex };
          break;
        case 'true_false':
          correctAnswerFormat = { value: gameData.correctAnswer };
          break;
        case 'fill_blank':
          // Include sub_questions if provided, otherwise just blanks
          if (gameData.sub_questions?.length >= 1) {
            correctAnswerFormat = { 
              sub_questions: gameData.sub_questions,
              blanks: gameData.blanks,
              numbering_style: gameData.numbering_style 
            };
          } else {
            correctAnswerFormat = { blanks: gameData.blanks };
          }
          break;
        case 'match_column':
          correctAnswerFormat = { pairs: gameData.correctPairs };
          break;
        case 'match_pairs':
          correctAnswerFormat = { pairs: gameData.pairs };
          break;
        case 'sequence_order':
          correctAnswerFormat = { correctSequence: gameData.correctSequence };
          break;
        case 'card_memory':
          correctAnswerFormat = { pairs: gameData.pairs };
          break;
        case 'typing_race':
          correctAnswerFormat = { 
            targetText: gameData.targetText,
            timeLimit: gameData.timeLimit,
            minAccuracy: gameData.minAccuracy || 90
          };
          break;
        case 'interactive_blanks':
          correctAnswerFormat = { blanks: gameData.blanks };
          break;
        default:
          correctAnswerFormat = gameData;
      }

      // Prepare data for match_column
      const leftColumnData = gameType === 'match_column' ? (gameData.leftColumn || []).filter((v: string) => v?.trim()) : null;
      const rightColumnData = gameType === 'match_column' ? (gameData.rightColumn || []).filter((v: string) => v?.trim()) : null;
      
      // Ensure we have valid arrays (not empty) before saving
      const finalLeftColumn = leftColumnData && leftColumnData.length > 0 ? leftColumnData : null;
      const finalRightColumn = rightColumnData && rightColumnData.length > 0 ? rightColumnData : null;

      // === PHASE 2: DUAL-WRITE MODE ===
      // Build unified JSONB structures for new columns
      let questionDataJSON: any = {};
      let answerDataJSON: any = {};

      switch (gameType) {
        case 'mcq':
          questionDataJSON = {
            text: questionData.questionText,
            options: gameData.options || [],
            type: 'mcq'
          };
          answerDataJSON = {
            correctIndex: gameData.correctAnswerIndex || 0,
            explanation: questionData.explanation
          };
          break;

        case 'true_false':
          questionDataJSON = {
            statement: questionData.questionText,
            type: 'true_false'
          };
          answerDataJSON = {
            value: gameData.correctAnswer || false,
            explanation: questionData.explanation
          };
          break;

        case 'fill_blank':
          questionDataJSON = {
            text: questionData.questionText,
            blanks: gameData.blanks || [],
            sub_questions: gameData.sub_questions || null,
            numbering_style: gameData.numbering_style || null,
            type: 'fill_blank'
          };
          answerDataJSON = {
            blanks: gameData.blanks || [],
            sub_questions: gameData.sub_questions || null,
            explanation: questionData.explanation
          };
          break;

        case 'match_column':
          questionDataJSON = {
            leftColumn: finalLeftColumn || [],
            rightColumn: finalRightColumn || [],
            questionText: questionData.questionText,
            type: 'match_column'
          };
          answerDataJSON = {
            correctPairs: gameData.correctPairs || [],
            explanation: questionData.explanation
          };
          break;

        case 'match_pairs':
          questionDataJSON = {
            pairs: gameData.pairs || [],
            type: 'match_pairs'
          };
          answerDataJSON = {
            pairs: gameData.pairs || [],
            explanation: questionData.explanation
          };
          break;

        case 'sequence_order':
          questionDataJSON = {
            text: questionData.questionText,
            items: gameData.items || gameData.options || [],
            type: 'drag_drop_sort'
          };
          answerDataJSON = {
            correctOrder: gameData.correctSequence || [],
            explanation: questionData.explanation
          };
          break;

        case 'card_memory':
          questionDataJSON = {
            pairs: gameData.pairs || [],
            type: 'card_memory'
          };
          answerDataJSON = {
            pairs: gameData.pairs || [],
            explanation: questionData.explanation
          };
          break;

        case 'typing_race':
          questionDataJSON = {
            text: questionData.questionText,
            targetText: gameData.targetText || questionData.questionText,
            timeLimit: gameData.timeLimit || 60,
            type: 'typing_race'
          };
          answerDataJSON = {
            targetText: gameData.targetText || questionData.questionText,
            minAccuracy: gameData.minAccuracy || 90,
            explanation: questionData.explanation
          };
          break;

        case 'interactive_blanks':
          questionDataJSON = {
            text: questionData.questionText,
            blanks: gameData.blanks || [],
            type: 'interactive_blanks'
          };
          answerDataJSON = {
            blanks: gameData.blanks || [],
            explanation: questionData.explanation
          };
          break;

        default:
          questionDataJSON = {
            text: questionData.questionText,
            type: gameType
          };
          answerDataJSON = {
            explanation: questionData.explanation
          };
      }

      console.log('💾 Saving question (DUAL-WRITE MODE):', {
        gameType,
        // Old format
        leftColumn: finalLeftColumn,
        rightColumn: finalRightColumn,
        correctAnswer: correctAnswerFormat,
        // New JSONB format
        question_data: questionDataJSON,
        answer_data: answerDataJSON
      });

      // Step 1: Save to question_bank (DUAL-WRITE: both old and new columns)
      const { data: questionBankData, error: questionBankError } = await supabase
        .from('question_bank')
        .insert({
          // Context fields
          topic_id: selectedTopic.id,
          chapter_id: selectedChapter.id,
          subject: selectedSubject,
          batch_id: selectedBatch,
          exam_domain: selectedDomain,
          question_type: gameType,
          
          // OLD FORMAT (legacy columns) - for backward compatibility
          question_text: questionData.questionText,
          options: gameData.options || null,
          left_column: finalLeftColumn,
          right_column: finalRightColumn,
          correct_answer: correctAnswerFormat,
          sub_questions: gameType === 'fill_blank' && gameData.sub_questions?.length >= 1 
            ? gameData.sub_questions 
            : null,
          explanation: questionData.explanation,
          
          // NEW FORMAT (unified JSONB columns)
          question_data: questionDataJSON,
          answer_data: answerDataJSON,
          
          // Metadata
          marks: questionData.marks || 1,
          difficulty: questionData.difficulty || 'medium',
          is_published: true,
          admin_reviewed: true,
          created_manually: true,
        })
        .select()
        .single();

      if (questionBankError) throw questionBankError;

      toast.success("✅ Question saved to Question Bank and ready for students!");
      
      // Reset form
      setQuestionData(null);
      setSelectedGameType("mcq");
      
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNew = async () => {
    await handleSave();
    // Form already reset in handleSave
  };

  const handleSaveAndExit = async () => {
    await handleSave();
    onComplete();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Manual Question Builder - All Game Types
          </CardTitle>
          <CardDescription>
            Create questions manually for: {selectedSubject} → {selectedChapter.chapter_name} → {selectedTopic.topic_name}
          </CardDescription>
          
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">{selectedDomain || 'Domain'}</Badge>
            <Badge variant="outline">{selectedSubject}</Badge>
            <Badge variant="outline">{selectedChapter.chapter_name}</Badge>
            <Badge variant="secondary">{selectedTopic.topic_name}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Game Type Selector */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Select Game Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gameTypeOptions.map((option) => (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedGameType === option.value
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border'
                  }`}
                  onClick={() => setSelectedGameType(option.value as GameType)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{option.icon}</div>
                    <div className="text-sm font-medium">{option.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Dynamic Question Input */}
          <Card className="border-2 border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Question Details</CardTitle>
            </CardHeader>
            <CardContent>
              <DynamicQuestionInput
                gameType={selectedGameType}
                onChange={setQuestionData}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSaveAndNew}
              disabled={saving || !questionData?.questionText}
              className="flex-1"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Save & Add Another
            </Button>
            <Button
              onClick={handleSaveAndExit}
              disabled={saving || !questionData?.questionText}
              className="flex-1"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save & Exit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
