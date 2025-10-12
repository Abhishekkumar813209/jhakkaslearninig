import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Users, TrendingUp, Trophy, Flame, Target } from "lucide-react";
import { toast } from "sonner";
import ParentNavbar from "@/components/ParentNavbar";
import { StudentZoneAnalysis } from "@/components/parent/StudentZoneAnalysis";
import { TopicWiseBreakdown } from "@/components/parent/TopicWiseBreakdown";
import { TopRacersSection } from "@/components/student/racing/TopRacersSection";
import { UserPositionSection } from "@/components/student/racing/UserPositionSection";

interface LinkedStudent {
  student_id: string;
  relationship: string;
  is_primary_contact: boolean;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    student_class: string;
    batch_id: string | null;
  };
}

interface StudentProgress {
  analytics: any;
  subjectAnalytics: any[];
  recentTests: any[];
}

interface StudentActivity {
  attendance: any[];
  gamification: any;
  achievements: any[];
}

interface FeeSummary {
  feeRecords: any[];
  pendingFees: any[];
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [activity, setActivity] = useState<StudentActivity | null>(null);
  const [fees, setFees] = useState<FeeSummary | null>(null);
  const [zoneData, setZoneData] = useState<any>(null);
  const [topicsBySubject, setTopicsBySubject] = useState<any>({});
  const [racingData, setRacingData] = useState<any>(null);

