import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Award, TrendingUp, Users, Building, Map } from 'lucide-react';

interface StudentAnalytics {
  student_id: string;
  zone_rank: number | null;
  school_rank: number | null;
  overall_rank: number | null;
  zone_percentile: number | null;
  school_percentile: number | null;
  overall_percentile: number | null;
  average_score: number;
  tests_attempted: number;
  streak_days: number;
}

interface ZoneInfo {
  id: string;
  name: string;
  code: string;
}

interface SchoolInfo {
  id: string;
  name: string;
  code: string;
}

interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  rank: number;
  score: number;
  percentile: number;
}

export const ZoneAnalytics = () => {
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [zoneLeaderboard, setZoneLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [schoolLeaderboard, setSchoolLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch student's analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('student_analytics')
        .select('*')
        .eq('student_id', user.id)
        .single();

      // Fetch profile with zone and school info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          zone_id,
          school_id,
          zones!fk_profiles_zone (id, name, code),
          schools!fk_profiles_school (id, name, code)
        `)
        .eq('id', user.id)
        .single();

      if (analyticsError) throw analyticsError;
      if (profileError) throw profileError;

      setAnalytics(analyticsData);
      setZoneInfo(profileData?.zones);
      setSchoolInfo(profileData?.schools);

      // Fetch zone leaderboard
      if (profileData?.zone_id) {
        await fetchZoneLeaderboard(profileData.zone_id);
      }

      // Fetch school leaderboard
      if (profileData?.school_id) {
        await fetchSchoolLeaderboard(profileData.school_id);
      }

      // Fetch overall leaderboard
      await fetchOverallLeaderboard();

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchZoneLeaderboard = async (zoneId: string) => {
    const { data, error } = await supabase
      .from('student_analytics')
      .select(`
        student_id,
        zone_rank,
        average_score,
        zone_percentile
      `)
      .not('zone_rank', 'is', null)
      .order('zone_rank', { ascending: true })
      .limit(10);

    if (!error && data) {
      // Get profiles for these students
      const { data: profilesData } = await supabase
        .from('public_profiles')
        .select('id, full_name')
        .in('id', data.map(item => item.student_id));

      const leaderboard = data
        .filter(item => profilesData?.some(p => p.id === item.student_id))
        .map(item => ({
          student_id: item.student_id,
          full_name: profilesData?.find(p => p.id === item.student_id)?.full_name || 'Unknown',
          rank: item.zone_rank || 0,
          score: item.average_score || 0,
          percentile: item.zone_percentile || 0
        }));
      setZoneLeaderboard(leaderboard);
    }
  };

  const fetchSchoolLeaderboard = async (schoolId: string) => {
    const { data, error } = await supabase
      .from('student_analytics')
      .select(`
        student_id,
        school_rank,
        average_score,
        school_percentile
      `)
      .not('school_rank', 'is', null)
      .order('school_rank', { ascending: true })
      .limit(10);

    if (!error && data) {
      // Get profiles for these students
      const { data: profilesData } = await supabase
        .from('public_profiles')
        .select('id, full_name')
        .in('id', data.map(item => item.student_id));

      const leaderboard = data
        .filter(item => profilesData?.some(p => p.id === item.student_id))
        .map(item => ({
          student_id: item.student_id,
          full_name: profilesData?.find(p => p.id === item.student_id)?.full_name || 'Unknown',
          rank: item.school_rank || 0,
          score: item.average_score || 0,
          percentile: item.school_percentile || 0
        }));
      setSchoolLeaderboard(leaderboard);
    }
  };

  const fetchOverallLeaderboard = async () => {
    const { data, error } = await supabase
      .from('student_analytics')
      .select(`
        student_id,
        overall_rank,
        average_score,
        overall_percentile
      `)
      .not('overall_rank', 'is', null)
      .order('overall_rank', { ascending: true })
      .limit(10);

    if (!error && data) {
      // Get profiles for these students
      const { data: profilesData } = await supabase
        .from('public_profiles')
        .select('id, full_name')
        .in('id', data.map(item => item.student_id));

      const leaderboard = data.map(item => ({
        student_id: item.student_id,
        full_name: profilesData?.find(p => p.id === item.student_id)?.full_name || 'Unknown',
        rank: item.overall_rank || 0,
        score: item.average_score || 0,
        percentile: item.overall_percentile || 0
      }));
      setOverallLeaderboard(leaderboard);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{rank}</span>;
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return "text-green-600";
    if (percentile >= 75) return "text-blue-600";
    if (percentile >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return <div className="flex justify-center p-6">Loading analytics...</div>;
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No analytics data available. Take some tests to see your rankings!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Zone Rank Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">Zone Ranking</CardTitle>
            </div>
            <CardDescription>{zoneInfo?.name} ({zoneInfo?.code})</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">#{analytics.zone_rank || 'N/A'}</span>
                {analytics.zone_percentile && (
                  <Badge variant="secondary" className={getPercentileColor(analytics.zone_percentile)}>
                    {analytics.zone_percentile.toFixed(1)}%ile
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Your rank within {zoneInfo?.name}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* School Rank Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-green-600" />
              <CardTitle className="text-base">School Ranking</CardTitle>
            </div>
            <CardDescription>{schoolInfo?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">#{analytics.school_rank || 'N/A'}</span>
                {analytics.school_percentile && (
                  <Badge variant="secondary" className={getPercentileColor(analytics.school_percentile)}>
                    {analytics.school_percentile.toFixed(1)}%ile
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Your rank within {schoolInfo?.name}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Overall Rank Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-base">Overall Ranking</CardTitle>
            </div>
            <CardDescription>Across all zones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">#{analytics.overall_rank || 'N/A'}</span>
                {analytics.overall_percentile && (
                  <Badge variant="secondary" className={getPercentileColor(analytics.overall_percentile)}>
                    {analytics.overall_percentile.toFixed(1)}%ile
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Your rank among all students
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboards */}
      <Card>
        <CardHeader>
          <CardTitle>Leaderboards</CardTitle>
          <CardDescription>See how you compare with others</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="zone" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="zone">
                <Map className="w-4 h-4 mr-2" />
                Zone
              </TabsTrigger>
              <TabsTrigger value="school">
                <Building className="w-4 h-4 mr-2" />
                School
              </TabsTrigger>
              <TabsTrigger value="overall">
                <Users className="w-4 h-4 mr-2" />
                Overall
              </TabsTrigger>
            </TabsList>

            <TabsContent value="zone" className="mt-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  Top 10 in {zoneInfo?.name}
                </h4>
                {zoneLeaderboard.map((student) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {getRankIcon(student.rank)}
                      <span className="font-medium">{student.full_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{student.score.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        {student.percentile.toFixed(1)}%ile
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="school" className="mt-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  Top 10 in {schoolInfo?.name}
                </h4>
                {schoolLeaderboard.map((student) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {getRankIcon(student.rank)}
                      <span className="font-medium">{student.full_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{student.score.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        {student.percentile.toFixed(1)}%ile
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="overall" className="mt-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  Top 10 Overall
                </h4>
                {overallLeaderboard.map((student) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {getRankIcon(student.rank)}
                      <span className="font-medium">{student.full_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{student.score.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        {student.percentile.toFixed(1)}%ile
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics.average_score.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.tests_attempted}</div>
              <p className="text-sm text-muted-foreground">Tests Attempted</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{analytics.streak_days}</div>
              <p className="text-sm text-muted-foreground">Study Streak (Days)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};