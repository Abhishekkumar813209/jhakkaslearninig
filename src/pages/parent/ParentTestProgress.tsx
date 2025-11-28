import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ParentAppLayout } from '@/components/parent/ParentAppLayout';
import { ArrowLeft, FileText, Clock, Target, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestAttempt {
  id: string;
  test_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  status: string;
  submitted_at: string;
  tests: {
    title: string;
    subject: string;
    difficulty: string;
    duration_minutes: number;
    total_marks: number;
    passing_marks: number;
  };
}

export default function ParentTestProgress() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [assignedTests, setAssignedTests] = useState<any[]>([]);

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
      fetchTestAttempts();
      fetchAssignedTests();
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', studentId)
        .single();

      if (error) throw error;
      setStudentName(data.full_name || 'Student');
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };

  const fetchAssignedTests = async () => {
    try {
      // Get student's batch
      const { data: profile } = await supabase
        .from('profiles')
        .select('batch_id')
        .eq('id', studentId)
        .single();

      if (!profile?.batch_id) return;

      // Fetch assigned tests via batch_tests
      const { data, error } = await supabase
        .from('batch_tests')
        .select(`
          *,
          tests (
            id,
            title,
            subject,
            total_marks,
            passing_marks
          )
        `)
        .eq('batch_id', profile.batch_id);

      if (error) throw error;
      setAssignedTests((data || []).filter(bt => bt.tests).map(bt => bt.tests));
    } catch (error) {
      console.error('Error fetching assigned tests:', error);
    }
  };

  const fetchTestAttempts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('test_attempts')
        .select(`
          *,
          tests (
            title,
            subject,
            difficulty,
            duration_minutes,
            total_marks,
            passing_marks
          )
        `)
        .eq('student_id', studentId)
        .in('status', ['submitted', 'auto_submitted'])
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setTestAttempts((data || []) as TestAttempt[]);
    } catch (error: any) {
      console.error('Error fetching test attempts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (attempt: TestAttempt) => {
    const passed = attempt.percentage >= (attempt.tests?.passing_marks || 50);
    return passed ? (
      <Badge className="bg-green-500">
        <CheckCircle className="h-3 w-3 mr-1" />
        Passed
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  if (loading) {
    return (
      <ParentAppLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ParentAppLayout>
    );
  }

  return (
    <ParentAppLayout>
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/parent/tests')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle>Test Progress for {studentName}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{assignedTests.length}</div>
                <div className="text-sm text-muted-foreground">Tests Assigned</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{testAttempts.length}</div>
                <div className="text-sm text-muted-foreground">Tests Taken</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {testAttempts.filter(a => a.percentage >= (a.tests?.passing_marks || 50)).length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {testAttempts.length > 0
                    ? Math.round(testAttempts.reduce((sum, a) => sum + a.percentage, 0) / testAttempts.length)
                    : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Average Score</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {testAttempts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Tests Taken Yet</h3>
              <p className="text-sm text-muted-foreground">
                {studentName} hasn't completed any tests yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test History</h2>
            {testAttempts.map((attempt) => (
              <Card key={attempt.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {attempt.tests?.title || 'Unknown Test'}
                      </h3>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>{attempt.tests?.subject}</span>
                        <span>•</span>
                        <span>{new Date(attempt.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {getStatusBadge(attempt)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-2xl font-bold">{attempt.score}/{attempt.total_marks}</div>
                      <div className="text-sm text-muted-foreground">Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{attempt.percentage.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Percentage</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-semibold">{attempt.tests?.duration_minutes}m</div>
                        <div className="text-xs text-muted-foreground">Duration</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-semibold">{attempt.tests?.passing_marks}%</div>
                        <div className="text-xs text-muted-foreground">Passing</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ParentAppLayout>
  );
}
