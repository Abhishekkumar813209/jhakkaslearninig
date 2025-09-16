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

      // For now, using mock data since backend isn't running
      // TODO: Replace with real Supabase queries when backend is set up
      
      // Mock overview data
      const mockOverview: DashboardOverview = {
        stats: {
          totalStudyTime: {
            value: "142h",
            change: 8,
            changeType: "increase",
            description: "This month"
          },
          averageScore: {
            value: "87%",
            change: 5,
            changeType: "increase", 
            description: "Across all subjects"
          },
          currentStreak: {
            value: "12 days",
            change: 15,
            changeType: "increase",
            description: "Consecutive study days"
          },
          batchRank: {
            value: "#4",
            change: 2,
            changeType: "increase",
            description: "Out of 150 students"
          }
        },
        subjectPerformance: [
          { subject: "Mathematics", score: 85 },
          { subject: "Physics", score: 78 },
          { subject: "Chemistry", score: 92 },
          { subject: "Biology", score: 74 },
          { subject: "English", score: 88 }
        ],
        recentActivity: [
          {
            type: "test",
            title: "Completed Quiz: Thermodynamics",
            description: "Score: 92%",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            icon: "CheckCircle",
            color: "success"
          },
          {
            type: "video",
            title: "Watched: Vector Calculus Lecture", 
            description: "Duration: 45 minutes",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            icon: "PlayCircle",
            color: "primary"
          },
          {
            type: "test",
            title: "Earned Badge: Quiz Master",
            description: "For scoring 90%+ in 10 quizzes",
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            icon: "Award",
            color: "warning"
          }
        ],
        performanceTrend: [
          { month: "Jan", score: 65 },
          { month: "Feb", score: 72 },
          { month: "Mar", score: 68 },
          { month: "Apr", score: 78 },
          { month: "May", score: 85 },
          { month: "Jun", score: 82 }
        ],
        weeklyGoal: {
          current: 12,
          target: 15,
          progress: 80,
          description: "You're 80% towards your weekly goal. Keep it up!"
        }
      };

      // Mock upcoming classes
      const mockClasses: UpcomingClass[] = [
        {
          id: 1,
          title: "Quantum Mechanics - Wave Function",
          instructor: "Dr. Rajesh Kumar",
          time: "Today, 4:00 PM",
          duration: "1.5 hours",
          subject: "Physics",
          meetingLink: "https://zoom.us/j/123456789"
        },
        {
          id: 2,
          title: "Calculus - Integration by Parts",
          instructor: "Prof. Priya Sharma",
          time: "Tomorrow, 2:00 PM", 
          duration: "2 hours",
          subject: "Mathematics",
          meetingLink: "https://zoom.us/j/987654321"
        },
        {
          id: 3,
          title: "Organic Chemistry - Reaction Mechanisms",
          instructor: "Dr. Amit Verma",
          time: "Friday, 3:30 PM",
          duration: "1.5 hours",
          subject: "Chemistry",
          meetingLink: "https://zoom.us/j/456789123"
        }
      ];

      // Mock achievements
      const mockAchievements: Achievement[] = [
        {
          title: "Quiz Master",
          description: "Scored 90%+ in 10 quizzes",
          icon: "Trophy",
          earnedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          category: "performance"
        },
        {
          title: "Consistent Learner", 
          description: "12-day learning streak",
          icon: "Target",
          earnedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          category: "consistency"
        },
        {
          title: "Fast Learner",
          description: "Completed 5 chapters this week",
          icon: "TrendingUp",
          earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          category: "engagement"
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setOverview(mockOverview);
      setUpcomingClasses(mockClasses);
      setAchievements(mockAchievements);

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