import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Send,
  AlertTriangle,
  CheckCircle,
  Circle,
  FileText,
  Timer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'text';
  options?: { text: string; isCorrect: boolean }[];
  marks: number;
  order_num: number;
  word_limit?: number;
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
  instructions?: string;
}

interface Answer {
  questionId: string;
  selectedOption?: string;
  textAnswer?: string;
}

const OnlineTestInterface: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: Answer }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout>();
  const autoSaveRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
  }, [testId]);

  useEffect(() => {
    if (test && timeRemaining > 0) {
      startTimer();
      startAutoSave();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [test, timeRemaining]);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'getTestWithQuestions', testId }
      });

      if (error) throw error;

      if (data.success) {
        const testData = data.test;
        const questionsData = (data.questions || []).map((q: any) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null,
        })).sort((a: any, b: any) => a.order_num - b.order_num);

        setTest(testData);
        setQuestions(questionsData);
        setTimeRemaining(testData.duration_minutes * 60); // Convert to seconds
        
        // Create test attempt
        await createTestAttempt(testData.id);
      }
    } catch (error) {
      console.error('Error fetching test data:', error);
      toast({
        title: "Error",
        description: "Failed to load test. Please try again.",
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const createTestAttempt = async (testId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('test-attempt-api', {
        body: { 
          action: 'createAttempt',
          testId,
          totalMarks: test?.total_marks || 0
        }
      });

      if (error) throw error;

      if (data.success) {
        setAttemptId(data.attemptId);
      }
    } catch (error) {
      console.error('Error creating test attempt:', error);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmitTest(true); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startAutoSave = () => {
    autoSaveRef.current = setInterval(() => {
      autoSaveAnswers();
    }, 30000); // Auto-save every 30 seconds
  };

  const autoSaveAnswers = async () => {
    if (!attemptId) return;

    try {
      for (const [questionId, answer] of Object.entries(answers)) {
        await supabase.functions.invoke('test-attempt-api', {
          body: {
            action: 'saveAnswer',
            attemptId,
            questionId,
            selectedOption: answer.selectedOption,
            textAnswer: answer.textAnswer
          }
        });
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleAnswerChange = (questionId: string, value: string, type: 'option' | 'text') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        [type === 'option' ? 'selectedOption' : 'textAnswer']: value
      }
    }));
  };

  const handleSubmitTest = async (autoSubmit = false) => {
    if (!attemptId) return;

    const unansweredQuestions = questions.filter(q => !answers[q.id]);
    
    if (!autoSubmit && unansweredQuestions.length > 0) {
      const confirmed = confirm(
        `You have ${unansweredQuestions.length} unanswered questions. Are you sure you want to submit?`
      );
      if (!confirmed) return;
    }

    try {
      setSubmitting(true);
      
      // Save all answers first
      await autoSaveAnswers();
      
      // Submit the test
      const { data, error } = await supabase.functions.invoke('test-attempt-api', {
        body: {
          action: 'submitAttempt',
          attemptId,
          timeTakenMinutes: Math.ceil((test!.duration_minutes * 60 - timeRemaining) / 60)
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Test Submitted Successfully!",
          description: `You scored ${data.score}/${data.totalMarks} (${data.percentage}%)`,
        });

        // Navigate to results page
        navigate(`/test-results/${attemptId}`);
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    const percentage = (timeRemaining / (test!.duration_minutes * 60)) * 100;
    if (percentage > 50) return 'text-green-600';
    if (percentage > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Test not found or has no questions</h2>
        <Button onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{test.title}</CardTitle>
                <p className="text-muted-foreground">{test.subject} • {test.class}</p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getTimeColor()}`}>
                  <Timer className="inline h-5 w-5 mr-2" />
                  {formatTime(timeRemaining)}
                </div>
                <p className="text-sm text-muted-foreground">Time Remaining</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </CardTitle>
                  <Badge variant="outline">{currentQuestion.marks} marks</Badge>
                </div>
                <Progress value={progress} className="mt-2" />
                <p className="text-sm text-muted-foreground">
                  {answeredCount} of {questions.length} questions answered
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-lg">{currentQuestion.question_text}</p>
                </div>

                {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Button
                          variant={answers[currentQuestion.id]?.selectedOption === option.text ? 'default' : 'outline'}
                          className="w-8 h-8 rounded-full p-0"
                          onClick={() => handleAnswerChange(currentQuestion.id, option.text, 'option')}
                        >
                          {answers[currentQuestion.id]?.selectedOption === option.text ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </Button>
                        <div 
                          className="flex-1 p-3 rounded border cursor-pointer hover:bg-gray-50"
                          onClick={() => handleAnswerChange(currentQuestion.id, option.text, 'option')}
                        >
                          <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                          {option.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion.question_type === 'text' && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion.id]?.textAnswer || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, 'text')}
                      rows={6}
                      className="resize-none"
                    />
                    {currentQuestion.word_limit && (
                      <p className="text-sm text-muted-foreground">
                        Word limit: {currentQuestion.word_limit} words
                        {answers[currentQuestion.id]?.textAnswer && (
                          <span className="ml-2">
                            (Current: {answers[currentQuestion.id]?.textAnswer?.split(' ').length || 0} words)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between items-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={autoSaveAnswers}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Progress
                    </Button>
                    
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
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Navigator Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Question Navigator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((question, index) => (
                    <Button
                      key={question.id}
                      size="sm"
                      variant={
                        index === currentQuestionIndex 
                          ? 'default' 
                          : answers[question.id] 
                            ? 'outline' 
                            : 'ghost'
                      }
                      className={`h-8 w-8 p-0 ${
                        answers[question.id] 
                          ? 'border-green-500 text-green-700' 
                          : 'border-gray-300'
                      }`}
                      onClick={() => setCurrentQuestionIndex(index)}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded"></div>
                    <span>Current Question</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-green-500 rounded"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-gray-300 rounded"></div>
                    <span>Unanswered</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Test Info</span>
                  </div>
                  <div className="mt-2 text-xs text-yellow-700 space-y-1">
                    <p>Total Questions: {questions.length}</p>
                    <p>Total Marks: {test.total_marks}</p>
                    <p>Passing Marks: {test.passing_marks}</p>
                    <p>Duration: {test.duration_minutes} minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineTestInterface;