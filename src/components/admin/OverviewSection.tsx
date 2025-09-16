import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, TrendingUp, Target, DollarSign } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Mock data - in real app, fetch from Supabase
const statsData = {
  totalStudents: 1247,
  activeStudentsToday: 342,
  totalCourses: 28,
  activeBatches: 12,
  avgTestScore: 78.5,
  monthlyRevenue: 45600
};

const studentGrowthData = [
  { month: 'Jan', students: 200 },
  { month: 'Feb', students: 340 },
  { month: 'Mar', students: 580 },
  { month: 'Apr', students: 750 },
  { month: 'May', students: 920 },
  { month: 'Jun', students: 1247 }
];

const batchDistributionData = [
  { batch: 'JEE Main', students: 450, performance: 82 },
  { batch: 'JEE Advanced', students: 280, performance: 89 },
  { batch: 'NEET', students: 320, performance: 85 },
  { batch: 'Foundation', students: 197, performance: 75 }
];

const coursePopularityData = [
  { name: 'Physics', value: 35, color: '#3B82F6' },
  { name: 'Chemistry', value: 30, color: '#10B981' },
  { name: 'Mathematics', value: 25, color: '#8B5CF6' },
  { name: 'Biology', value: 10, color: '#F59E0B' }
];

const testPerformanceData = [
  { week: 'Week 1', avgScore: 72 },
  { week: 'Week 2', avgScore: 75 },
  { week: 'Week 3', avgScore: 78 },
  { week: 'Week 4', avgScore: 76 },
  { week: 'Week 5', avgScore: 82 },
  { week: 'Week 6', avgScore: 79 }
];

const OverviewSection = () => {
  const statCards = [
    {
      title: "Total Students",
      value: statsData.totalStudents,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Active Today",
      value: statsData.activeStudentsToday,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Courses",
      value: statsData.totalCourses,
      icon: BookOpen,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Active Batches",
      value: statsData.activeBatches,
      icon: GraduationCap,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Avg Test Score",
      value: `${statsData.avgTestScore}%`,
      icon: Target,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    },
    {
      title: "Monthly Revenue",
      value: `₹${statsData.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="card-gradient shadow-soft hover:shadow-medium transition-smooth">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Growth Chart */}
        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Student Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={studentGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="students" stroke="#3B82F6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Batch Distribution Chart */}
        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Batch-wise Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={batchDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="batch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="students" fill="#3B82F6" />
                <Bar dataKey="performance" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Course Popularity Chart */}
        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Course Popularity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={coursePopularityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {coursePopularityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Test Performance Trend */}
        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Test Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={testPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgScore" stroke="#10B981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewSection;