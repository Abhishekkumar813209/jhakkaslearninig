import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, CheckCircle, AlertCircle, Loader2, Search, X, Crop } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { renderMath } from '@/lib/mathRendering';
import { RichQuestionEditor } from './RichQuestionEditor';
import { PDFQuestionExtractor } from './PDFQuestionExtractor';

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

  // Sync with parent questions
  useEffect(() => {
    setEditableQuestions(questions);
  }, [questions]);

  // Auto-save with debounce
  useEffect(() => {
    if (JSON.stringify(editableQuestions) === JSON.stringify(questions)) return;
    
    setAutoSaving(true);
    const timer = setTimeout(() => {
      onUpdate(editableQuestions);
      setAutoSaving(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [editableQuestions]);

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
    if (!pdfFile) {
      toast.error('PDF file not available for cropping');
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
          {pdfFile && (
            <PDFQuestionExtractor
              onQuestionExtracted={handleCropExtractComplete}
              onClose={() => setCropModalOpen(false)}
              editMode={{
                questionId: selectedQuestionForCrop?.id || '',
                currentQuestion: selectedQuestionForCrop!,
                pdfFile: pdfFile
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    <div className="space-y-4 h-full flex flex-col">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 bg-background z-10 border-b p-4 space-y-3">
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
        <div className="flex gap-6 text-sm items-center">
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
              hasPdf={!!pdfFile}
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
    onUpdate({ ...question, [field]: value, edited: true });
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
            <Badge variant="outline" className="text-xs">
              {question.question_type.replace('_', ' ')}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {question.difficulty || 'medium'}
            </Badge>
            <span className="text-xs text-muted-foreground">{question.marks || 1} marks</span>
            
            {hasPdf && onFixWithCrop && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFixWithCrop();
                }}
                className="ml-auto mr-2"
              >
                <Crop className="w-3 h-3 mr-1.5" />
                Fix via Crop
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
              />
            </div>
            
            {/* MCQ Options */}
            {question.question_type === 'mcq' && (
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
                      />
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
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Reason (R)</label>
                  <RichQuestionEditor
                    content={question.reason || ''}
                    onChange={(content) => handleChange('reason', content)}
                    placeholder="Enter reason statement..."
                    compact
                  />
                </div>
              </div>
            )}
            
            {/* Fill in Blank */}
            {question.question_type === 'fill_blank' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Number of Blanks</label>
                <Input
                  type="number"
                  value={question.blanks_count || 1}
                  onChange={(e) => handleChange('blanks_count', parseInt(e.target.value) || 1)}
                  className="w-32"
                  min={1}
                  max={10}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use _____ (5 underscores) to mark blanks in the question text
                </p>
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
