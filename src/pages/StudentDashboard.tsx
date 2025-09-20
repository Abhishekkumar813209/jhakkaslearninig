import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  FileText, 
  Award, 
  Play,
  CheckCircle,
  AlertCircle,
  Calendar,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

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
  scheduled_at: string | null;
  expires_at: string | null;
  is_published: boolean;
}

interface TestAttempt {
  id: string;
  test_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  status: string;
  submitted_at: string;
}

const StudentDashboard: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAvailableTests();
    fetchMyAttempts();
  }, []);

  const fetchAvailableTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to load available tests.",
        variant: "destructive"
      });
    }
  };

  const fetchMyAttempts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttempts(data || []);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTestAttempt = (testId: string) => {
    return attempts.find(attempt => attempt.test_id === testId);
  };

  const canTakeTest = (test: Test) => {
    const now = new Date();
    const scheduled = test.scheduled_at ? new Date(test.scheduled_at) : null;
    const expires = test.expires_at ? new Date(test.expires_at) : null;

    if (scheduled && now < scheduled) return false;
    if (expires && now > expires) return false;

    const attempt = getTestAttempt(test.id);
    if (attempt && attempt.status === 'submitted') {
      // Check if retakes are allowed
      return false; // For now, no retakes
    }

    return true;
  };

  const startTest = (testId: string) => {
    navigate(`/student/test/${testId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const completedTests = attempts.filter(a => a.status === 'submitted').length;
  const averageScore = attempts.length > 0 
    ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">Take tests and track your progress</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <FileText className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Available Tests</p>
              <p className="text-2xl font-bold">{tests.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completedTests}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <Target className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Average Score</p>
              <p className="text-2xl font-bold">{averageScore}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <Award className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Best Score</p>
              <p className="text-2xl font-bold">{attempts.length > 0 ? Math.max(...attempts.map(a => a.percentage)) : 0}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Available Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tests available at the moment.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tests.map((test) => {
                const attempt = getTestAttempt(test.id);
                const canTake = canTakeTest(test);
                
                return (
                  <Card key={test.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{test.title}</h3>
                            <Badge variant={test.difficulty === 'easy' ? 'default' : test.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                              {test.difficulty}
                            </Badge>
                            {attempt && (
                              <Badge variant="outline">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">{test.description}</p>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {test.subject}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {test.duration_minutes} mins
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {test.total_marks} marks
                            </div>
                          </div>

                          {attempt && (
                            <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                              <div className="flex items-center justify-between text-sm">
                                <span>Your Score: <strong>{attempt.score}/{attempt.total_marks}</strong></span>
                                <span className={`font-medium ${attempt.percentage >= (test.passing_marks / test.total_marks * 100) ? 'text-green-600' : 'text-red-600'}`}>
                                  {attempt.percentage}% {attempt.percentage >= (test.passing_marks / test.total_marks * 100) ? '(Passed)' : '(Failed)'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          {canTake && !attempt ? (
                            <Button onClick={() => startTest(test.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Start Test
                            </Button>
                          ) : attempt ? (
                            <Button variant="outline" disabled>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Completed
                            </Button>
                          ) : (
                            <Button variant="outline" disabled>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Not Available
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Attempts */}
      {attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Test Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attempts.slice(0, 5).map((attempt) => {
                const test = tests.find(t => t.id === attempt.test_id);
                if (!test) return null;

                return (
                  <div key={attempt.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{test.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {new Date(attempt.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{attempt.score}/{attempt.total_marks}</p>
                      <p className={`text-sm ${attempt.percentage >= (test.passing_marks / test.total_marks * 100) ? 'text-green-600' : 'text-red-600'}`}>
                        {attempt.percentage}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;