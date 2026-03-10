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
  Home,
  Zap,
  Crown,
  Rocket,
  Car,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { StudentAppLayout } from '@/components/student/StudentAppLayout';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PostTestAnalytics } from '@/components/student/PostTestAnalytics';
import PaywallModal from '@/components/PaywallModal';
import { useSubscription } from '@/hooks/useSubscription';

// Define interfaces for the data structures
interface ZoneRanking {
  leaderboard: any[];
  currentRank: number | null;
  currentPercentile: number | null;
  totalStudents: number;
  averageScore: number;
  zoneInfo: {
    id: string;
    name: string;
    code: string;
  };
}

interface SchoolRanking {
  leaderboard: any[];
  currentRank: number | null;
  currentPercentile: number | null;
  totalStudents: number;
  averageScore: number;
  schoolInfo: {
    id: string;
    name: string;
    code: string;
  };
}

interface OverallRanking {
  leaderboard: any[];
  currentRank: number | null;
  currentPercentile: number | null;
  totalStudents: number;
  averageScore: number;
}

interface PerformanceData {
  strengths: any[];
  weaknesses: any[];
  topicBreakdown: any[];
}

interface ImprovementSuggestion {
  topic: string;
  suggestion: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface TestAnalytics {
  testInfo: {
    title: string;
    subject: string;
    difficulty: string;
    score: number;
    totalMarks: number;
    percentage: number;
    timeTaken: number;
    rank: number | null;
  };
  studentInfo: {
    name: string;
    currentStats: any;
  };
  rankings: {
    zone: ZoneRanking | null;
    school: SchoolRanking | null;
    overall: OverallRanking;
  };
  performance: PerformanceData;
  insights: string[];
  improvementSuggestions: ImprovementSuggestion[];
  xpRewards: {
    baseXP: number;
    performanceBonus: number;
    speedBonus: number;
    perfectScoreBonus: number;
    totalXP: number;
    breakdown: {
      base: string;
      performance: string;
      speed: string | null;
      perfect: string | null;
    };
  };
  achievements: any[];
  nextSteps: {
    subscriptionRecommended: boolean;
    freeTestsRemaining: number;
  };
}

interface TestResult {
  id: string;
  test_id: string;
  student_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  time_taken_minutes: number;
  time_taken_seconds?: number;
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
  tags?: string[];
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

interface LeaderboardEntry {
  student_id: string;
  score: number;
  time_taken_seconds: number;
  rank: number;
}

const TestResults: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<TestResult | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [cumulativeLeaderboard, setCumulativeLeaderboard] = useState<any[]>([]);
  const [postTestAnalytics, setPostTestAnalytics] = useState<any>(null);
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(true); // Always show detailed analytics
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const { toast } = useToast();
  const { hasActiveSubscription, hasFreeTestUsed, checkTestAccess } = useSubscription();

  useEffect(() => {
    fetchAllData();
  }, [testId]);

