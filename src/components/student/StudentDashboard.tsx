import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  FileText, 
  Play, 
  AlertCircle, 
  CheckCircle, 
  BookOpen,
  TrendingUp,
  Trophy,
  Calendar,
  Target,
  Filter,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
  is_published: boolean;
  question_count?: number;
  attempt_count?: number;
  user_attempted?: boolean;
  best_score?: number;
}

interface TestAttempt {
  id: string;
  test_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  submitted_at: string;
  test: {
    title: string;
    subject: string;
  };
}

const StudentDashboard: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTestsAndAttempts();
  }, []);

  const fetchTestsAndAttempts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to access tests.",
          variant: "destructive"
        });
        return;
      }

      // Fetch published tests
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select(`
          *
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;

      // Fetch user's recent attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('test_attempts')
        .select(`
          *,
          tests!inner(title, subject)
        `)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (attemptsError) throw attemptsError;

      // Transform attempts data to match interface
      const transformedAttempts = (attemptsData || []).map(attempt => ({
        ...attempt,
        test: attempt.tests
      }));

      // Process tests with attempt information
      const testsWithInfo = await Promise.all(
        (testsData || []).map(async (test) => {
          const [questionsResult, userAttemptsResult] = await Promise.all([
            supabase.from('questions').select('id', { count: 'exact' }).eq('test_id', test.id),
            supabase
              .from('test_attempts')
              .select('score, total_marks')
              .eq('test_id', test.id)
              .eq('student_id', user.id)
              .order('score', { ascending: false })
              .limit(1)
          ]);

          const bestAttempt = userAttemptsResult.data?.[0];
          
          return {
            ...test,
            question_count: questionsResult.count || 0,
            user_attempted: !!bestAttempt,
            best_score: bestAttempt ? Math.round((bestAttempt.score / bestAttempt.total_marks) * 100) : undefined
          };
        })
      );

      setTests(testsWithInfo);
      setRecentAttempts(transformedAttempts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = (testId: string) => {
    navigate(`/test/${testId}`);
  };

  const getDifficultyBadge = (difficulty: string) => {
    const difficultyConfig = {
      easy: { variant: 'default' as const, className: 'bg-green-500 text-white' },
      medium: { variant: 'default' as const, className: 'bg-yellow-500 text-white' },
      hard: { variant: 'default' as const, className: 'bg-red-500 text-white' }
    };
    
    const config = difficultyConfig[difficulty.toLowerCase() as keyof typeof difficultyConfig] || difficultyConfig.medium;
    return <Badge variant={config.variant} className={config.className}>{difficulty}</Badge>;
  };

  const getSubjectBadge = (subject: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500', 
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    const colorIndex = subject.length % colors.length;
    return <Badge className={`${colors[colorIndex]} text-white`}>{subject}</Badge>;
  };

  // Filter tests based on search and filters
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || test.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || test.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  // Get unique subjects for filter
  const subjects = Array.from(new Set(tests.map(test => test.subject)));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">Track your progress and discover new tests</p>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Tests</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tests.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tests Attempted</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tests.filter(test => test.user_attempted).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tests.filter(test => test.best_score).length > 0 
                    ? Math.round(tests.filter(test => test.best_score).reduce((sum, test) => sum + (test.best_score || 0), 0) / tests.filter(test => test.best_score).length)
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Attempts</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentAttempts.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Attempts */}
          {recentAttempts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Recent Test Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <h4 className="font-medium">{attempt.test.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getSubjectBadge(attempt.test.subject)}
                          <span>•</span>
                          <span>{new Date(attempt.submitted_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{attempt.percentage.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">
                          {attempt.score}/{attempt.total_marks} marks
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>


        <TabsContent value="tests" className="space-y-6">

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Browse Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tests by title or subject..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Difficulties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tests Grid */}
              {filteredTests.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tests found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTests.map((test) => (
                    <Card key={test.id} className="card-interactive shadow-soft">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          {test.user_attempted && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {test.best_score}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getSubjectBadge(test.subject)}
                          {getDifficultyBadge(test.difficulty)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground line-clamp-2">{test.description}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{test.duration_minutes}m</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span>{test.question_count} Q</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-muted-foreground" />
                            <span>{test.total_marks} marks</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-muted-foreground" />
                            <span>{test.passing_marks}% pass</span>
                          </div>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={() => handleStartTest(test.id)}
                          disabled={!test.question_count || test.question_count === 0}
                          variant={test.user_attempted ? "outline" : "default"}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {test.user_attempted ? 'Retake Test' : 
                           test.question_count === 0 ? 'No Questions' : 'Start Test'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentDashboard;