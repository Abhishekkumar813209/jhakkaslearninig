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
  Car
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PostTestAnalytics } from '@/components/student/PostTestAnalytics';
import { useSubscription } from '@/hooks/useSubscription';


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
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [cumulativeLeaderboard, setCumulativeLeaderboard] = useState<any[]>([]);
  const [postTestAnalytics, setPostTestAnalytics] = useState<any>(null);
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { checkTestAccess } = useSubscription();

  useEffect(() => {
    fetchAllData();
  }, [testId]);

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
        
        // Check if this was a free test to determine if we should show subscription flow
        const testAccess = await checkTestAccess();
        if (!testAccess.canTakeTest && !testAccess.isFreeTrial) {
          setShowDetailedAnalytics(true);
        }
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
      // Individual test leaderboard (deduped by student and ordered by best rank/time)
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

      // Cumulative leaderboard (from student_analytics)
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

  const getChartData = () => {
    if (!answers.length) return { pieData: [], topicData: [] };

    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    
    const topicPerformance = new Map<string, { correct: number; total: number }>();

    answers.forEach(answer => {
      if (answer.is_correct === true) {
        correct++;
      } else if (answer.is_correct === false) {
        wrong++;
      } else {
        unattempted++;
      }

      // Topic-wise performance
      const tags = answer.questions.tags || ['General'];
      tags.forEach(tag => {
        if (!topicPerformance.has(tag)) {
          topicPerformance.set(tag, { correct: 0, total: 0 });
        }
        const topic = topicPerformance.get(tag)!;
        topic.total++;
        if (answer.is_correct === true) {
          topic.correct++;
        }
      });
    });

    const pieData = [
      { name: 'Correct', value: correct, color: '#3B82F6' }, // Blue
      { name: 'Wrong', value: wrong, color: '#EF4444' },     // Red
      { name: 'Unattempted', value: unattempted, color: '#94A3B8' } // Gray-blue
    ];

    const topicData = Array.from(topicPerformance.entries()).map(([topic, data]) => ({
      topic,
      percentage: Math.round((data.correct / data.total) * 100),
      correct: data.correct,
      total: data.total
    }));

    return { pieData, topicData };
  };

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return `${hours}h ${remainingMinutes}m`;
    } else {
      const wholeMinutes = Math.floor(minutes);
      const seconds = Math.round((minutes - wholeMinutes) * 60);
      if (wholeMinutes === 0) {
        return `${seconds}s`;
      }
      return `${wholeMinutes}m ${seconds}s`;
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-white"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"
            />
            <p className="text-xl">Loading your race results...</p>
          </motion.div>
        </div>
      </>
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

  const derivedTotalMarks = (result.total_marks && result.total_marks > 0) ? result.total_marks : Math.max(answers.reduce((sum, a) => sum + (a.questions?.marks || 0), 0), 0);
  const safePercentage = derivedTotalMarks > 0 ? Math.round((result.score / derivedTotalMarks) * 100) : (result.percentage || 0);
  const passed = safePercentage >= result.tests.passing_marks;
  const { pieData, topicData } = getChartData();

  const currentUserRank = analytics?.studentRank || 1;
  const totalStudents = analytics?.totalStudents || 1;
  const studentsAhead = Math.max(0, totalStudents - currentUserRank);

  const handleSubscribeClick = () => {
    navigate('/student', { state: { showSubscription: true } });
  };

  // Calculate "What If" scenarios (clamped to valid range)
  const calculateWhatIf = (additionalCorrect: number) => {
    if (!result || !postTestAnalytics || !answers.length || derivedTotalMarks <= 0) return null;

    const currentScore = result.score;
    const currentRank = postTestAnalytics.rankings?.overall?.currentRank || currentUserRank;

    // Remaining opportunities = wrong + unattempted
    const remainingQuestions = answers.filter(a => a.is_correct !== true).length;
    const adjAdditional = Math.max(0, Math.min(additionalCorrect, remainingQuestions));

    // Assume equal marks per question (fallback to 1 to avoid NaN)
    const marksPerQuestion = answers.length > 0 ? derivedTotalMarks / answers.length : 1;
    const rawPotential = currentScore + adjAdditional * marksPerQuestion;
    const potentialScore = Math.min(derivedTotalMarks, Math.round(rawPotential));
    const potentialPercentage = Math.round((potentialScore / derivedTotalMarks) * 100);

    // Simple rank estimate: every +1 correct improves ~2 places
    const rankImprovement = Math.floor(adjAdditional * 2);
    const potentialRank = Math.max(1, currentRank - rankImprovement);

    return {
      additionalCorrect: adjAdditional,
      potentialScore,
      potentialPercentage,
      potentialRank,
      improvement: currentRank - potentialRank,
    };
  };

  const whatIfScenarios = [
    calculateWhatIf(3),
    calculateWhatIf(5),
    calculateWhatIf(10),
  ].filter(Boolean as any);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white text-gray-900">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} shadow-lg`}
            >
              {passed ? <Trophy className="h-8 w-8" /> : <Target className="h-8 w-8" />}
            </motion.div>
            
            <h1 className="text-3xl font-bold text-gray-900">
              Test Results
            </h1>
            <p className="text-lg text-gray-600">{result.tests.title} • {result.tests.subject}</p>
          </motion.div>

          {/* Score Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Score */}
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <Award className="h-8 w-8 mx-auto mb-4 text-blue-600" />
                <div className="text-4xl font-bold text-gray-900 mb-2">{result.score}/{derivedTotalMarks}</div>
                <div className="text-2xl font-semibold text-blue-600 mb-4">{safePercentage}%</div>
                <Badge variant={passed ? "default" : "destructive"} className={`text-base px-3 py-1 ${passed ? 'bg-blue-600 hover:bg-blue-700' : ''}`}>
                  {passed ? "Passed" : "Failed"}
                </Badge>
              </CardContent>
            </Card>

            {/* Status */}
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                {passed ? <CheckCircle className="h-8 w-8 mx-auto mb-4 text-green-600" /> : <XCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />}
                <div className={`text-2xl font-bold mb-4 ${passed ? 'text-green-600' : 'text-red-500'}`}>
                  {passed ? 'Passed' : 'Failed'}
                </div>
                <Progress 
                  value={safePercentage} 
                  className="h-3 mb-2"
                />
                <p className="text-sm text-gray-600">Target: {result.tests.passing_marks}%</p>
              </CardContent>
            </Card>

            {/* Time */}
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-4 text-blue-600" />
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatTime(
                    result.time_taken_seconds && result.time_taken_seconds > 0 
                      ? result.time_taken_seconds / 60 
                      : result.time_taken_minutes
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Total: {result.tests.duration_minutes}m
                </div>
                {analytics && (
                  <div className="text-sm text-blue-600">
                    Faster than {analytics.fasterThanPercent}% of students
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts Section */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Pie Chart */}
            <Card className="bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Question Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="bg-gradient-to-br from-emerald-100 to-green-100 border-2 border-emerald-200 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Topic Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topicData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                    <XAxis dataKey="topic" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        color: '#374151'
                      }}
                    />
                    <Bar dataKey="percentage" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Race Track Animation */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="bg-gradient-to-r from-gray-100 to-slate-100 border-2 border-yellow-300 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-gray-900 text-center text-2xl">
                  🏁 Race Track Position
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {/* Track */}
                <div className="relative h-20 bg-gray-600 rounded-full mb-6 overflow-hidden">
                  {/* Track Lines */}
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-1 bg-yellow-400 opacity-70" 
                         style={{
                           backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, #fbbf24 20px, #fbbf24 40px)'
                         }}
                    />
                  </div>
                  
                  {/* Student's Car */}
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: `${((totalStudents - currentUserRank) / totalStudents) * 100}%` }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="absolute top-1/2 transform -translate-y-1/2 z-10"
                  >
                    <div className="flex items-center space-x-2">
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="text-3xl"
                      >
                        🏎️
                      </motion.div>
                      <div className="bg-orange-500 text-white px-2 py-1 rounded text-sm font-bold">
                        YOU
                      </div>
                    </div>
                  </motion.div>

                  {/* Other Cars */}
                  {[...Array(Math.min(5, currentUserRank - 1))].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: '-50px' }}
                      animate={{ x: `${((totalStudents - (currentUserRank - i - 1)) / totalStudents) * 100}%` }}
                      transition={{ duration: 2, delay: i * 0.1, ease: "easeOut" }}
                      className="absolute top-1/2 transform -translate-y-1/2 text-2xl"
                    >
                      🚗
                    </motion.div>
                  ))}
                </div>

                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    You are ahead of {studentsAhead} students out of {totalStudents} 🚀
                  </h3>
                  <p className="text-lg text-orange-600 italic font-medium">
                    "Keep accelerating! The finish line is closer than you think."
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* What If Calculator */}
          {whatIfScenarios.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    🎯 "What If" Calculator - Your Rank Improvement Potential
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    See how your rank could improve with a few more correct answers:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {whatIfScenarios.map((scenario: any, index) => (
                      <div 
                        key={index}
                        className="bg-white p-4 rounded-lg border-2 border-orange-200 hover:border-orange-400 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-orange-600">
                            +{scenario.additionalCorrect}
                          </span>
                          <Badge className="bg-orange-500">
                            More Correct
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Score:</span>
                            <span className="font-semibold text-gray-900">
                              {scenario.potentialScore}/{derivedTotalMarks}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Percentage:</span>
                            <span className="font-semibold text-green-600">
                              {scenario.potentialPercentage}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Potential Rank:</span>
                            <span className="font-bold text-blue-600">
                              #{scenario.potentialRank}
                            </span>
                          </div>
                          {scenario.improvement > 0 && (
                            <div className="flex items-center justify-center mt-2 p-2 bg-green-50 rounded">
                              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                              <span className="text-xs font-semibold text-green-700">
                                ↑ {scenario.improvement} ranks better!
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Rankings & Percentiles */}
          {postTestAnalytics?.rankings && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-purple-600" />
                    Your Rankings & Percentiles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Zone Ranking */}
                    {postTestAnalytics.rankings.zone && (
                      <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                        <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          Zone Rank
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Current Rank:</span>
                            <Badge className="bg-blue-600 text-lg">
                              #{postTestAnalytics.rankings.zone.currentRank}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Percentile:</span>
                            <span className="font-bold text-blue-700">
                              Top {(postTestAnalytics.rankings.zone.percentile ?? postTestAnalytics.rankings.zone.currentPercentile ?? 0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* School Ranking */}
                    {postTestAnalytics.rankings.school && (
                      <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                        <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          School Rank
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Current Rank:</span>
                            <Badge className="bg-green-600 text-lg">
                              #{postTestAnalytics.rankings.school.currentRank}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Percentile:</span>
                            <span className="font-bold text-green-700">
                              Top {(postTestAnalytics.rankings.school.percentile ?? postTestAnalytics.rankings.school.currentPercentile ?? 0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Overall Ranking */}
                    {postTestAnalytics.rankings.overall && (
                      <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                        <h4 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          Overall Rank
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Current Rank:</span>
                            <Badge className="bg-purple-600 text-lg">
                              #{postTestAnalytics.rankings.overall.currentRank}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Percentile:</span>
                            <span className="font-bold text-purple-700">
                              Top {(postTestAnalytics.rankings.overall.percentile ?? postTestAnalytics.rankings.overall.currentPercentile ?? 0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Speed vs Accuracy */}
          {answers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.15 }}
            >
              <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-300 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-cyan-600" />
                    Speed vs Accuracy Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border-2 border-cyan-200">
                      <h4 className="font-semibold text-gray-700 mb-4">Your Performance</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Accuracy Rate:</span>
                          <span className="text-2xl font-bold text-green-600">
                            {safePercentage}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Speed:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            {formatTime(result.time_taken_minutes)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Avg Time/Question:</span>
                          <span className="text-lg font-semibold text-gray-900">
                            {Math.round(result.time_taken_minutes * 60 / answers.length)}s
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg border-2 border-cyan-200">
                      <h4 className="font-semibold text-gray-700 mb-4">Comparison</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Your Speed</span>
                            <span className="font-semibold">{result.time_taken_minutes > result.tests.duration_minutes / 2 ? 'Slower' : 'Faster'}</span>
                          </div>
                          <Progress 
                            value={(result.time_taken_minutes / result.tests.duration_minutes) * 100} 
                            className="h-2"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Your Accuracy</span>
                            <span className="font-semibold">{safePercentage >= 70 ? 'Great!' : 'Needs Work'}</span>
                          </div>
                          <Progress 
                            value={safePercentage} 
                            className="h-2"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          {result.time_taken_minutes < result.tests.duration_minutes / 2 && safePercentage >= 80 
                            ? "⚡ Perfect balance of speed and accuracy!" 
                            : result.time_taken_minutes > result.tests.duration_minutes * 0.8
                            ? "⏱️ Take your time, but try to finish faster next time."
                            : safePercentage < 70
                            ? "🎯 Focus more on accuracy than speed."
                            : "Good job! Keep practicing to improve further."}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Leaderboards */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Individual Test Leaderboard */}
            <Card className="bg-gradient-to-br from-yellow-100 to-amber-100 border-2 border-yellow-300 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-600" />
                  Test Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.slice(0, 10).map((entry, index) => (
                    <div 
                      key={`${entry.student_id}-${index}`}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        entry.student_id === result.student_id 
                          ? 'bg-orange-200 border-2 border-orange-400' 
                          : 'bg-white/70 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-amber-600 text-black' : 'bg-gray-500 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            Student #{entry.student_id.slice(-4)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {entry.score} points • {Math.round(entry.time_taken_seconds / 60)}m
                          </p>
                        </div>
                      </div>
                      {index < 3 && (
                        <div className="text-xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cumulative Leaderboard */}
            <Card className="bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-indigo-200 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-blue-600" />
                  Overall Ranking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cumulativeLeaderboard.slice(0, 10).map((entry, index) => (
                    <div 
                      key={entry.student_id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        entry.student_id === result.student_id 
                          ? 'bg-indigo-200 border-2 border-indigo-400' 
                          : 'bg-white/70 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-indigo-500 text-white' :
                          index === 1 ? 'bg-purple-400 text-white' :
                          index === 2 ? 'bg-pink-400 text-white' : 'bg-gray-500 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            Student #{entry.student_id.slice(-4)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Avg: {entry.average_score}% • {entry.tests_attempted} tests
                          </p>
                        </div>
                      </div>
                      {index < 3 && (
                        <div className="text-xl">
                          {index === 0 ? '👑' : index === 1 ? '⭐' : '🌟'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5 }}
            className="text-center"
          >
            <Card className="bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-300 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Want to boost your rank and win the race? 🏁
                </h2>
                <p className="text-xl text-red-600 mb-6 font-medium">
                  Unlock your personalized roadmap + premium test series now.
                </p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-4 px-8 text-xl shadow-xl"
                    onClick={() => navigate('/student')}
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="mr-2"
                    >
                      🏆
                    </motion.div>
                    Subscribe Now & Accelerate!
                    <Rocket className="ml-2 h-6 w-6" />
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button 
              onClick={() => navigate('/student')}
              variant="outline"
              size="lg"
              className="bg-white border-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
            >
              <Home className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Zap className="h-5 w-5 mr-2" />
              Try Another Test
            </Button>
          </motion.div>

        </div>
      </div>
    </>
  );
};

export default TestResults;
