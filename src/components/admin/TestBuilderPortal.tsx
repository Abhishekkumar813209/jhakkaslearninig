import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Save, 
  Eye, 
  Wand2, 
  Trash2, 
  Edit,
  Download,
  ArrowLeft,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Move,
  Settings,
  BookOpen,
  Target,
  Timer,
  Award,
  Upload,
  Image as ImageIcon,
  X,
  ScanText,
  Crop as CropIcon,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import TestSettingsDialog from './TestSettingsDialog';
import { PDFQuestionExtractor } from './PDFQuestionExtractor';
import { SmartQuestionExtractor } from './SmartQuestionExtractor';
import ReactCrop from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { pipeline, env } from '@huggingface/transformers';

// Import shared math rendering utilities
import { renderWithImages, stripLeadingOptionLabel } from '@/lib/mathRendering';

interface Question {
  id?: string;
  question_text: string;
  question_type: 'mcq' | 'subjective';
  options?: { text: string; isCorrect: boolean; image_url?: string }[];
  correct_answer?: string;
  marks: number;
  order_num: number;
  explanation?: string;
  sample_answer?: string;
  word_limit?: number;
  tags?: string[];
  allow_multiple_correct?: boolean;
  image_url?: string;
  image_alt?: string;
}

interface Test {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  status: string;
  instructions?: string;
  is_published: boolean;
  is_free?: boolean;
}

