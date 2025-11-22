import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Loader2, BookOpen, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReviewHeader } from '@/components/student/review/ReviewHeader';
import { QuestionCard } from '@/components/student/review/QuestionCard';
import { NavigationButtons } from '@/components/student/review/NavigationButtons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ReviewQuestion {
  questionId: string;
  questionText: string;
  questionType: string;
  options: any[];
  correctAnswer: string;
  studentAnswer: string | null;
  isCorrect: boolean | null;
  marksAwarded: number;
  maxMarks: number;
  explanation: string | null;
  difficulty: string | null;
}

interface AttemptSummary {
  testTitle: string;
  testSubject: string;
  score: number;
  totalMarks: number;
  percentage: number;
}

const TestQuestionReviewNew: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [attemptData, setAttemptData] = useState<AttemptSummary | null>(null);

  useEffect(() => {
    if (attemptId) {
      fetchReviewData();
    }
  }, [attemptId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, questions.length]);

  const fetchReviewData = async () => {
    try {
      setLoading(true);

      // Query 1: Get all questions + answers (ordered)
      const { data: reviewData, error: reviewError } = await supabase
        .from('test_answers')
        .select(`
          id,
          student_answer,
          is_correct,
          marks_awarded,
          questions!inner (
            id,
            question_text,
            question_type,
            options,
            correct_answer,
            marks,
            explanation,
            difficulty,
            tags,
            order_num
          )
        `)
        .eq('attempt_id', attemptId)
        .order('questions(order_num)', { ascending: true });

      if (reviewError) throw reviewError;

      // Query 2: Get attempt summary
      const { data: attempt, error: attemptError } = await supabase
        .from('test_attempts')
        .select(`
          id,
          score,
          total_marks,
          percentage,
          tests!inner (
            id,
            title,
            subject
          )
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;

      // Transform data
      const questionsData: ReviewQuestion[] = reviewData.map((answer: any) => {
        const q = answer.questions;
        
        // Parse options
        let parsedOptions = [];
        try {
          if (Array.isArray(q.options)) {
            parsedOptions = q.options;
          } else if (typeof q.options === 'string') {
            parsedOptions = JSON.parse(q.options);
          }
        } catch (e) {
          console.error('Error parsing options:', e);
          parsedOptions = [];
        }

        return {
          questionId: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          options: parsedOptions,
          correctAnswer: q.correct_answer,
          studentAnswer: answer.student_answer,
          isCorrect: answer.is_correct,
          marksAwarded: answer.marks_awarded || 0,
          maxMarks: q.marks,
          explanation: q.explanation,
          difficulty: q.difficulty
        };
      });

      setQuestions(questionsData);
      setAttemptData({
        testTitle: (attempt.tests as any)?.title || 'Test',
        testSubject: (attempt.tests as any)?.subject || '',
        score: attempt.score,
        totalMarks: attempt.total_marks,
        percentage: attempt.percentage
      });

    } catch (error) {
      console.error('Error fetching review data:', error);
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <ReviewHeader
            testTitle={attemptData.testTitle}
            testSubject={attemptData.testSubject}
            score={attemptData.score}
            totalMarks={attemptData.totalMarks}
            percentage={attemptData.percentage}
            currentIndex={currentIndex}
            totalQuestions={questions.length}
          />

          <QuestionCard
            questionNumber={currentIndex + 1}
            questionText={currentQuestion.questionText}
            questionType={currentQuestion.questionType}
            options={currentQuestion.options}
            correctAnswer={currentQuestion.correctAnswer}
            studentAnswer={currentQuestion.studentAnswer}
            isCorrect={currentQuestion.isCorrect}
            marksAwarded={currentQuestion.marksAwarded}
            maxMarks={currentQuestion.maxMarks}
            explanation={currentQuestion.explanation}
            difficulty={currentQuestion.difficulty}
          />

          <div className="mt-6">
            <NavigationButtons
              currentIndex={currentIndex}
              totalQuestions={questions.length}
              onPrevious={() => setCurrentIndex(i => i - 1)}
              onNext={() => setCurrentIndex(i => i + 1)}
              onFinish={() => navigate('/student/dashboard')}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default TestQuestionReviewNew;
