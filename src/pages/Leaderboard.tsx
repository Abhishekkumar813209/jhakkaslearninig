import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Award, TrendingUp, Users, Loader2, Target, Zap, BookOpen, Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTestLeaderboard, useSubjectLeaderboards, useAchievements } from '@/hooks/useLeaderboards';

interface LeaderboardEntry {
  rank: number;
  student_id: string;
  name: string;
  score: number;
  performance_index: number;
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
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [availableTests, setAvailableTests] = useState<any[]>([]);

  const { leaderboard: testLeaderboard, loading: testLoading } = useTestLeaderboard(selectedTest);
  const { subjects, loading: subjectsLoading } = useSubjectLeaderboards();
  const { achievements, loading: achievementsLoading } = useAchievements();

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
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
      
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('student_analytics')
        .select(`
          student_id,
          average_score,
          performance_index,
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

      const studentIds = analyticsData.map(a => a.student_id);
      let profileQuery = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, batch_id, student_class')
        .in('id', studentIds);
      
      if (studentClass) {
        profileQuery = profileQuery.eq('student_class', studentClass as any);
      }
      
      const { data: profilesData, error: profilesError } = await profileQuery;

      if (profilesError) throw profilesError;

      const batchIds = profilesData?.map(p => p.batch_id).filter(Boolean) || [];
      let batchesData: any[] = [];
      if (batchIds.length > 0) {
        const { data, error } = await supabase
          .from('batches')
          .select('id, name')
          .in('id', batchIds);
        if (!error) batchesData = data || [];
      }

      const combined: LeaderboardEntry[] = analyticsData.map(analytics => {
        const profile = profilesData?.find(p => p.id === analytics.student_id);
        const batch = batchesData.find(b => b.id === profile?.batch_id);
        
        return {
          rank: analytics.overall_rank || 0,
          student_id: analytics.student_id,
          name: profile?.full_name || 'Unknown Student',
          score: Math.round(analytics.average_score || 0),
          performance_index: Math.round(analytics.performance_index || 0),
          streak: analytics.streak_days || 0,
          batch_name: batch?.name,
          avatar_url: profile?.avatar_url,
          tests_attempted: analytics.tests_attempted || 0,
        };
      }).sort((a, b) => a.rank - b.rank);

      setLeaderboardData(combined);

      if (currentUser) {
        const userEntry = combined.find(entry => entry.student_id === currentUser.id);
        if (userEntry) {
          setCurrentUserRank(userEntry);
        } else {
          const { data: userData } = await supabase
            .from('student_analytics')
            .select('overall_rank, average_score, performance_index, streak_days, tests_attempted')
            .eq('student_id', currentUser.id)
            .maybeSingle();

          if (userData) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', currentUser.id)
              .maybeSingle();

            setCurrentUserRank({
              rank: userData.overall_rank || 0,
              student_id: currentUser.id,
              name: userProfile?.full_name || 'You',
              score: Math.round(userData.average_score || 0),
              performance_index: Math.round(userData.performance_index || 0),
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

  const fetchAvailableTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('id, title, subject, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAvailableTests(data || []);
      if (data && data.length > 0) {
        setSelectedTest(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchAvailableTests();

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

  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'master': return 'default';
      case 'advanced': return 'secondary';
      case 'intermediate': return 'outline';
      default: return 'outline';
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'perfect_scorer': return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 'speed_demon': return <Zap className="h-5 w-5 text-blue-500" />;
      case 'consistency_king': return <Target className="h-5 w-5 text-green-500" />;
      case 'subject_master': return <BookOpen className="h-5 w-5 text-purple-500" />;
      default: return <Star className="h-5 w-5 text-orange-500" />;
    }
  };

  const getAchievementTitle = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">
            Compete, track performance, and celebrate achievements
          </p>
        </div>

        <Tabs defaultValue="overall" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overall">Overall</TabsTrigger>
            <TabsTrigger value="test">Test-Specific</TabsTrigger>
            <TabsTrigger value="subject">Subject Masters</TabsTrigger>
            <TabsTrigger value="hall">Hall of Fame</TabsTrigger>
          </TabsList>

          {/* Overall Leaderboard */}
          <TabsContent value="overall">
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
                            <div className="text-2xl font-bold text-primary mb-1">{student.performance_index}</div>
                            <div className="text-sm text-muted-foreground mb-2">Performance Index</div>
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
                              <div className="font-bold text-primary text-lg">{student.performance_index}</div>
                              <div className="text-xs text-muted-foreground">Performance Index</div>
                              <div className="text-xs text-muted-foreground mt-1">{student.score}% avg</div>
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
                            <div className="font-bold text-primary text-lg">{currentUserRank.performance_index}</div>
                            <div className="text-xs text-muted-foreground">Performance Index</div>
                            <div className="text-xs text-muted-foreground mt-1">{currentUserRank.score}% avg</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Test-Specific Leaderboard */}
          <TabsContent value="test">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Select Test</CardTitle>
                <CardDescription>View rankings for a specific test</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedTest} onValueChange={setSelectedTest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a test" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTests.map((test) => (
                      <SelectItem key={test.id} value={test.id}>
                        {test.title} ({test.subject})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {testLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : testLeaderboard.length === 0 ? (
              <Card className="p-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Submissions Yet</h3>
                <p className="text-muted-foreground">
                  Be the first to complete this test!
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Score Rankings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      By Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {testLeaderboard.slice(0, 10).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">#{entry.score_rank}</span>
                            <div>
                              <p className="font-medium text-sm">{entry.student_name}</p>
                              <Badge variant="outline" className="text-xs">{entry.student_class}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{entry.score}</p>
                            <p className="text-xs text-muted-foreground">{entry.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Speed Rankings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-500" />
                      By Speed
                    </CardTitle>
                    <CardDescription className="text-xs">Fastest completions (60%+ score)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {testLeaderboard.slice(0, 10).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">#{entry.speed_rank}</span>
                            <div>
                              <p className="font-medium text-sm">{entry.student_name}</p>
                              <Badge variant="outline" className="text-xs">{entry.student_class}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-600">{entry.time_taken_minutes}m</p>
                            <p className="text-xs text-muted-foreground">{entry.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Accuracy Rankings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      By Accuracy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {testLeaderboard.slice(0, 10).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">#{entry.accuracy_rank}</span>
                            <div>
                              <p className="font-medium text-sm">{entry.student_name}</p>
                              <Badge variant="outline" className="text-xs">{entry.student_class}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{entry.percentage}%</p>
                            <p className="text-xs text-muted-foreground">{entry.score}/{entry.total_marks}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Subject-wise Masters */}
          <TabsContent value="subject">
            {subjectsLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : Object.keys(subjects).length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Subject Data Yet</h3>
                <p className="text-muted-foreground">
                  Complete tests to build subject mastery!
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(subjects).map(([subject, performers]) => (
                  <Card key={subject}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {subject}
                      </CardTitle>
                      <CardDescription>{performers.length} students ranked</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {performers.slice(0, 5).map((performer: any) => (
                          <div key={performer.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                #{performer.subject_rank}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{performer.student_name}</p>
                                <Badge variant={getMasteryColor(performer.mastery_level)} className="text-xs">
                                  {performer.mastery_level}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">{performer.subject_performance_index.toFixed(0)}</p>
                              <p className="text-xs text-muted-foreground">{performer.tests_taken} tests</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Hall of Fame */}
          <TabsContent value="hall">
            {achievementsLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : achievements.length === 0 ? (
              <Card className="p-12 text-center">
                <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
                <p className="text-muted-foreground">
                  Complete tests to unlock achievements!
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {['perfect_scorer', 'speed_demon', 'consistency_king', 'subject_master'].map((type) => {
                  const typeAchievements = achievements.filter(a => a.achievement_type === type);
                  if (typeAchievements.length === 0) return null;

                  return (
                    <Card key={type}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {getAchievementIcon(type)}
                          {getAchievementTitle(type)}
                        </CardTitle>
                        <CardDescription>{typeAchievements.length} achievers</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {typeAchievements.slice(0, 9).map((achievement: any) => (
                            <div
                              key={achievement.id}
                              className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-accent to-accent/50 border"
                            >
                              <div className="flex-shrink-0">
                                {getAchievementIcon(achievement.achievement_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">
                                  {achievement.profiles?.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {achievement.tests?.title || achievement.subject}
                                </p>
                                {achievement.score && (
                                  <p className="text-xs font-medium text-primary mt-1">
                                    Score: {achievement.score}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(achievement.achieved_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