const TestBuilderPortal: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showTestSettings, setShowTestSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [hasUnsavedQuestion, setHasUnsavedQuestion] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const ocrInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const questionStorageKey = `test-builder-portal-question-${testId}`;
  
  // Crop dialog state
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropImageType, setCropImageType] = useState<'question' | 'option'>('question');
  const [cropImageIndex, setCropImageIndex] = useState<number>(-1);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementType, setEnhancementType] = useState<'darken' | 'lighten'>('darken');
  const [showPDFExtractor, setShowPDFExtractor] = useState(false);
  const [showBulkExtractor, setShowBulkExtractor] = useState(false);

  // Initialize transformers.js
  useEffect(() => {
    env.allowLocalModels = false;
    env.useBrowserCache = false;
  }, []);

  const [newQuestion, setNewQuestion] = useState<Question>({
    question_text: '',
    question_type: 'mcq',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    marks: 1,
    order_num: 0,
    explanation: '',
    tags: [],
    allow_multiple_correct: false
  });

  // Dialog session to force fresh renders
  const [dialogSessionId, setDialogSessionId] = useState(0);
  
  // Track how dialog was opened
  const [openMode, setOpenMode] = useState<'new' | 'edit' | 'extracted'>('new');

  // Load saved question on dialog open - smart reset based on mode
  useEffect(() => {
    if (!showQuestionDialog) return;
    
    // If editing, don't reset
    if (editingQuestion) return;
    
    // If extracted from PDF, keep the extracted data
    if (openMode === 'extracted') {
      setHasUnsavedQuestion(true);
      return;
    }
    
    // Plain new question - clear localStorage and reset
    localStorage.removeItem(questionStorageKey);
    resetQuestionForm();
    setHasUnsavedQuestion(false);
  }, [showQuestionDialog, editingQuestion, openMode]);

  // Auto-save question when editing
  useEffect(() => {
    if (showQuestionDialog && (newQuestion.question_text || newQuestion.marks)) {
      setHasUnsavedQuestion(true);
      try {
        localStorage.setItem(questionStorageKey, JSON.stringify(newQuestion));
      } catch (error) {
        console.error('Failed to save question:', error);
      }
    }
  }, [newQuestion, showQuestionDialog, questionStorageKey]);

  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
  }, [testId]);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      console.log('Fetching test data for:', testId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Please log in', description: 'You need to sign in to edit tests.' });
        setLoading(false);
        navigate('/login');
        return;
      }

      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'getTestWithQuestions', testId },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      console.log('Test data response:', data, error);

      if (error) throw error;

      if (data.success) {
        setTest(data.test);
        // Transform questions to match our interface
        const transformedQuestions = (data.questions || []).map((q: any) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options ?? null,
          question_type: q.question_type || 'mcq'
        }));
        setQuestions(transformedQuestions);
      }
    } catch (error) {
      console.error('Error fetching test data:', error);
      toast({
        title: "Error",
        description: "Failed to load test data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async () => {
    try {
      const questionData = {
        ...newQuestion,
        marks: Number(newQuestion.marks),
        test_id: testId,
        position: questions.length + 1,
        qtype: newQuestion.question_type
      };

      console.log('Adding question:', questionData);

      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'addQuestion', questionData },
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
      });

      if (error) throw error;

      if (data.success) {
        const transformedQuestion = {
          ...data.question,
          options: typeof data.question.options === 'string' ? JSON.parse(data.question.options) : data.question.options ?? null
        };
        setQuestions(prev => [...prev, transformedQuestion]);
        setShowQuestionDialog(false);
        localStorage.removeItem(questionStorageKey);
        setHasUnsavedQuestion(false);
        resetQuestionForm();
        setOpenMode('new');
        setDialogSessionId(prev => prev + 1);

        toast({
          title: "Success",
          description: "Question added successfully!"
        });
      } else {
        // Show backend error if available
        const errorMsg = data.error || "Failed to add question. Please try again.";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error adding question:', error);
      const errorMsg = error?.message || "Failed to add question. Please try again.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion?.id) return;

    try {
      // Detect if image was removed
      const removeImage = Boolean(editingQuestion?.image_url) && !newQuestion.image_url;
      
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { 
          action: 'updateQuestion', 
          questionId: editingQuestion.id,
          updates: {
            ...newQuestion,
            qtype: newQuestion.question_type,
            image_url: newQuestion.image_url ?? null,
            image_alt: newQuestion.image_alt ?? null
          },
          removeImage
        },
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
      });

      if (error) throw error;

      if (data.success) {
        const transformedQuestion = {
          ...data.question,
          options: typeof data.question.options === 'string' ? JSON.parse(data.question.options) : data.question.options ?? null
        };
        
        setQuestions(prev => prev.map(q => 
          q.id === editingQuestion.id ? transformedQuestion : q
        ));
        
        setShowQuestionDialog(false);
        setEditingQuestion(null);
        resetQuestionForm();

        toast({
          title: "Success",
          description: "Question updated successfully!"
        });
      }
    } catch (error) {
      console.error('Error updating question:', error);
      toast({
        title: "Error",
        description: "Failed to update question. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'deleteQuestion', questionId },
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
      });

      if (error) throw error;

      if (data.success) {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
        
        toast({
          title: "Success",
          description: "Question deleted successfully!"
        });
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetQuestionForm = () => {
    setNewQuestion({
      question_text: '',
      question_type: 'mcq',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      marks: 1,
      order_num: 0,
      explanation: '',
      tags: [],
      allow_multiple_correct: false,
      image_url: undefined,
      image_alt: undefined
    });
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setNewQuestion({ ...question });
    setShowQuestionDialog(true);
  };

  const publishTest = async () => {
    if (questions.length === 0) {
      toast({
        title: "Cannot publish",
        description: "Add at least one question before publishing.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { 
          action: 'updateTest', 
          testId, 
          updates: { is_published: true, status: 'published' }
        },
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
      });

      if (error) throw error;

      if (data.success) {
        setTest(prev => prev ? { ...prev, is_published: true, status: 'published' } : null);

        toast({
          title: "Success",
          description: "Test published successfully!"
        });
      }
    } catch (error) {
      console.error('Error publishing test:', error);
      toast({
        title: "Error",
        description: "Failed to publish test. Please try again.",
        variant: "destructive"
      });
    }
  };

  const exportToPDF = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('export-test-pdf', {
        body: { testId }
      });

      if (error) throw error;

      if (data.success) {
        // Create and download HTML file that can be printed as PDF
        const blob = new Blob([data.htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${test?.title || 'test'}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Test exported! Open the HTML file and print as PDF."
        });
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export test. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleTestSettings = async (settings: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('test-settings', {
        body: { 
          testId, 
          action: 'updateSettings',
          settings 
        }
      });

      if (error) throw error;

      if (data.success) {
        setTest(prev => prev ? { ...prev, ...settings } : null);
        setShowTestSettings(false);

        toast({
          title: "Success",
          description: "Test settings updated successfully!"
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updateOptionCorrectness = (optionIndex: number) => {
    if (newQuestion.allow_multiple_correct) {
      // Allow multiple correct answers
      setNewQuestion(prev => ({
        ...prev,
        options: prev.options?.map((opt, idx) => 
          idx === optionIndex ? { ...opt, isCorrect: !opt.isCorrect } : opt
        ) || []
      }));
    } else {
      // Single correct answer (original behavior)
      setNewQuestion(prev => ({
        ...prev,
        options: prev.options?.map((opt, idx) => ({
          ...opt,
          isCorrect: idx === optionIndex
        })) || []
      }));
    }
  };

  const updateOptionText = (optionIndex: number, text: string) => {
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options?.map((opt, idx) => 
        idx === optionIndex ? { ...opt, text } : opt
      ) || []
    }));
  };

  const uploadQuestionImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `question-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      setNewQuestion(prev => ({
        ...prev,
        image_url: data.publicUrl,
        image_alt: file.name
      }));

      toast({
        title: "Success",
        description: "Image uploaded successfully!"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    }
  };

  const uploadOptionImage = async (file: File, optionIndex: number) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-option-${optionIndex}.${fileExt}`;
      const filePath = `question-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      setNewQuestion(prev => ({
        ...prev,
        options: prev.options?.map((opt, idx) => 
          idx === optionIndex ? { ...opt, image_url: data.publicUrl } : opt
        ) || []
      }));

      toast({
        title: "Success",
        description: "Option image uploaded successfully!"
      });
    } catch (error) {
      console.error('Error uploading option image:', error);
      toast({
        title: "Error",
        description: "Failed to upload option image. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateQuestionsWithAI = async () => {
    if (!test) {
      toast({
        title: "Error",
        description: "Test data not available.",
        variant: "destructive"
      });
      return;
    }

    try {
      setAiGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('ai-question-generator', {
        body: { 
          prompt: `Generate 5 multiple choice questions for ${test.subject} subject, ${test.class} class level, ${test.difficulty} difficulty.`,
          subject: test.subject,
          class: test.class,
          difficulty: test.difficulty,
          testId: testId
        }
      });

      if (error) throw error;

      if (data?.success && data.questions) {
        // Add generated questions to the test
        for (const question of data.questions) {
          const questionData = {
            ...question,
            test_id: testId,
            order_num: questions.length + 1,
            question_type: 'mcq' as const
          };
          
          const { data: addedQuestion, error: addError } = await supabase.functions.invoke('tests-api', {
            body: { action: 'addQuestion', testId, question: questionData }
          });

          if (!addError && addedQuestion.success) {
            setQuestions(prev => [...prev, addedQuestion.question]);
          }
        }

        toast({
          title: "Success",
          description: `Generated ${data.questions.length} questions using AI!`
        });
      }
    } catch (error) {
      console.error('Error generating AI questions:', error);
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const processImageWithOCR = async (file: File) => {
    setOcrProcessing(true);
    try {
      // Step 1: Upload full image first
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `question_full_${Date.now()}.${ext}`;
      const filePath = `question-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Step 2: Extract text using OCR
      const extractTextFromImage = async (file: File): Promise<string> => {
        const preprocessImage = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
              const maxSide = 1600;
              let width = img.naturalWidth;
              let height = img.naturalHeight;
              if (width > maxSide || height > maxSide) {
                const scale = Math.min(maxSide / width, maxSide / height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return reject(new Error('Canvas not supported'));
              ctx.drawImage(img, 0, 0, width, height);
              // Enhance contrast for better OCR
              const imgData = ctx.getImageData(0, 0, width, height);
              const data = imgData.data;
              const contrast = 1.4;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i+1], b = data[i+2];
                let v = 0.299*r + 0.587*g + 0.114*b;
                v = (v/255 - 0.5) * contrast + 0.5;
                v = Math.max(0, Math.min(1, v));
                const vi = Math.round(v * 255);
                data[i] = data[i+1] = data[i+2] = vi;
              }
              ctx.putImageData(imgData, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              URL.revokeObjectURL(url);
              resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = url;
          });
        };

        const imageDataUrl = await preprocessImage(file);
        const { createWorker } = await import('tesseract.js');
        const worker: any = await (createWorker as any)();
        if (worker.loadLanguage) {
          await worker.loadLanguage('eng');
          await worker.initialize('eng');
          if (worker.setParameters) {
            await worker.setParameters({ 
              tessedit_pageseg_mode: '6',
              tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,[]{}()+-=/<>:; ?()'
            });
          }
        }
        const { data: { text } } = await worker.recognize(imageDataUrl);
        await worker.terminate();
        return text || '';
      };

      // Extract text using OCR
      console.log('📝 Extracting text from image...');
      const extractedText = await extractTextFromImage(file);
      
      // Clean up extracted text
      let questionText = extractedText.replace(/\r/g, '').trim();
      questionText = questionText
        .replace(/\[IMAGE\]/gi, '')
        .replace(/\[IMG\]/gi, '')
        .replace(/\[TMAGE\]/gi, '')
        .replace(/\[INAGE\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      console.log('✅ Extracted text:', questionText);

      // Set both image URL and extracted text
      if (editingQuestion) {
        setEditingQuestion({
          ...editingQuestion,
          image_url: publicUrl,
          question_text: questionText || editingQuestion.question_text
        });
      } else {
        setNewQuestion({
          ...newQuestion,
          image_url: publicUrl,
          question_text: questionText || newQuestion.question_text
        });
      }

      toast({
        title: '🎉 Perfect!',
        description: `Image uploaded & text extracted! ${questionText ? 'Question text auto-filled.' : 'Use crop/enhance for fine-tuning.'}`
      });

    } catch (error) {
      console.error('❌ Processing error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleBulkAddQuestions = async (questions: any[]) => {
    let success = 0;
    const { data: { session } } = await supabase.auth.getSession();

    for (const [idx, q] of questions.entries()) {
      try {
        const base = {
          test_id: testId,
          marks: Number(q.marks || 1),
          position: questions.length + idx + 1,
          explanation: q.explanation || null,
          difficulty: q.difficulty || 'medium',
          tags: q.tags || [],
        };

        let payload: any = { ...base };
        switch (q.question_type) {
          case 'mcq':
            payload.qtype = 'mcq';
            payload.question_text = q.question_text;
            payload.options = (q.options || []).map((opt: string, i: number) => ({
              text: opt,
              isCorrect: typeof q.correct_answer === 'number'
                ? i === q.correct_answer
                : (Array.isArray(q.correct_answer) ? q.correct_answer.includes(i) : false)
            }));
            if (typeof q.correct_answer === 'string') {
              payload.correct_answer = q.correct_answer;
            }
            break;
          case 'true_false':
            payload.qtype = 'mcq';
            payload.question_text = q.question_text;
            payload.options = [
              { text: 'True',  isCorrect: q.correct_answer === true || q.correct_answer === 'True' },
              { text: 'False', isCorrect: q.correct_answer === false || q.correct_answer === 'False' }
            ];
            payload.correct_answer = (q.correct_answer === true || q.correct_answer === 'True') ? 'True' : 'False';
            break;
          case 'short_answer':
            payload.qtype = 'subjective';
            payload.question_text = q.question_text;
            payload.sample_answer = q.correct_answer || '';
            break;
          case 'match_column':
            payload.qtype = 'mcq';
            payload.question_text = q.question_text || 'Match the following';
            payload.left_column = q.left_column || [];
            payload.right_column = q.right_column || [];
            break;
          case 'assertion_reason':
            payload.qtype = 'mcq';
            payload.question_text = `Assertion (A): ${q.assertion}\nReason (R): ${q.reason}`;
            payload.assertion = q.assertion;
            payload.reason = q.reason;
            break;
          case 'fill_blank':
            payload.qtype = 'mcq';
            payload.question_text = q.question_text;
            payload.blanks_count = q.blanks_count || 1;
            break;
          default:
            payload.qtype = 'mcq';
            payload.question_text = q.question_text || '';
            break;
        }

        const { data, error } = await supabase.functions.invoke('tests-api', {
          body: { action: 'addQuestion', questionData: payload },
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
        });
        if (error || !data?.success) throw new Error(error?.message || data?.error || 'Failed to add');
        success++;
      } catch (e) {
        console.error('Bulk add failed for question', q?.id || q?.question_number, e);
      }
    }
    return success;
  };

  // Handle PDF question extraction
  const handlePDFQuestionExtracted = async (questionText: string, options?: string[], imageData?: string) => {
    try {
      // Keep PDF extractor open for continuous extraction
      
      // Increment dialog session to force clean render
      setDialogSessionId(prev => prev + 1);
      
      // Set the extracted text to question field
      setNewQuestion(prev => {
        const baseOptions = (prev.options && prev.options.length === 4)
          ? [...prev.options]
          : [
              { text: '', isCorrect: true },
              { text: '', isCorrect: false },
              { text: '', isCorrect: false },
              { text: '', isCorrect: false }
            ];
        
        let nextOptions = baseOptions;
        if (options && options.length > 0) {
          nextOptions = baseOptions.map((opt, i) => ({
            ...opt,
            text: options[i] !== undefined ? options[i] : opt.text
          }));
        }
        
        return {
          ...prev,
          question_text: questionText,
          image_url: imageData || '',
          options: nextOptions
        };
      });
      
      // Mark as extracted mode and show dialog
      setOpenMode('extracted');
      setShowQuestionDialog(true);
      
      toast({
        title: "Text extracted!",
        description: "Review the question and press 'Add Question' to save.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error handling PDF extraction:', error);
      toast({
        title: "Error",
        description: "Failed to process extracted question",
        variant: "destructive"
      });
    }
  };

   // Enhanced image processing function (fixed)
  const enhanceQuestionImage = async (questionId: string, imageUrl: string, enhanceType: 'darken' | 'lighten' = enhancementType) => {
    setIsEnhancing(true);
    try {
      // Load the image with proper CORS handling
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Handle blob URLs differently
      if (imageUrl.startsWith('blob:')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = reader.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      canvas.width = img.width;
      canvas.height = img.height;

      // Fill with pure white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Enhance contrast based on type
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate luminance
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        
        if (enhanceType === 'darken') {
          // Darken mode: Make dark areas darker and keep light areas white
          if (luminance > 200) {
            // Light pixels become pure white
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
          } else if (luminance < 100) {
            // Dark pixels become much darker
            data[i] = Math.max(0, r - 50);
            data[i + 1] = Math.max(0, g - 50);
            data[i + 2] = Math.max(0, b - 50);
          } else {
            // Medium pixels - enhance contrast towards darker
            const factor = 1.8;
            data[i] = Math.min(255, Math.max(0, (r - 128) * factor + 90));
            data[i + 1] = Math.min(255, Math.max(0, (g - 128) * factor + 90));
            data[i + 2] = Math.min(255, Math.max(0, (b - 128) * factor + 90));
          }
        } else {
          // Lighten mode: Make everything lighter and reduce contrast
          if (luminance > 150) {
            // Already light pixels become even lighter
            data[i] = Math.min(255, r + 30);
            data[i + 1] = Math.min(255, g + 30);
            data[i + 2] = Math.min(255, b + 30);
          } else {
            // Dark pixels become lighter
            const factor = 0.7;
            data[i] = Math.min(255, Math.max(0, (r - 128) * factor + 160));
            data[i + 1] = Math.min(255, Math.max(0, (g - 128) * factor + 160));
            data[i + 2] = Math.min(255, Math.max(0, (b - 128) * factor + 160));
          }
        }
      }

      // Apply processed image data
      ctx.putImageData(imageData, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
      });

      // Upload enhanced image
      const fileName = `enhanced_question_${questionId}_${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(fileName);

      // Update question with enhanced image
      setQuestions(prev => prev.map(q => 
        q.id === questionId 
          ? { ...q, image_url: publicUrl }
          : q
      ));

      toast({
        title: "Success",
        description: "Image enhanced successfully!",
      });
    } catch (error) {
      console.error('Enhancement error:', error);
      toast({
        title: "Error",
        description: "Failed to enhance image",
        variant: "destructive"
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleCropQuestionImage = (questionId: string, imageUrl: string) => {
    openCropDialog(imageUrl, 'question', parseInt(questionId));
  };

  const openCropDialog = (imageSrc: string, type: 'question' | 'option', index: number = -1) => {
    setCropImageSrc(imageSrc);
    setCropImageType(type);
    setCropImageIndex(index);
    setCrop(undefined);
    setIsCropDialogOpen(true);
  };

  const getCroppedImg = async (image: HTMLImageElement, crop: PixelCrop): Promise<File> => {
    return new Promise(async (resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No 2d context'));

        // Always re-load the image via fetch->blob to avoid CORS taint
        const src = image.src;
        const response = await fetch(src);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const tempImg = new Image();
        await new Promise<void>((res, rej) => {
          tempImg.onload = () => res();
          tempImg.onerror = () => rej(new Error('Image load failed'));
          tempImg.src = objectUrl;
        });

        const pixelRatio = window.devicePixelRatio;
        canvas.width = Math.max(1, Math.floor(crop.width * pixelRatio));
        canvas.height = Math.max(1, Math.floor(crop.height * pixelRatio));
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.imageSmoothingQuality = 'high';

        const scaleX = tempImg.naturalWidth / (image.width || tempImg.naturalWidth);
        const scaleY = tempImg.naturalHeight / (image.height || tempImg.naturalHeight);

        ctx.drawImage(
          tempImg,
          crop.x * scaleX,
          crop.y * scaleY,
          crop.width * scaleX,
          crop.height * scaleY,
          0,
          0,
          crop.width,
          crop.height
        );

        URL.revokeObjectURL(objectUrl);

        canvas.toBlob((outBlob) => {
          if (!outBlob) return reject(new Error('Canvas is empty'));
          resolve(new File([outBlob], 'cropped-image.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.95);
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleCropSave = async () => {
    if (!imgRef.current || !completedCrop) {
      toast({
        title: "Error",
        description: "Please select a crop area",
        variant: "destructive"
      });
      return;
    }

    try {
      const croppedFile = await getCroppedImg(imgRef.current, completedCrop);
      
      // Upload the cropped image
      const fileExt = 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `question-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, croppedFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      const imageUrl = data.publicUrl;

      // Update the appropriate field
      if (cropImageType === 'question') {
        if (editingQuestion) {
          setEditingQuestion({
            ...editingQuestion,
            image_url: imageUrl
          });
        } else {
          setNewQuestion({
            ...newQuestion,
            image_url: imageUrl
          });
        }
      } else if (cropImageType === 'option' && cropImageIndex >= 0) {
        if (editingQuestion) {
          const updatedOptions = [...(editingQuestion.options || [])];
          updatedOptions[cropImageIndex] = {
            ...updatedOptions[cropImageIndex],
            image_url: imageUrl
          };
          setEditingQuestion({
            ...editingQuestion,
            options: updatedOptions
          });
        } else {
          const updatedOptions = [...(newQuestion.options || [])];
          updatedOptions[cropImageIndex] = {
            ...updatedOptions[cropImageIndex],
            image_url: imageUrl
          };
          setNewQuestion({
            ...newQuestion,
            options: updatedOptions
          });
        }
      }

      setIsCropDialogOpen(false);
      toast({
        title: "Success",
        description: "Image cropped and updated successfully!"
      });
    } catch (error) {
      console.error('Error cropping image:', error);
      toast({
        title: "Error",
        description: "Failed to crop image",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading test builder...</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Test not found</h2>
        <Button onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{test.title}</h1>
            <p className="text-muted-foreground">{test.subject} • {test.class}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <Badge variant="outline" className="animate-pulse">
              <Save className="h-3 w-3 mr-1" />
              Saving...
            </Badge>
          )}
          <Badge variant={test.is_published ? 'default' : 'outline'}>
            {test.is_published ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {test.is_published ? 'Published' : 'Draft'}
          </Badge>
        </div>
      </div>

      {/* Test Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <BookOpen className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Questions</p>
              <p className="text-2xl font-bold">{questions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <Target className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Marks</p>
              <p className="text-2xl font-bold">{totalMarks}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <Timer className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Duration</p>
              <p className="text-2xl font-bold">{test.duration_minutes}m</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="default" onClick={() => setShowBulkExtractor(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload PDF/Word (Bulk Extract)
        </Button>
        <Button onClick={() => setShowQuestionDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question Manually
        </Button>
        <Button variant="outline" onClick={() => ocrInputRef.current?.click()} disabled={ocrProcessing}>
          <ScanText className={`h-4 w-4 mr-2 ${ocrProcessing ? 'animate-spin' : ''}`} />
          {ocrProcessing ? 'Processing...' : 'Upload Question Image'}
        </Button>
        <input
          ref={ocrInputRef}
          id="ocr-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              processImageWithOCR(file);
              setShowQuestionDialog(true);
              e.currentTarget.value = '';
            }
          }}
        />
        <Button variant="outline" onClick={() => setShowTestSettings(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Test Settings
        </Button>
        <Button variant="outline" onClick={exportToPDF}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button 
          onClick={publishTest}
          disabled={questions.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          <Eye className="h-4 w-4 mr-2" />
          {test.is_published ? 'Published' : 'Publish Test'}
        </Button>
      </div>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No questions added yet. Start by adding your first question.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card key={question.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Q{index + 1}</Badge>
                          <Badge variant={question.question_type === 'mcq' ? 'default' : 'secondary'}>
                            {question.question_type === 'mcq' ? 'MCQ' : 'Subjective'}
                          </Badge>
                          <Badge variant="outline">{question.marks} marks</Badge>
                        </div>
                        
                        {/* Display Question Image */}
                        {question.image_url && (
                          <div className="mb-2 relative group">
                            <img 
                              src={question.image_url} 
                              alt={question.image_alt || "Question image"} 
                              className="max-w-md h-auto rounded border bg-white"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => handleCropQuestionImage(question.id!, question.image_url!)}
                                >
                                  <CropIcon className="h-3 w-3 mr-1" />
                                  Crop
                                </Button>
                                <div className="flex items-center gap-1">
                                  <select 
                                    value={enhancementType} 
                                    onChange={(e) => setEnhancementType(e.target.value as 'darken' | 'lighten')}
                                    className="text-xs px-2 py-1 border rounded"
                                  >
                                    <option value="darken">Darken</option>
                                    <option value="lighten">Lighten</option>
                                  </select>
                                  <Button 
                                    size="sm" 
                                    variant="secondary"
                                    onClick={() => enhanceQuestionImage(question.id!, question.image_url!)}
                                    disabled={isEnhancing}
                                  >
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    {isEnhancing ? 'Processing...' : 'Enhance'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div 
                          className="font-medium mb-2 prose prose-sm max-w-none question-content"
                          dangerouslySetInnerHTML={{
                            __html: renderWithImages(question.question_text)
                          }}
                        />
                        {question.question_type === 'mcq' && question.options && (
                          <div className="space-y-1">
                            {question.options.map((option, optIndex) => {
                              const sanitizedText = stripLeadingOptionLabel(option.text);
                              console.log('Render option', {
                                qId: question.id,
                                optIndex,
                                raw: option.text,
                                sanitized: sanitizedText
                              });
                              return (
                                <div 
                                  key={`opt-${question.id ?? index}-${optIndex}`} 
                                  className={`text-sm p-2 rounded flex items-center gap-2 ${option.isCorrect ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50'}`}
                                >
                                  {option.image_url && (
                                    <img src={option.image_url} alt="Option" className="h-8 w-8 object-cover rounded" />
                                  )}
                                  <span>
                                    <span className="font-medium">{String.fromCharCode(65 + optIndex)}. </span>
                                    <span 
                                      className="font-sans prose prose-sm max-w-none question-content inline"
                                      dangerouslySetInnerHTML={{ __html: renderWithImages(sanitizedText) }} 
                                    />
                                  </span>
                                  {option.isCorrect && <span className="ml-auto text-xs">(Correct)</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="outline" onClick={() => handleEditQuestion(question)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteQuestion(question.id!)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exit Confirmation for Question Dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Question</AlertDialogTitle>
            <AlertDialogDescription>
              You have an unsaved question. Your progress will be automatically saved and you can continue later.
              Are you sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowExitConfirmation(false);
              setShowQuestionDialog(false);
              setHasUnsavedQuestion(false);
            }}>
              Exit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Question Dialog */}
      <Dialog 
        open={showQuestionDialog} 
        onOpenChange={(open) => {
          if (!open && hasUnsavedQuestion) {
            setShowExitConfirmation(true);
          } else {
            setShowQuestionDialog(open);
            if (!open) {
              localStorage.removeItem(questionStorageKey);
              setHasUnsavedQuestion(false);
              resetQuestionForm();
            }
          }
        }}
      >
        <DialogContent key={dialogSessionId} className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Edit Question' : 'Add New Question'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="question-type">Question Type</Label>
              <Select 
                value={newQuestion.question_type} 
                onValueChange={(value: 'mcq' | 'subjective') => 
                  setNewQuestion(prev => ({ ...prev, question_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                  <SelectItem value="subjective">Subjective/Text Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="question-text">Question Text</Label>
              <Textarea
                id="question-text"
                placeholder="Enter your question here... Use LaTeX for math: $x^2$ for superscript, $x_2$ for subscript, $\frac{a}{b}$ for fractions"
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                rows={4}
              />
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <div className="font-semibold">Chemical Formulas (use braces for precise control):</div>
                <div>• H₂SO₄ → <code>H_{"{2}"}SO_{"{4}"}</code> (braces control subscript length)</div>
                <div>• Fe²⁺ → <code>Fe^{"{2+}"}</code> | Simple: H_2 (next char only)</div>
                
                <div className="font-semibold mt-2">Chemical Arrows:</div>
                <div>• Reaction: <code>-&gt;</code> → → | Long: <code>\longrightarrow</code> → ⟶</div>
                <div>• Equilibrium: <code>&lt;-&gt;</code> → ⇌</div>
                
                <div className="font-semibold mt-2">Example:</div>
                <div><code>2Na + Cl_{"{2}"} -&gt; 2NaCl</code></div>
              </div>
              {newQuestion.question_text && (
                <div className="mt-2 p-2 border rounded bg-gray-50">
                  <Label className="text-xs text-muted-foreground">Preview:</Label>
                  <div className="space-y-2">
                    <div 
                      className="prose prose-sm max-w-none question-content"
                      dangerouslySetInnerHTML={{
                        __html: renderWithImages(newQuestion.question_text)
                      }}
                    />
                    {(newQuestion as any).originalImageUrl && (
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">
                          {(newQuestion as any).hasImageMarkers 
                            ? "✅ [IMAGE] marker detected in text" 
                            : "📷 Image available (add [IMAGE] marker in text to embed)"
                          }
                        </div>
                        <img 
                          src={(newQuestion as any).originalImageUrl} 
                          alt="Question Image" 
                          className="max-w-full h-auto rounded border max-h-48 object-contain bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Question Image Upload */}
            <div>
              <Label>Question Image (Optional)</Label>
              <div className="flex items-center gap-4">
                <Label htmlFor="question-image" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    Upload Image
                  </div>
                </Label>
                <input
                  id="question-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadQuestionImage(file);
                  }}
                />
                {newQuestion.image_url && (
                  <div className="flex items-center gap-2">
                    <img src={newQuestion.image_url} alt="Question" className="h-16 w-16 object-cover rounded" />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openCropDialog(newQuestion.image_url!, 'question')}
                      className="flex items-center gap-1"
                    >
                       <CropIcon className="h-3 w-3" />
                       Crop
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setNewQuestion(prev => ({ 
                          ...prev, 
                          image_url: undefined, 
                          image_alt: undefined 
                        }));
                        toast({
                          title: "Image removed",
                          description: "Click 'Update Question' to save changes"
                        });
                      }}
                      className="flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {newQuestion.question_type === 'mcq' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allow-multiple"
                    checked={newQuestion.allow_multiple_correct}
                    onChange={(e) => setNewQuestion(prev => ({ 
                      ...prev, 
                      allow_multiple_correct: e.target.checked,
                      options: e.target.checked ? prev.options : prev.options?.map((opt, idx) => ({
                        ...opt,
                        isCorrect: idx === 0
                      }))
                    }))}
                  />
                  <Label htmlFor="allow-multiple">Allow multiple correct answers</Label>
                </div>

                <div>
                  <Label>Answer Options</Label>
                  <div className="space-y-3">
                    {newQuestion.options?.map((option, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <Input
                              placeholder={`Option ${String.fromCharCode(65 + index)} - Use: H_{2}O for H₂O (braces for exact length), x^2, -> for arrow`}
                              value={option.text}
                              onChange={(e) => updateOptionText(index, e.target.value)}
                            />
                            {option.text && (
                              <div className="text-xs p-1 bg-gray-50 rounded border">
                                <span className="text-gray-500">Preview: </span>
                                <span className="font-medium">{String.fromCharCode(65 + index)}. </span>
                                <span 
                                  className="font-sans prose prose-sm max-w-none question-content inline"
                                  dangerouslySetInnerHTML={{
                                    __html: renderWithImages(stripLeadingOptionLabel(option.text))
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={option.isCorrect ? 'default' : 'outline'}
                            onClick={() => updateOptionCorrectness(index)}
                          >
                            {option.isCorrect ? 'Correct' : 'Mark Correct'}
                          </Button>
                        </div>
                        
                        {/* Option Image Upload */}
                        <div className="flex items-center gap-2 ml-10">
                          <Label htmlFor={`option-image-${index}`} className="cursor-pointer">
                            <div className="flex items-center gap-2 px-3 py-1 border rounded text-sm hover:bg-gray-50">
                              <ImageIcon className="h-4 w-4" />
                              Add Image
                            </div>
                          </Label>
                          <input
                            id={`option-image-${index}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadOptionImage(file, index);
                            }}
                          />
                          {option.image_url && (
                            <div className="flex items-center gap-2">
                              <img src={option.image_url} alt="Option" className="h-8 w-8 object-cover rounded" />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openCropDialog(option.image_url!, 'option', index)}
                                className="flex items-center gap-1 text-xs h-6"
                              >
                                 <CropIcon className="h-3 w-3" />
                                 Crop
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setNewQuestion(prev => ({
                                  ...prev,
                                  options: prev.options?.map((opt, idx) => 
                                    idx === index ? { ...opt, image_url: undefined } : opt
                                  ) || []
                                }))}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {newQuestion.question_type === 'subjective' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="word-limit">Word Limit (Optional)</Label>
                  <Input
                    id="word-limit"
                    type="number"
                    placeholder="e.g., 100"
                    value={newQuestion.word_limit || ''}
                    onChange={(e) => setNewQuestion(prev => ({ 
                      ...prev, 
                      word_limit: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="marks">Marks</Label>
                  <Input
                    id="marks"
                    type="number"
                    value={newQuestion.marks}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setNewQuestion(prev => ({ ...prev, marks: '' as any }));
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue > 0) {
                          setNewQuestion(prev => ({ ...prev, marks: numValue }));
                        }
                      }
                    }}
                    onBlur={(e) => e.currentTarget.blur()}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  />
                </div>
              </div>
            )}

            {newQuestion.question_type === 'mcq' && (
              <div>
                <Label htmlFor="marks">Marks</Label>
                <Input
                  id="marks"
                  type="number"
                  value={newQuestion.marks}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setNewQuestion(prev => ({ ...prev, marks: '' as any }));
                    } else {
                      const numValue = parseInt(value);
                      if (!isNaN(numValue) && numValue > 0) {
                        setNewQuestion(prev => ({ ...prev, marks: numValue }));
                      }
                    }
                  }}
                  onBlur={(e) => e.currentTarget.blur()}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                />
              </div>
            )}

            <div>
              <Label htmlFor="explanation">Explanation (Optional)</Label>
              <Textarea
                id="explanation"
                placeholder="Explain the correct answer or provide additional context..."
                value={newQuestion.explanation || ''}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                if (hasUnsavedQuestion) {
                  setShowExitConfirmation(true);
                } else {
                  setShowQuestionDialog(false);
                  resetQuestionForm();
                  setOpenMode('new');
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={editingQuestion ? handleUpdateQuestion : handleAddQuestion}
              disabled={(() => {
                // Validate question text
                if (!newQuestion.question_text?.trim()) return true;
                
                // Validate marks
                const marks = Number(newQuestion.marks);
                if (!isFinite(marks) || marks <= 0) return true;
                
                // MCQ validation
                if (newQuestion.question_type === 'mcq' && newQuestion.options) {
                  const filledOptions = newQuestion.options.filter(opt => opt.text?.trim());
                  if (filledOptions.length === 0) return true;
                  
                  const correctOptions = newQuestion.options.filter(opt => opt.isCorrect);
                  if (correctOptions.length === 0) return true;
                  
                  if (!newQuestion.allow_multiple_correct && correctOptions.length !== 1) return true;
                }
                
                return false;
              })()}
            >
              {editingQuestion ? 'Update Question' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Settings Dialog */}
      <TestSettingsDialog
        open={showTestSettings}
        onOpenChange={setShowTestSettings}
        testId={testId || ''}
        onSettingsUpdate={fetchTestData}
      />

      {/* Image Crop Dialog */}
      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cropImageSrc && (
              <div className="flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={undefined}
                  className="max-w-full"
                >
                  <img
                    ref={imgRef}
                    src={cropImageSrc}
                    alt="Crop"
                    className="max-w-full max-h-96 object-contain"
                    onLoad={() => {
                      if (imgRef.current) {
                        const { width, height } = imgRef.current;
                        setCrop({
                          unit: 'px',
                          x: width * 0.1,
                          y: height * 0.1,
                          width: width * 0.8,
                          height: height * 0.8,
                        });
                      }
                    }}
                  />
                </ReactCrop>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCropDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCropSave}>
                Save Cropped Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Question Extractor */}
      {showPDFExtractor && (
        <PDFQuestionExtractor
          onQuestionExtracted={handlePDFQuestionExtracted}
          onClose={() => setShowPDFExtractor(false)}
        />
      )}

      {/* Bulk Question Extractor */}
      <Dialog open={showBulkExtractor} onOpenChange={setShowBulkExtractor}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Upload & Extract Questions (Bulk)</DialogTitle>
            <DialogDescription>
              Upload PDF/Word documents to extract questions automatically
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <SmartQuestionExtractor
              mode="test-builder"
              testId={testId}
              testTitle={test?.title}
              subject={test?.subject}
              difficulty={test?.difficulty}
              onQuestionsAdded={async (questions) => {
                const added = await handleBulkAddQuestions(questions);
                toast({ 
                  title: "Questions added", 
                  description: `Successfully added ${added}/${questions.length} questions` 
                });
                setShowBulkExtractor(false);
                await fetchTestData();
              }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestBuilderPortal;