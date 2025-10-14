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
  Timer,
  Menu,
  Flag,
  X,
  Grid3x3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { renderMath } from '@/lib/mathRendering';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Navbar';

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
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
  const [markedForReview, setMarkedForReview] = useState<string[]>([]);
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set([0]));
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout>();
  const autoSaveRef = useRef<NodeJS.Timeout>();

  // Helper function to show only nearby questions for pagination
  const getVisibleQuestionRange = () => {
    const range = 3; // Show current ±3 questions (total 7)
    const start = Math.max(0, currentQuestionIndex - range);
    const end = Math.min(questions.length - 1, currentQuestionIndex + range);
    const indices = [];
    for (let i = start; i <= end; i++) {
      indices.push(i);
    }
    return indices;
  };

  // Track visited questions
  useEffect(() => {
    setVisitedQuestions(prev => new Set([...prev, currentQuestionIndex]));
  }, [currentQuestionIndex]);

  // Listen for navbar question palette event
  useEffect(() => {
    const handleOpenPalette = () => setShowQuestionPalette(true);
    window.addEventListener('open-question-palette', handleOpenPalette);
    return () => window.removeEventListener('open-question-palette', handleOpenPalette);
  }, []);

  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
  }, [testId]);

  useEffect(() => {
    if (!test) return;
    // Clear any existing intervals before starting new ones
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);

    if (timeRemaining > 0) {
      startTimer();
      startAutoSave();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [test]);

  const fetchTestData = async () => {
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
        const testData = data.test;
        const questionsData = (data.questions || []).map((q: any) => ({
          ...q,
          question_type: (q.qtype || q.question_type) === 'mcq' ? 'multiple_choice' : 'text',
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
        })).sort((a: any, b: any) => a.order_num - b.order_num);

        setTest(testData);
        setQuestions(questionsData);
        setTimeRemaining(testData.duration_minutes * 60); // Convert to seconds
        
        // Create test attempt with correct total marks
        await createTestAttempt(testData.id, testData.total_marks);
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

  const createTestAttempt = async (testId: string, totalMarks: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { data, error } = await supabase.functions.invoke('test-attempt-api', {
        body: { 
          action: 'createAttempt',
          testId,
          totalMarks,
          clientStartedAt: new Date().toISOString()
        },
        headers
      });

      if (error) throw error;

      if (!data.success) {
        if (data.requiresSubscription) {
          toast({
            title: "Free Test Already Attempted",
            description: data.error || "Free test can only be attempted once. Subscribe for unlimited attempts.",
            variant: "destructive"
          });
          // Navigate back to tests page
          navigate('/student/tests');
          return;
        }
        throw new Error(data.error || 'Failed to create test attempt');
      }

      if (data.success) {
        setAttemptId(data.attemptId);
      }
    } catch (error) {
      console.error('Error creating test attempt:', error);
      toast({
        title: "Error",
        description: "Failed to start test. Please try again.",
        variant: "destructive"
      });
      navigate('/student/tests');
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
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      for (const [questionId, answer] of Object.entries(answers)) {
        await supabase.functions.invoke('test-attempt-api', {
          body: {
            action: 'saveAnswer',
            attemptId,
            questionId,
            selectedOption: answer.selectedOption,
            textAnswer: answer.textAnswer
          },
          headers
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
      
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      // Submit the test
      const { data, error } = await supabase.functions.invoke('test-attempt-api', {
        body: {
          action: 'submitAttempt',
          attemptId,
          answers: Object.values(answers),
          timeTaken: Math.max(0, (test!.duration_minutes * 60) - timeRemaining),
          autoSubmitted: autoSubmit
        },
        headers
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
    const minutes = Math.floor(timeRemaining / 60);
    if (minutes < 5) return 'text-red-500 animate-pulse';
    if (minutes < 15) return 'text-yellow-400';
    return 'text-white';
  };

  // Mark for review handler
  const handleMarkForReview = (questionId: string) => {
    setMarkedForReview(prev => {
      if (prev.includes(questionId)) {
        toast({
          title: "Removed from Review",
          description: "Question unmarked for review",
          duration: 2000,
        });
        return prev.filter(id => id !== questionId);
      } else {
        toast({
          title: "Marked for Review",
          description: "You can review this question later",
          duration: 2000,
        });
        return [...prev, questionId];
      }
    });
  };

  // Clear answer handler
  const handleClearAnswer = (questionId: string) => {
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[questionId];
      return newAnswers;
    });
    toast({
      title: "Response Cleared",
      description: "Your answer has been removed",
    });
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
    <div className="min-h-screen bg-background">
      {/* Navbar at the top */}
      <Navbar />

      {/* Desktop: Test Header (below navbar) */}
      <div className="hidden lg:block fixed top-16 left-0 right-0 bg-[#1e3a8a] text-white z-40 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Subject */}
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-orange-400" />
            <span className="font-semibold text-lg">{test.subject}</span>
          </div>

          {/* Center: Timer */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg">
            <Clock className="h-5 w-5" />
            <span className={`text-xl font-bold ${getTimeColor()}`}>
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Right: Submit Button */}
          <Button
            onClick={() => handleSubmitTest()}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 font-semibold px-6"
          >
            SUBMIT
          </Button>
        </div>
      </div>

      {/* Spacer for navbar + test header */}
      <div className="h-0 lg:h-24"></div>

      {/* Mobile: Question Palette Sheet */}
      <Sheet open={showQuestionPalette} onOpenChange={setShowQuestionPalette}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto p-0">
          <div className="sticky top-0 bg-background z-10 border-b pb-4 pt-6 px-6">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold flex items-center gap-2">
                <Grid3x3 className="h-6 w-6" />
                Test Navigation
              </SheetTitle>
            </SheetHeader>
          </div>

          <Tabs defaultValue="questions" className="mt-4 px-6">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="questions" className="font-semibold">
                QUESTION PAPER
              </TabsTrigger>
              <TabsTrigger value="instructions" className="font-semibold">
                INSTRUCTIONS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="space-y-4 pb-6">
              {/* Status Legend */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold">1</div>
                    <span className="text-sm font-medium">Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-400 rounded flex items-center justify-center text-white font-bold">2</div>
                    <span className="text-sm font-medium">Not Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center text-gray-700 font-bold">3</div>
                    <span className="text-sm font-medium">Not Visited</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold">4</div>
                    <span className="text-sm font-medium">Review Later</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 border-4 border-green-500 rounded flex items-center justify-center text-white font-bold">5</div>
                    <span className="text-sm font-medium">Answered & Marked for Review</span>
                  </div>
                </CardContent>
              </Card>

              {/* Subject Section Header */}
              <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg">
                <FileText className="h-5 w-5" />
                <span className="font-bold text-lg">{test.subject}</span>
              </div>

              {/* Question Grid - Simplified NTA Style */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((question, index) => {
                  const isAnswered = !!answers[question.id];
                  const isVisited = visitedQuestions.has(index);
                  const isMarkedForReview = markedForReview.includes(question.id);
                  const isCurrent = index === currentQuestionIndex;
                  
                  let bgColor = 'bg-gray-200 text-gray-700'; // Not visited
                  
                  if (isAnswered && isMarkedForReview) {
                    bgColor = 'bg-blue-500 text-white border-2 border-green-500';
                  } else if (isAnswered) {
                    bgColor = 'bg-green-500 text-white';
                  } else if (isMarkedForReview) {
                    bgColor = 'bg-blue-500 text-white';
                  } else if (isVisited) {
                    bgColor = 'bg-red-400 text-white';
                  }
                  
                  return (
                    <Button
                      key={question.id}
                      onClick={() => {
                        setCurrentQuestionIndex(index);
                        setShowQuestionPalette(false);
                      }}
                      className={`
                        h-12 w-12 rounded font-semibold text-base
                        ${bgColor}
                        ${isCurrent ? 'ring-2 ring-blue-600' : ''}
                      `}
                    >
                      {index + 1}
                    </Button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="instructions" className="pb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="prose prose-sm max-w-none">
                    <h3 className="text-lg font-bold mb-3">General Instructions</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Total Questions:</strong> {questions.length}</p>
                      <p><strong>Total Marks:</strong> {test.total_marks}</p>
                      <p><strong>Passing Marks:</strong> {test.passing_marks}</p>
                      <p><strong>Duration:</strong> {test.duration_minutes} minutes</p>
                      <p><strong>Negative Marking:</strong> No</p>
                    </div>
                    {test.instructions && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded">
                        <div dangerouslySetInnerHTML={{ __html: renderMath(test.instructions) }} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Back to Test Button */}
          <div className="sticky bottom-0 bg-background border-t pt-4 pb-6 px-6 mt-6">
            <SheetClose asChild>
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 text-lg"
              >
                Back to Test
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile: Single Column Question Area */}
      <div className="lg:hidden w-full px-2 pb-40">
        {/* Question Card */}
        <div className="bg-background overflow-hidden">
          {/* Blue header strip */}
          <div className="bg-gradient-to-r from-[#2563eb] to-[#1e40af] text-white py-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">Q.{currentQuestionIndex + 1}</span>
              <span className={`text-xl font-bold ${getTimeColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Question Text */}
            <div 
              className="text-lg leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMath(currentQuestion.question_text) }}
            />

            {/* Options - NTA Style with Radio Buttons */}
              {currentQuestion.question_type === 'multiple_choice' && (
                <>
                  {console.log('Question Options:', currentQuestion.options)}
                  {!currentQuestion.options || !Array.isArray(currentQuestion.options) || currentQuestion.options.length === 0 ? (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 rounded-lg">
                      <p className="text-yellow-800 dark:text-yellow-200 font-semibold">⚠️ No options available for this question</p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">Please contact administrator.</p>
                    </div>
                  ) : (
                  <div className="space-y-3 mt-6">
                    {currentQuestion.options.map((option, index) => {
                  const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                  const isSelected = answers[currentQuestion.id]?.selectedOption === option.text;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => handleAnswerChange(currentQuestion.id, option.text, 'option')}
                      className={`
                        flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer
                        transition-all duration-200 group
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md' 
                          : 'border-border hover:border-blue-400 hover:bg-muted/50 hover:shadow-sm'
                        }
                      `}
                    >
                      {/* Custom Radio Button Circle */}
                      <div className={`
                        relative flex-shrink-0 w-7 h-7 rounded-full border-2 mt-1
                        flex items-center justify-center transition-all duration-200
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-500 shadow-md' 
                          : 'border-muted-foreground/40 group-hover:border-blue-400'
                        }
                      `}>
                        {isSelected && (
                          <div className="w-3 h-3 bg-white rounded-full" />
                        )}
                      </div>

                      {/* Option Label and Text */}
                      <div className="flex-1 pt-1">
                        <span className="font-bold text-lg mr-2">
                          {optionLabel}.
                        </span>
                        <span dangerouslySetInnerHTML={{ __html: renderMath(option.text) }} />
                      </div>
                    </div>
                  );
                })}
                  </div>
                )}
              </>
            )}

            {/* Text Answer Area */}
            {currentQuestion.question_type === 'text' && (
              <div className="mt-6">
                <Textarea
                  value={answers[currentQuestion.id]?.textAnswer || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, 'text')}
                  rows={10}
                  className="resize-none text-base border-2 focus:border-blue-500"
                  placeholder="Type your answer here..."
                />
                {currentQuestion.word_limit && (
                  <p className="text-sm text-muted-foreground mt-2 text-right">
                    {answers[currentQuestion.id]?.textAnswer?.length || 0} / {currentQuestion.word_limit} characters
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: Two-column layout - Question LEFT, Sidebar RIGHT */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_340px] gap-4 max-w-screen-2xl mx-auto px-3 pb-32">
        {/* Left Column: Question Area */}
        <div>
          {/* Question Card */}
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#2563eb] to-[#1e40af] text-white py-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">Q.{currentQuestionIndex + 1}</span>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-6">
              {/* Question Text */}
              <div 
                className="text-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMath(currentQuestion.question_text) }}
              />

              {/* Options - NTA Style with Radio Buttons */}
              {currentQuestion.question_type === 'multiple_choice' && (
                <>
                  {console.log('Question Options:', currentQuestion.options)}
                  {!currentQuestion.options || !Array.isArray(currentQuestion.options) || currentQuestion.options.length === 0 ? (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 rounded-lg">
                      <p className="text-yellow-800 dark:text-yellow-200 font-semibold">⚠️ No options available for this question</p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">Please contact administrator.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-6">
                      {currentQuestion.options.map((option, index) => {
                    const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                    const isSelected = answers[currentQuestion.id]?.selectedOption === option.text;
                    
                    return (
                      <div
                        key={index}
                        onClick={() => handleAnswerChange(currentQuestion.id, option.text, 'option')}
                        className={`
                          flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer
                          transition-all duration-200 group
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md' 
                            : 'border-border hover:border-blue-400 hover:bg-muted/50 hover:shadow-sm'
                          }
                        `}
                      >
                        {/* Custom Radio Button Circle */}
                        <div className={`
                          relative flex-shrink-0 w-7 h-7 rounded-full border-2 mt-1
                          flex items-center justify-center transition-all duration-200
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-500 shadow-md' 
                            : 'border-muted-foreground/40 group-hover:border-blue-400'
                          }
                        `}>
                          {isSelected && (
                            <div className="w-3 h-3 bg-white rounded-full" />
                          )}
                        </div>

                        {/* Option Label and Text */}
                        <div className="flex-1 pt-1">
                          <span className="font-bold text-lg mr-2">
                            {optionLabel}.
                          </span>
                          <span dangerouslySetInnerHTML={{ __html: renderMath(option.text) }} />
                        </div>
                      </div>
                    );
                  })}
                    </div>
                  )}
                </>
              )}

              {/* Text Answer Area */}
              {currentQuestion.question_type === 'text' && (
                <div className="mt-6">
                  <Textarea
                    value={answers[currentQuestion.id]?.textAnswer || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, 'text')}
                    rows={10}
                    className="resize-none text-base border-2 focus:border-blue-500"
                    placeholder="Type your answer here..."
                  />
                  {currentQuestion.word_limit && (
                    <p className="text-sm text-muted-foreground mt-2 text-right">
                      {answers[currentQuestion.id]?.textAnswer?.length || 0} / {currentQuestion.word_limit} characters
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Question Navigation Sidebar */}
        <div className="sticky top-24 h-[calc(100vh-180px)]">
          <div className="bg-background border-2 rounded-lg shadow-xl p-4 h-full overflow-y-auto">
            {/* Status Legend */}
            <Card className="mb-4 bg-muted">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-400 rounded"></div>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <span>Not Visited</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded"></div>
                  <span>Review Later</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 border-2 border-green-500 rounded"></div>
                  <span className="text-xs">Answered & Review</span>
                </div>
              </CardContent>
            </Card>

            {/* Subject Header */}
            <div className="mb-3 bg-green-600 text-white px-3 py-2 rounded font-bold text-center">
              {test.subject}
            </div>

            {/* Question Grid - ALL questions visible */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const isAnswered = !!answers[question.id];
                const isVisited = visitedQuestions.has(index);
                const isMarkedForReview = markedForReview.includes(question.id);
                const isCurrent = index === currentQuestionIndex;
                
                let bgColor = 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300';
                let borderClass = '';
                
                if (isAnswered && isMarkedForReview) {
                  bgColor = 'bg-blue-500 text-white';
                  borderClass = 'border-2 border-green-500';
                } else if (isAnswered) {
                  bgColor = 'bg-green-500 text-white';
                } else if (isMarkedForReview) {
                  bgColor = 'bg-blue-500 text-white';
                } else if (isVisited) {
                  bgColor = 'bg-red-400 text-white';
                }
                
                return (
                  <Button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`
                      h-11 w-11 rounded font-semibold text-sm
                      ${bgColor} ${borderClass}
                      ${isCurrent ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
                      hover:scale-105 transition-transform
                    `}
                  >
                    {index + 1}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t-2 shadow-2xl z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Previous Button */}
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-4 sm:px-6 h-11 font-semibold border-2"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            {/* Center: Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleMarkForReview(currentQuestion.id)}
                className={`
                  flex items-center gap-2 px-3 sm:px-4 h-11 font-semibold border-2
                  ${markedForReview.includes(currentQuestion.id) 
                    ? 'bg-blue-100 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-blue-50 dark:hover:bg-blue-950/50'
                  }
                `}
              >
                <Flag className="h-5 w-5" />
                <span className="hidden md:inline">Mark for Review</span>
                <span className="md:hidden">Review</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleClearAnswer(currentQuestion.id)}
                disabled={!answers[currentQuestion.id]}
                className="flex items-center gap-2 px-3 sm:px-4 h-11 font-semibold border-2 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-400"
              >
                <X className="h-5 w-5" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>

            {/* Right: Save and Next / Submit */}
            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={() => handleSubmitTest()}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 px-4 sm:px-6 h-11 font-bold text-base shadow-lg"
              >
                <Send className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Submit</span>
                <span className="sm:hidden">Submit</span>
              </Button>
            ) : (
              <Button
                onClick={() => {
                  autoSaveAnswers();
                  setCurrentQuestionIndex(prev => prev + 1);
                  setVisitedQuestions(prev => new Set([...prev, currentQuestionIndex + 1]));
                }}
                className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-6 h-11 font-bold text-base shadow-lg flex items-center gap-2"
              >
                <span className="hidden sm:inline">Save & Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineTestInterface;