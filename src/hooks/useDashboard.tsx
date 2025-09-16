import { useState, useEffect } from 'react';
import { dashboardAPI } from '@/services/api';

interface DashboardStats {
  totalStudyTime: {
    value: string;
    change: number;
    changeType: 'increase' | 'decrease';
    description: string;
  };
  averageScore: {
    value: string;
    change: number;
    changeType: 'increase' | 'decrease';
    description: string;
  };
  currentStreak: {
    value: string;
    change: number;
    changeType: 'increase' | 'decrease';
    description: string;
  };
  batchRank: {
    value: string;
    change: number;
    changeType: 'increase' | 'decrease';
    description: string;
  };
}

interface SubjectPerformance {
  subject: string;
  score: number;
}

interface RecentActivity {
  type: 'test' | 'enrollment' | 'video';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
}

interface PerformanceTrend {
  month: string;
  score: number;
}

interface WeeklyGoal {
  current: number;
  target: number;
  progress: number;
  description: string;
}

interface DashboardOverview {
  stats: DashboardStats;
  subjectPerformance: SubjectPerformance[];
  recentActivity: RecentActivity[];
  performanceTrend: PerformanceTrend[];
  weeklyGoal: WeeklyGoal;
}

interface UpcomingClass {
  id: number;
  title: string;
  instructor: string;
  time: string;
  duration: string;
  subject: string;
  meetingLink?: string;
}

interface Achievement {
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  category: string;
}

export const useDashboard = () => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call Supabase Edge Functions for dashboard data
      const { supabase } = await import('@/integrations/supabase/client');
      
      const [overviewRes, scheduleRes, achievementsRes] = await Promise.all([
        supabase.functions.invoke('dashboard-overview'),
        supabase.functions.invoke('dashboard-schedule'),
        supabase.functions.invoke('dashboard-achievements')
      ]);

      if (overviewRes.data?.success) {
        setOverview(overviewRes.data.data);
      } else {
        console.error('Overview error:', overviewRes.error);
      }

      if (scheduleRes.data?.success) {
        setUpcomingClasses(scheduleRes.data.data);
      } else {
        console.error('Schedule error:', scheduleRes.error);
      }

      if (achievementsRes.data?.success) {
        setAchievements(achievementsRes.data.data);
      } else {
        console.error('Achievements error:', achievementsRes.error);
      }

    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDashboard = () => {
    fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    overview,
    upcomingClasses,
    achievements,
    isLoading,
    error,
    refreshDashboard
  };
};