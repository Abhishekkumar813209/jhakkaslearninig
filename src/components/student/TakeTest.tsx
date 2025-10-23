import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { renderMath, renderWithImages } from '@/lib/mathRendering';

interface Question {
  id: string;
  qtype: 'mcq' | 'subjective';
  question_text: string;
  options?: { text: string; isCorrect: boolean }[];
  marks: number;
  word_limit?: number;
}

interface Test {
  id: string;
  title: string;
  subject: string;
  class: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
}

interface Answer {
  questionId: string;
  selectedOption?: string;
  textAnswer?: string;
}

const TakeTest: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (testId) {
      initializeTest();
    }
  }, [testId]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && test) {
      handleSubmitTest(true); // Auto-submit when time is up
    }
  }, [timeLeft, test]);

  const initializeTest = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'getTestWithQuestions', testId },
        headers
      });

      if (error) throw error;

      if (data.success) {
        setTest(data.test);
        
        // Normalize questions: ensure qtype and options are in correct formats
        const normalizedQuestions: Question[] = (data.questions || []).map((q: any) => {
          const normalizeOptions = (raw: any) => {
            if (!raw) return [] as { text: string; isCorrect: boolean }[];
            try {
              const val = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (Array.isArray(val)) return val;
              if (Array.isArray(val?.options)) return val.options;
              if (Array.isArray(val?.choices)) return val.choices;
              // Convert object map to array if needed
              if (typeof val === 'object') {
                const arr = Object.values(val);
                return Array.isArray(arr) ? (arr as any) : [];
              }
              return [];
            } catch {
              return [];
            }
          };

        const qtype = (q.qtype || q.question_type || 'mcq') as 'mcq' | 'subjective';
        return {
          id: q.id,
          qtype,
          question_text: q.question_text,
          options: qtype === 'mcq' ? normalizeOptions(q.options) : undefined,
          marks: q.marks,
          word_limit: q.word_limit ?? undefined,
        } as Question;
        });

        setQuestions(normalizedQuestions);
        setTimeLeft(data.test.duration_minutes * 60); // Convert to seconds
        
        // Initialize answers array
        const initialAnswers = normalizedQuestions.map((q: Question) => ({
          questionId: q.id,
          selectedOption: '',
          textAnswer: ''
        }));
        setAnswers(initialAnswers);

        // Create test attempt
        await createTestAttempt(data.test);
      }
    } catch (error) {
      console.error('Error initializing test:', error);
      toast({
        title: "Error",
        description: "Failed to load test. Please try again.",
        variant: "destructive"
      });
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const createTestAttempt = async (testData: Test) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};

      const { data, error } = await supabase.functions.invoke('test-attempt-api', {
        body: { 
          action: 'createAttempt',
          testId: testData.id,
          studentId: user.id,
           totalMarks: testData.total_marks,
           clientStartedAt: new Date().toISOString()
        },
        headers
      });

      if (error) throw error;

      if (data.success) {
        setAttemptId(data.attemptId);
      }
    } catch (error) {
      console.error('Error creating test attempt:', error);
      throw error;
    }
  };

  const handleAnswerChange = (questionId: string, selectedOption?: string, textAnswer?: string) => {
    setAnswers(prev => prev.map(answer => 
      answer.questionId === questionId 
        ? { ...answer, selectedOption, textAnswer }
        : answer
    ));

    // Auto-save answer
    saveAnswer(questionId, selectedOption, textAnswer);
  };

  const saveAnswer = async (questionId: string, selectedOption?: string, textAnswer?: string) => {
    if (!attemptId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      await supabase.functions.invoke('test-attempt-api', {
        body: { 
          action: 'saveAnswer',
          attemptId,
          questionId,
          selectedOption,
          textAnswer
        },
        headers
      });
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleSubmitTest = async (autoSubmit = false) => {
    if (!attemptId) return;

    try {
      setSubmitting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { data, error } = await supabase.functions.invoke('test-attempt-api', {
        body: { 
          action: 'submitAttempt',
          attemptId,
          answers,
          timeTaken: test ? Math.max(1, test.duration_minutes * 60 - timeLeft) : 1,
          autoSubmitted: autoSubmit
        },
        headers
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Test Submitted",
          description: autoSubmit ? "Test auto-submitted due to time limit" : "Test submitted successfully!"
        });
        
        navigate(`/test/${testId}/results`);
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      toast({
        title: "Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id);
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!test || !currentQuestion) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Test not found</h2>
        <Button onClick={() => navigate('/tests')}>
          Back to Tests
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{test.title}</CardTitle>
              <p className="text-muted-foreground">{test.subject} • {test.class}</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${timeLeft < 300 ? 'text-red-500' : ''}`}>
                <Clock className="inline h-5 w-5 mr-1" />
                {formatTime(timeLeft)}
              </div>
              {timeLeft < 300 && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Time running out!
                </p>
              )}
            </div>
          </div>
          <Progress value={progress} className="mt-4" />
          <p className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </CardHeader>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant={currentQuestion.qtype === 'mcq' ? 'default' : 'secondary'}>
                  {currentQuestion.qtype === 'mcq' ? 'Multiple Choice' : 'Subjective'}
                </Badge>
                <Badge variant="outline">{currentQuestion.marks} marks</Badge>
                {currentQuestion.word_limit && (
                  <Badge variant="outline">Max {currentQuestion.word_limit} words</Badge>
                )}
              </div>
              <div 
                className="text-lg font-medium prose prose-sm max-w-none question-content"
                dangerouslySetInnerHTML={{ __html: renderWithImages(currentQuestion.question_text) }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion.qtype === 'mcq' && currentQuestion.options ? (
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                    currentAnswer?.selectedOption === index.toString() ? 'border-primary bg-primary/10' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={index.toString()}
                    checked={currentAnswer?.selectedOption === index.toString()}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="text-primary"
                  />
                  <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                  <span 
                    className="flex-1 prose prose-sm max-w-none question-content inline"
                    dangerouslySetInnerHTML={{ __html: renderWithImages(option.text) }}
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                placeholder="Write your answer here..."
                value={currentAnswer?.textAnswer || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, undefined, e.target.value)}
                rows={8}
                className="min-h-[200px]"
              />
              {currentQuestion.word_limit && (
                <p className="text-sm text-muted-foreground">
                  Word count: {(currentAnswer?.textAnswer || '').split(' ').filter(Boolean).length} / {currentQuestion.word_limit}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {questions.map((_, index) => (
            <Button
              key={index}
              variant={index === currentQuestionIndex ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-10 h-10 ${
                answers.find(a => a.questionId === questions[index].id)?.selectedOption ||
                answers.find(a => a.questionId === questions[index].id)?.textAnswer
                  ? 'bg-green-100 border-green-300' : ''
              }`}
            >
              {index + 1}
            </Button>
          ))}
        </div>

        {currentQuestionIndex === questions.length - 1 ? (
          <Button
            onClick={() => handleSubmitTest()}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Test'}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default TakeTest;