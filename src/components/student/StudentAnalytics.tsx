import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, TrendingUp, Target, Zap } from 'lucide-react';

interface StudentAnalyticsProps {
  userId?: string;
}

interface Analytics {
  tests_attempted: number;
  average_score: number;
  streak_days: number;
  total_study_time_minutes: number;
}

export const StudentAnalytics = ({ userId }: StudentAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchAnalytics();
    }
  }, [userId]);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('student_analytics')
        .select('tests_attempted, average_score, streak_days, total_study_time_minutes')
        .eq('student_id', userId)
        .maybeSingle();

      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Learning Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Average Score */}
        <div className="text-center p-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border-2 border-primary/20">
          <div className="text-sm text-muted-foreground mb-2">Average Score</div>
          <div className="text-5xl font-bold text-primary mb-2">
            {analytics?.average_score?.toFixed(1) || 0}%
          </div>
          <div className="text-xs text-muted-foreground">
            Across all tests attempted
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-xl font-bold text-primary">
              {analytics?.tests_attempted || 0}
            </div>
            <div className="text-xs text-muted-foreground">Tests</div>
          </div>
          <div className="text-center p-3 bg-success/10 rounded-lg">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-success" />
            <div className="text-xl font-bold text-success">
              {analytics?.average_score?.toFixed(0) || 0}%
            </div>
            <div className="text-xs text-muted-foreground">Avg Score</div>
          </div>
          <div className="text-center p-3 bg-warning/10 rounded-lg">
            <Trophy className="h-5 w-5 mx-auto mb-1 text-warning" />
            <div className="text-xl font-bold text-warning">
              {Math.floor((analytics?.total_study_time_minutes || 0) / 60)}h
            </div>
            <div className="text-xs text-muted-foreground">Study Time</div>
          </div>
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <Zap className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-xl font-bold text-primary">
              {analytics?.streak_days || 0}
            </div>
            <div className="text-xs text-muted-foreground">Streak</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
