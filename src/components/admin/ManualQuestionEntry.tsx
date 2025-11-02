import { useState } from 'react';
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

    setSaving(true);

    try {
      // Step 1: Save to question_bank
      const { data: questionBankData, error: questionBankError } = await supabase
        .from('question_bank')
        .insert({
          topic_id: selectedTopic.id,
          question_type: questionData.question_type || selectedGameType,
          question_text: questionData.questionText,
          question_data: questionData.gameData,
          correct_answer: questionData.gameData,
          explanation: questionData.explanation,
          marks: questionData.marks || 1,
          difficulty: questionData.difficulty || 'medium',
          is_approved: true, // Manual entries are pre-approved
          created_manually: true,
        })
        .select()
        .single();

      if (questionBankError) throw questionBankError;

      // Step 2: Sync to gamified_exercises for immediate student visibility
      // Note: gamified_exercises table has different structure, only save to question_bank for now
      // Students will see questions through question_bank table

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
