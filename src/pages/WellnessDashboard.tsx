import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Target, Award, Calendar, ArrowRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

interface WellnessStats {
  currentStreak: number;
  longestStreak: number;
  wellnessXP: number;
  activeRoadmap: any;
}

export default function WellnessDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<WellnessStats>({
    currentStreak: 0,
    longestStreak: 0,
    wellnessXP: 0,
    activeRoadmap: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWellnessStats();
  }, []);

  const fetchWellnessStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch gamification stats
      const { data: gamData } = await supabase
        .from('student_gamification')
        .select('wellness_streak_days, wellness_longest_streak, wellness_xp')
        .eq('student_id', user.id)
        .maybeSingle();

      // Fetch active wellness roadmap
      const { data: profile } = await supabase
        .from('profiles')
        .select('batch_id')
        .eq('id', user.id)
        .single();

      if (profile?.batch_id) {
        const { data: roadmap } = await supabase
          .from('batch_roadmaps')
          .select('*')
          .eq('is_wellness_mode', true)
          .eq('batch_id', profile.batch_id)
          .maybeSingle();

        setStats({
          currentStreak: gamData?.wellness_streak_days || 0,
          longestStreak: gamData?.wellness_longest_streak || 0,
          wellnessXP: gamData?.wellness_xp || 0,
          activeRoadmap: roadmap,
        });
      }
    } catch (error) {
      console.error('Error fetching wellness stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome to Your Wellness Journey</h1>
        <p className="text-muted-foreground">
          Track your progress, build healthy habits, and achieve your goals
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentStreak} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Longest: {stats.longestStreak} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wellness XP</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.wellnessXP}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Keep checking in daily!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Journey</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.activeRoadmap ? stats.activeRoadmap.title.split(' ')[0] : 'None'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeRoadmap ? `${stats.activeRoadmap.total_days} days` : 'Start a journey'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Roadmap */}
      {stats.activeRoadmap && (
        <Card>
          <CardHeader>
            <CardTitle>{stats.activeRoadmap.title}</CardTitle>
            <CardDescription>{stats.activeRoadmap.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span className="text-muted-foreground">
                  Day {stats.currentStreak}/{stats.activeRoadmap.total_days}
                </span>
              </div>
              <Progress value={(stats.currentStreak / stats.activeRoadmap.total_days) * 100} />
            </div>
            <Button onClick={() => navigate('/wellness/journey')} className="w-full">
              Continue Journey
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/wellness/checkin')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Check-in
            </CardTitle>
            <CardDescription>
              Log your progress and maintain your streak
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/wellness/accountability')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Find Accountability Partner
            </CardTitle>
            <CardDescription>
              Connect with others on the same journey
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
