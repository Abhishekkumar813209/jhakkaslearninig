import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle, Wand2, Upload, FileSpreadsheet, Image as ImageIcon, Trash2 } from "lucide-react";
import { GamifiedExercise } from "@/components/student/GamifiedExercise";

type GameType = "mcq" | "fill_blank" | "true_false" | "match_pairs" | "drag_drop";

interface GameSuggestion {
  suggested_game: GameType;
  reason: string;
  confidence: number;
  alternative_options?: GameType[];
  difficulty_estimate?: string;
}

interface BulkQuestion {
  id: string;
  question_text: string;
  options?: string[];
  question_type: string;
  subject?: string;
  chapter_name?: string;
  topic_name?: string;
  suggested_game?: GameType;
  game_data?: any;
  status: 'pending' | 'processing' | 'generated' | 'error';
  error?: string;
}

export const QuestionToGameConverter = () => {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  
  // Single mode states
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

  // Bulk mode states
  const [bulkQuestions, setBulkQuestions] = useState<BulkQuestion[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Advanced features
  const [showConversion, setShowConversion] = useState(false);
  const [conversionTarget, setConversionTarget] = useState<GameType | "">("");

  const handleAISuggest = async () => {
    if (!questionText.trim()) {
      toast.error("Please enter a question first!");
      return;
    }

    setLoading(true);
    setSuggestion(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('ai-question-to-game', {
        body: {
          question_text: questionText,
          options: options ? options.split('\n').filter(o => o.trim()) : null,
          question_type: questionType,
          subject,
          chapter_name: chapterName,
          topic_name: topicName,
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) {
        throw new Error(error.message || 'Failed to get AI suggestion');
      }

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
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('ai-question-to-game', {
        body: {
          question_text: questionText,
          options: options ? options.split('\n').filter(o => o.trim()) : null,
          question_type: questionType,
          subject,
          chapter_name: chapterName,
          topic_name: topicName,
          game_type: selectedGameType,
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate game');
      }

      if (data.exercise_data) {
        setGeneratedExercise({
          exercise_type: selectedGameType,
          exercise_data: data.exercise_data,
          correct_answer: data.exercise_data.answer || "true",
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

  const handleConvertMCQ = async () => {
    if (!conversionTarget || !questionText.trim()) {
      toast.error("Please select a conversion target!");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('ai-question-to-game', {
        body: {
          question_text: questionText,
          options: options ? options.split('\n').filter(o => o.trim()) : null,
          question_type: questionType,
          subject,
          chapter_name: chapterName,
          topic_name: topicName,
          convert_to: conversionTarget,
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) {
        throw new Error(error.message || 'Failed to convert question');
      }

      if (data.exercise_data) {
        setGeneratedExercise({
          exercise_type: conversionTarget,
          exercise_data: data.exercise_data,
          correct_answer: data.exercise_data.answer || "true",
          explanation: `Converted from MCQ to ${conversionTarget}`,
          xp_reward: 10,
        });
        toast.success(`✨ Converted to ${conversionTarget.toUpperCase()}!`);
        setShowConversion(false);
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      toast.error(error.message || "Failed to convert question");
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
      const { error: questionError } = await supabase
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
        });

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

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim());
      const headers = rows[0].split(',').map(h => h.trim());

      const questions: BulkQuestion[] = rows.slice(1).map((row, index) => {
        const values = row.split(',').map(v => v.trim());
        const questionData: any = {};
        headers.forEach((header, i) => {
          questionData[header] = values[i];
        });

        return {
          id: `bulk-${Date.now()}-${index}`,
          question_text: questionData.question || questionData.question_text || '',
          options: questionData.options ? questionData.options.split('|') : undefined,
          question_type: questionData.question_type || questionData.type || 'mcq',
          subject: questionData.subject || '',
          chapter_name: questionData.chapter || questionData.chapter_name || '',
          topic_name: questionData.topic || questionData.topic_name || '',
          status: 'pending'
        };
      });

      setBulkQuestions(questions);
      toast.success(`Uploaded ${questions.length} questions from CSV`);
    };

    reader.readAsText(file);
  };

  const handleBulkGenerate = async () => {
    setBulkProcessing(true);

    for (let i = 0; i < bulkQuestions.length; i++) {
      const question = bulkQuestions[i];
      
      setBulkQuestions(prev => prev.map(q => 
        q.id === question.id ? { ...q, status: 'processing' } : q
      ));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authHeaders = session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {};
        
        const { data: suggestionData, error: suggestionError } = await supabase.functions.invoke('ai-question-to-game', {
          body: {
            question_text: question.question_text,
            options: question.options,
            question_type: question.question_type,
            subject: question.subject,
            chapter_name: question.chapter_name,
            topic_name: question.topic_name,
          },
          headers: authHeaders
        });

        if (suggestionError) throw new Error(suggestionError.message || 'Failed to get suggestion');

        const gameType = suggestionData.suggestion.suggested_game;

        const { data: gameData, error: gameError } = await supabase.functions.invoke('ai-question-to-game', {
          body: {
            question_text: question.question_text,
            options: question.options,
            question_type: question.question_type,
            subject: question.subject,
            chapter_name: question.chapter_name,
            topic_name: question.topic_name,
            game_type: gameType,
          },
          headers: authHeaders
        });

        if (gameError) throw new Error(gameError.message || 'Failed to generate game');

        setBulkQuestions(prev => prev.map(q => 
          q.id === question.id ? {
            ...q,
            status: 'generated',
            suggested_game: gameType,
            game_data: gameData.exercise_data
          } : q
        ));

      } catch (error: any) {
        console.error(`Error processing question ${i}:`, error);
        setBulkQuestions(prev => prev.map(q => 
          q.id === question.id ? {
            ...q,
            status: 'error',
            error: error.message
          } : q
        ));
      }
    }

    setBulkProcessing(false);
    toast.success("Bulk generation complete!");
  };

  const handleBulkSave = async () => {
    setSaving(true);

    try {
      const generatedQuestions = bulkQuestions.filter(q => q.status === 'generated');
      
      for (const question of generatedQuestions) {
        await supabase
          .from('generated_questions')
          .insert({
            question_text: question.question_text,
            question_type: question.suggested_game || 'mcq',
            options: question.options,
            correct_answer: "N/A",
            subject: question.subject,
            chapter_name: question.chapter_name,
            topic_name: question.topic_name,
            is_approved: false,
          });
      }

      toast.success(`✅ Saved ${generatedQuestions.length} games to database!`);
      setBulkQuestions([]);
      setUploadedFile(null);

    } catch (error: any) {
      console.error('Bulk save error:', error);
      toast.error(error.message || "Failed to save bulk games");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "bulk")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Single Question</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
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
                        {suggestion.difficulty_estimate && (
                          <Badge variant="outline">{suggestion.difficulty_estimate}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                      {suggestion.alternative_options && suggestion.alternative_options.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Alternatives:</span>
                          {suggestion.alternative_options.map(alt => (
                            <Badge key={alt} variant="secondary" className="uppercase">{alt}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setSelectedGameType(suggestion.suggested_game)}
                          variant="outline"
                        >
                          Use This Suggestion
                        </Button>
                        {questionType === 'mcq' && (
                          <Button
                            size="sm"
                            onClick={() => setShowConversion(true)}
                            variant="ghost"
                          >
                            <Sparkles className="mr-1 h-3 w-3" />
                            Convert to Other Format
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {showConversion && (
                <Card className="bg-accent/5 border-accent/20">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <span className="font-semibold">Smart Conversion</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Convert your MCQ to other game formats</p>
                    
                    <Select value={conversionTarget} onValueChange={(value: GameType) => setConversionTarget(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select conversion target" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fill_blank">Fill in the Blanks</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleConvertMCQ}
                        disabled={loading || !conversionTarget}
                        size="sm"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Convert Now
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowConversion(false)}
                        variant="ghost"
                        size="sm"
                      >
                        Cancel
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
                    <SelectItem value="match_pairs">Match the Pairs ✨ Auto-expands to 4 pairs</SelectItem>
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
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Upload Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-upload">Upload CSV File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      disabled={loading || bulkProcessing}
                    />
                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    CSV format: question, options (pipe-separated), type, subject, chapter, topic
                  </p>
                </div>
              </div>

              {uploadedFile && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="text-sm font-medium">{uploadedFile.name}</span>
                  <Badge variant="secondary">{bulkQuestions.length} questions</Badge>
                </div>
              )}

              {bulkQuestions.length > 0 && (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {bulkQuestions.map((q) => (
                      <Card key={q.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium line-clamp-2">{q.question_text}</p>
                            <div className="flex gap-2 mt-1">
                              {q.subject && <Badge variant="outline">{q.subject}</Badge>}
                              {q.suggested_game && <Badge>{q.suggested_game}</Badge>}
                              <Badge variant={
                                q.status === 'generated' ? 'default' :
                                q.status === 'processing' ? 'secondary' :
                                q.status === 'error' ? 'destructive' : 'outline'
                              }>
                                {q.status}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBulkQuestions(prev => prev.filter(x => x.id !== q.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleBulkGenerate}
                      disabled={bulkProcessing || bulkQuestions.length === 0}
                      className="flex-1"
                    >
                      {bulkProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing {bulkQuestions.filter(q => q.status === 'processing').length}/{bulkQuestions.length}
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Generate All Games
                        </>
                      )}
                    </Button>

                    {bulkQuestions.some(q => q.status === 'generated') && (
                      <Button
                        onClick={handleBulkSave}
                        disabled={saving}
                        variant="default"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Save All ({bulkQuestions.filter(q => q.status === 'generated').length})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
