import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import CourseCard from "@/components/CourseCard";
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

const Dashboard = () => {
  const { user, loading: authLoading, isStudent } = useAuth();
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

  // Redirect to login if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const enrolledCourses = [
    {
      id: "1",
      title: "Complete Physics for JEE Main & Advanced",
      instructor: "Dr. Rajesh Kumar",
      thumbnail: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&h=300&fit=crop",
      price: 4999,
      rating: 4.9,
      studentsEnrolled: 15420,
      duration: "120 hours",
      level: "Advanced" as const,
      category: "Physics",
      progress: 75
    },
    {
      id: "2",
      title: "Mathematics Foundation for Class 10th",
      instructor: "Prof. Priya Sharma",
      thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop",
      price: 2999,
      rating: 4.8,
      studentsEnrolled: 23150,
      duration: "80 hours",
      level: "Intermediate" as const,
      category: "Mathematics",
      progress: 45
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="bg-muted/30 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Student Analytics</h1>
              <p className="text-muted-foreground">
                Analyze performance and compare with peers
              </p>
            </div>
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
            <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
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

      {/* Analytics Navigation */}
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
        {/* Error State */}
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

        {/* Core Metrics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            // Loading skeletons
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
            // Show selected student's data
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
            // Actual current user data
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
            // Fallback with static data
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

        {/* Analytics Charts */}
        <AnalyticsCharts activeTab={activeTab} />

        {/* Sidebar Content for smaller tabs */}
        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-4 gap-8 mt-8">
            <div className="lg:col-span-3">
              {/* Recent Activity */}
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
                    // Fallback data
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
                          <p className="text-sm font-medium">Watched: Vector Calculus Lecture</p>
                          <p className="text-xs text-muted-foreground">Duration: 45 minutes • Yesterday</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Classes */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Upcoming Classes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="border-l-4 border-primary pl-4 space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : upcomingClasses?.length ? (
                    <div className="space-y-4">
                      {upcomingClasses.map(classItem => (
                        <div key={classItem.id} className="border-l-4 border-primary pl-4 space-y-1">
                          <h4 className="font-medium text-sm">{classItem.title}</h4>
                          <p className="text-xs text-muted-foreground">{classItem.instructor}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-primary font-medium">{classItem.time}</span>
                            <Badge variant="secondary" className="text-xs">{classItem.subject}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No upcoming classes</p>
                  )}
                  <Button className="w-full mt-4" variant="outline" size="sm">
                    View Schedule
                  </Button>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card className="shadow-soft card-hover-blue">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Award className="h-5 w-5 mr-2 text-blue-600" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : achievements?.length ? (
                    <div className="space-y-3">
                      {achievements.map((achievement, index) => (
                        <div key={index} className="achievement-card flex items-start space-x-3 p-3 rounded-lg border-l-4 border-l-blue-500">
                          <div className="w-8 h-8 achievement-icon rounded-full flex items-center justify-center">
                            {achievement.icon === 'Trophy' && <Trophy className="h-4 w-4" />}
                            {achievement.icon === 'Target' && <Target className="h-4 w-4" />}
                            {achievement.icon === 'TrendingUp' && <TrendingUp className="h-4 w-4" />}
                            {achievement.icon === 'Award' && <Award className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-blue-900">{achievement.title}</h4>
                            <p className="text-xs text-blue-700">{achievement.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No achievements yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Study Goal */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Weekly Goal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ) : overview?.weeklyGoal ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Study Time</span>
                        <span>{overview.weeklyGoal.current}h / {overview.weeklyGoal.target}h</span>
                      </div>
                      <Progress value={overview.weeklyGoal.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {overview.weeklyGoal.description}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Study Time</span>
                        <span>12h / 15h</span>
                      </div>
                      <Progress value={80} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        You're 80% towards your weekly goal. Keep it up!
                      </p>
                    </div>
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

export default Dashboard;