import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Save, 
  Eye, 
  Wand2, 
  GripVertical, 
  Trash2, 
  Edit,
  Download,
  ArrowLeft,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Move,
  Copy,
  Settings,
  X,
  Image as ImageIcon,
  ChevronDown,
  Upload,
  Loader2
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { SmartQuestionExtractor } from './SmartQuestionExtractor';
import { renderWithImages, stripLeadingOptionLabel } from '@/lib/mathRendering';

interface Question {
  id?: string;
  qtype: 'mcq' | 'subjective';
  question_text: string;
  image_url?: string;
  image_alt?: string;
  options?: { text: string; isCorrect: boolean }[];
  correct_answer?: string;
  marks: number;
  position: number;
  explanation?: string;
  sample_answer?: string;
  word_limit?: number;
  tags?: string[];
}

interface Test {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  difficulty: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  status: string;
  instructions?: string;
  is_published: boolean;
  exam_domain?: string;
}

const TestBuilder: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showTestSettings, setShowTestSettings] = useState(false);
  const [hasUnsavedQuestion, setHasUnsavedQuestion] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showDocumentExtraction, setShowDocumentExtraction] = useState(false);
  const [showAIPromptDialog, setShowAIPromptDialog] = useState(false);
  const [showImageExtractor, setShowImageExtractor] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [showBulkExtractor, setShowBulkExtractor] = useState(false);
  const [extractorMode, setExtractorMode] = useState<'upload' | 'manual'>('upload');
  const { toast } = useToast();
  const autoSaveTimer = useRef<NodeJS.Timeout>();
  const questionStorageKey = `test-builder-question-${testId}`;

  const [newQuestion, setNewQuestion] = useState<Question>({
    qtype: 'mcq',
    question_text: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    marks: 1,
    position: 0,
    explanation: '',
    tags: []
  });

  // Load saved question on mount
  useEffect(() => {
    const saved = localStorage.getItem(questionStorageKey);
    if (saved && showQuestionDialog) {
      try {
        const parsed = JSON.parse(saved);
        setNewQuestion(parsed);
        setHasUnsavedQuestion(true);
      } catch (error) {
        console.error('Failed to load saved question:', error);
      }
    }
  }, [questionStorageKey, showQuestionDialog]);

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

  useEffect(() => {
    // Auto-save every 30 seconds
    const saveData = () => {
      if (test && questions.length > 0) {
        autoSave();
      }
    };

    autoSaveTimer.current = setInterval(saveData, 30000);
    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }
    };
  }, [test, questions]);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'getTestWithQuestions', testId },
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
      });

      if (error) throw error;

      if (data.success) {
        setTest(data.test);
        setQuestions(data.questions || []);
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

  const autoSave = async () => {
    try {
      setSaving(true);
      
      const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
      
      await supabase.functions.invoke('tests-api', {
        body: { 
          action: 'updateTest', 
          testId, 
          updates: { total_marks: totalMarks }
        }
      });

      toast({
        title: "Auto-saved",
        description: "Changes saved automatically",
        duration: 2000
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAddQuestions = async (questionsToAdd: any[]) => {
    let successCount = 0;
    const totalCount = questionsToAdd.length;
    const MAX_RETRIES = 2;
    
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { Authorization: `Bearer ${session?.access_token ?? ''}` };
    
    // Show initial progress using console (toast doesn't support real-time updates)
    console.log(`📊 Starting bulk add: 0/${totalCount} questions`);
    
    try {
      for (const q of questionsToAdd) {
        let retries = 0;
        let success = false;
        
        while (retries <= MAX_RETRIES && !success) {
          try {
            const questionData = {
              test_id: testId,
              question_text: q.question_text,
              qtype: q.question_type === 'short_answer' ? 'subjective' : 'mcq',
              marks: q.marks || 1,
              position: questions.length + successCount + 1,
              options: q.options,
              correct_answer: q.correct_answer,
              explanation: q.explanation,
              tags: q.tags || [],
              // Support for advanced question types
              assertion: q.assertion,
              reason: q.reason,
              left_column: q.left_column,
              right_column: q.right_column,
              blanks_count: q.blanks_count,
              difficulty: q.difficulty || 'medium'
            };
            
            const { data, error } = await supabase.functions.invoke('tests-api', {
              body: { action: 'addQuestion', questionData },
              headers
            });
            
            if (data?.success) {
              successCount++;
              success = true;
              console.log(`📊 Progress: ${successCount}/${totalCount} questions added`);
            } else {
              throw new Error(error?.message || 'Failed to add question');
            }
          } catch (error) {
            retries++;
            if (retries > MAX_RETRIES) {
              console.error(`❌ Failed to add question after ${MAX_RETRIES} retries:`, q.id, error);
            } else {
              console.log(`🔄 Retrying question ${q.id}... (attempt ${retries}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      }
      
      // Refresh questions list after bulk add - CRITICAL!
      console.log('🔄 Refreshing test data after bulk add...');
      await fetchTestData();
      console.log('✅ Test data refreshed successfully');
      
      return successCount;
    } catch (error) {
      console.error('Error in handleBulkAddQuestions:', error);
      throw error;
    }
  };

  const handleAddQuestion = async () => {
    try {
      const questionData = {
        ...newQuestion,
        marks: Number(newQuestion.marks),
        test_id: testId,
        position: questions.length + 1
      };

      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'addQuestion', questionData }
      });

      if (error) throw error;

      if (data.success) {
        setQuestions(prev => [...prev, data.question]);
        setShowQuestionDialog(false);
        localStorage.removeItem(questionStorageKey);
        setHasUnsavedQuestion(false);
        resetQuestionForm();

        toast({
          title: "Success",
          description: "Question added successfully!"
        });
      }
    } catch (error) {
      console.error('Error adding question:', error);
      toast({
        title: "Error",
        description: "Failed to add question. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion?.id) return;

    try {
      // Ensure removed image fields are persisted as null (undefined is ignored by backend)
      const updates = {
        ...newQuestion,
        image_url: newQuestion.image_url ?? null,
        image_alt: newQuestion.image_alt ?? null,
      };

      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { 
          action: 'updateQuestion', 
          questionId: editingQuestion.id,
          updates,
          removeImage: !newQuestion.image_url // force server to null image fields when removed
        }
      });

      if (error) throw error;

      if (data.success) {
        setQuestions(prev => prev.map(q => 
          q.id === editingQuestion.id ? data.question : q
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
      const headers = { Authorization: `Bearer ${session?.access_token ?? ''}` };
      
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'deleteQuestion', questionId },
        headers
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
      qtype: 'mcq',
      question_text: '',
      image_url: undefined,
      image_alt: undefined,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      marks: 1,
      position: 0,
      explanation: '',
      tags: []
    });
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setNewQuestion({ ...question });
    setShowQuestionDialog(true);
  };

  const handleAIPromptGeneration = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt describing the questions you want",
        variant: "destructive"
      });
      return;
    }

    try {
      setAiGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('ai-question-generator-v2', {
        body: { 
          prompt: aiPrompt,
          testContext: {
            subject: test?.subject,
            class: test?.class,
            difficulty: test?.difficulty,
            testTitle: test?.title
          },
          includeSolutions: true,
          count: 5,
          format: 'structured'
        }
      });

      if (error) throw error;

      if (data?.success && data.questions) {
        let successCount = 0;
        
        for (const question of data.questions) {
          const questionData = {
            question_text: question.question_text,
            qtype: question.qtype || 'mcq',
            marks: question.marks || 1,
            options: question.options || [],
            correct_answer: question.correct_answer,
            explanation: question.explanation || question.solution,
            test_id: testId,
            position: questions.length + successCount + 1,
            tags: question.tags || []
          };

          const { data: { session } } = await supabase.auth.getSession();
          const headers = { Authorization: `Bearer ${session?.access_token ?? ''}` };
          
          const result = await supabase.functions.invoke('tests-api', {
            body: { action: 'addQuestion', questionData },
            headers
          });

          if (result.data?.success) {
            successCount++;
          }
        }

        await fetchTestData();
        setShowAIPromptDialog(false);
        setAiPrompt('');
        
        toast({
          title: "Success!",
          description: `Generated ${successCount} questions with solutions using AI!`
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsImageUploading(true);
    setShowImageExtractor(false);
    setShowDocumentExtraction(true);
    
    toast({
      title: "Processing images...",
      description: "Using OCR to extract text from images"
    });
  };

  const generateQuestionsWithAI = async () => {
    try {
      setAiGenerating(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token ?? ''}` };
      
      const { data, error } = await supabase.functions.invoke('ai-question-generator', {
        body: { 
          prompt: `Generate 5 multiple choice questions for ${test?.subject} subject, ${test?.class} class level, ${test?.difficulty} difficulty.`,
          subject: test?.subject,
          class: test?.class,
          difficulty: test?.difficulty,
          count: 5,
          type: 'mcq'
        }
      });

      if (error) throw error;

      if (data?.success && data.questions) {
        // Add generated questions to the test
        for (const question of data.questions) {
          const questionData = {
            ...question,
            qtype: 'mcq' as const,
            test_id: testId,
            position: questions.length + 1
          };

          const result = await supabase.functions.invoke('tests-api', {
            body: { action: 'addQuestion', questionData },
            headers
          });

          if (result.data?.success) {
            setQuestions(prev => [...prev, result.data.question]);
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
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { 
          action: 'updateTest', 
          testId, 
          updates: { is_published: true, status: 'published' }
        }
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

  const generatePrintableTest = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-printable-test', {
        body: { testId }
      });

      if (error) throw error;

      if (data.success && data.fileUrl) {
        // Open the generated PDF in a new tab
        window.open(data.fileUrl, '_blank');
        
        toast({
          title: "Success",
          description: "Printable test generated successfully!"
        });
      }
    } catch (error) {
      console.error('Error generating printable test:', error);
      toast({
        title: "Error",
        description: "Failed to generate printable test. Please try again.",
        variant: "destructive"
      });
    }
  };

  const moveQuestion = async (questionId: string, direction: 'up' | 'down') => {
    const currentIndex = questions.findIndex(q => q.id === questionId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === questions.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const updatedQuestions = [...questions];
    [updatedQuestions[currentIndex], updatedQuestions[newIndex]] = 
    [updatedQuestions[newIndex], updatedQuestions[currentIndex]];

    // Update positions
    updatedQuestions.forEach((q, index) => {
      q.position = index + 1;
    });

    setQuestions(updatedQuestions);

    // Save to database
    try {
      await Promise.all(
        updatedQuestions.map(q => 
          supabase.functions.invoke('tests-api', {
            body: { 
              action: 'updateQuestion', 
              questionId: q.id,
              updates: { position: q.position }
            }
          })
        )
      );
    } catch (error) {
      console.error('Error updating question positions:', error);
    }
  };

  const handleExtractedQuestions = async (extractedQuestions: any[]) => {
    setLoading(true);
    try {
      let successCount = 0;
      
      for (const question of extractedQuestions) {
        const questionData = {
          test_id: testId,
          qtype: question.question_type === 'mcq' ? 'mcq' : 'subjective',
          question_text: question.question_text,
          options: question.question_type === 'mcq' ? 
            question.options?.map((opt: string, idx: number) => ({
              text: opt,
              isCorrect: idx === (question.correct_answer?.correctAnswerIndex ?? 0)
            })) : undefined,
          // For MCQ, the backend will calculate the index from options
          // For subjective, use the text answer
          correct_answer: question.question_type !== 'mcq' ? question.correct_answer : undefined,
          marks: question.marks || 1,
          position: questions.length + successCount + 1,
          image_url: question.images?.[0],
          explanation: question.explanation
        };
        
        const { data, error } = await supabase.functions.invoke('tests-api', {
          body: { action: 'addQuestion', questionData }
        });

        if (error) {
          console.error('Error adding question:', error);
          continue;
        }
        
        if (data.success) {
          setQuestions(prev => [...prev, data.question]);
          successCount++;
        }
      }
      
      await fetchTestData();
      setShowDocumentExtraction(false);
      
      toast({
        title: "Success!",
        description: `Added ${successCount} questions to test`
      });
    } catch (error) {
      console.error('Error adding extracted questions:', error);
      toast({
        title: "Error",
        description: "Failed to add questions to test",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
          <Button variant="outline" onClick={() => setShowTestSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          {!test.is_published && (
            <Button onClick={publishTest}>
              <Eye className="h-4 w-4 mr-2" />
              Publish Test
            </Button>
          )}
        </div>
      </div>

      {/* Test Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Marks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {questions.reduce((sum, q) => sum + q.marks, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{test.duration_minutes}m</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => {
            setShowBulkExtractor(true);
            setExtractorMode('upload');
          }}
          size="lg"
          className="gap-2"
        >
          <Upload className="h-5 w-5" />
          📄 Upload PDF/Word (Bulk Extract)
        </Button>
        
        <Button
          onClick={() => {
            setShowBulkExtractor(true);
            setExtractorMode('manual');
          }}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <Plus className="h-5 w-5" />
          ✏️ Add Question Manually
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="lg">
              <Wand2 className="h-4 w-4 mr-2" />
              AI Tools
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>AI Generation</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => setShowAIPromptDialog(true)}>
              <Wand2 className="h-4 w-4 mr-2" />
              <div className="flex flex-col">
                <span className="font-medium">🤖 AI Generate (Text Prompt)</span>
                <span className="text-xs text-muted-foreground">
                  Describe what questions you want
                </span>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => setShowImageExtractor(true)}>
              <ImageIcon className="h-4 w-4 mr-2" />
              <div className="flex flex-col">
                <span className="font-medium">📸 Extract from Image</span>
                <span className="text-xs text-muted-foreground">
                  Upload photo of question paper
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Other action buttons */}
        <Button variant="outline" onClick={generatePrintableTest}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No questions added yet</h3>
              <p className="text-muted-foreground mb-4">Start building your test by adding questions</p>
              <div className="flex justify-center gap-2">
                <Button onClick={() => setShowQuestionDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
                <Button variant="outline" onClick={generateQuestionsWithAI} disabled={aiGenerating}>
                  <Wand2 className={`h-4 w-4 mr-2 ${aiGenerating ? 'animate-spin' : ''}`} />
                  AI Generate
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card key={question.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveQuestion(question.id!, 'up')}
                          disabled={index === 0}
                        >
                          <Move className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveQuestion(question.id!, 'down')}
                          disabled={index === questions.length - 1}
                        >
                          <Move className="h-3 w-3 rotate-180" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={question.qtype === 'mcq' ? 'default' : 'secondary'}>
                              {question.qtype === 'mcq' ? 'MCQ' : 'Subjective'}
                            </Badge>
                            <Badge variant="outline">{question.marks} marks</Badge>
                            {question.explanation ? (
                              <Badge variant="default" className="bg-green-500 text-white">
                                ✓ Solution
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-red-100 text-red-700">
                                ⚠️ No Solution
                              </Badge>
                            )}
                          </div>
                          <div 
                            className="font-medium prose prose-sm max-w-none question-content"
                            dangerouslySetInnerHTML={{
                              __html: renderWithImages(question.question_text)
                            }}
                          />
                          {question.image_url && (
                            <div className="mt-2">
                              <img 
                                src={question.image_url} 
                                alt={question.image_alt || "Question image"} 
                                className="h-20 w-20 object-cover rounded border"
                              />
                            </div>
                          )}
                          {question.qtype === 'mcq' && question.options && (
                            <div className="grid grid-cols-2 gap-2">
                              {question.options.map((option, optIndex) => (
                                <div 
                                  key={optIndex} 
                                  className={`p-2 rounded border text-sm ${
                                    option.isCorrect 
                                      ? 'bg-green-50 border-green-200 text-green-800' 
                                      : 'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <span className="font-medium">{String.fromCharCode(65 + optIndex)}. </span>
                                  <span 
                                    className="font-sans prose prose-sm max-w-none question-content inline"
                                    dangerouslySetInnerHTML={{ 
                                      __html: renderWithImages(stripLeadingOptionLabel(option.text)) 
                                    }} 
                                  />
                                  {option.isCorrect && ' ✓'}
                                </div>
                              ))}
                            </div>
                          )}
                          {question.qtype === 'subjective' && question.word_limit && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Word Limit:</strong> {question.word_limit} words
                            </p>
                          )}
                          {question.explanation && (
                            <div className="p-3 mt-2 rounded-md bg-green-50 border border-green-200">
                              <p className="text-sm font-semibold text-green-900 mb-1">💡 Solution:</p>
                              <div 
                                className="text-sm text-green-800 prose prose-sm max-w-none question-content"
                                dangerouslySetInnerHTML={{
                                  __html: renderWithImages(question.explanation || '')
                                }}
                              />
                            </div>
                          )}
                          {!question.explanation && (
                            <div className="p-3 mt-2 rounded-md bg-amber-50 border border-amber-200">
                              <p className="text-sm text-amber-800">⚠️ No solution added yet. Add one to help students learn!</p>
                            </div>
                          )}
                          {question.tags && question.tags.length > 0 && (
                            <div className="flex gap-1">
                              {question.tags.map((tag, tagIndex) => (
                                <Badge key={tagIndex} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditQuestion(question)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id!)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
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
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Edit Question' : 'Add New Question'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="qtype">Question Type</Label>
              <Select
                value={newQuestion.qtype}
                onValueChange={(value: 'mcq' | 'subjective') => 
                  setNewQuestion(prev => ({ ...prev, qtype: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                  <SelectItem value="subjective">Subjective</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="question_text">Question Text</Label>
              <Textarea
                id="question_text"
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                placeholder="Enter your question here..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="explanation">💡 Solution / Explanation</Label>
                {newQuestion.explanation ? (
                  <Badge variant="default" className="bg-green-500 text-white">
                    ✓ Solution Added
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="bg-red-100 text-red-700">
                    ⚠️ No Solution
                  </Badge>
                )}
              </div>
              <Textarea
                id="explanation"
                value={newQuestion.explanation || ''}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                placeholder="Explain the correct answer, common mistakes, and key concepts..."
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                ✅ <strong>Good:</strong> "Option B is correct because photosynthesis converts light energy to chemical energy. Common mistake: Students confuse it with respiration which releases energy."
              </p>
            </div>

            {newQuestion.image_url && (
              <div className="grid gap-2">
                <Label>Question Image</Label>
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <img 
                    src={newQuestion.image_url} 
                    alt="Question" 
                    className="h-20 w-20 object-cover rounded border"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Image attached to question</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewQuestion(prev => ({ 
                        ...prev, 
                        image_url: undefined, 
                        image_alt: undefined 
                      }));
                      toast({
                        title: "Success",
                        description: "Image removed successfully"
                      });
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            )}

            {newQuestion.qtype === 'mcq' && (
              <div className="grid gap-2">
                <Label>Answer Options</Label>
                {newQuestion.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-6">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <Input
                      value={option.text}
                      onChange={(e) => {
                        const newOptions = [...(newQuestion.options || [])];
                        newOptions[index] = { ...option, text: e.target.value };
                        setNewQuestion(prev => ({ ...prev, options: newOptions }));
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                    <input
                      type="radio"
                      name="correct_option"
                      checked={option.isCorrect}
                      onChange={() => {
                        const newOptions = (newQuestion.options || []).map((opt, i) => ({
                          ...opt,
                          isCorrect: i === index
                        }));
                        setNewQuestion(prev => ({ ...prev, options: newOptions }));
                      }}
                    />
                    <Label className="text-xs">Correct</Label>
                  </div>
                ))}
              </div>
            )}

            {newQuestion.qtype === 'subjective' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="word_limit">Word Limit (optional)</Label>
                  <Input
                    id="word_limit"
                    type="number"
                    value={newQuestion.word_limit || ''}
                    onChange={(e) => setNewQuestion(prev => ({ 
                      ...prev, 
                      word_limit: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder="e.g., 200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sample_answer">Sample Answer (optional)</Label>
                  <Textarea
                    id="sample_answer"
                    value={newQuestion.sample_answer || ''}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, sample_answer: e.target.value }))}
                    placeholder="Provide a sample answer for reference..."
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="marks">Marks</Label>
                <div className="flex gap-2">
                  <Input
                    id="marks"
                    type="text"
                    inputMode="numeric"
                    value={newQuestion.marks || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setNewQuestion(prev => ({ ...prev, marks: '' as any }));
                        return;
                      }
                      if (!/^\d+$/.test(value)) {
                        return;
                      }
                      const numValue = parseInt(value);
                      if (!isNaN(numValue) && numValue > 0 && numValue <= 20) {
                        setNewQuestion(prev => ({ ...prev, marks: numValue }));
                      }
                    }}
                    onBlur={(e) => {
                      e.target.blur();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    placeholder="Enter marks (1-20)"
                    className="flex-1"
                  />
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewQuestion(prev => ({ ...prev, marks: 1 }));
                        setTimeout(() => document.getElementById('marks')?.blur(), 0);
                      }}
                      className="px-2"
                    >
                      1
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewQuestion(prev => ({ ...prev, marks: 2 }));
                        setTimeout(() => document.getElementById('marks')?.blur(), 0);
                      }}
                      className="px-2"
                    >
                      2
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewQuestion(prev => ({ ...prev, marks: 4 }));
                        setTimeout(() => document.getElementById('marks')?.blur(), 0);
                      }}
                      className="px-2"
                    >
                      4
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewQuestion(prev => ({ ...prev, marks: 5 }));
                        setTimeout(() => document.getElementById('marks')?.blur(), 0);
                      }}
                      className="px-2"
                    >
                      5
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags">Tags (optional)</Label>
                <Input
                  id="tags"
                  value={newQuestion.tags?.join(', ') || ''}
                  onChange={(e) => setNewQuestion(prev => ({ 
                    ...prev, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  }))}
                  placeholder="e.g., algebra, equations"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="explanation">Explanation (optional)</Label>
              <Textarea
                id="explanation"
                value={newQuestion.explanation || ''}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                placeholder="Explain the correct answer or solution..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (hasUnsavedQuestion) {
                  setShowExitConfirmation(true);
                } else {
                  setShowQuestionDialog(false);
                  setEditingQuestion(null);
                  resetQuestionForm();
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={editingQuestion ? handleUpdateQuestion : handleAddQuestion}
              disabled={!newQuestion.question_text || !newQuestion.marks}
            >
              {editingQuestion ? 'Update Question' : 'Add Question'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Prompt Dialog */}
      <Dialog open={showAIPromptDialog} onOpenChange={setShowAIPromptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>🤖 Generate Questions with AI</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Describe the type of questions you want to generate. AI will create questions with solutions automatically.
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>AI Prompt</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Example: Generate 5 MCQ questions on Photosynthesis for Class 10 CBSE. Include diagrams concepts, process steps, and chemical equations. Difficulty: Medium"
                rows={6}
                className="resize-none"
              />
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Tips for better results</AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                <p>✅ Specify: Number of questions, topic, difficulty level</p>
                <p>✅ Mention: Question type (MCQ, subjective, true/false)</p>
                <p>✅ Include: Class standard, board (CBSE/ICSE/State)</p>
                <p>✅ Request: Explanations and solutions for each question</p>
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-between">
              <div className="text-xs text-muted-foreground">
                💡 AI will generate questions with detailed explanations
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAIPromptDialog(false);
                    setAiPrompt('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAIPromptGeneration}
                  disabled={!aiPrompt.trim() || aiGenerating}
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Questions
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Question Extractor Dialog */}
      <Dialog open={showBulkExtractor} onOpenChange={setShowBulkExtractor}>
        <DialogContent className="max-w-7xl h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              {extractorMode === 'upload' ? (
                <>
                  <FileText className="h-5 w-5" />
                  Upload & Extract Questions (Bulk)
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Add Questions Manually
                </>
              )}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {extractorMode === 'upload' 
                ? 'Upload PDF/Word documents to automatically extract questions with AI. All question types supported: MCQ, Match Column, Assertion-Reason, Fill Blanks, True/False, Short Answer.'
                : 'Add questions one by one with full control over question type and format. Preview and edit answers before adding to test.'
              }
            </p>
          </DialogHeader>
          
          <div className="px-6 pb-6 overflow-auto">
            <SmartQuestionExtractor
              mode="test-builder"
              testId={testId}
              testTitle={test?.title}
              subject={test?.subject}
              difficulty={test?.difficulty}
              onQuestionsAdded={async (questions) => {
                try {
                  const successCount = await handleBulkAddQuestions(questions);
                  
                  if (successCount > 0) {
                    // Close modal ONLY after all questions are saved and refreshed
                    setShowBulkExtractor(false);
                    toast({
                      title: "✅ Questions Added Successfully!",
                      description: `${successCount} questions are now in your test. Scroll down to see them.`,
                      duration: 5000
                    });
                  } else {
                    toast({
                      title: "❌ Failed to Add Questions",
                      description: "Please try again or contact support if the issue persists.",
                      variant: "destructive",
                      duration: 7000
                    });
                  }
                } catch (error) {
                  console.error('Error in onQuestionsAdded:', error);
                  toast({
                    title: "Error",
                    description: "An unexpected error occurred while adding questions.",
                    variant: "destructive"
                  });
                }
              }}
              onBackClick={() => setShowBulkExtractor(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Extraction Dialog */}
      <Dialog open={showImageExtractor} onOpenChange={setShowImageExtractor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>📸 Extract Questions from Image</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Upload photos of question papers. AI will use OCR to extract text and identify questions.
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload">
                <Button asChild variant="outline">
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Select Images
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                Supports JPG, PNG. Multiple images allowed.
              </p>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Best Practices</AlertTitle>
              <AlertDescription className="text-xs">
                <p>✅ Use clear, well-lit photos</p>
                <p>✅ Ensure text is readable and not blurry</p>
                <p>✅ Crop out unnecessary margins</p>
                <p>✅ Hold camera parallel to paper (avoid skew)</p>
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Extraction Dialog */}
      <Dialog open={showDocumentExtraction} onOpenChange={setShowDocumentExtraction}>
        <DialogContent className="max-w-6xl h-[90vh] p-0">
          <SmartQuestionExtractor
            mode="test-builder"
            onQuestionsAdded={handleExtractedQuestions}
            onBackClick={() => setShowDocumentExtraction(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestBuilder;