import { useState } from "react";
import Navbar from "@/components/Navbar";
import CourseCard from "@/components/CourseCard";
import ProgressCard from "@/components/ProgressCard";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Zap
} from "lucide-react";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStudent, setSelectedStudent] = useState("current");
  const [timePeriod, setTimePeriod] = useState("30");
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

  const upcomingClasses = [
    {
      id: 1,
      title: "Quantum Mechanics - Wave Function",
      instructor: "Dr. Rajesh Kumar",
      time: "Today, 4:00 PM",
      duration: "1.5 hours",
      subject: "Physics"
    },
    {
      id: 2,
      title: "Calculus - Integration by Parts",
      instructor: "Prof. Priya Sharma", 
      time: "Tomorrow, 2:00 PM",
      duration: "2 hours",
      subject: "Mathematics"
    },
    {
      id: 3,
      title: "Organic Chemistry - Reaction Mechanisms",
      instructor: "Dr. Amit Verma",
      time: "Friday, 3:30 PM",
      duration: "1.5 hours",
      subject: "Chemistry"
    }
  ];

  const achievements = [
    { title: "Quiz Master", description: "Scored 90%+ in 10 quizzes", icon: <Trophy className="h-6 w-6" /> },
    { title: "Consistent Learner", description: "7-day learning streak", icon: <Target className="h-6 w-6" /> },
    { title: "Fast Learner", description: "Completed 5 chapters this week", icon: <TrendingUp className="h-6 w-6" /> }
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
            <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Student</SelectItem>
                  <SelectItem value="student1">Arjun Sharma</SelectItem>
                  <SelectItem value="student2">Priya Patel</SelectItem>
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
        {/* Core Metrics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
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
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                        <Award className="h-4 w-4 text-warning" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Earned Badge: Quiz Master</p>
                        <p className="text-xs text-muted-foreground">For scoring 90%+ in 10 quizzes • 3 days ago</p>
                      </div>
                    </div>
                  </div>
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
                  <Button className="w-full mt-4" variant="outline" size="sm">
                    View Schedule
                  </Button>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {achievements.map((achievement, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center text-success">
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{achievement.title}</h4>
                          <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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