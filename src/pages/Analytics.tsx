import React, { useState, useEffect } from 'react';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, TrendingUp, Clock, Target, Award, BookOpen, Users, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import StudentSearchInput from '@/components/StudentSearchInput';
import { useSubscription } from '@/hooks/useSubscription';
import SubscriptionCard from '@/components/student/SubscriptionCard';
import PremiumFeatureLock from '@/components/common/PremiumFeatureLock';
import { useToast } from '@/hooks/use-toast';

const Analytics = () => {
  const [selectedStudent, setSelectedStudent] = useState('550e8400-e29b-41d4-a716-446655440001');
  const [timeframe, setTimeframe] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const { hasActiveSubscription, hasFreeTestUsed, fetchSubscriptionStatus } = useSubscription();
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/student-analytics?studentId=${selectedStudent}&timeframe=${timeframe}`);
      const result = await response.json();
      if (result.success) {
        setAnalyticsData(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/student-leaderboard?type=overall`);
      const result = await response.json();
      if (result.success) {
        setLeaderboardData(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchLeaderboard();
  }, [selectedStudent, timeframe]);

  if (!hasActiveSubscription) {
    return (
      <>
        <SEOHead 
          title="Analytics - Premium Required"
          description="Access detailed student analytics, performance tracking, and learning insights with our premium subscription."
          keywords="student analytics, performance tracking, learning insights, premium education"
          noIndex={true}
        />
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container mx-auto p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
              <p className="text-muted-foreground">Premium required to access detailed analytics</p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <PremiumFeatureLock
                featureName="Detailed Analytics"
                description="Get comprehensive insights into your learning progress, test performance, strengths, weaknesses, and personalized recommendations to improve your scores."
                onUpgrade={() => {
                  // Scroll to subscription card
                  const subscriptionCard = document.querySelector('[data-subscription-card]') as HTMLElement;
                  if (subscriptionCard) {
                    subscriptionCard.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />
              
              <div className="mt-8">
                <SubscriptionCard
                  hasActiveSubscription={hasActiveSubscription}
                  hasFreeTestUsed={hasFreeTestUsed}
                  onSubscriptionSuccess={async () => {
                    await fetchSubscriptionStatus();
                    toast({
                      title: "Premium Activated! 🎉",
                      description: "You now have access to detailed analytics.",
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title="Student Analytics Dashboard"
        description="Comprehensive analytics dashboard showing student performance, rankings, trends, and predictive insights."
        keywords="student dashboard, performance analytics, learning metrics, educational insights"
      />
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Student Analytics</h1>
              <p className="text-muted-foreground">Analyze performance and compare with peers</p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={fetchAnalytics} variant="outline" size="sm" disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full md:w-auto">
                <StudentSearchInput
                  selectedStudent={selectedStudent}
                  onStudentSelect={setSelectedStudent}
                  placeholder="Search by name or email..."
                />
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview"><BookOpen className="h-4 w-4 mr-2" />Overview</TabsTrigger>
              <TabsTrigger value="performance"><TrendingUp className="h-4 w-4 mr-2" />Performance</TabsTrigger>
              <TabsTrigger value="comparison"><Users className="h-4 w-4 mr-2" />Comparison</TabsTrigger>
              <TabsTrigger value="leaderboard"><Award className="h-4 w-4 mr-2" />Leaderboard</TabsTrigger>
              <TabsTrigger value="predictive"><Brain className="h-4 w-4 mr-2" />Predictive</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {analyticsData && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.stats?.totalStudyTime?.value || "142h"}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.stats?.averageScore?.value || "87%"}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.stats?.currentStreak?.value || "12 days"}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Batch Rank</CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.stats?.batchRank?.value || "#4"}</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="leaderboard">
              {leaderboardData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Leaderboard</CardTitle>
                    <CardDescription>Top performing students</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {leaderboardData.students?.map((student: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{index === 0 ? "👑" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}</div>
                            <Avatar>
                              <AvatarImage src={student.avatar} />
                              <AvatarFallback>{student.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-sm text-muted-foreground">Score: {student.score}%</p>
                            </div>
                          </div>
                          <Badge variant="default">Rank {student.rank}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="performance">
              <AnalyticsCharts
                activeTab="performance"
                subjectPerformance={analyticsData?.subjectPerformance}
                performanceTrend={analyticsData?.performanceTrend}
              />
            </TabsContent>

            <TabsContent value="comparison">
              <AnalyticsCharts activeTab="comparison" />
            </TabsContent>

            <TabsContent value="predictive">
              <AnalyticsCharts activeTab="predictive" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Analytics;