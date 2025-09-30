import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TestLeaderboardEntry {
  id: string;
  test_id: string;
  student_id: string;
  student_name: string;
  student_class: string;
  batch_id: string;
  score: number;
  percentage: number;
  time_taken_minutes: number;
  submitted_at: string;
  score_rank: number;
  speed_rank: number;
  accuracy_rank: number;
  test_title: string;
  subject: string;
  total_marks: number;
}

export interface SubjectPerformance {
  id: string;
  student_id: string;
  subject: string;
  tests_taken: number;
  average_score: number;
  best_score: number;
  subject_rank: number;
  subject_percentile: number;
  subject_performance_index: number;
  mastery_level: 'beginner' | 'intermediate' | 'advanced' | 'master';
  last_test_date: string;
}

export interface Achievement {
  id: string;
  student_id: string;
  achievement_type: string;
  test_id?: string;
  subject?: string;
  score?: number;
  metadata: any;
  achieved_at: string;
}

export const useTestLeaderboard = (testId?: string) => {
  const [leaderboard, setLeaderboard] = useState<TestLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!testId) return;
    
    const fetchTestLeaderboard = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('test_leaderboards')
          .select('*')
          .eq('test_id', testId)
          .order('score_rank', { ascending: true })
          .limit(50);

        if (error) throw error;
        setLeaderboard(data || []);
      } catch (error: any) {
        console.error('Error fetching test leaderboard:', error);
        toast.error('Failed to load test leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchTestLeaderboard();
  }, [testId]);

  return { leaderboard, loading };
};

export const useSubjectLeaderboards = () => {
  const [subjects, setSubjects] = useState<Record<string, SubjectPerformance[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSubjectLeaderboards = async () => {
      setLoading(true);
      try {
        const { data: analyticsData, error: analyticsError } = await supabase
          .from('subject_analytics')
          .select('*')
          .not('subject_rank', 'is', null)
          .order('subject_rank', { ascending: true });

        if (analyticsError) throw analyticsError;

        // Fetch profiles separately
        if (analyticsData && analyticsData.length > 0) {
          const studentIds = [...new Set(analyticsData.map(a => a.student_id))];
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, student_class, batch_id')
            .in('id', studentIds);

          if (profilesError) throw profilesError;

          // Merge data
          const profileMap = new Map<string, any>();
          profilesData?.forEach(p => profileMap.set(p.id, p));
          
          // Group by subject
          const grouped = (analyticsData || []).reduce((acc: Record<string, any[]>, item: any) => {
            const profile = profileMap.get(item.student_id);
            if (!acc[item.subject]) {
              acc[item.subject] = [];
            }
            acc[item.subject].push({
              ...item,
              student_name: profile?.full_name,
              student_class: profile?.student_class,
              batch_id: profile?.batch_id,
            });
            return acc;
          }, {});

          setSubjects(grouped);
        } else {
          setSubjects({});
        }
      } catch (error: any) {
        console.error('Error fetching subject leaderboards:', error);
        toast.error('Failed to load subject leaderboards');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectLeaderboards();
  }, []);

  return { subjects, loading };
};

export const useAchievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAchievements = async () => {
      setLoading(true);
      try {
        const { data: achievementsData, error: achievementsError } = await supabase
          .from('achievements')
          .select('*')
          .order('achieved_at', { ascending: false })
          .limit(100);

        if (achievementsError) throw achievementsError;

        // Fetch related data separately
        if (achievementsData && achievementsData.length > 0) {
          const studentIds = [...new Set(achievementsData.map(a => a.student_id))];
          const testIds = [...new Set(achievementsData.map(a => a.test_id).filter(Boolean))];

          const [profilesResult, testsResult] = await Promise.all([
            supabase.from('profiles').select('id, full_name, student_class').in('id', studentIds),
            testIds.length > 0 ? supabase.from('tests').select('id, title').in('id', testIds) : { data: [], error: null }
          ]);

          if (profilesResult.error) throw profilesResult.error;
          if (testsResult.error) throw testsResult.error;

          // Merge data
          const profileMap = new Map<string, any>();
          profilesResult.data?.forEach(p => profileMap.set(p.id, p));
          
          const testMap = new Map<string, any>();
          testsResult.data?.forEach(t => testMap.set(t.id, t));
          
          const merged = achievementsData.map(a => ({
            ...a,
            profiles: profileMap.get(a.student_id),
            tests: a.test_id ? testMap.get(a.test_id) : null
          }));
          setAchievements(merged);
        } else {
          setAchievements([]);
        }
      } catch (error: any) {
        console.error('Error fetching achievements:', error);
        toast.error('Failed to load achievements');
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  return { achievements, loading };
};
