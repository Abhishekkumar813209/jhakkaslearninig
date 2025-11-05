import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, CheckCircle, AlertCircle, Loader2, Search, X, Crop, Upload, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { renderMath } from '@/lib/mathRendering';
import { RichQuestionEditor } from './RichQuestionEditor';
import { PDFQuestionExtractor } from './PDFQuestionExtractor';
import { getNumberingLabel } from '@/lib/questionParsing';
import { Textarea } from '@/components/ui/textarea';

// Helper to render math while preserving images and breaks
const renderWithImages = (html: string): string => {
  const tokens: Record<string, string> = {};
  let i = 0;
  
  // Tokenize <img> and <br> tags to preserve them
  // Use § separator instead of _ to avoid conflicts with subscript rendering
  const withTokens = html
    .replace(/<img[^>]*>/gi, (img) => { 
      const k = `IMG§${i++}§`; 
      tokens[k] = img; 
      return k; 
    })
    .replace(/<br\s*\/?>/gi, (br) => { 
      const k = `BR§${i++}§`; 
      tokens[k] = '<br />'; 
      return k; 
    });
  
  // Strip other HTML tags but keep text content
  const textOnly = withTokens.replace(/<[^>]*>/g, '');
  
  // Apply math rendering
  let out = renderMath(textOnly);
  
  // Restore image and break tokens (escape special regex characters)
  for (const [k, v] of Object.entries(tokens)) {
    const escapedKey = k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    out = out.replace(new RegExp(escapedKey, 'g'), v);
  }
  
  return out;
};

interface TrueFalseStatement {
  text: string;
  answer: boolean;
}

interface FillBlankSubQuestion {
  text: string;
  correctAnswer: string;
  distractors?: string[];
}

interface ExtractedQuestion {
  id: string;
  question_number: string;
  question_type: 'mcq' | 'match_column' | 'assertion_reason' | 'fill_blank' | 'true_false' | 'short_answer';
  question_text: string;
  options?: string[];
  left_column?: string[];
  right_column?: string[];
  assertion?: string;
  reason?: string;
  blanks_count?: number;
  marks?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  auto_corrected?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  images?: string[];
  ocr_text?: string[];
  edited?: boolean;
  correct_answer?: any;
  explanation?: string;
  ocr_status?: {
    method: 'pix2text' | 'tesseract' | 'failed' | 'error';
    confidence: number;
    requires_manual_review: boolean;
    error?: string;
  };
  // Sub-question fields
  statements?: TrueFalseStatement[];
  sub_questions?: FillBlankSubQuestion[];
  numberingStyle?: '1,2,3' | 'a,b,c' | 'i,ii,iii';
}

interface BulkQuestionEditorProps {
  questions: ExtractedQuestion[];
  onUpdate: (questions: ExtractedQuestion[]) => void;
  pdfFile?: File | null;
  pdfUrl?: string | null;
}

