import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeGameTypeForDisplay } from "@/lib/gameTypeMapping";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { normalizeMatchColumnAnswer } from "@/lib/answers";
import { autoStructureTrueFalse, autoStructureFillBlanks } from "@/lib/questionParsing";
import { 
  parseMCQData,
  parseFillBlankData,
  parseTrueFalseData,
  parseMatchPairsData,
  parseAssertionReasonData
} from "@/lib/questionDataHelpers";

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
  question_data?: any; // JSONB column from database
  answer_data?: any; // JSONB column from database
  statements?: Array<{ text: string; answer: boolean }>; // For true_false multi-statement
  numberingStyle?: string; // For true_false numbering
  use_word_bank?: boolean; // For fill_blank word bank toggle
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
  let ans = q.correct_answer;
  
  // 🔧 STRING PARSE: Handle JSON strings from backend
  if (typeof ans === 'string' && (ans.startsWith('{') || ans.startsWith('['))) {
    try {
      console.log('🔄 Parsing JSON string answer:', ans.substring(0, 100));
      ans = JSON.parse(ans);
      console.log('✅ Parsed to object:', ans);
    } catch (err) {
      console.warn('⚠️ JSON parse failed:', err);
    }
  }
  
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
      // Use centralized normalizer from lib/answers.ts (handles all legacy formats + string parsing)
      return normalizeMatchColumnAnswer(ans);
    
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

  // Column editing state for match_column questions
  const [editingColumns, setEditingColumns] = useState<Map<string, { left: string[], right: string[] }>>(new Map());

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
        
        // ✅ Parse JSONB into legacy format for admin UI
        const normalizedQuestions = rawQuestions.map(q => {
          let parsed: any = {};
          
          // Parse based on type using JSONB parsers
          switch (q.question_type) {
            case 'mcq':
              parsed = parseMCQData(q);
              return {
                ...q,
                question_text: parsed.text,
                options: parsed.options,
                correct_answer: parsed.correctIndex !== null ? { index: parsed.correctIndex } : null,
                explanation: parsed.explanation,
                marks: q.question_data?.marks || q.marks || 1,
                difficulty: q.question_data?.difficulty || q.difficulty
              };
              
            case 'true_false':
              parsed = parseTrueFalseData(q);
              if (parsed.statements?.length > 0) {
                // Multi-part
                return {
                  ...q,
                  question_text: parsed.question || "True/False Statements",
                  correct_answer: { statements: parsed.statements },
                  explanation: parsed.explanation,
                  marks: q.question_data?.marks || q.marks || 1,
                  difficulty: q.question_data?.difficulty || q.difficulty
                };
              } else {
                // Single statement
                return {
                  ...q,
                  question_text: parsed.statement,
                  correct_answer: parsed.correctValue !== null ? { value: parsed.correctValue } : null,
                  explanation: parsed.explanation,
                  marks: q.question_data?.marks || q.marks || 1,
                  difficulty: q.question_data?.difficulty || q.difficulty
                };
              }
              
            case 'fill_blank':
              parsed = parseFillBlankData(q);
              return {
                ...q,
                question_text: parsed.text,
                correct_answer: {
                  blanks: parsed.blanks || [],
                  sub_questions: parsed.sub_questions || []
                },
                use_word_bank: parsed.use_word_bank,
                explanation: parsed.explanation,
                marks: q.question_data?.marks || q.marks || 1,
                difficulty: q.question_data?.difficulty || q.difficulty
              };
              
            case 'match_column':
              parsed = parseMatchPairsData(q);
              return {
                ...q,
                question_text: parsed.question,
                left_column: parsed.leftColumn,
                right_column: parsed.rightColumn,
                correct_answer: parsed.correctPairs?.length > 0 ? { pairs: parsed.correctPairs } : null,
                explanation: parsed.explanation,
                marks: q.question_data?.marks || q.marks || 1,
                difficulty: q.question_data?.difficulty || q.difficulty
              };
              
            case 'match_pair':
            case 'match_pairs':
              parsed = parseMatchPairsData(q);
              return {
                ...q,
                question_text: parsed.question,
                correct_answer: parsed.pairs?.length > 0 ? { pairs: parsed.pairs } : null,
                explanation: parsed.explanation,
                marks: q.question_data?.marks || q.marks || 1,
                difficulty: q.question_data?.difficulty || q.difficulty
              };
              
            case 'assertion_reason':
              parsed = parseAssertionReasonData(q);
              return {
                ...q,
                question_text: `Assertion: ${parsed.assertion}\nReason: ${parsed.reason}`,
                options: parsed.options,
                correct_answer: parsed.correctIndex !== null ? { index: parsed.correctIndex } : null,
                explanation: parsed.explanation,
                marks: q.question_data?.marks || q.marks || 1,
                difficulty: q.question_data?.difficulty || q.difficulty
              };
              
            default:
              // Unknown type - try to use legacy data or return minimal structure
              return {
                ...q,
                question_text: q.question_data?.text || q.question_text || 'No question text',
                correct_answer: normalizeCorrectAnswer(q),
                marks: q.question_data?.marks || q.marks || 1,
                difficulty: q.question_data?.difficulty || q.difficulty
              };
          }
        });
        // Debug audit: Before vs After for match_column
        console.group('🧾 Match Column Data (Before/After)');
        try {
          rawQuestions
            .filter((rq: any) => rq.question_type === 'match_column')
            .forEach((rq: any, idx: number) => {
              const nq = normalizedQuestions.find((q: any) => q.id === rq.id) || normalizedQuestions[idx];
              const before = {
                id: rq.id,
                type: typeof rq.correct_answer,
                leftLen: rq.left_column?.length || 0,
                rightLen: rq.right_column?.length || 0,
                leftSample: (rq.left_column || []).slice(0, 3),
                rightSample: (rq.right_column || []).slice(0, 3),
                answer: rq.correct_answer
              };
              const after = {
                id: nq?.id,
                type: typeof nq?.correct_answer,
                leftLen: nq?.left_column?.length || 0,
                rightLen: nq?.right_column?.length || 0,
                leftSample: (nq?.left_column || []).slice(0, 3),
                rightSample: (nq?.right_column || []).slice(0, 3),
                pairsLen: nq?.correct_answer?.pairs?.length || 0,
                pairsSample: (nq?.correct_answer?.pairs || []).slice(0, 3)
              };
              console.log('Q:', before.id, { before, after });
            });
        } catch (e) {
          console.warn('Audit logging failed:', e);
        }
        console.groupEnd();
        
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
    console.log('🔄 [SmartExtractor] handleAnswerUpdate called:', { 
      questionId, 
      answerType: typeof answer,
      answerKeys: typeof answer === 'object' && answer ? Object.keys(answer) : [],
      hasBlanks: answer?.blanks?.length || 0,
      hasPairs: answer?.pairs?.length || 0,
      answerPreview: JSON.stringify(answer).substring(0, 150)
    });
    
    const question = questions.find(q => q.id === questionId);
    
    // Track the edit locally instead of saving immediately
    setEditedQuestions(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(questionId) || {};
      
      // 🔧 CRITICAL FIX: For true_false, preserve statements and numberingStyle
      if (question?.question_type === 'true_false') {
        if (answer.statements) {
          newMap.set(questionId, { 
            ...existing, 
            correct_answer: answer, 
            explanation,
            statements: answer.statements,
            numberingStyle: question.correct_answer?.numbering_style || 'i,ii,iii'
          });
        } else {
          newMap.set(questionId, { ...existing, correct_answer: answer, explanation });
        }
      } else {
        newMap.set(questionId, { ...existing, correct_answer: answer, explanation });
      }
      
      console.log('✅ [SmartExtractor] editedQuestions updated. Map size:', newMap.size, 'Has this ID?', newMap.has(questionId));
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
      // 🔧 CRITICAL FIX: For true_false, include statements and numberingStyle
      const requestBody: any = {
        action: 'update_full_question',
        question_id: questionId,
        question_text: edits.question_text ?? question.question_text,
        question_type: edits.question_type ?? question.question_type,
        options: edits.options ?? question.options,
        left_column: edits.left_column ?? question.left_column,
        right_column: edits.right_column ?? question.right_column,
        marks: edits.marks ?? question.marks,
        difficulty: edits.difficulty ?? question.difficulty,
        correct_answer: edits.correct_answer ?? question.correct_answer,
        explanation: edits.explanation ?? question.explanation,
      };

      // 🔧 CRITICAL FIX: For true_false, include statements and numberingStyle
      if (question.question_type === 'true_false') {
        const finalStatements = 
          edits.statements || 
          edits.correct_answer?.statements || 
          question.correct_answer?.statements || 
          [];
        const finalNumbering = 
          edits.numberingStyle || 
          question.correct_answer?.numbering_style || 
          'i,ii,iii';
        
        if (finalStatements.length > 0) {
          requestBody.statements = finalStatements;
          requestBody.numberingStyle = finalNumbering;
        }
      }

      const data = await invokeWithAuth<any, { success: boolean }>({
        name: 'topic-questions-api',
        body: requestBody
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
        // Multi-statement format (new)
        if (ans?.statements && Array.isArray(ans.statements)) {
          return ans.statements.length > 0 && 
                 ans.statements.every((stmt: any) => typeof stmt.answer === 'boolean');
        }
        // Single boolean format (legacy)
        return typeof ans === 'boolean' || typeof ans?.value === 'boolean';
      
      case 'fill_blank':
        // New drag-drop format with blanks array
        if (ans?.blanks && Array.isArray(ans.blanks)) {
          // If Word Bank is OFF, distractors are optional
          if (q?.use_word_bank === false) {
            return ans.blanks.length > 0 && ans.blanks.every((b: any) => 
              b.correctAnswer?.trim().length > 0
            );
          }
          
          // Word Bank ON: require at least 1 distractor per blank
          const isValid = ans.blanks.length > 0 && ans.blanks.every((b: any) => 
            b.correctAnswer?.trim().length > 0 && 
            Array.isArray(b.distractors) && 
            b.distractors.filter((d: string) => typeof d === 'string' && d.trim().length > 0).length >= 1
          );
          
          // Log warning if valid but has fewer than 3 distractors
          if (isValid) {
            const blanksWithFewDistractors = ans.blanks.filter((b: any) => 
              b.distractors?.filter((d: string) => d && d.trim().length > 0).length < 3
            );
            if (blanksWithFewDistractors.length > 0) {
              console.warn('[validateAnswer] fill_blank valid but has blanks with <3 distractors:', blanksWithFewDistractors.length);
            }
          }
          
          return isValid;
        }
        // Sub-questions format (multi-part)
        if (ans?.sub_questions && Array.isArray(ans.sub_questions)) {
          return ans.sub_questions.length > 0 && 
                 ans.sub_questions.every((sq: any) => 
                   sq.correctAnswer?.trim().length > 0
                 );
        }
        // Legacy formats
        if (typeof ans === 'string') return ans.trim().length > 0;
        if (ans?.text) return ans.text.trim().length > 0;
        return false;
      
      case 'match_column':
        // Accept both legacy (array) and new (object with pairs) formats
        if (Array.isArray(ans)) return ans.length > 0;
        return Array.isArray(ans?.pairs) && ans.pairs.length > 0;
      
      case 'match_pair':
      case 'match_pairs':
        // Validate pairs array format: [{id, left, right}]
        if (ans?.pairs && Array.isArray(ans.pairs)) {
          return ans.pairs.length > 0 && 
                 ans.pairs.every((pair: any) => 
                   pair.left?.trim().length > 0 && 
                   pair.right?.trim().length > 0
                 );
        }
        return false;
      
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

    // Auto-complete missing distractors for fill_blank questions (only when Word Bank ON)
    const processedQuestions = selectedQuestions.map(q => {
      if (q.question_type === 'fill_blank' && q.correct_answer?.blanks) {
        // Skip auto-complete when Word Bank is OFF
        if (q.use_word_bank === false) {
          console.log('[Auto-complete] Skipping - Word Bank OFF for question:', q.id);
          return q;
        }
        
        const updatedBlanks = q.correct_answer.blanks.map((blank: any, idx: number) => {
          const validDistractors = blank.distractors?.filter((d: string) => d && d.trim().length > 0) || [];
          if (validDistractors.length < 3) {
            // Generate safe fallback distractors that don't duplicate correctAnswer
            const fallbacks = ['___', '...', '???'];
            const correctAns = blank.correctAnswer?.toLowerCase() || '';
            const safeDistractors = fallbacks.filter(f => 
              f.toLowerCase() !== correctAns && !validDistractors.includes(f)
            );
            const needed = 3 - validDistractors.length;
            const fillers = safeDistractors.slice(0, needed);
            console.log(`[Auto-complete] Blank ${idx}: adding ${fillers.length} distractors`);
            return { ...blank, distractors: [...validDistractors, ...fillers] };
          }
          return blank;
        });
        return { ...q, correct_answer: { ...q.correct_answer, blanks: updatedBlanks } };
      }
      return q;
    });

    // Call parent callback with processed questions
    if (onQuestionsAdded) {
      onQuestionsAdded(processedQuestions);
      toast.success(`Added ${processedQuestions.length} questions to Lesson Library`);
      setSelectedIds(new Set()); // Clear selections
    } else {
      toast.error('Cannot add to Lesson Library: callback not configured');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await invokeWithAuth({
        name: 'topic-questions-api',
        body: { 
          action: 'delete_question', 
          question_id: questionId 
        }
      });
      
      // Remove from UI after successful deletion
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
      
      toast.success('Question deleted from database');
    } catch (error: any) {
      console.error('Failed to delete question:', error);
      toast.error(`Delete failed: ${error.message || 'Unknown error'}`);
    }
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

  const handleClearAll = async () => {
    const selectedQuestions = questions.filter(q => q.id && selectedIds.has(q.id));
    
    if (selectedQuestions.length === 0) {
      toast.error('No questions selected to delete');
      return;
    }

    // Show confirmation dialog before deleting
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete ${selectedQuestions.length} selected question(s) from the database?`
    );
    
    if (!confirmDelete) {
      return;
    }

    setLoading(true);
    try {
      console.log('🗑️ Deleting selected questions:', selectedQuestions.map(q => q.id));
      
      // Use edge function to delete from question_bank
      const deletePromises = selectedQuestions.map(q =>
        invokeWithAuth({
          name: 'topic-questions-api',
          body: { 
            action: 'delete_question', 
            question_id: q.id 
          }
        })
      );
      
      const results = await Promise.allSettled(deletePromises);
      
      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`✅ Deleted ${successful} questions, ${failed} failed`);

      // Remove successfully deleted questions from UI
      const failedIds = results
        .map((r, i) => r.status === 'rejected' ? selectedQuestions[i].id : null)
        .filter(Boolean);
      
      setQuestions(prev => prev.filter(q => 
        !q.id || !selectedIds.has(q.id) || failedIds.includes(q.id)
      ));
      setSelectedIds(new Set(failedIds as string[]));
      
      // Clear localStorage
      if (selectedTopic && failedIds.length === 0) {
        localStorage.removeItem(`question-selections-${selectedTopic}`);
      }

      // Show result toast
      if (failed === 0) {
        toast.success(`Successfully deleted ${successful} question(s)`);
      } else {
        toast.warning(`Deleted ${successful} question(s), ${failed} failed`);
      }
      
    } catch (error: any) {
      console.error('Failed to delete questions:', error);
      toast.error(`Deletion failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
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
                {publishedQuestionIds.size > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {publishedQuestionIds.size} Published
                  </Badge>
                )}
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
                      Select All ({filteredQuestions.filter(q => q.id && !publishedQuestionIds.has(q.id)).length})
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
                      "relative transition-all",
                      q.id && publishedQuestionIds.has(q.id) 
                        ? "opacity-60 cursor-not-allowed bg-muted/50" 
                        : "cursor-pointer hover:shadow-md",
                      q.id && selectedIds.has(q.id) && "ring-2 ring-primary"
                    )}
                    onClick={() => {
                      if (q.id && !publishedQuestionIds.has(q.id)) {
                        toggleSelection(q.id);
                      }
                    }}
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
                      {normalizeGameTypeForDisplay(q.question_type)}
                    </Badge>
                            {q.id && publishedQuestionIds.has(q.id) && (
                              <Badge className="text-xs bg-green-600 hover:bg-green-600 text-white shadow-md">
                                ✓ Already Added
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
                        <div className="text-xs font-medium text-muted-foreground">
                          {q.question_type === 'fill_blank' && q.correct_answer?.sub_questions?.length > 0 
                            ? `Sub-Question (1 of ${q.correct_answer.sub_questions.length})` 
                            : q.question_type === 'match_pair' && q.correct_answer?.pairs?.length > 0
                            ? `First Pair (1 of ${q.correct_answer.pairs.length})`
                            : 'Question:'}
                        </div>
                        {/* ✅ Match Pair: Plain text arrow (no renderWithImages to avoid "vector" artifacts) */}
                        {q.question_type === 'match_pair' && q.correct_answer?.pairs?.[0] ? (
                          <div className="text-sm bg-muted/30 p-3 rounded-md">
                            {q.correct_answer.pairs[0].left} → {q.correct_answer.pairs[0].right}
                          </div>
                        ) : (
                          <div 
                            className="text-sm prose prose-sm max-w-none question-content bg-muted/30 p-3 rounded-md"
                            dangerouslySetInnerHTML={{ 
                              __html: renderWithImages(
                                q.question_type === 'fill_blank' && q.correct_answer?.sub_questions?.[0]?.text
                                  ? q.correct_answer.sub_questions[0].text
                                  : q.question_text || 'No question text'
                              ) 
                            }}
                          />
                        )}
                        {/* Multi-part badges */}
                        {q.question_type === 'fill_blank' && q.correct_answer?.sub_questions?.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            {q.correct_answer.sub_questions.length} Sub-Questions
                          </Badge>
                        )}
                        {q.question_type === 'match_pair' && q.correct_answer?.pairs?.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {q.correct_answer.pairs.length} Pairs
                          </Badge>
                        )}
                      </div>

                      {/* Multi-Statement True/False Preview */}
                      {q.question_type === 'true_false' && q.correct_answer?.statements?.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">Statements:</div>
                          <div className="space-y-2">
                            {q.correct_answer.statements.map((stmt: any, stmtIdx: number) => (
                              <div key={stmtIdx} className="flex items-start gap-3 bg-muted/20 p-2 rounded">
                                <Badge variant="outline" className="shrink-0 h-5 w-5 flex items-center justify-center p-0 text-xs font-mono">
                                  {stmtIdx + 1}
                                </Badge>
                                <div 
                                  className="flex-1 text-xs prose prose-xs max-w-none"
                                  dangerouslySetInnerHTML={{ __html: renderWithImages(stmt.text || '') }}
                                />
                                <div className="flex items-center gap-2 shrink-0">
                                  <Switch
                                    checked={stmt.answer === true}
                                    disabled
                                    className="data-[state=checked]:bg-blue-700 disabled:opacity-100"
                                  />
                                  <span className="text-xs font-medium w-10">
                                    {stmt.answer ? 'True' : 'False'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
                        
                        // Inline Column Editor for match_column if columns still missing
                        if (q.question_type === 'match_column' && (!q.left_column?.length || !q.right_column?.length)) {
                          const currentEdit = editingColumns.get(q.id!) || { left: q.left_column || [''], right: q.right_column || [''] };
                          
                          return (
                            <div onClick={(e) => e.stopPropagation()} className="space-y-3 border border-orange-500/50 rounded-lg p-3 bg-orange-50/50">
                              <Alert className="py-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  Columns not detected. Add them manually below:
                                </AlertDescription>
                              </Alert>
                              
                              <div className="grid grid-cols-2 gap-3">
                                {/* Left Column */}
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold">Column A (Left)</Label>
                                  {currentEdit.left.map((item, idx) => (
                                    <div key={idx} className="flex gap-1">
                                      <Input
                                        value={item}
                                        onChange={(e) => {
                                          const newEdit = { ...currentEdit };
                                          newEdit.left[idx] = e.target.value;
                                          setEditingColumns(new Map(editingColumns).set(q.id!, newEdit));
                                        }}
                                        placeholder={`Item ${idx + 1}`}
                                        className="text-xs h-8"
                                      />
                                      {currentEdit.left.length > 1 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => {
                                            const newEdit = { ...currentEdit };
                                            newEdit.left = newEdit.left.filter((_, i) => i !== idx);
                                            setEditingColumns(new Map(editingColumns).set(q.id!, newEdit));
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-7 text-xs"
                                    onClick={() => {
                                      const newEdit = { ...currentEdit };
                                      newEdit.left = [...newEdit.left, ''];
                                      setEditingColumns(new Map(editingColumns).set(q.id!, newEdit));
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Item
                                  </Button>
                                </div>
                                
                                {/* Right Column */}
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold">Column B (Right)</Label>
                                  {currentEdit.right.map((item, idx) => (
                                    <div key={idx} className="flex gap-1">
                                      <Input
                                        value={item}
                                        onChange={(e) => {
                                          const newEdit = { ...currentEdit };
                                          newEdit.right[idx] = e.target.value;
                                          setEditingColumns(new Map(editingColumns).set(q.id!, newEdit));
                                        }}
                                        placeholder={`Item ${idx + 1}`}
                                        className="text-xs h-8"
                                      />
                                      {currentEdit.right.length > 1 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => {
                                            const newEdit = { ...currentEdit };
                                            newEdit.right = newEdit.right.filter((_, i) => i !== idx);
                                            setEditingColumns(new Map(editingColumns).set(q.id!, newEdit));
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-7 text-xs"
                                    onClick={() => {
                                      const newEdit = { ...currentEdit };
                                      newEdit.right = [...newEdit.right, ''];
                                      setEditingColumns(new Map(editingColumns).set(q.id!, newEdit));
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Item
                                  </Button>
                                </div>
                              </div>
                              
                              <Button
                                variant="default"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                  const validLeft = currentEdit.left.filter(i => i.trim().length > 0);
                                  const validRight = currentEdit.right.filter(i => i.trim().length > 0);
                                  if (validLeft.length === 0 || validRight.length === 0) {
                                    toast.error('Both columns need at least 1 item');
                                    return;
                                  }
                                  // Update question with columns (local state)
                                  setQuestions(prev => prev.map(question => 
                                    question.id === q.id 
                                      ? { ...question, left_column: validLeft, right_column: validRight }
                                      : question
                                  ));
                                  // Mark as edited so Save Changes button appears and PATCH includes columns
                                  setEditedQuestions(prev => {
                                    const newMap = new Map(prev);
                                    const existing = newMap.get(q.id!) || {};
                                    newMap.set(q.id!, { ...existing, left_column: validLeft, right_column: validRight });
                                    return newMap;
                                  });
                                  // Clear editing state
                                  const newMap = new Map(editingColumns);
                                  newMap.delete(q.id!);
                                  setEditingColumns(newMap);
                                  toast.success('Columns added! Now select the correct pairs below.');
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Save Columns
                              </Button>
                            </div>
                          );
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

                      {/* Unsaved Changes Indicator */}
                      {q.id && editedQuestions.has(q.id) && (
                        <Badge variant="outline" className="w-full justify-center gap-1 text-orange-600 border-orange-400">
                          <AlertCircle className="h-3 w-3" />
                          Unsaved Changes
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
                            console.log('💾 [SmartExtractor] Save Changes clicked for:', q.id, {
                              edits: editedQuestions.get(q.id),
                              questionType: q.question_type
                            });
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
