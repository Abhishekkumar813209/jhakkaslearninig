import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, Crown, TrendingUp, Flame, School, Map as MapIcon, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeaderboardEntry {
  student_id: string;
  student_name: string;
  student_class: string;
  school_name?: string;
  zone_name?: string;
  total_xp: number;
  level: number;
  current_streak_days: number;
  rank: number;
}

interface XPLeaderboardEntry {
  student_id: string;
  total_xp: number;
  level: number;
  current_streak_days: number;
  profiles: {
    full_name: string;
    student_class: string;
  };
}

const LeaderboardManagement = () => {
  const [leaderboardType, setLeaderboardType] = useState<'overall' | 'zone' | 'school'>('overall');
  const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [zoneLeaderboard, setZoneLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [schoolLeaderboard, setSchoolLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [xpLeaderboard, setXpLeaderboard] = useState<XPLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      // Fetch Overall Leaderboard
      const { data: overallData, error: overallError } = await supabase
        .from('student_analytics')
        .select('*')
        .not('overall_rank', 'is', null)
        .order('overall_rank', { ascending: true })
        .limit(50);

      if (overallError) throw overallError;

      // Fetch profiles separately
      const studentIds = overallData?.map(s => s.student_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, student_class')
        .in('id', studentIds);

      const profileMap = new Map<string, any>();
      profilesData?.forEach(p => profileMap.set(p.id, p));

      const overall = overallData?.map((entry) => ({
        student_id: entry.student_id,
        student_name: profileMap.get(entry.student_id)?.full_name || 'Unknown',
        student_class: profileMap.get(entry.student_id)?.student_class || '',
        total_xp: entry.performance_index || 0,
        level: Math.floor((entry.average_score || 0) / 10),
        current_streak_days: entry.streak_days || 0,
        rank: entry.overall_rank || 0
      })) || [];
      setOverallLeaderboard(overall);

      // Fetch Zone-wise Leaderboard
      const { data: zoneData, error: zoneError } = await supabase
        .from('student_analytics')
        .select('*')
        .not('zone_rank', 'is', null)
        .order('zone_rank', { ascending: true })
        .limit(50);

      if (zoneError) throw zoneError;

      const zoneStudentIds = zoneData?.map(s => s.student_id) || [];
      const { data: zoneProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, student_class, zone_id, zones(name)')
        .in('id', zoneStudentIds);

      const zoneProfileMap = new Map<string, any>();
      zoneProfiles?.forEach(p => zoneProfileMap.set(p.id, p));

      const zone = zoneData?.map((entry) => {
        const profile = zoneProfileMap.get(entry.student_id);
        return {
          student_id: entry.student_id,
          student_name: profile?.full_name || 'Unknown',
          student_class: profile?.student_class || '',
          zone_name: (profile?.zones as any)?.name || 'N/A',
          total_xp: entry.performance_index || 0,
          level: Math.floor((entry.average_score || 0) / 10),
          current_streak_days: entry.streak_days || 0,
          rank: entry.zone_rank || 0
        };
      }) || [];
      setZoneLeaderboard(zone);

      // Fetch School-wise Leaderboard
      const { data: schoolData, error: schoolError } = await supabase
        .from('student_analytics')
        .select('*')
        .not('school_rank', 'is', null)
        .order('school_rank', { ascending: true })
        .limit(50);

      if (schoolError) throw schoolError;

      const schoolStudentIds = schoolData?.map(s => s.student_id) || [];
      const { data: schoolProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, student_class, school_id, schools(name)')
        .in('id', schoolStudentIds);

      const schoolProfileMap = new Map<string, any>();
      schoolProfiles?.forEach(p => schoolProfileMap.set(p.id, p));

      const school = schoolData?.map((entry) => {
        const profile = schoolProfileMap.get(entry.student_id);
        return {
          student_id: entry.student_id,
          student_name: profile?.full_name || 'Unknown',
          student_class: profile?.student_class || '',
          school_name: (profile?.schools as any)?.name || 'N/A',
          total_xp: entry.performance_index || 0,
          level: Math.floor((entry.average_score || 0) / 10),
          current_streak_days: entry.streak_days || 0,
          rank: entry.school_rank || 0
        };
      }) || [];
      setSchoolLeaderboard(school);

      // Fetch XP Leaderboard
      const { data: xpData, error: xpError } = await supabase.functions.invoke('jhakkas-points-system', {
        body: { action: 'leaderboard' }
      });

      if (xpError) throw xpError;
      setXpLeaderboard(xpData?.leaderboard || []);

    } catch (error: any) {
      console.error('Error fetching leaderboards:', error);
      toast.error('Failed to load leaderboards');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const currentLeaderboard = leaderboardType === 'overall' ? overallLeaderboard :
    leaderboardType === 'zone' ? zoneLeaderboard : schoolLeaderboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Leaderboard Management</h2>
          <p className="text-muted-foreground">Track top performers across school, zone, and overall rankings</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={leaderboardType} onValueChange={(val: any) => setLeaderboardType(val)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overall">Overall Performance</SelectItem>
              <SelectItem value="zone">Zone-wise</SelectItem>
              <SelectItem value="school">School-wise</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchLeaderboards} disabled={loading}>
            Refresh Rankings
          </Button>
        </div>
      </div>

      <Card className="card-gradient shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {leaderboardType === 'overall' && <><Globe className="h-5 w-5 text-blue-500" />Overall Leaderboard</>}
            {leaderboardType === 'zone' && <><MapIcon className="h-5 w-5 text-green-500" />Zone-wise Leaderboard</>}
            {leaderboardType === 'school' && <><School className="h-5 w-5 text-purple-500" />School-wise Leaderboard</>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-3">
              {currentLeaderboard.map((student) => (
                <div key={student.student_id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background shadow-sm">
                      {getRankIcon(student.rank)}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{student.student_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.student_class}
                        {leaderboardType === 'zone' && student.zone_name && ` • ${student.zone_name}`}
                        {leaderboardType === 'school' && student.school_name && ` • ${student.school_name}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-sm font-medium text-foreground">{student.total_xp.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-foreground flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-yellow-500" />
                        {student.level}
                      </div>
                      <div className="text-xs text-muted-foreground">Level</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-foreground flex items-center gap-1">
                        <Flame className="h-3 w-3 text-orange-500" />
                        {student.current_streak_days}
                      </div>
                      <div className="text-xs text-muted-foreground">Streak</div>
                    </div>
                  </div>
                </div>
              ))}
              {currentLeaderboard.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No data available</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* XP & Streak Leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Top XP Earners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {xpLeaderboard.slice(0, 5).map((student, index) => (
                <div key={student.student_id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-orange-600">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{student.profiles?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{student.profiles?.student_class}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">{student.total_xp}</div>
                    <div className="text-xs text-muted-foreground">Level {student.level}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Current Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {xpLeaderboard
                .sort((a, b) => b.current_streak_days - a.current_streak_days)
                .slice(0, 5)
                .map((student, index) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-yellow-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{student.profiles?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{student.profiles?.student_class}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-600 flex items-center gap-1">
                        <Flame className="h-4 w-4" />
                        {student.current_streak_days}
                      </div>
                      <div className="text-xs text-muted-foreground">days</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderboardManagement;