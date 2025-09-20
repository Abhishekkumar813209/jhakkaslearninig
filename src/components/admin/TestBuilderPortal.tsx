import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';

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
}

const TestBuilderPortal: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTestSettings, setShowTestSettings] = useState(false);
  const { toast } = useToast();

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

  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
  }, [testId]);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      console.log('Fetching test data for:', testId);
      
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'getTestWithQuestions', testId }
      });

      console.log('Test data response:', data, error);

      if (error) throw error;

      if (data.success) {
        setTest(data.test);
        // Transform questions to match our interface
        const transformedQuestions = (data.questions || []).map((q: any) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null,
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
        test_id: testId,
        position: questions.length + 1,
        qtype: newQuestion.question_type
      };

      console.log('Adding question:', questionData);

      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'addQuestion', questionData }
      });

      if (error) throw error;

      if (data.success) {
        const transformedQuestion = {
          ...data.question,
          options: data.question.options ? JSON.parse(data.question.options) : null
        };
        setQuestions(prev => [...prev, transformedQuestion]);
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
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { 
          action: 'updateQuestion', 
          questionId: editingQuestion.id,
          updates: {
            ...newQuestion,
            qtype: newQuestion.question_type
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        const transformedQuestion = {
          ...data.question,
          options: data.question.options ? JSON.parse(data.question.options) : null
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
        <Card>
          <CardContent className="flex items-center p-4">
            <Award className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Passing %</p>
              <p className="text-2xl font-bold">{totalMarks > 0 ? Math.round((test.passing_marks / totalMarks) * 100) : 0}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowQuestionDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
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
                          <div className="mb-2">
                            <img 
                              src={question.image_url} 
                              alt={question.image_alt || "Question image"} 
                              className="max-w-md h-auto rounded border"
                            />
                          </div>
                        )}
                        
                        <p className="font-medium mb-2">{question.question_text}</p>
                        {question.question_type === 'mcq' && question.options && (
                          <div className="space-y-1">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className={`text-sm p-2 rounded flex items-center gap-2 ${option.isCorrect ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50'}`}>
                                {option.image_url && (
                                  <img src={option.image_url} alt="Option" className="h-8 w-8 object-cover rounded" />
                                )}
                                <span>{String.fromCharCode(65 + optIndex)}. {option.text}</span>
                                {option.isCorrect && <span className="ml-auto text-xs">(Correct)</span>}
                              </div>
                            ))}
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

      {/* Add/Edit Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                placeholder="Enter your question here..."
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                rows={3}
              />
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
                      onClick={() => setNewQuestion(prev => ({ 
                        ...prev, 
                        image_url: undefined, 
                        image_alt: undefined 
                      }))}
                    >
                      <X className="h-4 w-4" />
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
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            value={option.text}
                            onChange={(e) => updateOptionText(index, e.target.value)}
                            className="flex-1"
                          />
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
                    onChange={(e) => setNewQuestion(prev => ({ 
                      ...prev, 
                      marks: parseInt(e.target.value) || 1 
                    }))}
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
                  onChange={(e) => setNewQuestion(prev => ({ 
                    ...prev, 
                    marks: parseInt(e.target.value) || 1 
                  }))}
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
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editingQuestion ? handleUpdateQuestion : handleAddQuestion}>
              {editingQuestion ? 'Update Question' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestBuilderPortal;