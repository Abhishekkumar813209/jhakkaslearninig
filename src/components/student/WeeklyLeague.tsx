import { useEffect, useState } from "react";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface League {
  id: string;
  name: string;
  tier: number;
  color: string;
  icon: string;
  min_xp: number;
  max_xp: number | null;
}

interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  week_xp: number;
  rank: number;
}

export const WeeklyLeague = () => {
  const [currentLeague, setCurrentLeague] = useState<League | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userXP, setUserXP] = useState<number>(0);

  useEffect(() => {
    const fetchLeagueData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user's profile with exam domain and class
        const { data: profile } = await supabase
          .from('profiles')
          .select('exam_domain, student_class')
          .eq('id', user.id)
          .single();

        if (!profile?.exam_domain || !profile?.student_class) {
          console.log('Profile incomplete - exam domain and class required');
          return;
        }

        // Get user's XP
        const { data: xpData } = await supabase
          .from("student_gamification")
          .select("total_xp")
          .eq("student_id", user.id)
          .single();

        if (xpData) {
          setUserXP(xpData.total_xp);

          // Get current league based on XP
          const { data: leagues } = await supabase
            .from("leagues")
            .select("*")
            .order("tier", { ascending: true });

          if (leagues) {
            const league = leagues.find(l => 
              xpData.total_xp >= l.min_xp && (l.max_xp === null || xpData.total_xp <= l.max_xp)
            ) || leagues[0];
            setCurrentLeague(league);
          }
        }

        // Get week start date (Monday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - diff);
        weekStart.setHours(0, 0, 0, 0);

        // Get leaderboard (domain and class specific)
        const { data: leagueData } = await supabase
          .from("student_leagues")
          .select(`
            student_id,
            weekly_xp,
            rank_in_league,
            profiles!inner(full_name)
          `)
          .eq("league_week_start", weekStart.toISOString().split('T')[0])
          .eq("exam_domain", profile.exam_domain)
          .eq("student_class", profile.student_class)
          .order("rank_in_league", { ascending: true })
          .limit(10);

        if (leagueData) {
          const formattedData = leagueData.map(entry => ({
            student_id: entry.student_id,
            full_name: (entry.profiles as any).full_name || "Unknown",
            week_xp: entry.weekly_xp,
            rank: entry.rank_in_league || 0
          }));
          setLeaderboard(formattedData);

          const userEntry = leagueData.find(e => e.student_id === user.id);
          if (userEntry) setUserRank(userEntry.rank_in_league || null);
        }
      } catch (error) {
        console.error("Error fetching league data:", error);
      }
    };

    fetchLeagueData();
  }, []);

  if (!currentLeague) return null;

  const promotionZone = 3;
  const relegationZone = 7;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" style={{ color: currentLeague.color }} />
              {currentLeague.name} League
            </CardTitle>
            <CardDescription>
              Weekly competition • Resets Monday
              <br />
              <span className="text-xs">Domain-specific: Your exam & class only</span>
            </CardDescription>
          </div>
          {userRank && (
            <Badge variant="secondary" className="text-lg">
              #{userRank}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User's Position */}
        {userRank && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                  {userRank}
                </div>
                <div>
                  <p className="font-medium">Your Position</p>
                  <p className="text-sm text-muted-foreground">{userXP} XP this week</p>
                </div>
              </div>
              {userRank <= promotionZone && (
                <Badge variant="default" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Promotion Zone
                </Badge>
              )}
              {userRank >= relegationZone && (
                <Badge variant="destructive" className="gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Danger Zone
                </Badge>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Leaderboard */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Top 10 This Week</h4>
          {leaderboard.map((entry, index) => (
            <div
              key={entry.student_id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                entry.rank <= promotionZone
                  ? 'bg-green-500/10'
                  : entry.rank >= relegationZone
                  ? 'bg-red-500/10'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                index === 0 ? 'bg-yellow-500 text-yellow-950' :
                index === 1 ? 'bg-gray-400 text-gray-950' :
                index === 2 ? 'bg-amber-600 text-amber-950' :
                'bg-muted text-muted-foreground'
              }`}>
                {entry.rank}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {entry.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{entry.full_name}</p>
                <p className="text-xs text-muted-foreground">{entry.week_xp} XP</p>
              </div>
              {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
            </div>
          ))}
        </div>

        {/* League Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-1">
          <p className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            Top 3 advance to {currentLeague.tier < 4 ? 'higher league' : 'stay in Diamond'}
          </p>
          <p className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-red-500" />
            Bottom 3 relegated to {currentLeague.tier > 1 ? 'lower league' : 'stay in Bronze'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
