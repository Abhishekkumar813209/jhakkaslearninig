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

      const [overviewRes, scheduleRes, achievementsRes] = await Promise.all([
        dashboardAPI.getOverview(),
        dashboardAPI.getSchedule(),
        dashboardAPI.getAchievements()
      ]);

      if (overviewRes.success) {
        setOverview(overviewRes.data);
      }

      if (scheduleRes.success) {
        setUpcomingClasses(scheduleRes.data);
      }

      if (achievementsRes.success) {
        setAchievements(achievementsRes.data);
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