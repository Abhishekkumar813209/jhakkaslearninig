import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Trophy,
  Award,
  AlertTriangle,
  Zap
} from "lucide-react";

// Sample data for charts
const subjectPerformanceData = [
  { subject: 'Mathematics', score: 85 },
  { subject: 'Physics', score: 78 },
  { subject: 'Chemistry', score: 92 },
  { subject: 'Biology', score: 74 },
  { subject: 'English', score: 88 }
];

const performanceTrendData = [
  { month: 'Jan', score: 65 },
  { month: 'Feb', score: 72 },
  { month: 'Mar', score: 68 },
  { month: 'Apr', score: 78 },
  { month: 'May', score: 85 },
  { month: 'Jun', score: 82 }
];

const timeSpentData = [
  { subject: 'Math', hours: 24 },
  { subject: 'Physics', hours: 18 },
  { subject: 'Chemistry', hours: 22 },
  { subject: 'Biology', hours: 16 },
  { subject: 'English', hours: 12 }
];

const airPredictionData = [
  { month: 'Current', rank: 1250 },
  { month: '+1M', rank: 1100 },
  { month: '+2M', rank: 950 },
  { month: '+3M', rank: 800 },
  { month: '+4M', rank: 720 },
  { month: '+5M', rank: 650 }
];

const weaknessHeatmapData = [
  { topic: 'Calculus', risk: 85, color: '#ef4444' },
  { topic: 'Organic Chemistry', risk: 72, color: '#f97316' },
  { topic: 'Thermodynamics', risk: 45, color: '#eab308' },
  { topic: 'Genetics', risk: 30, color: '#22c55e' },
  { topic: 'Literature', risk: 15, color: '#10b981' }
];

const COLORS = ['#3B82F6', '#1D4ED8', '#0EA5E9', '#0284C7', '#0369A1', '#075985'];

interface AnalyticsChartsProps {
  activeTab: string;
  subjectPerformance?: Array<{ subject: string; score: number }>;
  performanceTrend?: Array<{ month: string; score: number }>;
}

const AnalyticsCharts = ({ activeTab, subjectPerformance, performanceTrend }: AnalyticsChartsProps) => {
  // Use real data if available, otherwise fall back to mock data
  const chartSubjectData = subjectPerformance || subjectPerformanceData;
  const chartTrendData = performanceTrend || performanceTrendData;
  if (activeTab === "overview") {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Subject Performance Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={chartSubjectData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                  strokeWidth={3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3B82F6"
                  strokeWidth={4}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, fill: '#1D4ED8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Time Spent per Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeSpentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === "performance") {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={4} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }} activeDot={{ r: 8, fill: '#1D4ED8' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Subject Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartSubjectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === "predictive") {
    return (
      <div className="space-y-6">
        {/* AIR Prediction */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                AIR Prediction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">650</div>
                  <div className="text-sm text-muted-foreground">Predicted AIR in 5 months</div>
                  <Badge variant="secondary" className="mt-2">85% confidence</Badge>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={airPredictionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="rank"
                      stroke="#10B981"
                      strokeWidth={4}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, fill: '#059669' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Burnout Risk Indicator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                    <div className="text-2xl font-bold text-success">Low</div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your study pattern is healthy. Keep maintaining balance!
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Study Hours vs Performance</span>
                    <span className="text-success">Optimal</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weakest Topics */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Weakest Topics Prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weaknessHeatmapData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.topic}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{item.risk}% risk</span>
                    <Progress value={item.risk} className="w-20 h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time to Mastery & Goal Forecasting */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Time-to-Mastery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Mathematics (Calculus)</span>
                    <span>3 weeks remaining</span>
                  </div>
                  <Progress value={70} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Physics (Mechanics)</span>
                    <span>2 weeks remaining</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Chemistry (Organic)</span>
                    <span>5 weeks remaining</span>
                  </div>
                  <Progress value={40} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Batch Promotion Probability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div>
                  <div className="text-4xl font-bold text-success mb-2">92%</div>
                  <p className="text-sm text-muted-foreground">
                    Probability of promotion to next batch
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Performance</span>
                    <span className="text-success">Excellent</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
                <Badge variant="secondary" className="bg-success/10 text-success">
                  Keep up the great work!
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === "comparison") {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Peer Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span>Your Average</span>
                <span className="font-bold text-primary">87%</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span>Batch Average</span>
                <span className="font-bold">78%</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-success/10">
                <span>Difference</span>
                <span className="font-bold text-success">+9%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Subject Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Mathematics', 'Physics', 'Chemistry', 'Biology'].map((subject, index) => (
                <div key={subject} className="flex justify-between items-center">
                  <span>{subject}</span>
                  <Badge variant={index < 2 ? "default" : "secondary"}>
                    #{index + 3} in batch
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === "leaderboard") {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Live Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { rank: 1, name: "Arjun Sharma", score: 98, badge: "🥇" },
              { rank: 2, name: "Priya Patel", score: 96, badge: "🥈" },
              { rank: 3, name: "Rahul Kumar", score: 94, badge: "🥉" },
              { rank: 4, name: "You", score: 87, badge: "", highlight: true },
              { rank: 5, name: "Sneha Singh", score: 85, badge: "" }
            ].map((student, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  student.highlight ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="font-bold w-8">{student.badge || `#${student.rank}`}</span>
                  <span className={student.highlight ? 'font-bold text-primary' : ''}>
                    {student.name}
                  </span>
                </div>
                <span className="font-bold">{student.score}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default AnalyticsCharts;