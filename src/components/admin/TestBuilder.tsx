import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';

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
  const { toast } = useToast();
  const autoSaveTimer = useRef<NodeJS.Timeout>();

  const [newQuestion, setNewQuestion] = useState<Question>({
    qtype: 'mcq',
    question_text: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    marks: '' as any,
    position: 0,
    explanation: '',
    tags: []
  });

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

  const handleAddQuestion = async () => {
    try {
      const questionData = {
        ...newQuestion,
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
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'deleteQuestion', questionId }
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
      marks: '' as any,
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

  const generateQuestionsWithAI = async () => {
    try {
      setAiGenerating(true);
      
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
            body: { action: 'addQuestion', questionData }
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
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowQuestionDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
        <Button variant="outline" onClick={generateQuestionsWithAI} disabled={aiGenerating}>
          <Wand2 className={`h-4 w-4 mr-2 ${aiGenerating ? 'animate-spin' : ''}`} />
          {aiGenerating ? 'Generating...' : 'AI Generate'}
        </Button>
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
                          <div className="flex items-center gap-2">
                            <Badge variant={question.qtype === 'mcq' ? 'default' : 'secondary'}>
                              {question.qtype === 'mcq' ? 'MCQ' : 'Subjective'}
                            </Badge>
                            <Badge variant="outline">{question.marks} marks</Badge>
                          </div>
                          <h4 className="font-medium">{question.question_text}</h4>
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
                                  {String.fromCharCode(65 + optIndex)}. {option.text}
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
                            <p className="text-sm text-muted-foreground">
                              <strong>Explanation:</strong> {question.explanation}
                            </p>
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

      {/* Add/Edit Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
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
                setShowQuestionDialog(false);
                setEditingQuestion(null);
                resetQuestionForm();
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
    </div>
  );
};

export default TestBuilder;