  useEffect(() => {
    checkParentRole();
    fetchLinkedStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData(selectedStudent);
    }
  }, [selectedStudent]);

  const checkParentRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (roleData?.role !== 'parent') {
      toast.error("Access denied. Parent role required.");
      navigate('/');
    }
  };

  const fetchLinkedStudents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('parent-portal', {
        body: { action: 'getLinkedStudents' },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setLinkedStudents(data.students || []);
      if (data.students?.length > 0) {
        setSelectedStudent(data.students[0].student_id);
      }
    } catch (error) {
      console.error('Error fetching linked students:', error);
      toast.error("Failed to load linked students");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async (studentId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      console.log('[ParentDashboard] Fetching data for student:', studentId);

      const [progressData, activityData, feesData, zoneStatusData, topicsData, racingResult] = await Promise.all([
        supabase.functions.invoke('parent-portal', {
          body: { action: 'getStudentProgress', studentId },
          headers: { Authorization: `Bearer ${session.access_token}` }
        }),
        supabase.functions.invoke('parent-portal', {
          body: { action: 'getStudentActivity', studentId },
          headers: { Authorization: `Bearer ${session.access_token}` }
        }),
        supabase.functions.invoke('parent-portal', {
          body: { action: 'getFeeSummary', studentId },
          headers: { Authorization: `Bearer ${session.access_token}` }
        }),
        supabase.functions.invoke('parent-portal', {
          body: { action: 'getZoneStatus', studentId },
          headers: { Authorization: `Bearer ${session.access_token}` }
        }),
        supabase
          .from('student_topic_analytics')
          .select('*')
          .eq('student_id', studentId),
        supabase.functions.invoke('live-racing', {
          body: {
            race_type: 'overall',
            user_id: studentId,
          },
        })
      ]);

      console.log('[ParentDashboard] Progress:', progressData);
      console.log('[ParentDashboard] Activity:', activityData);
      console.log('[ParentDashboard] Fees:', feesData);
      console.log('[ParentDashboard] Zone:', zoneStatusData);

      console.log('[ParentDashboard] Racing API response:', racingResult);

      setProgress(progressData.data);
      setActivity(activityData.data);
      setFees(feesData.data);
      setZoneData(zoneStatusData.data?.zoneStatus || null);
      
      // Handle racing data with proper fallback
      if (racingResult.data?.success) {
        console.log('[ParentDashboard] Racing data:', racingResult.data.data);
        setRacingData(racingResult.data.data);
      } else {
        console.error('[ParentDashboard] Racing fetch failed:', racingResult.data?.error || racingResult.error);
        setRacingData({
          topRacers: [],
          userPosition: null,
          nearbyRacers: [],
          totalRacers: 0,
          gapFromLeader: 0,
          leaderXP: 0,
          title: 'Live Racing',
          description: 'No racing data available'
        });
      }
      
      // Group topics by subject
      const grouped = (topicsData.data || []).reduce((acc: any, topic: any) => {
        if (!acc[topic.subject]) {
          acc[topic.subject] = [];
        }
        acc[topic.subject].push({
          name: topic.topic_name,
          practice_count: topic.practice_count || 0,
          avg_score: topic.average_score || 0,
          xp_earned: topic.xp_earned || 0,
          time_spent: topic.time_spent_minutes || 0,
          mastery_level: topic.mastery_level || 'beginner',
          last_practiced: topic.last_practiced_at
        });
        return acc;
      }, {});
      setTopicsBySubject(grouped);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error("Failed to load student data");
    } finally {
      setLoading(false);
    }
  };

  const currentStudent = linkedStudents.find(s => s.student_id === selectedStudent);

  if (loading && linkedStudents.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (linkedStudents.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <ParentNavbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Students Linked</h3>
              <p className="text-muted-foreground text-center">
                Contact the administrator to link your children to your account.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ParentNavbar />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Child Selector */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">Select Child</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {linkedStudents.map((student) => (
              <Card
                key={student.student_id}
                className={`cursor-pointer transition-all ${
                  selectedStudent === student.student_id
                    ? 'ring-2 ring-primary'
                    : 'hover:bg-accent'
                }`}
                onClick={() => setSelectedStudent(student.student_id)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={student.profiles.avatar_url || undefined} />
                    <AvatarFallback>
                      {student.profiles.full_name?.charAt(0) || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{student.profiles.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Class {student.profiles.student_class}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {currentStudent && !loading && (
          <div className="space-y-6">
            {/* Zone Status */}
            {zoneData && <StudentZoneAnalysis zoneStatus={zoneData} />}

            {/* Rankings */}
            <Card>
              <CardHeader>
                <CardTitle>Rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Overall</p>
                    <p className="text-3xl font-bold text-primary">
                      #{progress?.analytics?.overall_rank || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress?.analytics?.overall_percentile}th percentile
                    </p>
                  </div>
                  <div className="text-center border-x">
                    <p className="text-sm text-muted-foreground mb-1">Zone</p>
                    <p className="text-3xl font-bold text-primary">
                      #{progress?.analytics?.zone_rank || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress?.analytics?.zone_percentile}th percentile
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">School</p>
                    <p className="text-3xl font-bold text-primary">
                      #{progress?.analytics?.school_rank || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress?.analytics?.school_percentile}th percentile
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Total XP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{activity?.gamification?.total_xp || 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{activity?.gamification?.streak_days || 0} days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Tests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{progress?.analytics?.tests_attempted || 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    Avg Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {progress?.analytics?.average_score?.toFixed(1) || 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Subject Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Subject-wise Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {progress?.subjectAnalytics?.length > 0 ? (
                  <div className="space-y-4">
                    {progress.subjectAnalytics.map((subject: any) => (
                      <div key={subject.subject} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{subject.subject}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              subject.mastery_level === 'master' ? 'default' :
                              subject.mastery_level === 'advanced' ? 'secondary' :
                              'outline'
                            }>
                              {subject.mastery_level}
                            </Badge>
                            <span className="text-sm font-bold">
                              {subject.average_score?.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <Progress value={subject.average_score} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {subject.tests_taken} tests attempted
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No subject data available yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Topic-wise Breakdown */}
            {Object.keys(topicsBySubject).length > 0 && (
              <TopicWiseBreakdown topicsBySubject={topicsBySubject} />
            )}

            {/* Racing Charts */}
            {racingData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🏁 Live Racing Position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {racingData.topRacers?.length > 0 ? (
                    <div className="space-y-4">
                      <TopRacersSection racers={racingData.topRacers} />
                      
                      {racingData.userPosition && racingData.userPosition.position > 15 && (
                        <UserPositionSection
                          userPosition={racingData.userPosition}
                          nearbyRacers={racingData.nearbyRacers || []}
                          gapFromLeader={racingData.gapFromLeader || 0}
                          leaderXP={racingData.leaderXP || 0}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        No racing data available yet.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Racing data will appear once the student participates in activities.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pending Fees (if any) */}
            {fees?.pendingFees?.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Pending Fees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fees.pendingFees.map((fee: any) => (
                      <div key={fee.id} className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5">
                        <div>
                          <p className="font-medium">
                            {new Date(fee.year, fee.month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(fee.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">₹{fee.amount}</p>
                          <div className="flex items-center gap-2">
                            <Progress value={fee.battery_level} className="w-20 h-2" />
                            <span className="text-sm">{fee.battery_level}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {loading && currentStudent && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
