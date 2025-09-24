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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, [testId]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchTestResults(),
      fetchAnswers(),
      fetchAnalytics(),
      fetchLeaderboards()
    ]);
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
      // Individual test leaderboard
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
        .limit(10);

      setLeaderboard(testLeaderboard || []);

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
      { name: 'Correct', value: correct, color: '#10b981' },
      { name: 'Wrong', value: wrong, color: '#ef4444' },
      { name: 'Unattempted', value: unattempted, color: '#6b7280' }
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          
          {/* Header with Trophy Animation */}
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${passed ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-red-400 to-pink-500'} text-white text-3xl font-bold shadow-2xl`}
            >
              {passed ? <Trophy className="h-12 w-12" /> : <Target className="h-12 w-12" />}
            </motion.div>
            
            <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Race Results 🏁
            </h1>
            <p className="text-xl text-blue-200">{result.tests.title} • {result.tests.subject}</p>
          </motion.div>

          {/* Score Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Score */}
            <Card className="bg-gradient-to-br from-green-400/20 to-blue-500/20 border-green-400/30 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <Award className="h-8 w-8 mx-auto mb-4 text-yellow-400" />
                <div className="text-5xl font-bold text-white mb-2">{result.score}/{derivedTotalMarks}</div>
                <div className="text-3xl font-semibold text-green-400 mb-4">{safePercentage}%</div>
                <Badge variant={passed ? "default" : "destructive"} className="text-lg px-4 py-2">
                  {passed ? "🏆 CHAMPION" : "🎯 KEEP RACING"}
                </Badge>
              </CardContent>
            </Card>

            {/* Status */}
            <Card className={`bg-gradient-to-br ${passed ? 'from-green-500/20 to-emerald-600/20 border-green-400/30' : 'from-red-500/20 to-pink-600/20 border-red-400/30'} backdrop-blur-sm`}>
              <CardContent className="p-6 text-center">
                {passed ? <CheckCircle className="h-8 w-8 mx-auto mb-4 text-green-400" /> : <XCircle className="h-8 w-8 mx-auto mb-4 text-red-400" />}
                <div className={`text-4xl font-bold mb-4 ${passed ? 'text-green-400' : 'text-red-400'}`}>
                  {passed ? 'VICTORY!' : 'TRY AGAIN!'}
                </div>
                <Progress 
                  value={safePercentage} 
                  className="h-4 mb-2"
                />
                <p className="text-sm text-gray-300">Target: {result.tests.passing_marks}%</p>
              </CardContent>
            </Card>

            {/* Time */}
            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-400/30 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-4 text-purple-400" />
                <div className="text-4xl font-bold text-white mb-2">
                  {formatTime(
                    result.time_taken_seconds && result.time_taken_seconds > 0 
                      ? result.time_taken_seconds / 60 
                      : result.time_taken_minutes
                  )}
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  Total: {result.tests.duration_minutes}m
                </div>
                {analytics && (
                  <div className="text-sm text-purple-300">
                    Faster than {analytics.fasterThanPercent}% of racers
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
            <Card className="bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border-indigo-400/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
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
            <Card className="bg-gradient-to-br from-teal-500/20 to-cyan-600/20 border-teal-400/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Topic Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topicData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="topic" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="percentage" fill="#06b6d4" />
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
            <Card className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-yellow-400/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-center text-2xl">
                  🏁 Race Track Position
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {/* Track */}
                <div className="relative h-20 bg-gray-700 rounded-full mb-6 overflow-hidden">
                  {/* Track Lines */}
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-1 bg-yellow-400 opacity-50" 
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
                      <div className="bg-blue-500 text-white px-2 py-1 rounded text-sm font-bold">
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
                  <h3 className="text-2xl font-bold text-white mb-2">
                    You are ahead of {studentsAhead} students out of {totalStudents} 🚀
                  </h3>
                  <p className="text-lg text-blue-300 italic">
                    "Keep accelerating! The finish line is closer than you think."
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Leaderboards */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Individual Test Leaderboard */}
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border-yellow-400/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Test Champions 🏆
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.slice(0, 10).map((entry, index) => (
                    <div 
                      key={entry.student_id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        entry.student_id === result.student_id 
                          ? 'bg-blue-500/30 border border-blue-400' 
                          : 'bg-gray-700/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-amber-600 text-black' : 'bg-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            Student #{entry.student_id.slice(-4)}
                          </p>
                          <p className="text-sm text-gray-300">
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
            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-400/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Overall Champions 👑
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cumulativeLeaderboard.slice(0, 10).map((entry, index) => (
                    <div 
                      key={entry.student_id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        entry.student_id === result.student_id 
                          ? 'bg-purple-500/30 border border-purple-400' 
                          : 'bg-gray-700/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-purple-500 text-white' :
                          index === 1 ? 'bg-pink-400 text-white' :
                          index === 2 ? 'bg-indigo-500 text-white' : 'bg-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            Student #{entry.student_id.slice(-4)}
                          </p>
                          <p className="text-sm text-gray-300">
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
            <Card className="bg-gradient-to-r from-orange-500/20 to-red-600/20 border-orange-400/30 backdrop-blur-sm">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Want to boost your rank and win the race? 🏁
                </h2>
                <p className="text-xl text-orange-200 mb-6">
                  Unlock your personalized roadmap + premium test series now.
                </p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 px-8 text-xl shadow-2xl"
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
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
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
