import { useState, useEffect } from "react";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Upload, Loader2, AlertCircle, CheckCircle2, Trash2, Search, X, Eye, Plus, Save, Library } from "lucide-react";
import { QuestionAnswerInput } from "./QuestionAnswerInput";
import { getDocument } from 'pdfjs-dist';
import mammoth from 'mammoth';
import { cn } from "@/lib/utils";

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
  selectedExamName,
  onQuestionsAdded
}: SmartQuestionExtractorNewProps) => {
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Auto-load draft questions when topic changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
      return;
    }

    if (selectedTopic) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          loadDraftQuestions();
        }
      });
    } else {
      setQuestions([]);
      setSelectedIds(new Set());
    }
  }, [selectedTopic]);

  // Load selections from localStorage
  useEffect(() => {
    if (selectedTopic) {
      const saved = localStorage.getItem(`question-selections-${selectedTopic}`);
      if (saved) {
        try {
          setSelectedIds(new Set(JSON.parse(saved)));
        } catch (e) {
          console.error('Failed to load selections:', e);
        }
      }
    }
  }, [selectedTopic]);

  // Save selections to localStorage
  useEffect(() => {
    if (selectedTopic && selectedIds.size > 0) {
      localStorage.setItem(`question-selections-${selectedTopic}`, JSON.stringify([...selectedIds]));
    }
  }, [selectedIds, selectedTopic]);

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
      console.error('loadDraftQuestions error:', error);
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
    if (!selectedTopic) {
      toast.error('Please select a topic before uploading');
      return;
    }

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

      if (!extractedText || extractedText.trim().length === 0) {
        toast.error('No readable text detected in this document');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        return;
      }

      const aiData = await invokeWithAuth<any, { success: boolean; questions: any[] }>({
        name: 'ai-extract-all-questions',
        body: {
          file_content: extractedText,
          subject: selectedSubject || null,
          chapter: selectedChapter || null,
          topic: selectedTopic || null,
          skip_validation: true
        }
      });

      if (aiData.success && aiData.questions?.length > 0) {
        setQuestions(prev => [...prev, ...aiData.questions.map((q: any) => ({
          ...q,
          id: undefined, // Mark as unsaved
          admin_reviewed: false
        }))]);
        toast.success(`Extracted ${aiData.questions.length} questions from ${file.name}`);
      } else {
        toast.error('No questions found in the document');
      }
    } catch (error: any) {
      console.error('Extraction error:', error);
      toast.error(error?.message || 'Failed to extract questions');
    } finally {
      setExtracting(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const saveDraftQuestions = async () => {
    const unsavedQuestions = questions.filter(q => !q.id);
    
    if (unsavedQuestions.length === 0) {
      toast.error('No new questions to save');
      return;
    }

    if (!selectedTopic) {
      toast.error('Please select a topic');
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
          questions: unsavedQuestions.map(q => ({
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
        await loadDraftQuestions(); // Reload to get IDs
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

  const validateAnswer = (q: ExtractedQuestion): boolean => {
    if (!q.correct_answer) return false;
    
    switch (q.question_type) {
      case 'mcq':
      case 'assertion_reason':
        return q.correct_answer?.index !== undefined && q.correct_answer.index >= 0;
      case 'true_false':
        return q.correct_answer?.value !== undefined;
      case 'fill_blank':
        return q.correct_answer?.text && q.correct_answer.text.trim().length > 0;
      case 'match_column':
        return Array.isArray(q.correct_answer?.pairs) && q.correct_answer.pairs.length > 0;
      case 'short_answer':
        return true; // No strict validation for subjective
      default:
        return false;
    }
  };

  const handleAddToLessonLibrary = async () => {
    const selectedQuestions = questions.filter(q => q.id && selectedIds.has(q.id));
    
    if (selectedQuestions.length === 0) {
      toast.error('Please select questions to add');
      return;
    }

    // Validate all selected questions have answers
    const missingAnswers = selectedQuestions.filter(q => !validateAnswer(q));
    if (missingAnswers.length > 0) {
      toast.error(`${missingAnswers.length} question(s) are missing valid answers`);
      return;
    }

    // Call parent callback
    if (onQuestionsAdded) {
      onQuestionsAdded(selectedQuestions);
      toast.success(`Adding ${selectedQuestions.length} questions to Lesson Library...`);
      setSelectedIds(new Set()); // Clear selections
    } else {
      toast.error('Cannot add to Lesson Library: callback not configured');
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(questionId);
      return newSet;
    });
    toast.success('Question removed');
  };

  const toggleSelection = (id?: string) => {
    if (!id) return;
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const allIds = filteredQuestions.filter(q => q.id).map(q => q.id!);
    setSelectedIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleClearAll = () => {
    setQuestions([]);
    setSelectedIds(new Set());
    if (selectedTopic) {
      localStorage.removeItem(`question-selections-${selectedTopic}`);
    }
    toast.success('All questions cleared');
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = searchTerm === '' || 
      q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.question_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || q.question_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const totalCount = questions.length;
  const selectedCount = selectedIds.size;
  const unsavedCount = questions.filter(q => !q.id).length;
  const reviewedCount = questions.filter(q => q.admin_reviewed && validateAnswer(q)).length;

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
              <div>
                <CardTitle>Question Extractor</CardTitle>
                <CardDescription>
                  Extract questions from PDFs, edit answers, and add to Lesson Library
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{totalCount} Total</Badge>
                {selectedCount > 0 && (
                  <Badge variant="default">{selectedCount} Selected</Badge>
                )}
                {unsavedCount > 0 && (
                  <Badge variant="secondary">{unsavedCount} Unsaved</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
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
                    <Plus className="mr-2 h-4 w-4" />
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

              {unsavedCount > 0 && (
                <Button onClick={saveDraftQuestions} disabled={loading} variant="secondary">
                  <Save className="mr-2 h-4 w-4" />
                  Save {unsavedCount} as Drafts
                </Button>
              )}

              {selectedCount > 0 && (
                <Button 
                  onClick={handleAddToLessonLibrary} 
                  disabled={loading}
                  variant="default"
                >
                  <Library className="mr-2 h-4 w-4" />
                  Add to Lesson Library ({selectedCount})
                </Button>
              )}

              {totalCount > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all questions?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all {totalCount} questions from this view. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAll}>Clear All</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Search & Filter Bar */}
            {totalCount > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="fill_blank">Fill in Blank</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                    <SelectItem value="assertion_reason">Assertion-Reason</SelectItem>
                    <SelectItem value="match_column">Match Column</SelectItem>
                  </SelectContent>
                </Select>

                {filteredQuestions.filter(q => q.id).length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select All ({filteredQuestions.filter(q => q.id).length})
                    </Button>
                    {selectedCount > 0 && (
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        Clear Selection
                      </Button>
                    )}
                  </>
                )}

                <div className="text-sm text-muted-foreground">
                  Found {filteredQuestions.length} questions
                </div>
              </div>
            )}

            {/* Questions Grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">No questions yet</p>
                <p className="text-sm mt-1">Upload a PDF or Word document to extract questions</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredQuestions.map((q, idx) => (
                  <Card 
                    key={q.id || idx}
                    className={cn(
                      "relative cursor-pointer transition-all hover:shadow-md",
                      q.id && selectedIds.has(q.id) && "ring-2 ring-primary"
                    )}
                    onClick={() => q.id && toggleSelection(q.id)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {q.id && (
                            <Checkbox
                              checked={selectedIds.has(q.id)}
                              onCheckedChange={() => toggleSelection(q.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {q.question_type}
                            </Badge>
                            {q.difficulty && (
                              <Badge variant="outline" className="text-xs">
                                {q.difficulty}
                              </Badge>
                            )}
                            {q.marks && (
                              <Badge variant="outline" className="text-xs">
                                {q.marks}m
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            q.id && handleDeleteQuestion(q.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      {/* Question Text */}
                      <p className="text-sm line-clamp-3">{q.question_text}</p>

                      {/* Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-1">
                          {q.options.slice(0, 4).map((opt, i) => (
                            <div key={i} className="text-xs text-muted-foreground">
                              <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {opt.slice(0, 50)}{opt.length > 50 ? '...' : ''}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Answer Input (always show for questions with IDs) */}
                      {q.id && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <QuestionAnswerInput
                            questionType={q.question_type}
                            options={q.options}
                            currentAnswer={q.correct_answer}
                            onChange={(answer) => handleAnswerUpdate(q.id!, answer)}
                          />
                        </div>
                      )}

                      {/* Answer Status */}
                      {q.id && validateAnswer(q) && (
                        <Badge variant="default" className="w-full justify-center">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Answer Saved
                        </Badge>
                      )}

                      {/* View Full Dialog */}
                      <Dialog>
                        <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="h-3 w-3 mr-2" />
                            View Full
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>
                              Question {q.question_number || idx + 1}
                            </DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-[60vh]">
                            <div className="space-y-4 p-4">
                              <div className="flex gap-2">
                                <Badge>{q.question_type}</Badge>
                                {q.difficulty && <Badge variant="outline">{q.difficulty}</Badge>}
                                {q.marks && <Badge variant="outline">{q.marks} marks</Badge>}
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">Question:</h4>
                                <p className="text-sm">{q.question_text}</p>
                              </div>

                              {q.options && (
                                <div>
                                  <h4 className="font-medium mb-2">Options:</h4>
                                  <div className="space-y-2">
                                    {q.options.map((opt, i) => (
                                      <div key={i} className="text-sm">
                                        <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {opt}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {q.correct_answer && (
                                <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
                                  <h4 className="font-medium mb-1 text-green-700 dark:text-green-300">Answer:</h4>
                                  <p className="text-sm text-green-600 dark:text-green-400">
                                    {JSON.stringify(q.correct_answer, null, 2)}
                                  </p>
                                  {q.explanation && (
                                    <>
                                      <h4 className="font-medium mt-2 mb-1 text-green-700 dark:text-green-300">Explanation:</h4>
                                      <p className="text-sm text-green-600 dark:text-green-400">{q.explanation}</p>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
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
