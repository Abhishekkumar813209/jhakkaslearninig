import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, Users, TrendingUp, Calendar, DollarSign, Trophy, Flame } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

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

      const [progressData, activityData, feesData] = await Promise.all([
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
        })
      ]);

      setProgress(progressData.data);
      setActivity(activityData.data);
      setFees(feesData.data);
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
        <Navbar />
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
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Parent Dashboard</h1>
          <p className="text-muted-foreground">Monitor your children's academic progress</p>
        </div>

        {/* Student Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
              <CardContent className="flex items-center gap-4 p-4">
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
                {student.is_primary_contact && (
                  <Badge variant="secondary">Primary</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Student Details */}
        {currentStudent && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="academics">Academics</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="fees">Fees</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total XP</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {activity?.gamification?.total_xp || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Streak</CardTitle>
                    <Flame className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {activity?.gamification?.streak_days || 0} days
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Tests Taken</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {progress?.analytics?.tests_attempted || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {progress?.analytics?.average_score?.toFixed(1) || 0}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Tests */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Test Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {progress?.recentTests?.length > 0 ? (
                    <div className="space-y-4">
                      {progress.recentTests.map((test: any) => (
                        <div key={test.id} className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="font-medium">{test.test?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {test.test?.subject} • {new Date(test.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{test.percentage}%</p>
                            <p className="text-sm text-muted-foreground">
                              {test.score}/{test.test?.total_marks}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No tests attempted yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="academics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Subject-wise Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {progress?.subjectAnalytics?.length > 0 ? (
                    <div className="space-y-4">
                      {progress.subjectAnalytics.map((subject: any) => (
                        <div key={subject.subject} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium">{subject.subject}</span>
                            <span className="text-sm text-muted-foreground">
                              {subject.average_score?.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={subject.average_score} className="h-2" />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{subject.tests_taken} tests</span>
                            <Badge variant={
                              subject.mastery_level === 'master' ? 'default' :
                              subject.mastery_level === 'advanced' ? 'secondary' :
                              'outline'
                            }>
                              {subject.mastery_level}
                            </Badge>
                          </div>
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
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Attendance (Last 30 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {activity?.attendance?.length || 0} days
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity?.attendance?.filter((a: any) => a.social_share_done).length || 0} days with social share
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Recent Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activity?.achievements?.length > 0 ? (
                      <div className="space-y-2">
                        {activity.achievements.slice(0, 5).map((achievement: any) => (
                          <div key={achievement.id} className="flex items-center justify-between">
                            <span className="text-sm">{achievement.achievement_type}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(achievement.achieved_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No achievements yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="fees" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pending Fees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {fees?.pendingFees?.length > 0 ? (
                    <div className="space-y-4">
                      {fees.pendingFees.map((fee: any) => (
                        <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No pending fees
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {fees?.feeRecords?.length > 0 ? (
                    <div className="space-y-2">
                      {fees.feeRecords.map((fee: any) => (
                        <div key={fee.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">
                              {new Date(fee.year, fee.month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                            </p>
                            {fee.paid_date && (
                              <p className="text-sm text-muted-foreground">
                                Paid on {new Date(fee.paid_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold">₹{fee.amount}</p>
                            <Badge variant={fee.is_paid ? 'default' : 'destructive'}>
                              {fee.is_paid ? 'Paid' : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No payment history
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
