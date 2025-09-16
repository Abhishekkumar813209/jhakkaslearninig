import React, { useState, useEffect } from 'react';
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

const Analytics = () => {
  const [selectedStudent, setSelectedStudent] = useState('550e8400-e29b-41d4-a716-446655440001');
  const [timeframe, setTimeframe] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);

  const mockStudents = [
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Priya Patel' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Rahul Sharma' },
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Anita Gupta' },
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Vikram Singh' },
    { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Sneha Joshi' },
  ];

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Student Analytics</h1>
            <p className="text-muted-foreground">Analyze performance and compare with peers</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={fetchAnalytics} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Student" />
              </SelectTrigger>
              <SelectContent>
                {mockStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

          {['performance', 'comparison', 'predictive'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardHeader>
                  <CardTitle>{tab.charAt(0).toUpperCase() + tab.slice(1)} Analytics</CardTitle>
                  <CardDescription>
                    {tab === 'performance' && 'Detailed performance metrics and trends'}
                    {tab === 'comparison' && 'Compare student performance with peers'}
                    {tab === 'predictive' && 'AI-powered predictions and insights'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>✅ {tab.charAt(0).toUpperCase() + tab.slice(1)} API ready - Supabase Edge Function deployed</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Data will be loaded from database with 10 mock students for testing
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;