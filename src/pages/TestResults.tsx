import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trophy, 
  Target, 
  BarChart3,
  Award,
  TrendingUp,
  Users,
  Star,
  Home
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';

interface TestResult {
  id: string;
  test_id: string;
  student_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  time_taken_minutes: number;
  status: string;
  submitted_at: string;
  tests: {
    title: string;
    subject: string;
    passing_marks: number;
    duration_minutes: number;
  };
}

interface Question {
  id: string;
  question_text: string;
  qtype: string;
  options: any;
  correct_answer: string;
  marks: number;
  explanation?: string;
}

interface Answer {
  id: string;
  question_id: string;
  selected_option?: string | null;
  option_id?: string | null;
  text_answer?: string;
  is_correct?: boolean;
  marks_awarded: number;
  questions: Question;
}

const TestResults: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<TestResult | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTestResults();
    fetchAnswers();
    fetchAnalytics();
  }, [testId]);

  const fetchTestResults = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Prefer latest SUBMITTED attempt; fallback to most recent created
      const { data: submittedAttempt, error: submittedErr } = await supabase
        .from('test_attempts')
        .select(`
          *,
          tests (
            title,
            subject,
            passing_marks,
            duration_minutes
          )
        `)
        .eq('test_id', testId)
        .eq('student_id', user.id)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let data = submittedAttempt;
      if (!data) {
        const { data: fallbackAttempt } = await supabase
          .from('test_attempts')
          .select(`
            *,
            tests (
              title,
              subject,
              passing_marks,
              duration_minutes
            )
          `)
          .eq('test_id', testId)
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        data = fallbackAttempt || null;
      }

      if (!data) throw new Error('No attempt found');

      setResult(data);
    } catch (error) {
      console.error('Error fetching test results:', error);
      toast({
        title: "Error",
        description: "Failed to fetch test results. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Prefer latest SUBMITTED attempt; fallback to most recent created
      const { data: submittedAttempt } = await supabase
        .from('test_attempts')
        .select('id, submitted_at, created_at, status')
        .eq('test_id', testId)
        .eq('student_id', user.id)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let attempt = submittedAttempt;
      if (!attempt) {
        const { data: fallbackAttempt } = await supabase
          .from('test_attempts')
          .select('id, submitted_at, created_at, status')
          .eq('test_id', testId)
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        attempt = fallbackAttempt || null;
      }

      if (!attempt) {
        console.log('No attempt found');
        return;
      }

      console.log('Found attempt:', attempt.id);

      // Fetch questions and answers separately to avoid embedding issues
      const { data: questionsData, error: qErr } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          qtype,
          options,
          correct_answer,
          marks,
          explanation,
          order_num
        `)
        .eq('test_id', testId)
        .order('order_num', { ascending: true });

      if (qErr) {
        console.error('Error fetching questions:', qErr);
        throw qErr;
      }

      const { data: answersRows, error: aErr } = await supabase
        .from('test_answers')
        .select(`id, question_id, selected_option, option_id, text_answer, is_correct, marks_awarded`)
        .eq('attempt_id', attempt.id);

      if (aErr) {
        console.error('Error fetching answers:', aErr);
        throw aErr;
      }

      console.log('Fetched questions:', questionsData);
      console.log('Fetched answers rows:', answersRows);

      // Map option_id -> option_text so we can resolve user's answer even when selected_option is null
      const optionIds = Array.from(new Set((answersRows || [])
        .map((a: any) => a.option_id)
        .filter((id: string | null) => !!id)));

      let optionTextById = new Map<string, string>();
      if (optionIds.length > 0) {
        const { data: optionRows, error: oErr } = await supabase
          .from('options')
          .select('id, option_text')
          .in('id', optionIds);
        if (oErr) throw oErr;
        optionTextById = new Map((optionRows || []).map((r: any) => [r.id, r.option_text]));
      }

      const answerByQuestion = new Map(
        (answersRows || []).map((a: any) => [a.question_id, a])
      );

      // Transform data to match the expected structure
      const transformedAnswers = (questionsData || []).map((question: any) => {
        const answer = answerByQuestion.get(question.id) || null;
        const selectedText = answer?.selected_option ?? (answer?.option_id ? optionTextById.get(answer.option_id) ?? null : null);
        return {
          id: answer?.id || '',
          attempt_id: attempt.id,
          question_id: question.id,
          selected_option: selectedText,
          option_id: answer?.option_id ?? null,
          text_answer: answer?.text_answer ?? null,
          is_correct: answer?.is_correct ?? null,
          marks_awarded: answer?.marks_awarded ?? 0,
          questions: {
            id: question.id,
            question_text: question.question_text,
            qtype: question.qtype,
            options: question.options,
            correct_answer: question.correct_answer,
            marks: question.marks,
            explanation: question.explanation,
            order_num: question.order_num
          }
        };
      });
      
      setAnswers(transformedAnswers);
    } catch (error) {
      console.error('Error fetching answers:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('test-analytics', {
        body: {
          action: 'getTestAnalytics',
          testId,
          studentId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setAnalytics(data.analytics);
        console.log('Analytics data:', data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const getGradeAndColor = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: 'bg-green-500', textColor: 'text-green-600' };
    if (percentage >= 80) return { grade: 'A', color: 'bg-green-400', textColor: 'text-green-600' };
    if (percentage >= 70) return { grade: 'B+', color: 'bg-blue-500', textColor: 'text-blue-600' };
    if (percentage >= 60) return { grade: 'B', color: 'bg-blue-400', textColor: 'text-blue-600' };
    if (percentage >= 50) return { grade: 'C', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    return { grade: 'F', color: 'bg-red-500', textColor: 'text-red-600' };
  };

  const getPerformanceMessage = (percentage: number, passingMarks: number) => {
    if (percentage >= passingMarks) {
      if (percentage >= 90) return "Outstanding performance! 🎉";
      if (percentage >= 80) return "Excellent work! 👏";
      if (percentage >= 70) return "Great job! 👍";
      return "Good work! You passed! ✅";
    }
    return "Keep practicing! You can do better next time! 💪";
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading results...</p>
          </div>
        </div>
      </>
    );
  }

  if (!result) {
    return (
      <>
        <Navbar />
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Results not found</h2>
          <Button onClick={() => navigate('/student')}>
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </>
    );
  }

  const { grade, color, textColor } = getGradeAndColor(result.percentage);
  const passed = result.percentage >= result.tests.passing_marks;

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${color} text-white text-2xl font-bold`}>
            {passed ? <Trophy className="h-8 w-8" /> : <Target className="h-8 w-8" />}
          </div>
          <h1 className="text-3xl font-bold">Test Results</h1>
          <p className="text-muted-foreground">{result.tests.title} • {result.tests.subject}</p>
          <p className={`text-lg font-semibold ${textColor}`}>
            {getPerformanceMessage(result.percentage, result.tests.passing_marks)}
          </p>
        </div>

        {/* Main Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score Card */}
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Award className="h-5 w-5" />
                Your Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold">{result.score}/{result.total_marks}</div>
              <div className={`text-2xl font-semibold ${textColor}`}>{result.percentage}%</div>
              <Badge variant={passed ? "default" : "destructive"} className="text-lg px-4 py-2">
                Grade: {grade}
              </Badge>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                {passed ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`text-3xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {passed ? 'PASSED' : 'FAILED'}
              </div>
              <div className="text-sm text-muted-foreground">
                Passing Score: {result.tests.passing_marks}%
              </div>
              <Progress 
                value={result.percentage} 
                className="h-3"
              />
            </CardContent>
          </Card>

          {/* Time Card */}
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Clock className="h-5 w-5" />
                Time Taken
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">{result.time_taken_minutes}m</div>
              <div className="text-sm text-muted-foreground">
                Total Duration: {result.tests.duration_minutes}m
              </div>
              {analytics ? (
                <>
                  <div className="text-sm">Time Efficiency: {analytics.timeEfficiency}%</div>
                  <div className="text-sm text-muted-foreground">Class Average: {analytics.averageTime}m</div>
                  {typeof analytics.fasterThanPercent === 'number' && (
                    <div className="text-sm">Faster than {analytics.fasterThanPercent}% of class</div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded"></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analytics Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Accuracy */}
                <div className="text-center space-y-2">
                  <Target className="h-8 w-8 mx-auto text-blue-500" />
                  <div className="text-2xl font-bold">{analytics.accuracy}%</div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>

                {/* Questions Correct */}
                <div className="text-center space-y-2">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                  <div className="text-2xl font-bold">
                    {analytics.correctAnswers}/{analytics.totalQuestions}
                  </div>
                  <div className="text-sm text-muted-foreground">Correct Answers</div>
                </div>

                {/* Class Average */}
                <div className="text-center space-y-2">
                  <Users className="h-8 w-8 mx-auto text-purple-500" />
                  <div className="text-2xl font-bold">{analytics.classAverage}</div>
                  <div className="text-sm text-muted-foreground">Class Average</div>
                </div>

                {/* Rank */}
                <div className="text-center space-y-2">
                  <Star className="h-8 w-8 mx-auto text-yellow-500" />
                  <div className="text-2xl font-bold">#{analytics.studentRank}</div>
                  <div className="text-sm text-muted-foreground">Class Rank</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="text-center space-y-2">
                    <div className="h-8 w-8 mx-auto bg-muted animate-pulse rounded-full"></div>
                    <div className="h-6 bg-muted animate-pulse rounded mx-auto w-16"></div>
                    <div className="h-4 bg-muted animate-pulse rounded mx-auto w-20"></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Question-by-Question Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {answers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No question data available for this test attempt.</p>
              </div>
            ) : (
              answers.map((answer, index) => {
                const question = answer.questions;
                const options = question.qtype === 'mcq' && question.options 
                  ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options)
                  : [];
                
                const isCorrect = answer.is_correct;
                const correctOption = options.find((opt: any) => opt.isCorrect);

                return (
                  <div key={answer.id || index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Question {index + 1}</Badge>
                          <Badge variant={isCorrect ? "default" : "destructive"}>
                            {isCorrect ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            {isCorrect ? "Correct" : "Incorrect"}
                          </Badge>
                          <Badge variant="outline">{question.marks} marks</Badge>
                        </div>
                        <h4 className="font-medium text-lg mb-3">{question.question_text}</h4>
                      </div>
                    </div>

                    {question.qtype === 'mcq' ? (
                      <div className="space-y-2">
                        {options.map((option: any, optIndex: number) => {
                          const isSelected = (answer.selected_option || '') === (option.text || '');
                          const isCorrectOption = option.isCorrect;
                          
                          let bgColor = '';
                          let textColor = '';
                          let borderColor = '';
                          let icon = null;
                          let label = '';

                          if (isSelected && isCorrectOption) {
                            // User selected the correct answer
                            bgColor = 'bg-green-50';
                            borderColor = 'border-green-300';
                            textColor = 'text-green-800';
                            icon = <CheckCircle className="h-4 w-4 text-green-600" />;
                            label = 'Your Answer (Correct)';
                          } else if (isSelected && !isCorrectOption) {
                            // User selected this wrong option - red
                            bgColor = 'bg-red-50';
                            borderColor = 'border-red-300';
                            textColor = 'text-red-800';
                            icon = <XCircle className="h-4 w-4 text-red-600" />;
                            label = 'Your Answer (Wrong)';
                          } else if (isCorrectOption) {
                            // Correct answer (not selected)
                            bgColor = 'bg-green-50';
                            borderColor = 'border-green-300';
                            textColor = 'text-green-800';
                            icon = <CheckCircle className="h-4 w-4 text-green-600" />;
                            label = 'Correct Answer';
                          } else {
                            // Not selected, not correct - neutral
                            bgColor = 'bg-gray-50';
                            borderColor = 'border-gray-200';
                            textColor = 'text-gray-700';
                          }

                          return (
                            <div
                              key={optIndex}
                              className={`flex items-center justify-between p-3 rounded-lg border-2 ${bgColor} ${borderColor} ${textColor}`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className="font-bold min-w-[24px]">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>
                                <span className="flex-1">{option.text}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {label && (
                                  <Badge 
                                    variant={isCorrectOption ? "default" : "destructive"}
                                    className={isCorrectOption ? "bg-green-600" : "bg-red-600"}
                                  >
                                    {label}
                                  </Badge>
                                )}
                                {icon}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Summary line showing user's choice vs correct */}
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-sm">
                            <div className="flex items-center justify-between">
                              <span>
                                <strong>Your Answer:</strong> {answer.selected_option ?? 'Not answered'}
                              </span>
                              <span>
                                <strong>Correct Answer:</strong> {correctOption?.text ?? 'N/A'}
                              </span>
                            </div>
                            <div className="mt-2 text-center">
                              {isCorrect ? (
                                <span className="text-green-700 font-medium">✅ Correct! Well done!</span>
                              ) : (
                                <span className="text-red-700 font-medium">❌ Incorrect. Review the correct answer above.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Your Answer:</label>
                          <div className="p-3 bg-gray-50 border rounded-lg">
                            {answer.text_answer || "No answer provided"}
                          </div>
                        </div>
                        {question.correct_answer && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-green-700">Sample Answer:</label>
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                              {question.correct_answer}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {question.explanation && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <div className="text-blue-600 mt-0.5">💡</div>
                          <div>
                            <p className="font-medium text-blue-800 text-sm">Explanation:</p>
                            <p className="text-blue-700 text-sm mt-1">{question.explanation}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                      <span>Points Earned: {answer.marks_awarded}/{question.marks}</span>
                      {question.qtype === 'mcq' && correctOption && (
                        <span>Correct Answer: {correctOption.text}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Submission Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Submission Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span>You submitted at</span>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(100, Math.round(((analytics.studentTime || 0) / (analytics.testDuration || result.tests.duration_minutes)) * 100))} className="w-40" />
                    <span className="text-sm">{analytics.studentTime}m</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Class average submission</span>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(100, Math.round(((analytics.averageTime || 0) / (analytics.testDuration || result.tests.duration_minutes)) * 100))} className="w-40" />
                    <span className="text-sm">{analytics.averageTime}m</span>
                  </div>
                </div>
                {typeof analytics.fasterThanPercent === 'number' && (
                  <div className="text-sm text-muted-foreground">You were faster than {analytics.fasterThanPercent}% of the class</div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 bg-muted animate-pulse rounded w-40"></div>
                    <div className="flex items-center gap-2">
                      <div className="w-40 h-3 bg-muted animate-pulse rounded"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-10"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate('/student')} variant="outline" size="lg">
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button onClick={() => navigate(`/test/${testId}`)} size="lg">
            <Target className="h-4 w-4 mr-2" />
            Retake Test
          </Button>
        </div>
      </div>
    </>
  );
};

export default TestResults;