  useEffect(() => {
    // Check if user should see paywall after analytics load
    if (!hasActiveSubscription && hasFreeTestUsed && postTestAnalytics) {
      setIsBlurred(true);
      setTimeout(() => setShowPaywall(true), 2000);
    }
  }, [hasActiveSubscription, hasFreeTestUsed, postTestAnalytics]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchTestResults(),
      fetchAnswers(),
      fetchAnalytics(),
      fetchLeaderboards(),
      fetchPostTestAnalytics()
    ]);
  };

  const fetchPostTestAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !testId) return;

      const { data, error } = await supabase.functions.invoke('post-test-analytics', {
        body: {
          testId,
          studentId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setPostTestAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching post-test analytics:', error);
    }
  };

  const fetchTestResults = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

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

      if (data) {
        setAttemptId(data.id);
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

      if (!attempt) return;

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
          order_num,
          tags
        `)
        .eq('test_id', testId)
        .order('order_num', { ascending: true });

      if (qErr) throw qErr;

      const { data: answersRows, error: aErr } = await supabase
        .from('test_answers')
        .select(`id, question_id, selected_option, option_id, text_answer, is_correct, marks_awarded`)
        .eq('attempt_id', attempt.id);

      if (aErr) throw aErr;

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

      // Helper to detect index format
      const isIndexFormat = (value: string): boolean => {
        return /^\d$/.test(value);
      };

      const transformedAnswers = (questionsData || []).map((question: any) => {
        const answer = answerByQuestion.get(question.id) || null;
        
        // For MCQ: Smart detection for backward compatibility
        let selectedText = answer?.selected_option ?? null;
        let correctText = question.correct_answer;
        
        if (question.qtype === 'mcq' && question.options) {
          const options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
          
          // Handle selected option
          if (selectedText !== null) {
            if (isIndexFormat(selectedText)) {
              // New format: Convert index to text for display
              const selectedIndex = parseInt(selectedText);
              if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < options.length) {
                selectedText = options[selectedIndex]?.text || selectedText;
              }
            }
            // else: Old format - already text, use as-is
          }
          
          // Handle correct answer
          if (isIndexFormat(question.correct_answer)) {
            // New format: Convert index to text for display
            const correctIndex = parseInt(question.correct_answer);
            if (!isNaN(correctIndex) && correctIndex >= 0 && correctIndex < options.length) {
              correctText = options[correctIndex]?.text || question.correct_answer;
            }
          }
          // else: Old format - already text, use as-is
        }
        
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
            correct_answer: correctText, // Display text instead of index
            marks: question.marks,
            explanation: question.explanation,
            order_num: question.order_num,
            tags: question.tags || []
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
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchLeaderboards = async () => {
    try {
      const { data: testLeaderboard } = await supabase
        .from('test_attempts')
        .select(`
          student_id,
          score,
          time_taken_seconds,
          rank
        `)
        .eq('test_id', testId)
        .in('status', ['submitted', 'auto_submitted'])
        .order('rank', { ascending: true })
        .order('time_taken_seconds', { ascending: true })
        .limit(50);

      const uniqueMap = new Map<string, LeaderboardEntry>();
      (testLeaderboard || []).forEach((row: any) => {
        const existing = uniqueMap.get(row.student_id);
        if (!existing || row.rank < existing.rank || (row.rank === existing.rank && row.time_taken_seconds < existing.time_taken_seconds)) {
          uniqueMap.set(row.student_id, row as LeaderboardEntry);
        }
      });
      const uniqueList = Array.from(uniqueMap.values()).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, 10);
      setLeaderboard(uniqueList);

      const { data: cumulativeData } = await supabase
        .from('student_analytics')
        .select(`
          student_id,
          average_score,
          tests_attempted,
          overall_rank
        `)
        .not('overall_rank', 'is', null)
        .order('overall_rank', { ascending: true })
        .limit(10);

      setCumulativeLeaderboard(cumulativeData || []);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    }
  };

  const handleSubscribeClick = () => {
    setShowPaywall(false);
    navigate('/student-dashboard?tab=subscription');
  };

  if (loading) {
    return (
      <StudentAppLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-muted border-t-primary rounded-full mx-auto mb-4"
            />
            <p className="text-xl">Loading your race results...</p>
          </motion.div>
        </div>
      </StudentAppLayout>
    );
  }

  // Show PostTestAnalytics if available
  if (showDetailedAnalytics && postTestAnalytics) {
    return (
      <StudentAppLayout>
        <div className="relative">
          <div className={isBlurred ? 'filter blur-sm pointer-events-none' : ''}>
            <PostTestAnalytics 
              analyticsData={postTestAnalytics}
              attemptId={attemptId}
              onSubscribeClick={handleSubscribeClick}
              loading={loading}
            />
          </div>

          {isBlurred && !showPaywall && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Card className="p-6 max-w-md text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-lg font-semibold">Preparing your detailed analytics...</p>
              </Card>
            </div>
          )}

          <PaywallModal
            isOpen={showPaywall}
            onClose={() => setShowPaywall(false)}
            onSubscribe={handleSubscribeClick}
            title="Unlock Detailed Analytics"
            description="Get comprehensive performance insights, rankings, and personalized improvement suggestions with Premium!"
          />
        </div>
      </StudentAppLayout>
    );
  }

  
  if (!result) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center text-white">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Results not found</h2>
            <Button onClick={() => navigate('/student')} className="bg-white text-black hover:bg-gray-200">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </>
    );
  }

  // If PostTestAnalytics not ready, show basic results
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background p-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Results Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default TestResults;
