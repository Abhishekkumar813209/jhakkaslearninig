import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, Circle, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QuestionAIAnalysis } from '@/components/student/QuestionAIAnalysis';
import { renderMath } from '@/lib/mathRendering';

interface QuestionData {
  questionId: string;
  questionText: string;
  questionType: string;
  marks: number;
  options: Array<{ text: string; isCorrect: boolean; orderNum: number }>;
  explanation?: string;
  tags?: string[];
  
  // Student's answer
  studentAnswer: string | null;
  isStudentCorrect: boolean;
  marksAwarded: number;
  
  // Performance analytics
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  correctPercentage: number;
  difficultyLevel: string;
  subject: string;
  topic?: string;
}

interface TestAttemptData {
  testTitle: string;
  testSubject: string;
  studentScore: number;
  totalMarks: number;
  percentage: number;
  rank: number | null;
}

const TestQuestionReview: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [attemptData, setAttemptData] = useState<TestAttemptData | null>(null);
  const [showAIHelp, setShowAIHelp] = useState(false);

  useEffect(() => {
    fetchQuestionReviewData();
  }, [attemptId]);

  const fetchQuestionReviewData = async () => {
    try {
      setLoading(true);

      // Fetch test attempt with test details
      const { data: attempt, error: attemptError } = await supabase
        .from('test_attempts')
        .select(`
          id,
          test_id,
          student_id,
          score,
          total_marks,
          percentage,
          rank,
          tests (
            id,
            title,
            subject
          )
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;

      // Fetch all answers with question details
      const { data: answers, error: answersError } = await supabase
        .from('test_answers')
        .select(`
          id,
          question_id,
          student_answer,
          is_correct,
          marks_awarded,
          questions (
            id,
            question_text,
            question_type,
            marks,
            explanation,
            tags,
            subject,
            topic,
            options (
              option_text,
              is_correct,
              order_num
            )
          )
        `)
        .eq('attempt_id', attemptId)
        .order('question_id');

      if (answersError) throw answersError;

      // Fetch question analytics from snapshot
      const { data: snapshot } = await supabase
        .from('test_analytics_snapshots')
        .select('analytics_data')
        .eq('test_attempt_id', attemptId)
        .maybeSingle();

      const questionAnalytics = (snapshot?.analytics_data as any)?.questionAnalytics || [];

      // Combine data
      const questionsData: QuestionData[] = answers.map((answer: any) => {
        const q = answer.questions;
        const analytics = questionAnalytics.find((qa: any) => qa.questionId === q.id) || {
          totalAttempts: 0,
          correctCount: 0,
          wrongCount: 0,
          correctPercentage: 0,
          difficultyLevel: 'Medium'
        };

        return {
          questionId: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          marks: q.marks,
          options: (q.options || []).sort((a: any, b: any) => a.order_num - b.order_num),
          explanation: q.explanation,
          tags: q.tags,
          subject: q.subject,
          topic: q.topic,
          
          studentAnswer: answer.student_answer,
          isStudentCorrect: answer.is_correct,
          marksAwarded: answer.marks_awarded,
          
          totalAttempts: analytics.totalAttempts,
          correctCount: analytics.correctCount,
          wrongCount: analytics.wrongCount,
          correctPercentage: analytics.correctPercentage,
          difficultyLevel: analytics.difficultyLevel
        };
      });

      setQuestions(questionsData);
      setAttemptData({
        testTitle: (attempt.tests as any)?.title || 'Test',
        testSubject: (attempt.tests as any)?.subject || '',
        studentScore: attempt.score,
        totalMarks: attempt.total_marks,
        percentage: attempt.percentage,
        rank: attempt.rank
      });

    } catch (error) {
      console.error('Error fetching question review data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load questions. Please try again.',
        variant: 'destructive'
      });
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const lower = difficulty.toLowerCase();
    if (lower === 'easy') return 'bg-green-500';
    if (lower === 'hard') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-xl text-foreground">Loading questions...</p>
          </div>
        </div>
      </>
    );
  }

  if (!attemptData || questions.length === 0) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Questions Found</h3>
              <p className="text-muted-foreground mb-4">Unable to load questions for this test.</p>
              <Button onClick={() => navigate('/student/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const correctAnswer = currentQuestion.options.find(o => o.isCorrect)?.text || currentQuestion.studentAnswer;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <Button 
              onClick={() => navigate('/student/dashboard')}
              variant="ghost"
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="bg-card p-4 rounded-lg border">
              <h1 className="text-2xl font-bold mb-2">{attemptData.testTitle}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{attemptData.testSubject}</span>
                <span>•</span>
                <span>Your Score: {attemptData.studentScore}/{attemptData.totalMarks} ({attemptData.percentage}%)</span>
                {attemptData.rank && (
                  <>
                    <span>•</span>
                    <span>Rank: #{attemptData.rank}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Question Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg">
                  Question {currentIndex + 1} of {totalQuestions}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{currentQuestion.marks} marks</Badge>
                  <Badge className={getDifficultyColor(currentQuestion.difficultyLevel)}>
                    {currentQuestion.difficultyLevel}
                  </Badge>
                </div>
              </div>
              <Progress value={((currentIndex + 1) / totalQuestions) * 100} className="h-2" />
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Question Text */}
              <div>
                <div 
                  className="text-base font-medium mb-4" 
                  dangerouslySetInnerHTML={{ __html: renderMath(currentQuestion.questionText) }} 
                />
                
                {/* Options */}
                {currentQuestion.questionType === 'mcq' && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, idx) => {
                      const optionLabel = getOptionLabel(idx);
                      const isCorrect = option.isCorrect;
                      const isStudentChoice = currentQuestion.studentAnswer === option.text;
                      
                      let bgColor = 'bg-muted';
                      let icon = <Circle className="h-5 w-5" />;
                      
                      if (isCorrect) {
                        bgColor = 'bg-green-100 border-green-500';
                        icon = <CheckCircle className="h-5 w-5 text-green-600" />;
                      } else if (isStudentChoice && !isCorrect) {
                        bgColor = 'bg-red-100 border-red-500';
                        icon = <XCircle className="h-5 w-5 text-red-600" />;
                      }

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${bgColor} flex items-start gap-3`}
                        >
                          {icon}
                          <div className="flex-1">
                            <span className="font-semibold mr-2">{optionLabel}.</span>
                            <span dangerouslySetInnerHTML={{ __html: renderMath(option.text) }} />
                            {isCorrect && (
                              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-300">
                                ✓ Correct
                              </Badge>
                            )}
                            {isStudentChoice && !isCorrect && (
                              <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-300">
                                Your Answer
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Class Performance */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  📊 Class Performance
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-green-600">✅ Correct ({currentQuestion.correctCount} students)</span>
                      <span className="font-semibold">{currentQuestion.correctPercentage}%</span>
                    </div>
                    <Progress value={currentQuestion.correctPercentage} className="h-2 bg-green-100" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-600">❌ Wrong ({currentQuestion.wrongCount} students)</span>
                      <span className="font-semibold">{100 - currentQuestion.correctPercentage}%</span>
                    </div>
                    <Progress value={100 - currentQuestion.correctPercentage} className="h-2 bg-red-100" />
                  </div>
                </div>
              </div>

              {/* Teacher's Explanation */}
              {currentQuestion.explanation && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    💡 Teacher's Explanation
                  </h3>
                  <div 
                    className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap" 
                    dangerouslySetInnerHTML={{ __html: renderMath(currentQuestion.explanation) }} 
                  />
                </div>
              )}

              {/* AI Help Button */}
              {!currentQuestion.isStudentCorrect && (
                <Button
                  onClick={() => setShowAIHelp(true)}
                  variant="outline"
                  className="w-full"
                >
                  🤖 Ask AI for More Help
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <Button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {totalQuestions}
            </span>
            
            <Button
              onClick={handleNext}
              disabled={currentIndex === totalQuestions - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* AI Analysis Modal */}
      <QuestionAIAnalysis
        isOpen={showAIHelp}
        onClose={() => setShowAIHelp(false)}
        question={{
          questionText: currentQuestion.questionText,
          correctAnswer: correctAnswer || '',
          studentAnswer: currentQuestion.studentAnswer || undefined,
          subject: currentQuestion.subject,
          topic: currentQuestion.topic,
          explanation: currentQuestion.explanation
        }}
      />
    </>
  );
};

export default TestQuestionReview;
