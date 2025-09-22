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

const TestResults: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTestResults();
  }, [testId]);

  const fetchTestResults = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get the latest test attempt for this user and test
      const { data, error } = await supabase
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
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

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
              <div className="text-sm">
                Time Efficiency: {Math.round((result.time_taken_minutes / result.tests.duration_minutes) * 100)}%
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Accuracy */}
              <div className="text-center space-y-2">
                <Target className="h-8 w-8 mx-auto text-blue-500" />
                <div className="text-2xl font-bold">{result.percentage}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>

              {/* Questions Correct */}
              <div className="text-center space-y-2">
                <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                <div className="text-2xl font-bold">{Math.round((result.score / result.total_marks) * 7)}/7</div>
                <div className="text-sm text-muted-foreground">Correct Answers</div>
              </div>

              {/* Class Average (Hardcoded) */}
              <div className="text-center space-y-2">
                <Users className="h-8 w-8 mx-auto text-purple-500" />
                <div className="text-2xl font-bold">68%</div>
                <div className="text-sm text-muted-foreground">Class Average</div>
              </div>

              {/* Rank (Hardcoded) */}
              <div className="text-center space-y-2">
                <Star className="h-8 w-8 mx-auto text-yellow-500" />
                <div className="text-2xl font-bold">#{Math.max(1, Math.round((100 - result.percentage) / 10))}</div>
                <div className="text-sm text-muted-foreground">Class Rank</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Subject Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Hardcoded subject breakdown based on score */}
              <div className="flex items-center justify-between">
                <span>Biology Fundamentals</span>
                <div className="flex items-center gap-2">
                  <Progress value={Math.min(100, result.percentage + 5)} className="w-32" />
                  <span className="text-sm">{Math.min(100, result.percentage + 5)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Cell Structure</span>
                <div className="flex items-center gap-2">
                  <Progress value={Math.max(0, result.percentage - 10)} className="w-32" />
                  <span className="text-sm">{Math.max(0, result.percentage - 10)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Molecular Biology</span>
                <div className="flex items-center gap-2">
                  <Progress value={result.percentage} className="w-32" />
                  <span className="text-sm">{result.percentage}%</span>
                </div>
              </div>
            </div>
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