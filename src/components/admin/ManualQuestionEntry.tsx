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
  selectedBatch: string; // This is the batch ID (UUID)
  selectedDomain: string | null;
  examName?: string; // exam_name from the batch
  onComplete: () => void;
}

export const ManualQuestionEntry = ({
  selectedTopic,
  selectedChapter,
  selectedSubject,
  selectedBatch,
  selectedDomain,
  examName,
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

  // Helper function to validate question data based on game type
  const isQuestionValid = (): boolean => {
    if (!questionData) return false;
    
    const gameType = questionData.question_type || selectedGameType;
    const gameData = questionData.gameData || {};
    
    switch (gameType) {
      case 'true_false':
        return gameData.statements?.length > 0;
        
      case 'fill_blank':
        return gameData.sub_questions?.length > 0 && 
               gameData.sub_questions.some((sq: any) => sq.text?.trim());
        
      case 'mcq':
        return !!questionData.questionText?.trim() && 
               gameData.options?.length >= 2;
               
      case 'match_column':
        return gameData.leftColumn?.length >= 2 && 
               gameData.rightColumn?.length >= 2;
               
      case 'match_pairs':
        return gameData.pairs?.length >= 2;
        
      case 'sequence_order':
        return gameData.items?.length >= 2;
        
      case 'card_memory':
        return gameData.pairs?.length >= 2;
        
      case 'typing_race':
        return !!questionData.questionText?.trim() || !!gameData.targetText?.trim();
        
      default:
        return !!questionData.questionText?.trim();
    }
  };

  const handleSave = async () => {
    if (!isQuestionValid()) {
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
          correctAnswerFormat = { 
            answers: gameData.answers || []
          };
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

      // === STEP 5: DUAL-WRITE MODE (JSONB + Legacy) ===
      // Build unified JSONB structures for new columns
      let questionDataJSON: any = {
        marks: questionData.marks || 1
      };

      // Set text or statements based on type
      if (gameType === 'true_false') {
        questionDataJSON.statements = gameData.statements || [];
        questionDataJSON.numbering_style = gameData.numbering_style || 'i,ii,iii';
      } else if (gameType === 'fill_blank' && gameData.sub_questions?.length >= 1) {
        // Handled separately below in fill_blank case
      } else {
        questionDataJSON.text = questionData.questionText;
      }
      let answerDataJSON: any = {
        explanation: questionData.explanation || ''
      };

      // Legacy fields for backward compatibility
      const legacyFields: any = {
        question_text: questionData.questionText
      };

      switch (gameType) {
        case 'mcq':
          questionDataJSON.options = gameData.options || [];
          answerDataJSON.correctIndex = gameData.correctAnswerIndex || 0;
          
          // Legacy
          legacyFields.options = gameData.options || [];
          legacyFields.correct_answer = gameData.correctAnswerIndex?.toString() || '0';
          break;

        case 'true_false':
          // Store only answers array
          answerDataJSON.answers = gameData.answers || [];
          
          // Legacy - for backward compatibility
          legacyFields.correct_answer = JSON.stringify({ 
            answers: gameData.answers || []
          });
          break;

        case 'fill_blank':
          if (gameData.sub_questions?.length >= 1) {
            questionDataJSON.sub_questions = gameData.sub_questions;
            questionDataJSON.numbering_style = gameData.numbering_style || '1,2,3';
            answerDataJSON.blanks = gameData.blanks || [];
          } else {
            answerDataJSON.blanks = gameData.blanks || [];
          }
          
          // Legacy
          legacyFields.correct_answer = JSON.stringify({ blanks: gameData.blanks || [] });
          break;

        case 'match_column':
          questionDataJSON.leftColumn = finalLeftColumn || [];
          questionDataJSON.rightColumn = finalRightColumn || [];
          answerDataJSON.pairs = gameData.correctPairs || [];
          
          // Legacy
          legacyFields.left_column = finalLeftColumn || [];
          legacyFields.right_column = finalRightColumn || [];
          legacyFields.correct_answer = JSON.stringify(gameData.correctPairs || []);
          break;

        case 'match_pairs':
          answerDataJSON.pairs = gameData.pairs || [];
          
          // Legacy
          legacyFields.correct_answer = JSON.stringify(gameData.pairs || []);
          break;

        case 'sequence_order':
          questionDataJSON.items = gameData.items || gameData.options || [];
          answerDataJSON.correctOrder = gameData.correctSequence || [];
          
          // Legacy
          legacyFields.correct_answer = JSON.stringify({ correctSequence: gameData.correctSequence || [] });
          break;

        case 'card_memory':
          answerDataJSON.pairs = gameData.pairs || [];
          
          // Legacy
          legacyFields.correct_answer = JSON.stringify(gameData.pairs || []);
          break;

        case 'typing_race':
          questionDataJSON.targetText = gameData.targetText || questionData.questionText;
          questionDataJSON.timeLimit = gameData.timeLimit || 60;
          answerDataJSON.targetText = gameData.targetText || questionData.questionText;
          answerDataJSON.minAccuracy = gameData.minAccuracy || 90;
          
          // Legacy
          legacyFields.correct_answer = JSON.stringify({
            targetText: gameData.targetText || questionData.questionText,
            timeLimit: gameData.timeLimit || 60,
            minAccuracy: gameData.minAccuracy || 90
          });
          break;

        case 'interactive_blanks':
          answerDataJSON.blanks = gameData.blanks || [];
          
          // Legacy
          legacyFields.correct_answer = JSON.stringify({ blanks: gameData.blanks || [] });
          break;

        default:
          answerDataJSON.value = gameData;
          legacyFields.correct_answer = JSON.stringify(gameData);
      }


      console.log('💾 Saving question (DUAL-WRITE MODE):', {
        gameType,
        question_data_keys: Object.keys(questionDataJSON),
        answer_data_keys: Object.keys(answerDataJSON),
        legacy_fields_keys: Object.keys(legacyFields),
        question_data_sample: JSON.stringify(questionDataJSON).substring(0, 150),
        answer_data_sample: JSON.stringify(answerDataJSON).substring(0, 150)
      });

      // Save to question_bank (DUAL-WRITE: JSONB + Legacy columns)
      const { data: questionBankData, error: questionBankError } = await supabase
        .from('question_bank')
        .insert([{
          // JSONB columns (NEW)
          question_type: gameType,
          question_data: questionDataJSON,
          answer_data: answerDataJSON,
          
          // Legacy columns (for compatibility)
          ...legacyFields,
          
          // Foreign Keys (CRITICAL)
          topic_id: selectedTopic.id,
          chapter_id: selectedChapter.id,
          subject: selectedSubject,
          batch_id: selectedBatch, // Batch ID (UUID)
          exam_domain: selectedDomain,
          exam_name: examName || selectedDomain || '',
          
          // Metadata
          explanation: questionData.explanation || null,
          marks: questionData.marks || 1,
          difficulty: questionData.difficulty || 'medium',
          is_published: true,
          admin_reviewed: true,
          created_manually: true,
        }])
        .select()
        .single();

      if (questionBankError) throw questionBankError;

      console.log('✅ Question saved with ID:', questionBankData.id, 'BOTH JSONB + legacy data written');
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
              disabled={saving || !isQuestionValid()}
              className="flex-1"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Save & Add Another
            </Button>
            <Button
              onClick={handleSaveAndExit}
              disabled={saving || !isQuestionValid()}
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
