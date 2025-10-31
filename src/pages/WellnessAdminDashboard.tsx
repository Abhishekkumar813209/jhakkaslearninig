import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Map, Trophy, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WellnessStats {
  totalStudents: number;
  activeRoadmaps: number;
  totalStreaks: number;
  avgCompletionRate: number;
}

export default function WellnessAdminDashboard() {
  const [stats, setStats] = useState<WellnessStats>({
    totalStudents: 0,
    activeRoadmaps: 0,
    totalStreaks: 0,
    avgCompletionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Count students with wellness roadmaps
      const { data: wellnessBatches } = await supabase
        .from('batch_roadmaps')
        .select('batch_id')
        .eq('is_wellness_mode', true);

      const batchIds = wellnessBatches?.map(b => b.batch_id).filter(Boolean) || [];
      
      const { count: students } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('batch_id', batchIds);

      // Count active wellness roadmaps
      const { count: roadmaps } = await supabase
        .from('batch_roadmaps')
        .select('*', { count: 'exact', head: true })
        .eq('is_wellness_mode', true)
        .eq('status', 'active');

      // Count total streaks from daily attendance
      const { data: streakData } = await supabase
        .from('daily_attendance')
        .select('streak_days')
        .eq('is_wellness_checkin', true);

      const totalStreaks = streakData?.reduce((sum, record) => sum + (record.streak_days || 0), 0) || 0;

      setStats({
        totalStudents: students || 0,
        activeRoadmaps: roadmaps || 0,
        totalStreaks,
        avgCompletionRate: 0 // Will calculate from topic progress
      });
    } catch (error) {
      console.error('Error fetching wellness stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      description: 'Students in wellness programs',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Active Roadmaps',
      value: stats.activeRoadmaps,
      description: 'Running wellness journeys',
      icon: Map,
      color: 'text-purple-600'
    },
    {
      title: 'Total Streak Days',
      value: stats.totalStreaks,
      description: 'Collective progress',
      icon: Trophy,
      color: 'text-yellow-600'
    },
    {
      title: 'Avg Completion',
      value: `${stats.avgCompletionRate}%`,
      description: 'Task completion rate',
      icon: TrendingUp,
      color: 'text-green-600'
    }
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading wellness statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Wellness Management</h1>
        <p className="text-muted-foreground">Oversee and support student wellness journeys</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common wellness management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/admin/wellness/roadmaps" className="block p-3 rounded-lg hover:bg-accent transition-colors">
              <div className="font-medium">Create Wellness Roadmap</div>
              <div className="text-sm text-muted-foreground">Launch a new wellness program from templates</div>
            </a>
            <a href="/admin/wellness/games" className="block p-3 rounded-lg hover:bg-accent transition-colors">
              <div className="font-medium">Manage Wellness Games</div>
              <div className="text-sm text-muted-foreground">Create and assign interactive exercises</div>
            </a>
            <a href="/admin/wellness/students" className="block p-3 rounded-lg hover:bg-accent transition-colors">
              <div className="font-medium">Monitor Student Progress</div>
              <div className="text-sm text-muted-foreground">Track streaks, check-ins, and support needs</div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest wellness check-ins and milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Activity feed will appear here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
