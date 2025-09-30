import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Map, Building, Globe } from 'lucide-react';

interface StudentRankingsProps {
  userId?: string;
  studentClass?: string;
}

interface RankingData {
  zone_rank: number | null;
  school_rank: number | null;
  overall_rank: number | null;
  zone_percentile: number | null;
  school_percentile: number | null;
  overall_percentile: number | null;
}

interface LocationInfo {
  zoneName?: string;
  schoolName?: string;
}

export const StudentRankings = ({ userId, studentClass }: StudentRankingsProps) => {
  const [rankings, setRankings] = useState<RankingData | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchRankings();
    }
  }, [userId]);

  const fetchRankings = async () => {
    try {
      // Fetch ranking data
      const { data: rankData, error: rankError } = await supabase
        .from('student_analytics')
        .select('zone_rank, school_rank, overall_rank, zone_percentile, school_percentile, overall_percentile')
        .eq('student_id', userId)
        .maybeSingle();

      if (rankError) throw rankError;

      // Fetch zone and school names
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          zones:zone_id (name),
          schools:school_id (name)
        `)
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      setRankings(rankData);
      setLocationInfo({
        zoneName: profileData?.zones?.name,
        schoolName: profileData?.schools?.name,
      });
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentileColor = (percentile: number | null) => {
    if (!percentile) return 'secondary';
    if (percentile >= 90) return 'default';
    if (percentile >= 75) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Your Rankings (Class {studentClass})</CardTitle>
          <CardDescription>Class-wise rankings updated in real-time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading rankings...</div>
        </CardContent>
      </Card>
    );
  }

  if (!rankings) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Your Rankings</CardTitle>
          <CardDescription>Complete a test to see your rankings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No ranking data available yet. Take your first test!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Your Rankings (Class {studentClass})
        </CardTitle>
        <CardDescription>
          Rankings are calculated among students in your class only
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Zone Ranking */}
          <div className="p-4 border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-center gap-2 mb-3">
              <Map className="h-5 w-5 text-primary" />
              <div className="font-semibold">Zone Rank</div>
            </div>
            <div className="space-y-2">
              {locationInfo.zoneName && (
                <div className="text-xs text-muted-foreground">{locationInfo.zoneName}</div>
              )}
              <div className="text-3xl font-bold text-primary">
                #{rankings.zone_rank || '-'}
              </div>
              {rankings.zone_percentile !== null && (
                <Badge variant={getPercentileColor(rankings.zone_percentile)}>
                  Top {(100 - rankings.zone_percentile).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>

          {/* School Ranking */}
          <div className="p-4 border rounded-lg bg-gradient-to-br from-success/5 to-success/10">
            <div className="flex items-center gap-2 mb-3">
              <Building className="h-5 w-5 text-success" />
              <div className="font-semibold">School Rank</div>
            </div>
            <div className="space-y-2">
              {locationInfo.schoolName && (
                <div className="text-xs text-muted-foreground">{locationInfo.schoolName}</div>
              )}
              <div className="text-3xl font-bold text-success">
                #{rankings.school_rank || '-'}
              </div>
              {rankings.school_percentile !== null && (
                <Badge variant={getPercentileColor(rankings.school_percentile)}>
                  Top {(100 - rankings.school_percentile).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>

          {/* Overall Ranking */}
          <div className="p-4 border rounded-lg bg-gradient-to-br from-warning/5 to-warning/10">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-5 w-5 text-warning" />
              <div className="font-semibold">Overall Rank</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">All Zones</div>
              <div className="text-3xl font-bold text-warning">
                #{rankings.overall_rank || '-'}
              </div>
              {rankings.overall_percentile !== null && (
                <Badge variant={getPercentileColor(rankings.overall_percentile)}>
                  Top {(100 - rankings.overall_percentile).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <strong>Note:</strong> Rankings update automatically after each test submission and only include students from Class {studentClass}.
          Only your best attempt per test is considered for ranking.
        </div>
      </CardContent>
    </Card>
  );
};
