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

// Helper: Normalize legacy answer formats into new object shapes
const normalizeCorrectAnswer = (q: ExtractedQuestion): any => {
  const ans = q.correct_answer;
  
  switch (q.question_type) {
    case 'mcq':
    case 'assertion_reason':
      // Handle legacy number, string, or already-normalized object
      if (typeof ans === 'number' && ans >= 0) return { index: ans };
      if (typeof ans === 'string' && q.options) {
        const idx = q.options.findIndex(opt => 
          opt.trim().toLowerCase() === ans.trim().toLowerCase()
        );
        return idx >= 0 ? { index: idx } : ans;
      }
      if (ans?.index !== undefined) return ans; // Already normalized
      return ans;
    
    case 'true_false':
      // Handle legacy boolean or already-normalized object
      if (typeof ans === 'boolean') return { value: ans };
      if (ans?.value !== undefined) return ans; // Already normalized
      return ans;
    
    case 'fill_blank':
      // Handle legacy string or already-normalized object
      if (typeof ans === 'string') return { text: ans };
      if (ans?.text !== undefined) return ans; // Already normalized
      return ans;
    
    case 'match_column':
      console.log('🔍 Normalizing match_column answer:', ans);
      
      // Already in modern format
      if (ans?.pairs && Array.isArray(ans.pairs)) {
        console.log('✅ Already normalized');
        return ans;
      }
      
      // Legacy array format
      if (Array.isArray(ans)) {
        console.log('🔄 Converting array to pairs');
        return { pairs: ans };
      }
      
      // Legacy object map: {"A":"2", "B":"1"} or {"0":1, "1":2}
      if (typeof ans === 'object' && ans !== null) {
        const keys = Object.keys(ans);
        if (keys.length > 0) {
          const pairs = [];
          
          for (const key of keys) {
            let leftIndex: number;
            let rightIndex: number;
            
            // Handle letter keys (A, B, C)
            if (/^[A-Z]$/i.test(key)) {
              leftIndex = key.toUpperCase().charCodeAt(0) - 65;
            } 
            // Handle numeric string keys
            else if (/^\d+$/.test(key)) {
              leftIndex = parseInt(key, 10);
            } else {
              continue;
            }
            
            // Parse right value
            const val = ans[key];
            if (typeof val === 'number') {
              rightIndex = val;
            } else if (typeof val === 'string' && /^\d+$/.test(val as string)) {
              rightIndex = parseInt(val as string, 10);
            } else {
              continue;
            }
            
            // Detect 1-based vs 0-based
            const allValues = Object.values(ans)
              .filter((v): v is number | string => typeof v === 'number' || typeof v === 'string')
              .filter(v => typeof v === 'number' || /^\d+$/.test(v as string))
              .map(v => typeof v === 'number' ? v : parseInt(v as string, 10));
            
            const hasZero = allValues.some(v => v === 0);
            const minValue = Math.min(...allValues);
            
            // Convert 1-based to 0-based
            if (!hasZero && minValue === 1) {
              rightIndex = rightIndex - 1;
            }
            
            pairs.push({ left: leftIndex, right: rightIndex });
          }
          
          if (pairs.length > 0) {
            console.log('✅ Normalized legacy object to pairs:', pairs);
            return { pairs };
          }
        }
      }
      
      console.log('⚠️ Could not normalize, returning as-is');
      return ans;
    
    default:
      return ans;
  }
};

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

  // Edit tracking state
  const [editedQuestions, setEditedQuestions] = useState<Map<string, Partial<ExtractedQuestion>>>(new Map());
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);

  // Track published questions
  const [publishedQuestionIds, setPublishedQuestionIds] = useState<Set<string>>(new Set());

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
        const rawQuestions = data.questions || [];
        
        // Normalize all answers to support legacy formats AND ensure columns exist
        const normalizedQuestions = rawQuestions.map(q => {
          let leftColumn = q.left_column || [];
          let rightColumn = q.right_column || [];
          
          // Fallback: Parse columns from question_text if missing
          if (q.question_type === 'match_column' && (!leftColumn.length || !rightColumn.length)) {
            const parsed = parseColumnsFromText(q.question_text);
            if (parsed) {
              leftColumn = parsed.leftColumn;
              rightColumn = parsed.rightColumn;
              console.log('📝 Parsed columns from text for question:', q.id);
            }
          }
          
          return {
            ...q,
            left_column: leftColumn,
            right_column: rightColumn,
            correct_answer: normalizeCorrectAnswer(q)
          };
        });
        
        setQuestions(normalizedQuestions);
        
        // Helper function to parse columns from text
        function parseColumnsFromText(text: string): { leftColumn: string[], rightColumn: string[] } | null {
          if (!text) return null;
          const col1Match = text.match(/Column\s*[I1A][:：]?\s*(.*?)(?=Column\s*[I2B]|$)/is);
          const col2Match = text.match(/Column\s*[I2B][:：]?\s*(.*?)$/is);
          if (!col1Match || !col2Match) return null;
          
          const parseItems = (t: string): string[] => {
            const items = t.match(/(?:\([A-Z0-9]\)|\([a-z0-9]\)|[A-Z0-9]\)|\d+\.|[A-Z]\.)\s*(.+?)(?=(?:\([A-Z0-9]\)|\([a-z0-9]\)|[A-Z0-9]\)|\d+\.|[A-Z]\.)|\s*$)/gi);
            return items ? items.map(item => item.trim()).filter(Boolean) : [];
          };
          
          const left = parseItems(col1Match[1]);
          const right = parseItems(col2Match[1]);
          return (left.length > 0 && right.length > 0) ? { leftColumn: left, rightColumn: right } : null;
        }
        
        // Load published questions for this topic
        const { data: mappings } = await supabase
          .from('topic_content_mapping')
          .select('content_id')
          .eq('topic_id', selectedTopic)
          .not('content_id', 'is', null);

        const publishedIds = new Set(
          mappings?.map(m => m.content_id).filter(Boolean) || []
        );
        setPublishedQuestionIds(publishedIds);
        
        if (normalizedQuestions.length > 0) {
          const publishedCount = normalizedQuestions.filter(q => q.id && publishedIds.has(q.id)).length;
          toast.success(
            `Loaded ${normalizedQuestions.length} questions from database`,
            publishedCount > 0 ? {
              description: `${publishedCount} already published in this lesson`
            } : undefined
          );
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
    // Track the edit locally instead of saving immediately
    setEditedQuestions(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(questionId) || {};
      newMap.set(questionId, { ...existing, correct_answer: answer, explanation });
      return newMap;
    });

    // Update the local state to show the answer immediately
    setQuestions(prev => prev.map(q =>
      q.id === questionId
        ? { ...q, correct_answer: answer, explanation }
        : q
    ));
  };

  const handleQuestionUpdate = async (questionId: string) => {
    const edits = editedQuestions.get(questionId);
    if (!edits) {
      toast.error('No changes to save');
      return;
    }

    const question = questions.find(q => q.id === questionId);
    if (!question) {
      toast.error('Question not found');
      return;
    }

    setSavingQuestionId(questionId);
    try {
      const data = await invokeWithAuth<any, { success: boolean }>({
        name: 'topic-questions-api',
        body: {
          action: 'update_full_question',
          question_id: questionId,
          question_text: edits.question_text ?? question.question_text,
          question_type: edits.question_type ?? question.question_type,
          options: edits.options ?? question.options,
          marks: edits.marks ?? question.marks,
          difficulty: edits.difficulty ?? question.difficulty,
          correct_answer: edits.correct_answer ?? question.correct_answer,
          explanation: edits.explanation ?? question.explanation,
        }
      });

      if (data.success) {
        // Clear the edit tracking for this question
        setEditedQuestions(prev => {
          const newMap = new Map(prev);
          newMap.delete(questionId);
          return newMap;
        });

        // Mark as reviewed
        setQuestions(prev => prev.map(q =>
          q.id === questionId
            ? { ...q, admin_reviewed: true }
            : q
        ));

        toast.success('Changes saved successfully');
      }
    } catch (error: any) {
      console.error('Failed to save question:', error);
      toast.error(`Failed to save: ${error.message || 'Unknown error'}`);
    } finally {
      setSavingQuestionId(null);
    }
  };

  const validateAnswer = (q: ExtractedQuestion): boolean => {
    const ans = q.correct_answer;
    if (!ans && ans !== 0 && ans !== false) return false;
    
    switch (q.question_type) {
      case 'mcq':
      case 'assertion_reason':
        // Accept both legacy (number) and new (object with index) formats
        return (typeof ans === 'number' && ans >= 0) || 
               (typeof ans?.index === 'number' && ans.index >= 0);
      
      case 'true_false':
        // Accept both legacy (boolean) and new (object with value) formats
        return typeof ans === 'boolean' || typeof ans?.value === 'boolean';
      
      case 'fill_blank':
        // Accept both legacy (string) and new (object with text) formats
        if (typeof ans === 'string') return ans.trim().length > 0;
        return !!ans?.text?.trim();
      
      case 'match_column':
        // Accept both legacy (array) and new (object with pairs) formats
        if (Array.isArray(ans)) return ans.length > 0;
        return Array.isArray(ans?.pairs) && ans.pairs.length > 0;
      
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

    // Check for unsaved edits
    const unsavedCount = editedQuestions.size;
    if (unsavedCount > 0) {
      const unsavedIds = Array.from(editedQuestions.keys());
      const unsavedSelected = unsavedIds.filter(id => selectedIds.has(id));
      if (unsavedSelected.length > 0) {
        toast.error(`You have ${unsavedSelected.length} unsaved question(s) in your selection`, {
          description: 'Click "Save Changes" on each edited question before adding to library'
        });
        return;
      }
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
    
    // Prevent selecting published questions
    if (publishedQuestionIds.has(id)) {
      toast.info('This question is already published in this lesson');
      return;
    }
    
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
    // Only select non-published questions
    const allIds = filteredQuestions
      .filter(q => q.id && !publishedQuestionIds.has(q.id))
      .map(q => q.id!);
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
                              disabled={publishedQuestionIds.has(q.id)}
                              onCheckedChange={() => toggleSelection(q.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs">
                              Q{idx + 1}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {q.question_type}
                            </Badge>
                            {q.id && publishedQuestionIds.has(q.id) && (
                              <Badge className="text-xs bg-green-500 hover:bg-green-600">
                                ✓ Published
                              </Badge>
                            )}
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
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">Question:</div>
                        <div 
                          className="text-sm prose prose-sm max-w-none question-content bg-muted/30 p-3 rounded-md"
                          dangerouslySetInnerHTML={{ __html: renderWithImages(q.question_text) }}
                        />
                      </div>

                      {/* Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">Options:</div>
                          <div className="space-y-1.5">
                            {q.options.map((opt, i) => (
                              <div key={i} className="text-xs flex gap-2 items-start bg-muted/20 p-2 rounded">
                                <span className="font-semibold shrink-0 text-primary">{String.fromCharCode(65 + i)}.</span>
                                <span 
                                  className="flex-1 prose prose-xs max-w-none" 
                                  dangerouslySetInnerHTML={{ 
                                    __html: renderWithImages(opt) 
                                  }} 
                                />
                              </div>
                            ))}
                          </div>
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
                      {q.id && validateAnswer(q) && !editedQuestions.has(q.id) && (
                        <Badge variant="default" className="w-full justify-center">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Answer Saved
                        </Badge>
                      )}

                      {/* Save Changes Button (shown when question has edits) */}
                      {q.id && editedQuestions.has(q.id) && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuestionUpdate(q.id!);
                          }}
                          disabled={savingQuestionId === q.id}
                        >
                          {savingQuestionId === q.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-3 w-3 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      )}
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
