import { useState, useEffect } from "react";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Upload, Loader2, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { QuestionAnswerInput } from "./QuestionAnswerInput";
import { getDocument } from 'pdfjs-dist';
import mammoth from 'mammoth';

interface ExtractedQuestion {
  id?: string;
  question_number?: string;
  question_type: string;
  question_text: string;
  options?: string[];
  marks?: number;
  difficulty?: string;
  correct_answer?: any;
  explanation?: string;
  admin_reviewed?: boolean;
}

interface SmartQuestionExtractorNewProps {
  selectedTopic?: string;
  selectedChapter?: string;
  selectedSubject?: string;
  selectedBatch?: string;
  selectedRoadmap?: string;
  selectedExamDomain?: string;
  selectedExamName?: string;
  onQuestionsAdded?: (questions: ExtractedQuestion[]) => void;
}

export const SmartQuestionExtractorNew = ({
  selectedTopic,
  selectedChapter,
  selectedSubject,
  selectedBatch,
  selectedRoadmap,
  selectedExamDomain,
  selectedExamName
}: SmartQuestionExtractorNewProps) => {
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Auto-load draft questions when topic changes
  useEffect(() => {
    if (selectedTopic) {
      loadDraftQuestions();
    } else {
      setQuestions([]);
    }
  }, [selectedTopic]);

  const loadDraftQuestions = async () => {
    if (!selectedTopic) return;
    
    setLoading(true);
    try {
      const data = await invokeWithAuth<any, { success: boolean; questions: ExtractedQuestion[] }>({
        name: 'topic-questions-api',
        body: { action: 'get_draft_questions', topic_id: selectedTopic }
      });

      if (data.success && data.questions?.length > 0) {
        setQuestions(data.questions);
        toast.success(`Loaded ${data.questions.length} draft questions`);
      }
    } catch (error: any) {
      if (error.code !== 401) {
        toast.error('Failed to load questions');
      }
    } finally {
      setLoading(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    try {
      let extractedText = '';
      if (file.name.endsWith('.pdf')) {
        extractedText = await extractTextFromPDF(file);
      } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        extractedText = await extractTextFromWord(file);
      } else {
        toast.error('Only PDF and Word files are supported');
        return;
      }

      // Call AI to extract questions
      const aiData = await invokeWithAuth<any, { success: boolean; questions: any[] }>({
        name: 'ai-extract-all-questions',
        body: { text: extractedText }
      });

      if (aiData.success && aiData.questions?.length > 0) {
        // Add to existing questions (don't replace)
        setQuestions(prev => [...prev, ...aiData.questions.map((q: any) => ({
          ...q,
          id: crypto.randomUUID(),
          admin_reviewed: false
        }))]);
        toast.success(`Extracted ${aiData.questions.length} questions from ${file.name}`);
      } else {
        toast.error('No questions found in the document');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Failed to extract questions');
    } finally {
      setExtracting(false);
    }
  };

  const saveDraftQuestions = async () => {
    if (!selectedTopic || questions.length === 0) {
      toast.error('No questions to save');
      return;
    }

    setLoading(true);
    try {
      const data = await invokeWithAuth<any, { success: boolean; saved_count: number }>({
        name: 'topic-questions-api',
        body: {
          action: 'save_draft_questions',
          batch_id: selectedBatch,
          roadmap_id: selectedRoadmap,
          chapter_id: selectedChapter,
          topic_id: selectedTopic,
          exam_domain: selectedExamDomain,
          exam_name: selectedExamName,
          subject: selectedSubject,
          chapter_name: null,
          topic_name: selectedTopic,
          questions: questions.map(q => ({
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            marks: q.marks,
            difficulty: q.difficulty
          }))
        }
      });

      if (data.success) {
        toast.success(`Saved ${data.saved_count} questions as drafts`);
        loadDraftQuestions(); // Reload to get IDs
      }
    } catch (error) {
      toast.error('Failed to save questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerUpdate = async (questionId: string, answer: any, explanation?: string) => {
    setLoading(true);
    try {
      const data = await invokeWithAuth<any, { success: boolean }>({
        name: 'topic-questions-api',
        body: {
          action: 'update_question_answer',
          question_id: questionId,
          correct_answer: answer,
          explanation
        }
      });

      if (data.success) {
        setQuestions(prev => prev.map(q =>
          q.id === questionId
            ? { ...q, correct_answer: answer, explanation, admin_reviewed: true }
            : q
        ));
        toast.success('Answer saved');
      }
    } catch (error) {
      toast.error('Failed to save answer');
    } finally {
      setLoading(false);
    }
  };

  const finalizeQuestions = async () => {
    const reviewedIds = questions
      .filter(q => q.admin_reviewed && q.correct_answer !== null && q.id)
      .map(q => q.id!);

    if (reviewedIds.length === 0) {
      toast.error('No reviewed questions to approve');
      return;
    }

    setLoading(true);
    try {
      const data = await invokeWithAuth<any, { success: boolean; linked_count: number }>({
        name: 'topic-questions-api',
        body: {
          action: 'finalize_and_link',
          question_ids: reviewedIds,
          topic_id: selectedTopic
        }
      });

      if (data.success) {
        toast.success(`${data.linked_count} questions approved & linked to students!`);
        loadDraftQuestions();
      }
    } catch (error) {
      toast.error('Failed to finalize questions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
    toast.success('Question removed from list');
  };

  const totalCount = questions.length;
  const reviewedCount = questions.filter(q => q.admin_reviewed).length;
  const savedCount = questions.filter(q => q.id && !q.id.startsWith('temp-')).length;

  return (
    <div className="space-y-4">
      {!selectedTopic && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Select a topic from the Lesson Builder to extract and manage questions
          </AlertDescription>
        </Alert>
      )}

      {selectedTopic && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Questions for Selected Topic</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{totalCount} Total</Badge>
                <Badge variant="secondary">{savedCount} Saved</Badge>
                <Badge variant="default">{reviewedCount} Reviewed</Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Upload Section */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={extracting}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                {extracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload PDF/Word
                  </>
                )}
              </Button>
              
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />

              {questions.length > 0 && !questions.every(q => q.id) && (
                <Button onClick={saveDraftQuestions} disabled={loading}>
                  Save {questions.filter(q => !q.id).length} as Drafts
                </Button>
              )}

              {reviewedCount > 0 && (
                <Button onClick={finalizeQuestions} variant="default" disabled={loading}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve & Link {reviewedCount} Questions
                </Button>
              )}
            </div>

            {/* Questions List */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>No questions yet. Upload a PDF or Word document to extract questions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <Card key={q.id || idx} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex gap-2">
                        <Badge>{q.question_type}</Badge>
                        {q.difficulty && <Badge variant="outline">{q.difficulty}</Badge>}
                        {q.admin_reviewed && (
                          <Badge variant="default">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Reviewed
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => q.id && handleDeleteQuestion(q.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="text-sm mb-3">{q.question_text}</p>

                    {q.options && (
                      <div className="mb-3 space-y-1">
                        {q.options.map((opt, i) => (
                          <div key={i} className="text-sm text-muted-foreground">
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.id && !q.admin_reviewed && (
                      <QuestionAnswerInput
                        questionType={q.question_type}
                        options={q.options}
                        currentAnswer={q.correct_answer}
                        onChange={(answer) => handleAnswerUpdate(q.id!, answer)}
                      />
                    )}

                    {q.admin_reviewed && q.correct_answer !== null && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          ✓ Answer: {JSON.stringify(q.correct_answer)}
                        </p>
                        {q.explanation && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};