export const BulkQuestionEditor = ({ questions, onUpdate, pdfFile, pdfUrl }: BulkQuestionEditorProps) => {
  const [editableQuestions, setEditableQuestions] = useState(questions);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [autoSaving, setAutoSaving] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedQuestionForCrop, setSelectedQuestionForCrop] = useState<ExtractedQuestion | null>(null);
  const [localPdfFile, setLocalPdfFile] = useState<File | null>(pdfFile || null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Sync with parent questions and normalize question types
  useEffect(() => {
    const normalized = questions.map(q => {
      const baseQuestion = {
        ...q,
        question_type: (q.question_type?.toLowerCase() || 'mcq') as any
      };
      
      // Auto-initialize options for MCQ/assertion_reason if missing
      if ((baseQuestion.question_type === 'mcq' || baseQuestion.question_type === 'assertion_reason') 
          && (!baseQuestion.options || baseQuestion.options.length === 0)) {
        baseQuestion.options = ['', '', '', ''];
      }
      
      // Auto-initialize columns for match_column if missing
      if (baseQuestion.question_type === 'match_column') {
        if (!baseQuestion.left_column || baseQuestion.left_column.length === 0) {
          baseQuestion.left_column = ['', '', '', ''];
        }
        if (!baseQuestion.right_column || baseQuestion.right_column.length === 0) {
          baseQuestion.right_column = ['', '', '', ''];
        }
      }
      
      return baseQuestion;
    });
    setEditableQuestions(normalized);
  }, [questions]);

  // Auto-save with debounce
  useEffect(() => {
    if (JSON.stringify(editableQuestions) === JSON.stringify(questions)) return;
    
    setAutoSaving(true);
    const timer = setTimeout(() => {
      onUpdate(editableQuestions);
      setAutoSaving(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [editableQuestions]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autoSaving || JSON.stringify(editableQuestions) !== JSON.stringify(questions)) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autoSaving, editableQuestions, questions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ctrl+F: Focus search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[placeholder="Find..."]')?.focus();
      }
      
      // Ctrl+S: Manual save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onUpdate(editableQuestions);
        toast.success('✅ Manually saved!');
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [editableQuestions, onUpdate]);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setLocalPdfFile(file);
      toast.success('PDF uploaded! Crop feature now available.');
    } else if (file) {
      toast.error('Please upload a PDF file');
    }
  };

  const handleFindReplace = () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }
    
    let changedCount = 0;
    const regex = new RegExp(searchTerm, 'gi');
    
    const updated = editableQuestions.map(q => {
      let modified = false;
      const newQuestion = { ...q };
      
      // Replace in question text
      if (q.question_text.includes(searchTerm)) {
        newQuestion.question_text = q.question_text.replace(regex, replaceTerm);
        modified = true;
      }
      
      // Replace in options
      if (q.options && q.options.some(opt => opt.includes(searchTerm))) {
        newQuestion.options = q.options.map(opt => opt.replace(regex, replaceTerm));
        modified = true;
      }
      
      // Replace in columns
      if (q.left_column && q.left_column.some(item => item.includes(searchTerm))) {
        newQuestion.left_column = q.left_column.map(item => item.replace(regex, replaceTerm));
        modified = true;
      }
      
      if (q.right_column && q.right_column.some(item => item.includes(searchTerm))) {
        newQuestion.right_column = q.right_column.map(item => item.replace(regex, replaceTerm));
        modified = true;
      }
      
      // Replace in assertion/reason
      if (q.assertion && q.assertion.includes(searchTerm)) {
        newQuestion.assertion = q.assertion.replace(regex, replaceTerm);
        modified = true;
      }
      
      if (q.reason && q.reason.includes(searchTerm)) {
        newQuestion.reason = q.reason.replace(regex, replaceTerm);
        modified = true;
      }
      
      if (modified) {
        newQuestion.edited = true;
        changedCount++;
      }
      
      return newQuestion;
    });
    
    setEditableQuestions(updated);
    toast.success(`Replaced "${searchTerm}" in ${changedCount} question${changedCount !== 1 ? 's' : ''}`);
  };

  const handleFixWithCrop = (question: ExtractedQuestion) => {
    if (!localPdfFile) {
      // Trigger PDF upload if no file available
      setSelectedQuestionForCrop(question);
      pdfInputRef.current?.click();
      return;
    }
    setSelectedQuestionForCrop(question);
    setCropModalOpen(true);
  };

  const handleCropExtractComplete = (questionText: string, options?: string[], imageData?: string) => {
    if (!selectedQuestionForCrop) return;

    const updatedQuestion = {
      ...selectedQuestionForCrop,
      question_text: questionText,
      options: options || selectedQuestionForCrop.options,
      edited: true,
      ocr_status: {
        method: 'tesseract' as const,
        confidence: 0.9,
        requires_manual_review: false
      }
    };

    const questionIndex = editableQuestions.findIndex(q => q.id === selectedQuestionForCrop.id);
    if (questionIndex !== -1) {
      const newQuestions = [...editableQuestions];
      newQuestions[questionIndex] = updatedQuestion;
      setEditableQuestions(newQuestions);
      toast.success('Question updated from cropped area!');
    }

    setCropModalOpen(false);
    setSelectedQuestionForCrop(null);
  };

  const completedCount = editableQuestions.filter(q => q.edited).length;
  const needsReviewCount = editableQuestions.filter(q => !q.edited || q.ocr_status?.requires_manual_review).length;

  return (
    <>
      {/* PDF Crop Modal */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Fix Question via Crop</DialogTitle>
            {selectedQuestionForCrop && (
              <p className="text-sm text-muted-foreground">
                Editing Q{selectedQuestionForCrop.question_number} - Crop the correct area from PDF
              </p>
            )}
          </DialogHeader>
          {localPdfFile && (
            <PDFQuestionExtractor
              onQuestionExtracted={handleCropExtractComplete}
              onClose={() => setCropModalOpen(false)}
              editMode={{
                questionId: selectedQuestionForCrop?.id || '',
                currentQuestion: selectedQuestionForCrop!,
                pdfFile: localPdfFile
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    <div className="space-y-4 h-full flex flex-col">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 bg-background z-10 border-b p-4 space-y-3">
        {/* Hidden PDF Upload Input */}
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handlePdfUpload}
        />
        
        {/* Find & Replace */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Find..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              onKeyDown={(e) => e.key === 'Enter' && handleFindReplace()}
            />
            {searchTerm && (
              <X
                className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => setSearchTerm('')}
              />
            )}
          </div>
          <Input
            placeholder="Replace with..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleFindReplace()}
          />
          <Button onClick={handleFindReplace} disabled={!searchTerm.trim()}>
            Replace All
          </Button>
        </div>
        
        {/* Stats */}
        <div className="flex gap-6 text-sm items-center flex-wrap">
          <span className="flex items-center gap-1.5">
            📊 <span className="font-medium">{editableQuestions.length}</span> total
          </span>
          <span className="flex items-center gap-1.5 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">{completedCount}</span> complete
          </span>
          <span className="flex items-center gap-1.5 text-yellow-600">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">{needsReviewCount}</span> needs review
          </span>
          
          {/* PDF Status and Upload */}
          {!localPdfFile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => pdfInputRef.current?.click()}
              className="ml-auto"
            >
              <Upload className="h-3 w-3 mr-1.5" />
              Upload PDF for Crop
            </Button>
          )}
          
          {localPdfFile && (
            <Badge variant="secondary" className="ml-auto">
              📄 PDF Ready for Crop
            </Badge>
          )}
          {autoSaving && (
            <span className="flex items-center gap-1.5 text-muted-foreground ml-auto">
              <Loader2 className="h-3 w-3 animate-spin" />
              Auto-saving...
            </span>
          )}
        </div>
        
        {/* Keyboard hints */}
        <div className="text-xs text-muted-foreground">
          💡 Shortcuts: <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+F</kbd> to search • <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+S</kbd> to save
        </div>
      </div>
      
      {/* Questions List */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 pb-4">
          {editableQuestions.map((q, idx) => (
            <InlineQuestionCard
              key={q.id}
              question={q}
              onUpdate={(updated) => {
                const newQuestions = [...editableQuestions];
                newQuestions[idx] = updated;
                setEditableQuestions(newQuestions);
              }}
              hasPdf={!!localPdfFile}
              onFixWithCrop={() => handleFixWithCrop(q)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
    </>
  );
};

// Inline Question Card Component
interface InlineQuestionCardProps {
  question: ExtractedQuestion;
  onUpdate: (question: ExtractedQuestion) => void;
  hasPdf?: boolean;
  onFixWithCrop?: () => void;
}

const InlineQuestionCard = ({ question, onUpdate, hasPdf, onFixWithCrop }: InlineQuestionCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleChange = (field: string, value: any) => {
    const updatedQuestion = { ...question, [field]: value, edited: true };
    
    // Transform data structure for database on save
    if (field === 'sub_questions' && question.question_type === 'fill_blank') {
      updatedQuestion.correct_answer = {
        blanks: (value as FillBlankSubQuestion[]).map(sq => ({
          correctAnswer: sq.correctAnswer,
          distractors: sq.distractors || []
        })),
        sub_questions: value,
        numbering_style: question.numberingStyle || '1,2,3'
      };
    }
    
    if (field === 'statements' && question.question_type === 'true_false') {
      updatedQuestion.correct_answer = {
        statements: value,
        numbering_style: question.numberingStyle || 'i,ii,iii'
      };
    }
    
    // Also update correct_answer when numbering style changes
    if (field === 'numberingStyle') {
      if (question.question_type === 'fill_blank' && question.sub_questions) {
        updatedQuestion.correct_answer = {
          blanks: question.sub_questions.map(sq => ({
            correctAnswer: sq.correctAnswer,
            distractors: sq.distractors || []
          })),
          sub_questions: question.sub_questions,
          numbering_style: value
        };
      }
      
      if (question.question_type === 'true_false' && question.statements) {
        updatedQuestion.correct_answer = {
          statements: question.statements,
          numbering_style: value
        };
      }
    }
    
    onUpdate(updatedQuestion);
  };
  
  const getStatusIcon = () => {
    if (question.edited) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (question.ocr_status?.requires_manual_review || question.confidence === 'low') {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  };
  
  const getBorderColor = () => {
    if (question.edited) return 'border-green-500/30';
    if (question.ocr_status?.requires_manual_review || question.confidence === 'low') return 'border-yellow-500/30';
    return 'border-border';
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("border rounded-lg transition-colors", getBorderColor())}>
        {/* Header */}
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50 rounded-t-lg transition-colors">
          <div className="flex items-center gap-2 flex-1">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">Q{question.question_number}</span>
            <Select
              value={question.question_type}
              onValueChange={(value) => {
                const updates: Partial<ExtractedQuestion> = {
                  question_type: value as any,
                  edited: true
                };
                
                // Auto-initialize options array for MCQ/Assertion Reason
                if ((value === 'mcq' || value === 'assertion_reason') && !question.options) {
                  updates.options = ['', '', '', ''];
                }
                
                // Auto-initialize columns for Match Column with 2 items minimum
                if (value === 'match_column' && (!question.left_column || !question.right_column)) {
                  updates.left_column = ['', ''];
                  updates.right_column = ['', ''];
                }
                
                // Auto-initialize fill_blank sub-questions
                if (value === 'fill_blank' && !question.sub_questions) {
                  updates.sub_questions = [{ text: '', correctAnswer: '', distractors: [] }];
                  updates.numberingStyle = '1,2,3';
                }
                
                // Auto-initialize true_false statements
                if (value === 'true_false' && !question.statements) {
                  updates.statements = [{ text: '', answer: true }];
                  updates.numberingStyle = 'i,ii,iii';
                }
                
                const updatedQuestion = { ...question, ...updates };
                onUpdate(updatedQuestion);
                
                // Immediate save on type change
                setTimeout(() => {
                  const event = new Event('forceSave');
                  window.dispatchEvent(event);
                }, 100);
              }}
            >
              <SelectTrigger className="w-auto h-6 text-xs border-dashed" onClick={(e) => e.stopPropagation()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">MCQ</SelectItem>
                <SelectItem value="match_column">Match Column</SelectItem>
                <SelectItem value="assertion_reason">Assertion Reason</SelectItem>
                <SelectItem value="fill_blank">Fill Blank</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs">
              {question.difficulty || 'medium'}
            </Badge>
            <span className="text-xs text-muted-foreground">{question.marks || 1} marks</span>
            
            {onFixWithCrop && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFixWithCrop();
                }}
                className="ml-auto mr-2"
                title={hasPdf ? "Fix via Crop" : "Upload PDF to Enable Crop"}
              >
                <Crop className="w-3 h-3 mr-1.5" />
                {hasPdf ? 'Fix via Crop' : 'Upload PDF'}
                {!hasPdf && <Upload className="w-3 h-3 ml-1" />}
              </Button>
            )}
          </div>
          {getStatusIcon()}
        </CollapsibleTrigger>
        
        {/* Content */}
        <CollapsibleContent>
          <div className="p-4 space-y-4 border-t">
            {/* Question Text */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Question Text</label>
              
              <RichQuestionEditor
                content={question.question_text}
                onChange={(content) => handleChange('question_text', content)}
                placeholder="Enter question text..."
                compact
                forcePlainPaste={true}
                smartMathPaste={false}
              />
              
              {/* Live Math Preview */}
              {question.question_text && (
                <div className="mt-2 p-3 bg-muted/30 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Live Preview:</p>
                  <div 
                    className="text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: renderWithImages(question.question_text)
                    }}
                  />
                </div>
              )}
              
              {/* Sub-Questions Preview for Fill Blank */}
              {question.question_type === 'fill_blank' && question.sub_questions && question.sub_questions.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-900">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Sub-Questions Preview:</p>
                  <div className="space-y-1.5">
                    {question.sub_questions.map((subQ, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 min-w-[20px]">
                          {getNumberingLabel(idx, question.numberingStyle || '1,2,3')}.
                        </span>
                        <span className="text-foreground">{subQ.text || '(empty)'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Statements Preview for True/False */}
              {question.question_type === 'true_false' && question.statements && question.statements.length > 0 && (
                <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-900">
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">Statements Preview:</p>
                  <div className="space-y-1.5">
                    {question.statements.map((stmt, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <span className="font-semibold text-purple-600 dark:text-purple-400 min-w-[20px]">
                          {getNumberingLabel(idx, question.numberingStyle || 'i,ii,iii')}.
                        </span>
                        <span className="text-foreground flex-1">{stmt.text || '(empty)'}</span>
                        <Badge variant={stmt.answer ? "default" : "secondary"} className="text-xs">
                          {stmt.answer ? 'TRUE' : 'FALSE'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* MCQ Options */}
            {(['mcq', 'assertion_reason'].includes(question.question_type) || question.options?.length > 0) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Options</label>
                {(question.options || ['', '', '', '']).map((opt, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="font-semibold text-sm mt-3 w-6">{String.fromCharCode(65 + i)})</span>
                    <div className="flex-1">
                      <RichQuestionEditor
                        content={opt}
                        onChange={(content) => {
                          const newOptions = [...(question.options || ['', '', '', ''])];
                          newOptions[i] = content;
                          handleChange('options', newOptions);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        compact
                        forcePlainPaste={true}
                        smartMathPaste={false}
                      />
                      
                      {/* Live Preview for option */}
                      {opt && (
                        <div className="mt-1 p-2 bg-muted/20 rounded text-xs">
                          <span dangerouslySetInnerHTML={{ 
                            __html: renderWithImages(opt)
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Match Column */}
            {question.question_type === 'match_column' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Column I</label>
                  <div className="space-y-2">
                    {(question.left_column || ['']).map((item, i) => (
                      <Input
                        key={i}
                        value={item}
                        onChange={(e) => {
                          const newColumn = [...(question.left_column || [''])];
                          newColumn[i] = e.target.value;
                          handleChange('left_column', newColumn);
                        }}
                        className="font-mono text-sm"
                        placeholder={`Item ${i + 1}`}
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChange('left_column', [...(question.left_column || []), ''])}
                    >
                      + Add Item
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Column II</label>
                  <div className="space-y-2">
                    {(question.right_column || ['']).map((item, i) => (
                      <Input
                        key={i}
                        value={item}
                        onChange={(e) => {
                          const newColumn = [...(question.right_column || [''])];
                          newColumn[i] = e.target.value;
                          handleChange('right_column', newColumn);
                        }}
                        className="font-mono text-sm"
                        placeholder={`Item ${i + 1}`}
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChange('right_column', [...(question.right_column || []), ''])}
                    >
                      + Add Item
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Match Column Preview */}
            {question.question_type === 'match_column' && 
             (question.left_column?.length > 0 || question.right_column?.length > 0) && (
              <div className="mt-3 grid grid-cols-2 gap-6 border-l-2 border-primary/20 pl-4 bg-muted/20 p-3 rounded-md">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Column I (Preview)</p>
                  <div className="space-y-1">
                    {(question.left_column || []).map((item, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <Badge variant="outline" className="text-xs">
                          {String.fromCharCode(65 + idx)}
                        </Badge>
                        <span 
                          className="flex-1 prose prose-sm max-w-none question-content"
                          dangerouslySetInnerHTML={{ __html: renderWithImages(item) }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Column II (Preview)</p>
                  <div className="space-y-1">
                    {(question.right_column || []).map((item, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <Badge variant="outline" className="text-xs">
                          {String.fromCharCode(105 + idx)}
                        </Badge>
                        <span 
                          className="flex-1 prose prose-sm max-w-none question-content"
                          dangerouslySetInnerHTML={{ __html: renderWithImages(item) }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Assertion & Reason */}
            {question.question_type === 'assertion_reason' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Assertion (A)</label>
                  <RichQuestionEditor
                    content={question.assertion || ''}
                    onChange={(content) => handleChange('assertion', content)}
                    placeholder="Enter assertion statement..."
                    compact
                    forcePlainPaste={true}
                    smartMathPaste={false}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Reason (R)</label>
                  <RichQuestionEditor
                    content={question.reason || ''}
                    onChange={(content) => handleChange('reason', content)}
                    placeholder="Enter reason statement..."
                    compact
                    forcePlainPaste={true}
                    smartMathPaste={false}
                  />
                </div>
              </div>
            )}

            {/* Assertion-Reason Preview */}
            {question.question_type === 'assertion_reason' && 
             (question.assertion || question.reason) && (
              <div className="mt-3 space-y-2 border-l-2 border-purple-500/20 pl-4 bg-muted/20 p-3 rounded-md">
                {question.assertion && (
                  <div>
                    <Badge variant="outline" className="text-xs mb-1">Assertion (A) - Preview</Badge>
                    <div 
                      className="text-sm prose prose-sm max-w-none question-content"
                      dangerouslySetInnerHTML={{ __html: renderWithImages(question.assertion) }}
                    />
                  </div>
                )}
                {question.reason && (
                  <div>
                    <Badge variant="outline" className="text-xs mb-1">Reason (R) - Preview</Badge>
                    <div 
                      className="text-sm prose prose-sm max-w-none question-content"
                      dangerouslySetInnerHTML={{ __html: renderWithImages(question.reason) }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Fill in Blank - Sub-questions */}
            {question.question_type === 'fill_blank' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Fill-in-the-Blanks Sub-Questions</label>
                  <Select
                    value={question.numberingStyle || '1,2,3'}
                    onValueChange={(val) => handleChange('numberingStyle', val)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue placeholder="Numbering" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1,2,3">1, 2, 3...</SelectItem>
                      <SelectItem value="a,b,c">a, b, c...</SelectItem>
                      <SelectItem value="i,ii,iii">i, ii, iii...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub-questions list */}
                <div className="space-y-3">
                  {(question.sub_questions || []).map((subQ, idx) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {getNumberingLabel(idx, question.numberingStyle || '1,2,3')}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newSubQuestions = [...(question.sub_questions || [])];
                            newSubQuestions.splice(idx, 1);
                            handleChange('sub_questions', newSubQuestions);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium mb-1 block">Sub-question Text</label>
                        <Textarea
                          value={subQ.text}
                          onChange={(e) => {
                            const newSubQuestions = [...(question.sub_questions || [])];
                            newSubQuestions[idx] = { ...subQ, text: e.target.value };
                            handleChange('sub_questions', newSubQuestions);
                          }}
                          placeholder="Enter sub-question text (use _____ for blanks)"
                          className="min-h-[60px]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium mb-1 block">Correct Answer</label>
                        <Input
                          value={subQ.correctAnswer}
                          onChange={(e) => {
                            const newSubQuestions = [...(question.sub_questions || [])];
                            newSubQuestions[idx] = { ...subQ, correctAnswer: e.target.value };
                            handleChange('sub_questions', newSubQuestions);
                          }}
                          placeholder="Correct answer"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium mb-1 block">Distractors (comma-separated)</label>
                        <Input
                          value={(subQ.distractors || []).join(', ')}
                          onChange={(e) => {
                            const newSubQuestions = [...(question.sub_questions || [])];
                            newSubQuestions[idx] = { 
                              ...subQ, 
                              distractors: e.target.value.split(',').map(d => d.trim()).filter(Boolean)
                            };
                            handleChange('sub_questions', newSubQuestions);
                          }}
                          placeholder="distractor1, distractor2, distractor3"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add sub-question button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newSubQuestions = [
                      ...(question.sub_questions || []),
                      { text: '', correctAnswer: '', distractors: [] }
                    ];
                    handleChange('sub_questions', newSubQuestions);
                  }}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Add Sub-Question
                </Button>

                <p className="text-xs text-muted-foreground">
                  💡 Use _____ (5 underscores) to mark blanks in sub-question text
                </p>
              </div>
            )}

            {/* True/False - Statements */}
            {question.question_type === 'true_false' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">True/False Statements</label>
                  <Select
                    value={question.numberingStyle || 'i,ii,iii'}
                    onValueChange={(val) => handleChange('numberingStyle', val)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue placeholder="Numbering" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1,2,3">1, 2, 3...</SelectItem>
                      <SelectItem value="a,b,c">a, b, c...</SelectItem>
                      <SelectItem value="i,ii,iii">i, ii, iii...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Statements list */}
                <div className="space-y-3">
                  {(question.statements || []).map((stmt, idx) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {getNumberingLabel(idx, question.numberingStyle || 'i,ii,iii')}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newStatements = [...(question.statements || [])];
                            newStatements.splice(idx, 1);
                            handleChange('statements', newStatements);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium mb-1 block">Statement</label>
                        <Textarea
                          value={stmt.text}
                          onChange={(e) => {
                            const newStatements = [...(question.statements || [])];
                            newStatements[idx] = { ...stmt, text: e.target.value };
                            handleChange('statements', newStatements);
                          }}
                          placeholder="Enter statement"
                          className="min-h-[60px]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium mb-1 block">Correct Answer</label>
                        <Select
                          value={stmt.answer ? 'true' : 'false'}
                          onValueChange={(val) => {
                            const newStatements = [...(question.statements || [])];
                            newStatements[idx] = { ...stmt, answer: val === 'true' };
                            handleChange('statements', newStatements);
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">True</SelectItem>
                            <SelectItem value="false">False</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add statement button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newStatements = [
                      ...(question.statements || []),
                      { text: '', answer: true }
                    ];
                    handleChange('statements', newStatements);
                  }}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Add Statement
                </Button>
              </div>
            )}
            
            {/* Metadata */}
            <div className="flex gap-4 pt-2 border-t">
              <div className="flex-1">
                <label className="text-xs font-medium mb-1 block">Marks</label>
                <Input
                  type="number"
                  value={question.marks || 1}
                  onChange={(e) => handleChange('marks', parseInt(e.target.value) || 1)}
                  className="w-20"
                  min={1}
                  max={20}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium mb-1 block">Difficulty</label>
                <Select
                  value={question.difficulty || 'medium'}
                  onValueChange={(val) => handleChange('difficulty', val)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* OCR Warning */}
            {question.ocr_status?.requires_manual_review && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-xs text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">Manual Review Needed</p>
                  <p className="text-yellow-700 dark:text-yellow-300 mt-0.5">
                    This question contains complex math/symbols. Please verify the text is correct.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
