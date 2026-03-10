import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { StudentAppLayout } from "@/components/student/StudentAppLayout";
import ProgressCard from "@/components/ProgressCard";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { useDashboard } from "@/hooks/useDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BookOpen,
  Clock,
  Trophy,
  TrendingUp,
  Target,
  Calendar,
  PlayCircle,
  Award,
  Users,
  Star,
  CheckCircle,
  BarChart3,
  LineChart,
  PieChart,
  Zap,
  RefreshCw
} from "lucide-react";

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStudent, setSelectedStudent] = useState("current");
  const [timePeriod, setTimePeriod] = useState("30");
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [studentAnalytics, setStudentAnalytics] = useState<any>(null);
  
  const { 
    overview, 
    upcomingClasses, 
    achievements, 
    isLoading, 
    error, 
    refreshDashboard 
  } = useDashboard();

  const mockStudents = [
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Priya Patel' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Rahul Sharma' },
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Anita Gupta' },
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Vikram Singh' },
    { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Kavya Reddy' },
    { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Arjun Kumar' },
    { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Sneha Joshi' },
    { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Rohit Mehta' },
    { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Pooja Agarwal' },
    { id: '550e8400-e29b-41d4-a716-446655440010', name: 'Karthik Rao' },
  ];

  const fetchStudents = async () => {
    try {
      const res = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/student-analytics`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setStudents(json.data.map((s: any) => ({ id: s.id, name: s.name })));
      } else if (!students.length) {
        setStudents(mockStudents);
      }
    } catch (e) {
      console.error('Error loading students:', e);
      if (!students.length) setStudents(mockStudents);
    }
  };

  const fetchStudentAnalytics = async () => {
    if (selectedStudent === "current" || !selectedStudent) return;
    
    try {
      const res = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/student-analytics?studentId=${selectedStudent}`);
      const json = await res.json();
      if (json.success) {
        setStudentAnalytics(json.data);
      }
    } catch (e) {
      console.error('Error loading student analytics:', e);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchStudentAnalytics();
  }, [selectedStudent]);

  if (authLoading) {
    return (
      <StudentAppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      </StudentAppLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <StudentAppLayout>
      
      <section className="bg-muted/30 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Student Analytics</h1>
              <p className="text-muted-foreground">
                Analyze performance and compare with peers
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
              <Button 
                onClick={refreshDashboard} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Student</SelectItem>
                  {(students.length ? students : mockStudents).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
              { id: "performance", label: "Performance", icon: <LineChart className="h-4 w-4" /> },
              { id: "comparison", label: "Comparison", icon: <PieChart className="h-4 w-4" /> },
              { id: "leaderboard", label: "Leaderboard", icon: <Trophy className="h-4 w-4" /> },
              { id: "predictive", label: "Predictive Analytics", icon: <Zap className="h-4 w-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span>Error loading dashboard: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-5 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))
          ) : (selectedStudent !== "current" && studentAnalytics) ? (
            <>
              <ProgressCard
                title="Total Study Time"
                value={studentAnalytics.stats.totalStudyTime.value}
                change={studentAnalytics.stats.totalStudyTime.change}
                changeType={studentAnalytics.stats.totalStudyTime.changeType}
                description={studentAnalytics.stats.totalStudyTime.description}
                icon={<Clock className="h-5 w-5" />}
                color="primary"
              />
              <ProgressCard
                title="Average Score"
                value={studentAnalytics.stats.averageScore.value}
                change={studentAnalytics.stats.averageScore.change}
                changeType={studentAnalytics.stats.averageScore.changeType}
                description={studentAnalytics.stats.averageScore.description}
                icon={<Target className="h-5 w-5" />}
                color="success"
              />
              <ProgressCard
                title="Current Streak"
                value={studentAnalytics.stats.currentStreak.value}
                change={studentAnalytics.stats.currentStreak.change}
                changeType={studentAnalytics.stats.currentStreak.changeType}
                description={studentAnalytics.stats.currentStreak.description}
                icon={<TrendingUp className="h-5 w-5" />}
                color="warning"
              />
              <ProgressCard
                title="Batch Rank"
                value={studentAnalytics.stats.batchRank.value}
                change={studentAnalytics.stats.batchRank.change}
                changeType={studentAnalytics.stats.batchRank.changeType}
                description={studentAnalytics.stats.batchRank.description}
                icon={<Trophy className="h-5 w-5" />}
                color="primary"
              />
            </>
          ) : overview ? (
            <>
              <ProgressCard
                title="Total Study Time"
                value={overview.stats.totalStudyTime.value}
                change={overview.stats.totalStudyTime.change}
                changeType={overview.stats.totalStudyTime.changeType}
                description={overview.stats.totalStudyTime.description}
                icon={<Clock className="h-5 w-5" />}
                color="primary"
              />
              <ProgressCard
                title="Average Score"
                value={overview.stats.averageScore.value}
                change={overview.stats.averageScore.change}
                changeType={overview.stats.averageScore.changeType}
                description={overview.stats.averageScore.description}
                icon={<Target className="h-5 w-5" />}
                color="success"
              />
              <ProgressCard
                title="Current Streak"
                value={overview.stats.currentStreak.value}
                change={overview.stats.currentStreak.change}
                changeType={overview.stats.currentStreak.changeType}
                description={overview.stats.currentStreak.description}
                icon={<TrendingUp className="h-5 w-5" />}
                color="warning"
              />
              <ProgressCard
                title="Batch Rank"
                value={overview.stats.batchRank.value}
                change={overview.stats.batchRank.change}
                changeType={overview.stats.batchRank.changeType}
                description={overview.stats.batchRank.description}
                icon={<Trophy className="h-5 w-5" />}
                color="primary"
              />
            </>
          ) : (
            <>
              <ProgressCard
                title="Total Study Time"
                value="142h"
                change={8}
                changeType="increase"
                description="This month"
                icon={<Clock className="h-5 w-5" />}
                color="primary"
              />
              <ProgressCard
                title="Average Score"
                value="87%"
                change={5}
                changeType="increase"
                description="Across all subjects"
                icon={<Target className="h-5 w-5" />}
                color="success"
              />
              <ProgressCard
                title="Current Streak"
                value="12 days"
                change={15}
                changeType="increase"
                description="Consecutive study days"
                icon={<TrendingUp className="h-5 w-5" />}
                color="warning"
              />
              <ProgressCard
                title="Batch Rank"
                value="#4"
                change={2}
                changeType="increase"
                description="Out of 150 students"
                icon={<Trophy className="h-5 w-5" />}
                color="primary"
              />
            </>
          )}
        </div>

        <AnalyticsCharts activeTab={activeTab} subjectPerformance={overview?.subjectPerformance} performanceTrend={overview?.performanceTrend} />

        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-4 gap-8 mt-8">
            <div className="lg:col-span-3">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-xl">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-48 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : overview?.recentActivity?.length ? (
                    <div className="space-y-4">
                      {overview.recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className={`w-8 h-8 bg-${activity.color}/10 rounded-full flex items-center justify-center`}>
                            {activity.icon === 'CheckCircle' && <CheckCircle className={`h-4 w-4 text-${activity.color}`} />}
                            {activity.icon === 'PlayCircle' && <PlayCircle className={`h-4 w-4 text-${activity.color}`} />}
                            {activity.icon === 'Award' && <Award className={`h-4 w-4 text-${activity.color}`} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">{activity.description} • {new Date(activity.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-success" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Completed Quiz: Thermodynamics</p>
                          <p className="text-xs text-muted-foreground">Score: 92% • 2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <PlayCircle className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Watched: Advanced Calculus Lecture</p>
                          <p className="text-xs text-muted-foreground">Duration: 45 minutes • Yesterday</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                          <Award className="h-4 w-4 text-warning" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Achievement Unlocked: Week Warrior</p>
                          <p className="text-xs text-muted-foreground">7 day streak • 3 days ago</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index}>
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : upcomingClasses?.length ? (
                    <div className="space-y-4">
                      {upcomingClasses.map((cls, index) => (
                        <div key={index} className="pb-4 border-b last:border-0">
                          <div className="flex items-start space-x-3">
                            <div className="bg-primary/10 rounded p-2">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{cls.title}</p>
                              <p className="text-xs text-muted-foreground">{cls.instructor}</p>
                              <p className="text-xs text-muted-foreground">{cls.time} • {cls.duration}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="pb-4 border-b">
                        <div className="flex items-start space-x-3">
                          <div className="bg-primary/10 rounded p-2">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Physics: Modern Physics</p>
                            <p className="text-xs text-muted-foreground">Dr. Kumar</p>
                            <p className="text-xs text-muted-foreground">Today, 4:00 PM • 1 hour</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-start space-x-3">
                          <div className="bg-primary/10 rounded p-2">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Mathematics: Calculus</p>
                            <p className="text-xs text-muted-foreground">Prof. Sharma</p>
                            <p className="text-xs text-muted-foreground">Tomorrow, 10:00 AM • 1.5 hours</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <Skeleton className="h-8 w-8 rounded" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : achievements?.length ? (
                    <div className="space-y-3">
                      {achievements.slice(0, 3).map((achievement, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="text-2xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{achievement.title}</p>
                            <p className="text-xs text-muted-foreground">{achievement.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">🏆</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Top Scorer</p>
                          <p className="text-xs text-muted-foreground">Scored 95% in Physics</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">⚡</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Speed Demon</p>
                          <p className="text-xs text-muted-foreground">Completed test in record time</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg">Weekly Goal</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </>
                  ) : overview?.weeklyGoal ? (
                    <>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Study Hours</span>
                        <span className="font-medium">{overview.weeklyGoal.current}/{overview.weeklyGoal.target}h</span>
                      </div>
                      <Progress value={overview.weeklyGoal.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">{overview.weeklyGoal.description}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Study Hours</span>
                        <span className="font-medium">28/35h</span>
                      </div>
                      <Progress value={80} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">You're almost there! Keep it up.</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;