import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle, Wand2 } from "lucide-react";
import { GamifiedExercise } from "@/components/student/GamifiedExercise";

type GameType = "mcq" | "fill_blank" | "true_false" | "match_pairs" | "drag_drop";

interface GameSuggestion {
  suggested_game: GameType;
  reason: string;
  confidence: number;
}

export const QuestionToGameConverter = () => {
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [subject, setSubject] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [selectedGameType, setSelectedGameType] = useState<GameType | "">("");
  const [suggestion, setSuggestion] = useState<GameSuggestion | null>(null);
  const [generatedExercise, setGeneratedExercise] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAISuggest = async () => {
    if (!questionText.trim()) {
      toast.error("Please enter a question first!");
      return;
    }

    setLoading(true);
    setSuggestion(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-question-to-game', {
        body: {
          question_text: questionText,
          options: options ? options.split('\n').filter(o => o.trim()) : null,
          question_type: questionType,
          subject,
          chapter_name: chapterName,
          topic_name: topicName,
        }
      });

      if (error) throw error;

      if (data.suggestion) {
        setSuggestion(data.suggestion);
        toast.success(`AI suggests: ${data.suggestion.suggested_game.toUpperCase()}`);
      }
    } catch (error: any) {
      console.error('AI suggestion error:', error);
      toast.error(error.message || "Failed to get AI suggestion");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGame = async () => {
    if (!questionText.trim()) {
      toast.error("Please enter a question!");
      return;
    }

    if (!selectedGameType) {
      toast.error("Please select a game type!");
      return;
    }

    setLoading(true);
    setGeneratedExercise(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-question-to-game', {
        body: {
          question_text: questionText,
          options: options ? options.split('\n').filter(o => o.trim()) : null,
          question_type: questionType,
          subject,
          chapter_name: chapterName,
          topic_name: topicName,
          game_type: selectedGameType,
        }
      });

      if (error) throw error;

      if (data.exercise_data) {
        setGeneratedExercise({
          exercise_type: selectedGameType,
          exercise_data: data.exercise_data,
          correct_answer: data.exercise_data.answer || "true", // For preview
          explanation: `Generated game for: ${questionText.substring(0, 50)}...`,
          xp_reward: 10,
        });
        toast.success("Game generated successfully! Preview below 👇");
      }
    } catch (error: any) {
      console.error('Game generation error:', error);
      toast.error(error.message || "Failed to generate game");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!generatedExercise) {
      toast.error("Please generate a game first!");
      return;
    }

    setSaving(true);

    try {
      // First, insert the question to generated_questions
      const { data: questionData, error: questionError } = await supabase
        .from('generated_questions')
        .insert({
          question_text: questionText,
          question_type: selectedGameType,
          options: options ? options.split('\n').filter(o => o.trim()) : null,
          correct_answer: generatedExercise.correct_answer || "N/A",
          subject,
          chapter_name: chapterName,
          topic_name: topicName,
          is_approved: false,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      toast.success("✅ Game saved successfully! Pending admin approval.");
      
      // Reset form
      setQuestionText("");
      setOptions("");
      setSelectedGameType("");
      setSuggestion(null);
      setGeneratedExercise(null);

    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || "Failed to save game");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Question to Game Converter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question Text *</Label>
            <Textarea
              id="question"
              placeholder="Enter your question here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Physics, Math"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="questionType">Question Type</Label>
              <Input
                id="questionType"
                placeholder="e.g., MCQ, Match Column"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chapter">Chapter Name</Label>
              <Input
                id="chapter"
                placeholder="Optional"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic Name</Label>
              <Input
                id="topic"
                placeholder="Optional"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="options">Options (one per line, optional for MCQ)</Label>
            <Textarea
              id="options"
              placeholder="Option 1&#10;Option 2&#10;Option 3&#10;Option 4"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAISuggest}
              disabled={loading || !questionText.trim()}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get AI Suggestion
                </>
              )}
            </Button>
          </div>

          {suggestion && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-semibold">AI Suggestion:</span>
                    <span className="uppercase font-bold text-primary">{suggestion.suggested_game}</span>
                    <span className="text-sm text-muted-foreground">
                      ({Math.round(suggestion.confidence * 100)}% confident)
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                  <Button
                    size="sm"
                    onClick={() => setSelectedGameType(suggestion.suggested_game)}
                    variant="outline"
                  >
                    Use This Suggestion
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="gameType">Game Type *</Label>
            <Select value={selectedGameType} onValueChange={(value: GameType) => setSelectedGameType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select or use AI suggestion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                <SelectItem value="fill_blank">Fill in the Blanks</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="match_pairs">Match the Pairs</SelectItem>
                <SelectItem value="drag_drop">Drag & Drop Sequence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleGenerateGame}
              disabled={loading || !selectedGameType || !questionText.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Game
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedExercise && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Preview Generated Game
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <GamifiedExercise
                exercise={generatedExercise}
                onComplete={() => toast.info("Preview mode - completion not saved")}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSaveToDatabase}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save to Database
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedExercise(null);
                  setSelectedGameType("");
                }}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
