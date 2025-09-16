import Navbar from "@/components/Navbar";
import CourseCard from "@/components/CourseCard";
import ProgressCard from "@/components/ProgressCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  CheckCircle
} from "lucide-react";

const Dashboard = () => {
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
              <h1 className="text-3xl font-bold mb-2">Welcome back, Student!</h1>
              <p className="text-muted-foreground">
                Continue your learning journey and track your progress
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Badge variant="secondary" className="text-sm">
                <Star className="h-4 w-4 mr-1" />
                Premium Member
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Progress Overview */}
            <div className="grid md:grid-cols-3 gap-6">
              <ProgressCard
                title="Courses Enrolled"
                value={enrolledCourses.length}
                change={15}
                changeType="increase"
                description="Active learning paths"
                icon={<BookOpen className="h-5 w-5" />}
                color="primary"
              />
              <ProgressCard
                title="Hours Studied"
                value="142h"
                change={8}
                changeType="increase"
                description="This month"
                icon={<Clock className="h-5 w-5" />}
                color="success"
              />
              <ProgressCard
                title="Quiz Average"
                value="87%"
                change={5}
                changeType="increase"
                description="Across all subjects"
                icon={<Trophy className="h-5 w-5" />}
                color="warning"
              />
            </div>

            {/* Enrolled Courses */}
            <Card className="shadow-soft">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">My Courses</CardTitle>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {enrolledCourses.map(course => (
                    <CourseCard key={course.id} {...course} />
                  ))}
                </div>
              </CardContent>
            </Card>

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
      </div>
    </div>
  );
};

export default Dashboard;