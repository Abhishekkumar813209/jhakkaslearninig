import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle2, Trash2, Search, X, Eye, Plus, Save, Library, Upload, Crop } from "lucide-react";
import { QuestionAnswerInput } from "./QuestionAnswerInput";
import { DocumentUploader } from "./DocumentUploader";
import { UniversalCropModal } from "./UniversalCropModal";
import { cn } from "@/lib/utils";
import { renderWithImages } from "@/lib/mathRendering";

interface ExtractedQuestion {
  id?: string;
  question_number?: string;
  question_type: string;
  question_text: string;
  options?: string[];
  left_column?: string[];
  right_column?: string[];
  marks?: number;
  difficulty?: string;
  correct_answer?: any;
  explanation?: string;
  admin_reviewed?: boolean;
}

interface SmartQuestionExtractorNewProps {
  selectedTopic?: string;
  selectedTopicName?: string;
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
  selectedTopicName,
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
  const navigate = useNavigate();
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropQuestion, setCropQuestion] = useState<ExtractedQuestion | null>(null);
  const [cropPdfFile, setCropPdfFile] = useState<File | null>(null);

  // Auto-load draft questions when topic changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
      return;
    }

    if (selectedTopic) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          loadTopicQuestions();
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

  const loadTopicQuestions = async () => {
    if (!selectedTopic) return;
    
    setLoading(true);
    try {
      const data = await invokeWithAuth<any, { success: boolean; questions: ExtractedQuestion[] }>({
        name: 'topic-questions-api',
        body: { action: 'get_topic_questions', topic_id: selectedTopic }
      });

      if (data.success) {
        const questions = data.questions || [];
        setQuestions(questions);
        
        if (questions.length > 0) {
          toast.success(`Loaded ${questions.length} questions from database`);
        } else {
          toast.info(
            selectedTopicName 
              ? `No questions found for "${selectedTopicName}"` 
              : 'No questions found for this topic',
            {
              description: 'Add questions using the PDF extractor or question builder'
            }
          );
        }
      } else {
        throw new Error('Edge function returned success: false');
      }
    } catch (error: any) {
      console.error('loadTopicQuestions error:', error);
      setQuestions([]); // Reset to empty array on error
      
      if (error.code === 401) {
        toast.error('Session expired. Please log in again.', {
          action: {
            label: 'Log in',
            onClick: () => window.location.href = '/login'
          }
        });
      } else {
        toast.error(`Failed to load questions: ${error.message || 'Unknown error'}`);
      }
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
      const missingNums = missingAnswers.map(q => q.question_number || '?').join(', ');
      toast.error(
        `${missingAnswers.length} question(s) missing answers`,
        { description: `Questions #${missingNums} need answers before adding to library` }
      );
      return;
    }

    // Call parent callback
    if (onQuestionsAdded) {
      onQuestionsAdded(selectedQuestions);
      toast.success(`Added ${selectedQuestions.length} questions to Lesson Library`);
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

  const handleDocumentUpload = (uploadedQuestions: ExtractedQuestion[]) => {
    if (cropQuestion) {
      // User uploaded PDF for cropping - don't add questions, just enable crop
      toast.success(`PDF uploaded! Now crop the correct area for Q${cropQuestion.question_number}`);
      setShowUploadDialog(false);
      setShowCropModal(true);
    } else {
      // Normal document upload - add questions
      setQuestions(prev => [...prev, ...uploadedQuestions]);
      setShowUploadDialog(false);
      toast.success(`Added ${uploadedQuestions.length} new questions`);
    }
  };

  const handleCropComplete = (extractedData: any) => {
    if (!cropQuestion) return;

    // Update the question with extracted data
    setQuestions(prev => prev.map(q => 
      q.id === cropQuestion.id 
        ? {
            ...q,
            question_text: extractedData.question_text || extractedData.raw_text || q.question_text,
            edited: true,
            admin_reviewed: false
          }
        : q
    ));

    toast.success('Question updated from crop!');
    setShowCropModal(false);
    setCropQuestion(null);
  };

  const handleOpenCropModal = (question: ExtractedQuestion) => {
    setCropQuestion(question);
    setShowCropModal(true);
  };

  const totalCount = questions.length;
  const selectedCount = selectedIds.size;
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
                <CardTitle>📚 Question Bank Fetcher</CardTitle>
                <CardDescription>
                  Fetch questions from database, edit answers, and add to Lesson Library
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {cropPdfFile ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    PDF Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    No PDF
                  </Badge>
                )}
                <Badge variant="outline">{totalCount} Total</Badge>
                {selectedCount > 0 && (
                  <Badge variant="default">{selectedCount} Selected</Badge>
                )}
                {reviewedCount > 0 && (
                  <Badge variant="secondary">{reviewedCount} Reviewed</Badge>
                )}
                <Button 
                  onClick={() => setShowUploadDialog(true)}
                  variant="default"
                  size="sm"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload PDF/Word
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
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
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium mb-2">
                  {selectedTopicName 
                    ? `No questions found for "${selectedTopicName}"` 
                    : 'No questions found for this topic'}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Upload a document or use the Question Builder to add questions
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => setShowUploadDialog(true)}
                    size="lg"
                    variant="default"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Upload PDF/Word
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => toast.info("Navigate to PDF Question Extractor tab for manual crop mode")}
                  >
                    <Crop className="mr-2 h-5 w-5" />
                    Manual Crop Mode
                  </Button>
                </div>
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (cropPdfFile) {
                                // PDF available - open crop modal
                                handleOpenCropModal(q);
                              } else {
                                // No PDF - prompt upload
                                setCropQuestion(q);
                                setShowUploadDialog(true);
                                toast.info("Please upload the PDF containing this question");
                              }
                            }}
                            title={cropPdfFile ? "Fix via Crop" : "Upload PDF to Crop"}
                          >
                            <Crop className="h-3 w-3" />
                            {!cropPdfFile && <Upload className="h-3 w-3 ml-1" />}
                          </Button>
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
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      {/* Question Text */}
                      <div 
                        className="text-sm line-clamp-3 prose prose-sm max-w-none question-content"
                        dangerouslySetInnerHTML={{ __html: renderWithImages(q.question_text) }}
                      />

                      {/* Options */}
                        {q.options && q.options.length > 0 && (
                          <div className="space-y-1">
                            {q.options.slice(0, 4).map((opt, i) => (
                              <div key={i} className="text-xs text-muted-foreground flex gap-1">
                                <span className="font-medium shrink-0">{String.fromCharCode(65 + i)}.</span>
                                <span 
                                  className="line-clamp-1 flex-1" 
                                  dangerouslySetInnerHTML={{ 
                                    __html: renderWithImages(opt.slice(0, 50) + (opt.length > 50 ? '...' : '')) 
                                  }} 
                                />
                              </div>
                            ))}
                          </div>
                        )}

                       {/* Answer Input (always show for questions with IDs) */}
                      {q.id && (() => {
                        // Parse matching columns if missing
                        if (q.question_type === 'match_column' && (!q.left_column || !q.right_column)) {
                          const parseMatchingQuestion = (text: string) => {
                            const columnIMatch = text.match(/Column I[:\s]*\n?([\s\S]*?)(?=Column II|$)/i);
                            const columnIIMatch = text.match(/Column II[:\s]*\n?([\s\S]*?)$/i);
                            
                            const parseColumn = (colText: string) => {
                              const items = [];
                              const lines = colText.split('\n').filter(l => l.trim());
                              for (const line of lines) {
                                const match = line.match(/^\s*[A-Za-z0-9][\.\)]\s*(.+)/);
                                if (match) items.push(match[1].trim());
                              }
                              return items;
                            };
                            
                            return {
                              leftColumn: columnIMatch ? parseColumn(columnIMatch[1]) : [],
                              rightColumn: columnIIMatch ? parseColumn(columnIIMatch[1]) : []
                            };
                          };
                          
                          const { leftColumn, rightColumn } = parseMatchingQuestion(q.question_text);
                          q.left_column = leftColumn;
                          q.right_column = rightColumn;
                        }
                        
                        return (
                          <div onClick={(e) => e.stopPropagation()}>
                            <QuestionAnswerInput
                              questionType={q.question_type}
                              options={q.options}
                              leftColumn={q.left_column}
                              rightColumn={q.right_column}
                              currentAnswer={q.correct_answer}
                              onChange={(answer) => handleAnswerUpdate(q.id!, answer)}
                            />
                          </div>
                        );
                      })()}

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
                                <div 
                                  className="text-sm prose prose-sm max-w-none question-content"
                                  dangerouslySetInnerHTML={{ __html: renderWithImages(q.question_text) }}
                                />
                              </div>

                              {q.options && (
                                <div>
                                  <h4 className="font-medium mb-2">Options:</h4>
                                  <div className="space-y-2">
                                    {q.options.map((opt, i) => (
                                      <div key={i} className="text-sm flex gap-2">
                                        <span className="font-medium shrink-0">{String.fromCharCode(65 + i)}.</span>
                                        <span 
                                          className="flex-1 prose prose-sm max-w-none question-content"
                                          dangerouslySetInnerHTML={{ __html: renderWithImages(opt) }} 
                                        />
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
                                      <div 
                                        className="text-sm text-green-600 dark:text-green-400 prose prose-sm max-w-none question-content"
                                        dangerouslySetInnerHTML={{ __html: renderWithImages(q.explanation || '') }}
                                      />
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

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Extract questions from PDF, Word, or image files using AI + OCR
            </DialogDescription>
          </DialogHeader>
          
          <DocumentUploader
            onQuestionsExtracted={handleDocumentUpload}
            onPdfUploaded={(file) => setCropPdfFile(file)}
            onClose={() => setShowUploadDialog(false)}
            topicContext={selectedTopic ? {
              topicId: selectedTopic,
              topicName: selectedTopicName || '',
              chapterId: selectedChapter || '',
              subjectId: selectedSubject || ''
            } : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Universal Crop Modal */}
      <UniversalCropModal
        open={showCropModal}
        onOpenChange={setShowCropModal}
        onCropComplete={handleCropComplete}
        currentQuestion={cropQuestion || undefined}
        contextLabel={cropQuestion?.question_number || `Question ${questions.findIndex(q => q.id === cropQuestion?.id) + 1}`}
        pdfFile={cropPdfFile}
      />
    </div>
  );
};
