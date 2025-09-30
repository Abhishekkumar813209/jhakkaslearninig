import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Map, 
  Building, 
  Users, 
  Brain, 
  BookOpen,
  ArrowRight,
  Crown,
  Medal,
  Award,
  Star,
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface PostTestAnalyticsProps {
  analyticsData: any;
  onSubscribeClick: () => void;
  loading?: boolean;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

export const PostTestAnalytics: React.FC<PostTestAnalyticsProps> = ({ 
  analyticsData, 
  onSubscribeClick,
  loading = false 
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full mx-auto mb-4"
          />
          <p className="text-lg font-medium">Generating your performance analysis...</p>
        </motion.div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analytics Unavailable</h3>
            <p className="text-muted-foreground mb-4">
              Unable to generate analytics for this test. Please try again later.
            </p>
            <Button onClick={() => navigate('/student')} variant="outline">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { testInfo, rankings, performance, insights, improvementSuggestions } = analyticsData;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">#{rank}</span>;
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return "bg-green-100 text-green-800";
    if (percentile >= 75) return "bg-blue-100 text-blue-800";
    if (percentile >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const performanceData = performance.topicBreakdown.map(topic => ({
    name: topic.topic,
    accuracy: topic.accuracy,
    questions: topic.total
  }));

  const scoreDistribution = [
    { name: 'Your Score', value: testInfo.percentage, color: 'hsl(var(--primary))' },
    { name: 'Remaining', value: 100 - testInfo.percentage, color: '#e5e7eb' }
  ];

  // Calculate "What If" scenarios
  const calculateWhatIf = (additionalCorrect: number) => {
    const avgMarksPerQuestion = testInfo.totalMarks / (performance.topicBreakdown.reduce((sum, t) => sum + t.total, 0) || 1);
    const potentialScore = testInfo.score + (additionalCorrect * avgMarksPerQuestion);
    const potentialPercentage = Math.round((potentialScore / testInfo.totalMarks) * 100);
    
    // Rough rank estimation (assuming linear distribution)
    const currentRankPosition = rankings.overall.currentRank || 1;
    const totalStudents = rankings.overall.totalStudents || currentRankPosition;
    const rankImprovement = Math.floor((additionalCorrect * avgMarksPerQuestion / testInfo.totalMarks) * totalStudents * 0.15);
    const potentialRank = Math.max(1, currentRankPosition - rankImprovement);
    
    return { potentialScore: Math.round(potentialScore), potentialPercentage, potentialRank };
  };

  const whatIfScenarios = [
    { label: '3 more correct', ...calculateWhatIf(3) },
    { label: '5 more correct', ...calculateWhatIf(5) },
    { label: '10 more correct', ...calculateWhatIf(10) }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
            <Brain className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Your Performance Analysis
          </h1>
          <p className="text-lg text-muted-foreground">
            {testInfo.title} • {testInfo.subject}
          </p>
        </motion.div>

        {/* Score Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-4" />
              <div className="text-3xl font-bold mb-2">{testInfo.score}/{testInfo.totalMarks}</div>
              <div className="text-xl font-semibold mb-2">{testInfo.percentage}%</div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Rank #{testInfo.rank}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <PieChart width={200} height={150} className="mx-auto">
                  <Pie
                    data={scoreDistribution}
                    cx={100}
                    cy={75}
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                  >
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
                <p className="text-sm text-muted-foreground mt-2">Score Distribution</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{testInfo.timeTaken}m</div>
                  <p className="text-sm text-muted-foreground">Time Taken</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{testInfo.difficulty}</div>
                  <p className="text-sm text-muted-foreground">Difficulty Level</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* "What If" Scenarios Calculator */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-orange-500/30 bg-gradient-to-br from-orange-50 to-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Zap className="h-5 w-5" />
                What If Calculator
              </CardTitle>
              <p className="text-sm text-muted-foreground">See how your rank would change with more correct answers</p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {whatIfScenarios.map((scenario, index) => (
                  <div key={index} className="p-4 rounded-lg border-2 border-orange-200 bg-white hover:border-orange-400 transition-all hover:shadow-md">
                    <p className="text-sm font-semibold text-orange-700 mb-3">{scenario.label}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Score</span>
                        <span className="text-lg font-bold text-orange-600">{scenario.potentialScore}/{testInfo.totalMarks}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Percentage</span>
                        <span className="text-sm font-semibold">{scenario.potentialPercentage}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Potential Rank</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-green-600">#{scenario.potentialRank}</span>
                          {scenario.potentialRank < (rankings.overall.currentRank || 999) && (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-center text-muted-foreground">
                  💡 <strong>Pro Tip:</strong> Focus on your weak topics to achieve these improvements in your next test!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rankings */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="zone" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="zone" className="flex items-center gap-2">
                    <Map className="w-4 h-4" />
                    Zone
                  </TabsTrigger>
                  <TabsTrigger value="school" className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    School
                  </TabsTrigger>
                  <TabsTrigger value="overall" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Overall
                  </TabsTrigger>
                </TabsList>

                {rankings.zone && (
                  <TabsContent value="zone" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">#{rankings.zone.currentRank || 'N/A'}</div>
                        <p className="text-sm text-muted-foreground">Zone Rank</p>
                        <p className="text-xs text-muted-foreground">{rankings.zone.zoneInfo?.name}</p>
                      </div>
                      <div className="text-center">
                        <Badge className={getPercentileColor(rankings.zone.currentPercentile || 0)}>
                          {rankings.zone.currentPercentile?.toFixed(1) || 0}%ile
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">Percentile</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Top 5 in Zone</h4>
                      {rankings.zone.leaderboard.slice(0, 5).map((student, index) => (
                        <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            {getRankIcon(index + 1)}
                            <span className="font-medium">{student.profiles?.full_name || 'Anonymous'}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{student.average_score?.toFixed(1) || 0}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}

                {rankings.school && (
                  <TabsContent value="school" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">#{rankings.school.currentRank || 'N/A'}</div>
                        <p className="text-sm text-muted-foreground">School Rank</p>
                        <p className="text-xs text-muted-foreground">{rankings.school.schoolInfo?.name}</p>
                      </div>
                      <div className="text-center">
                        <Badge className={getPercentileColor(rankings.school.currentPercentile || 0)}>
                          {rankings.school.currentPercentile?.toFixed(1) || 0}%ile
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">Percentile</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Top 5 in School</h4>
                      {rankings.school.leaderboard.slice(0, 5).map((student, index) => (
                        <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            {getRankIcon(index + 1)}
                            <span className="font-medium">{student.profiles?.full_name || 'Anonymous'}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{student.average_score?.toFixed(1) || 0}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="overall" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">#{rankings.overall.currentRank || 'N/A'}</div>
                      <p className="text-sm text-muted-foreground">Overall Rank</p>
                      <p className="text-xs text-muted-foreground">Among all students</p>
                    </div>
                    <div className="text-center">
                      <Badge className={getPercentileColor(rankings.overall.currentPercentile || 0)}>
                        {rankings.overall.currentPercentile?.toFixed(1) || 0}%ile
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">Percentile</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Top 5 Overall</h4>
                    {rankings.overall.leaderboard.slice(0, 5).map((student, index) => (
                      <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          {getRankIcon(index + 1)}
                          <span className="font-medium">{student.profiles?.full_name || 'Anonymous'}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{student.average_score?.toFixed(1) || 0}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance Analysis */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Strengths & Weaknesses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Performance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {performance.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Strengths
                  </h4>
                  {performance.strengths.map((strength, index) => (
                    <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 mr-2 mb-2">
                      {strength.topic} ({strength.accuracy.toFixed(1)}%)
                    </Badge>
                  ))}
                </div>
              )}
              
              {performance.weaknesses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Areas to Improve
                  </h4>
                  {performance.weaknesses.map((weakness, index) => (
                    <Badge key={index} variant="secondary" className="bg-red-100 text-red-800 mr-2 mb-2">
                      {weakness.topic} ({weakness.accuracy.toFixed(1)}%)
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Topic Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Topic-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="accuracy" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Insights */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50">
                    <Star className="w-5 h-5 text-blue-600 mt-0.5" />
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upgrade CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Card className="bg-gradient-to-r from-purple-500 to-blue-600 text-white border-0">
            <CardContent className="p-8 text-center">
              <Crown className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">Unlock Your Full Potential</h3>
              <p className="text-lg mb-6 opacity-90">
                Get personalized roadmaps, mentorship, full test series, and detailed bi-weekly analytics
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Personalized Roadmap
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Expert Mentorship
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Full Test Series
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Gamified Learning
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-purple-600 hover:bg-gray-100"
                  onClick={onSubscribeClick}
                >
                  Upgrade Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10"
                  onClick={() => navigate('/student')}
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};