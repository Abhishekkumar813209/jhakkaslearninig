import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, TrendingUp, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeaderboardEntry {
  rank: number;
  student_id: string;
  name: string;
  score: number;
  streak: number;
  batch_name?: string;
  avatar_url?: string;
  tests_attempted: number;
}

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [userClass, setUserClass] = useState<string>('');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      // First, get the current user's class
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let studentClass: any = '';
      
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('student_class')
          .eq('id', currentUser.id)
          .maybeSingle();
        
        studentClass = profile?.student_class || '';
        setUserClass(studentClass);
      }
      
      // Fetch top performers with their profile data from the same class
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('student_analytics')
        .select(`
          student_id,
          average_score,
          tests_attempted,
          streak_days,
          overall_rank
        `)
        .order('overall_rank', { ascending: true })
        .limit(50);

      if (analyticsError) throw analyticsError;

      if (!analyticsData || analyticsData.length === 0) {
        setLeaderboardData([]);
        return;
      }

      // Fetch profiles for these students (filter by class)
      const studentIds = analyticsData.map(a => a.student_id);
      let profileQuery = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, batch_id, student_class')
        .in('id', studentIds);
      
      // Filter by class if user has a class
      if (studentClass) {
        profileQuery = profileQuery.eq('student_class', studentClass as any);
      }
      
      const { data: profilesData, error: profilesError } = await profileQuery;

      if (profilesError) throw profilesError;

      // Fetch batch names
      const batchIds = profilesData?.map(p => p.batch_id).filter(Boolean) || [];
      let batchesData: any[] = [];
      if (batchIds.length > 0) {
        const { data, error } = await supabase
          .from('batches')
          .select('id, name')
          .in('id', batchIds);
        if (!error) batchesData = data || [];
      }

      // Combine data
      const combined: LeaderboardEntry[] = analyticsData.map(analytics => {
        const profile = profilesData?.find(p => p.id === analytics.student_id);
        const batch = batchesData.find(b => b.id === profile?.batch_id);
        
        return {
          rank: analytics.overall_rank || 0,
          student_id: analytics.student_id,
          name: profile?.full_name || 'Unknown Student',
          score: Math.round(analytics.average_score || 0),
          streak: analytics.streak_days || 0,
          batch_name: batch?.name,
          avatar_url: profile?.avatar_url,
          tests_attempted: analytics.tests_attempted || 0,
        };
      }).sort((a, b) => a.rank - b.rank);

      setLeaderboardData(combined);

      // Check if current user is in the list
      if (currentUser) {
        const userEntry = combined.find(entry => entry.student_id === currentUser.id);
        if (userEntry) {
          setCurrentUserRank(userEntry);
        } else {
          // Fetch current user's rank if not in top 50
          const { data: userData } = await supabase
            .from('student_analytics')
            .select('overall_rank, average_score, streak_days, tests_attempted')
            .eq('student_id', currentUser.id)
            .single();

          if (userData) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', currentUser.id)
              .single();

            setCurrentUserRank({
              rank: userData.overall_rank || 0,
              student_id: currentUser.id,
              name: userProfile?.full_name || 'You',
              score: Math.round(userData.average_score || 0),
              streak: userData.streak_days || 0,
              tests_attempted: userData.tests_attempted || 0,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to real-time updates on student_analytics
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_analytics',
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const topStudents = leaderboardData.slice(0, 3);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-orange-600" />;
      default: return <span className="text-muted-foreground font-semibold">#{rank}</span>;
    }
  };

  const getBatchColor = (batch?: string) => {
    if (!batch) return 'outline';
    return 'secondary';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Live Leaderboard</h1>
            <p className="text-muted-foreground">
              Real-time rankings • Class-wise • Updates automatically
            </p>
            {userClass && (
              <Badge variant="outline" className="mt-2">
                Class {userClass} Rankings
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Live</span>
          </div>
        </div>

        {leaderboardData.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
            <p className="text-muted-foreground">
              Take a test to appear on the leaderboard!
            </p>
          </Card>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topStudents.length > 0 && (
              <div className="mb-8">
                <Card className="p-6 shadow-soft">
                  <CardHeader className="text-center mb-6">
                    <CardTitle className="text-2xl">Top Performers</CardTitle>
                  </CardHeader>
                  <div className="grid md:grid-cols-3 gap-6">
                    {topStudents.map((student, index) => (
                      <div key={student.student_id} className={`text-center ${index === 0 ? 'md:order-2' : index === 1 ? 'md:order-1' : 'md:order-3'}`}>
                        <div className={`relative mb-4 ${index === 0 ? 'scale-110' : ''}`}>
                          <Avatar className="h-20 w-20 mx-auto mb-2">
                            <AvatarImage src={student.avatar_url} />
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-2 -right-2">
                            {getRankIcon(student.rank)}
                          </div>
                        </div>
                        <h3 className="font-semibold mb-1">{student.name}</h3>
                        <div className="text-2xl font-bold text-primary mb-1">{student.score}</div>
                        <div className="text-sm text-muted-foreground mb-2">avg score</div>
                        {student.batch_name && (
                          <Badge variant={getBatchColor(student.batch_name)} className="text-xs">
                            {student.batch_name}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Full Leaderboard */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Overall Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboardData.map((student) => {
                    const isCurrentUser = student.student_id === currentUserRank?.student_id;
                    return (
                      <div
                        key={student.student_id}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-smooth ${
                          isCurrentUser ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-center w-8">
                          {getRankIcon(student.rank)}
                        </div>
                        
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.avatar_url} />
                          <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="font-semibold">
                            {student.name}
                            {isCurrentUser && (
                              <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {student.streak} day streak • {student.tests_attempted} tests
                          </div>
                        </div>
                        
                        {student.batch_name && (
                          <Badge variant={getBatchColor(student.batch_name)}>
                            {student.batch_name}
                          </Badge>
                        )}
                        
                        <div className="text-right">
                          <div className="font-bold text-primary">{student.score}</div>
                          <div className="text-sm text-muted-foreground">avg score</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Your Rank Card */}
            {currentUserRank && !leaderboardData.slice(0, 10).find(s => s.student_id === currentUserRank.student_id) && (
              <div className="mt-8">
                <Card className="shadow-soft border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                        <span className="text-primary font-bold">#{currentUserRank.rank}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">Your Current Rank</div>
                        <div className="text-sm text-muted-foreground">
                          {currentUserRank.tests_attempted} tests attempted • {currentUserRank.streak} day streak
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">{currentUserRank.score} avg</div>
                        <div className="text-sm text-muted-foreground">Keep improving!</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;