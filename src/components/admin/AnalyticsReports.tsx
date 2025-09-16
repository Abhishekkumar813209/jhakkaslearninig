import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, TrendingDown, Users, BookOpen, Target } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

// Mock analytics data
const performanceData = [
  { month: 'Jan', avgScore: 72, students: 200, completion: 68 },
  { month: 'Feb', avgScore: 75, students: 340, completion: 72 },
  { month: 'Mar', avgScore: 78, students: 580, completion: 75 },
  { month: 'Apr', avgScore: 76, students: 750, completion: 78 },
  { month: 'May', avgScore: 82, students: 920, completion: 80 },
  { month: 'Jun', avgScore: 79, students: 1247, completion: 85 }
];

const subjectPerformance = [
  { subject: 'Physics', score: 78, improvement: 5.2 },
  { subject: 'Chemistry', score: 82, improvement: -2.1 },
  { subject: 'Mathematics', score: 75, improvement: 8.7 },
  { subject: 'Biology', score: 85, improvement: 3.4 }
];

const batchComparison = [
  { batch: 'JEE Main', students: 450, avgScore: 78, topScore: 95, weakest: 45 },
  { batch: 'JEE Advanced', students: 280, avgScore: 85, topScore: 98, weakest: 52 },
  { batch: 'NEET', students: 320, avgScore: 82, topScore: 96, weakest: 48 },
  { batch: 'Foundation', students: 197, avgScore: 72, topScore: 89, weakest: 38 }
];

const engagementData = [
  { course: 'Physics Complete', enrollments: 320, avgWatchTime: 85, completion: 78 },
  { course: 'Chemistry Mastery', enrollments: 285, avgWatchTime: 92, completion: 85 },
  { course: 'Math Foundation', enrollments: 410, avgWatchTime: 76, completion: 72 },
  { course: 'Biology Advanced', enrollments: 195, avgWatchTime: 88, completion: 80 }
];

const predictiveData = [
  { student: 'Rahul Sharma', currentScore: 85, predictedAIR: 1250, promotionProbability: 92 },
  { student: 'Priya Patel', currentScore: 92, predictedAIR: 580, promotionProbability: 96 },
  { student: 'Arjun Singh', currentScore: 78, predictedAIR: 2100, promotionProbability: 78 },
  { student: 'Sneha Gupta', currentScore: 88, predictedAIR: 950, promotionProbability: 89 }
];

const AnalyticsReports = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics & Reports</h2>
          <p className="text-muted-foreground">Comprehensive analytics and performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="last-30-days">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-3-months">Last 3 months</SelectItem>
              <SelectItem value="last-6-months">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
                <p className="text-2xl font-bold text-foreground">78.5%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">+5.2% from last month</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Course Completion</p>
                <p className="text-2xl font-bold text-foreground">85%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">+3.1% from last month</span>
                </div>
              </div>
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                <p className="text-2xl font-bold text-foreground">1,247</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">+12.3% from last month</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Study Streak</p>
                <p className="text-2xl font-bold text-foreground">15.8</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-red-600">-1.2 days avg</span>
                </div>
              </div>
              <div className="h-8 w-8 text-orange-600 font-bold text-lg">🔥</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="avgScore" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="completion" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle>Subject-wise Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Batch Comparison */}
        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle>Batch Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={batchComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="batch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgScore" fill="#3B82F6" />
                <Bar dataKey="topScore" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Course Engagement */}
        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle>Course Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {engagementData.map((course, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium">{course.course}</div>
                    <div className="text-sm text-muted-foreground">{course.enrollments} enrollments</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{course.avgWatchTime}% watch time</div>
                    <Badge variant={course.completion > 80 ? "default" : "secondary"}>
                      {course.completion}% completion
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictive Analytics */}
      <Card className="card-gradient shadow-soft">
        <CardHeader>
          <CardTitle>Predictive Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Student</th>
                  <th className="text-left p-3">Current Score</th>
                  <th className="text-left p-3">Predicted AIR</th>
                  <th className="text-left p-3">Promotion Probability</th>
                  <th className="text-left p-3">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {predictiveData.map((student, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-3 font-medium">{student.student}</td>
                    <td className="p-3">{student.currentScore}%</td>
                    <td className="p-3">{student.predictedAIR.toLocaleString()}</td>
                    <td className="p-3">{student.promotionProbability}%</td>
                    <td className="p-3">
                      <Badge variant={student.promotionProbability > 85 ? "default" : student.promotionProbability > 70 ? "secondary" : "destructive"}>
                        {student.promotionProbability > 85 ? "Low" : student.promotionProbability > 70 ? "Medium" : "High"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsReports;