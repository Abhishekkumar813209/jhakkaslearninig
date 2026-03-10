import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ParentAppLayout } from "@/components/parent/ParentAppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Users, TrendingUp, Trophy, Flame, Target, AlertOctagon, AlertTriangle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { StudentZoneAnalysis } from "@/components/parent/StudentZoneAnalysis";
import { TopicWiseBreakdown } from "@/components/parent/TopicWiseBreakdown";
import { ParentRoadmapCalendar } from "@/components/parent/ParentRoadmapCalendar";
import { ChapterTestProgress } from "@/components/parent/ChapterTestProgress";
import { TopRacersSection } from "@/components/student/racing/TopRacersSection";
import { UserPositionSection } from "@/components/student/racing/UserPositionSection";
import { RaceTypeSelector } from "@/components/student/racing/RaceTypeSelector";
import { RaceType } from "@/pages/LiveRacing";
import { ParentHeroSection } from "@/components/parent/ParentHeroSection";
import { ThreeBackground } from "@/components/student/ThreeBackground";
import {
  ParentWatchingIllustration,
  ReportCardIllustration,
  TrophyMomentIllustration,
} from "@/components/parent/ParentStoryIllustrations";

// --- Animation helpers ---
const sectionFadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const staggerGrid = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardPop = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
};

// --- Types ---
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

interface StudentProgress { analytics: any; subjectAnalytics: any[]; recentTests: any[]; }
interface StudentActivity { attendance: any[]; gamification: any; achievements: any[]; }
interface FeeSummary { feeRecords: any[]; pendingFees: any[]; }

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
  const [selectedRace, setSelectedRace] = useState<RaceType>('class');
  const [testAnalysis, setTestAnalysis] = useState<any>({});
  const [roadmapCalendar, setRoadmapCalendar] = useState<any>(null);
  const [chapterStatuses, setChapterStatuses] = useState<Record<string, { total: number; completed: number }>>({});
  const [manualZone, setManualZone] = useState<'red' | 'yellow' | 'green'>('red');
  const [currentDataStudentId, setCurrentDataStudentId] = useState<string | null>(null);

  // ========== DATA FETCHING (unchanged logic) ==========
  useEffect(() => { checkParentRole(); fetchLinkedStudents(); }, []);

  useEffect(() => {
    if (selectedStudent) {
      setProgress(null); setActivity(null); setFees(null); setZoneData(null);
      setTopicsBySubject({}); setRacingData(null); setTestAnalysis({});
      setRoadmapCalendar(null); setChapterStatuses({}); setCurrentDataStudentId(null);
      setLoading(true);
      fetchStudentData(selectedStudent);
    }
  }, [selectedStudent, selectedRace]);

  const checkParentRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/login'); return; }
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
    if (roleData?.role !== 'parent') { toast.error("Access denied. Parent role required."); navigate('/'); }
  };

  const fetchLinkedStudents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke('parent-portal', {
        body: { action: 'getLinkedStudents' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (error) throw error;
      setLinkedStudents(data.students || []);
      if (data.students?.length > 0) setSelectedStudent(data.students[0].student_id);
    } catch (error) {
      console.error('Error fetching linked students:', error);
      toast.error("Failed to load linked students");
    } finally { setLoading(false); }
  };

  const fetchStudentData = async (studentId: string) => {
    const fetchingForStudent = studentId;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [progressData, activityData, feesData, zoneStatusData, topicsData, racingResult, testAnalysisData, calendarData, chapterProgressData] = await Promise.all([
        supabase.functions.invoke('parent-portal', { body: { action: 'getStudentProgress', studentId }, headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.functions.invoke('parent-portal', { body: { action: 'getStudentActivity', studentId }, headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.functions.invoke('parent-portal', { body: { action: 'getFeeSummary', studentId }, headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.functions.invoke('parent-portal', { body: { action: 'getZoneStatus', studentId }, headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.from('student_topic_analytics').select('*').eq('student_id', studentId),
        supabase.functions.invoke('live-racing', { body: { race_type: selectedRace, user_id: studentId }, headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.functions.invoke('parent-portal', { body: { action: 'getSubjectChapterTestAnalysis', studentId }, headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.functions.invoke('parent-portal', { body: { action: 'getRoadmapCalendarView', studentId }, headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.functions.invoke('parent-portal', { body: { action: 'getChapterTestProgress', studentId }, headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);

      if (selectedStudent !== fetchingForStudent) return;

      setProgress(progressData.data);
      setActivity(activityData.data);
      setFees(feesData.data);
      setZoneData(zoneStatusData.data?.zoneStatus || null);
      setTestAnalysis(testAnalysisData.data?.testAnalysis || {});
      setRoadmapCalendar(calendarData.data || null);
      setChapterStatuses(chapterProgressData.data?.chapterStatuses || {});
      setCurrentDataStudentId(fetchingForStudent);

      if (racingResult.data?.success) {
        setRacingData(racingResult.data.data);
      } else {
        setRacingData({ topRacers: [], userPosition: null, nearbyRacers: [], totalRacers: 0, gapFromLeader: 0, leaderXP: 0, title: 'Live Racing', description: 'No racing data available' });
      }

      const grouped = (topicsData.data || []).reduce((acc: any, topic: any) => {
        if (!acc[topic.subject]) acc[topic.subject] = [];
        acc[topic.subject].push({ topic_name: topic.topic_name, times_practiced: topic.practice_count || 0, average_score: topic.average_score || 0, total_xp_earned: topic.xp_earned || 0, time_spent_minutes: topic.time_spent_minutes || 0, mastery_level: topic.mastery_level || 'beginner', last_practiced_at: topic.last_practiced_at });
        return acc;
      }, {});
      if (selectedStudent === fetchingForStudent) setTopicsBySubject(grouped);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error("Failed to load student data");
    } finally {
      if (selectedStudent === fetchingForStudent) setLoading(false);
    }
  };

  const toggleZone = (zone: 'red' | 'yellow' | 'green') => {
    setManualZone(zone);
    const zoneNames = { red: 'RED ZONE - Urgent Attention Needed', yellow: 'YELLOW ZONE - Needs Improvement', green: 'GREEN ZONE - Excellent Progress' };
    toast.success('Zone Updated', { description: zoneNames[zone], duration: 2000 });
  };

  const currentStudent = linkedStudents.find(s => s.student_id === selectedStudent);

  // ========== LOADING / EMPTY STATES ==========
  if (loading && linkedStudents.length === 0) {
    return (
      <ParentAppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ParentAppLayout>
    );
  }

  if (linkedStudents.length === 0) {
    return (
      <ParentAppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Students Linked</h3>
              <p className="text-muted-foreground text-center">Contact the administrator to link your children to your account.</p>
            </CardContent>
          </Card>
        </div>
      </ParentAppLayout>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <ParentAppLayout>
      {/* Animated Hero Section */}
      <ParentHeroSection
        linkedStudents={linkedStudents}
        selectedStudent={selectedStudent}
        onSelectStudent={setSelectedStudent}
        activity={activity}
        progress={progress}
      />

      {/* 3D Background (desktop only, lazy-loaded) */}
      <div className="relative">
        <ThreeBackground />

        <div className="container mx-auto px-4 py-6 max-w-6xl relative z-10">
          {/* Loading state */}
          {loading && currentStudent && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {currentStudent && !loading && currentDataStudentId === selectedStudent && (
            <div className="space-y-8">

              {/* ── Section 1: Performance Zone ── */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionFadeUp}>
                <div className="flex items-center gap-4 mb-4">
                  <ParentWatchingIllustration />
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">Performance Zone</h2>
                    <p className="text-sm text-muted-foreground">Double-click any zone to mark student's current status</p>
                  </div>
                </div>
                <motion.div variants={staggerGrid} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Red Zone */}
                  <motion.div variants={cardPop} whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.95 }} onDoubleClick={() => toggleZone('red')}
                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${manualZone === 'red' ? 'bg-destructive text-destructive-foreground border-destructive shadow-lg shadow-destructive/20' : 'bg-destructive/10 text-foreground border-destructive/30 hover:bg-destructive/20'}`}>
                    <AlertOctagon className={`h-10 w-10 mx-auto mb-3 ${manualZone === 'red' ? 'text-destructive-foreground' : 'text-destructive'}`} />
                    <h3 className="text-center font-bold text-lg">Red Zone</h3>
                    <p className="text-center text-sm mt-1 opacity-80">Urgent Attention Needed</p>
                    {manualZone === 'red' && <Badge className="w-full mt-3 justify-center bg-card text-destructive hover:bg-card">Active</Badge>}
                  </motion.div>

                  {/* Yellow Zone */}
                  <motion.div variants={cardPop} whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.95 }} onDoubleClick={() => toggleZone('yellow')}
                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${manualZone === 'yellow' ? 'bg-warning text-warning-foreground border-warning shadow-lg shadow-warning/20' : 'bg-warning/10 text-foreground border-warning/30 hover:bg-warning/20'}`}>
                    <AlertTriangle className={`h-10 w-10 mx-auto mb-3 ${manualZone === 'yellow' ? 'text-warning-foreground' : 'text-warning'}`} />
                    <h3 className="text-center font-bold text-lg">Yellow Zone</h3>
                    <p className="text-center text-sm mt-1 opacity-80">Needs Improvement</p>
                    {manualZone === 'yellow' && <Badge className="w-full mt-3 justify-center bg-card text-warning hover:bg-card">Active</Badge>}
                  </motion.div>

                  {/* Green Zone */}
                  <motion.div variants={cardPop} whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.95 }} onDoubleClick={() => toggleZone('green')}
                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${manualZone === 'green' ? 'bg-success text-success-foreground border-success shadow-lg shadow-success/20' : 'bg-success/10 text-foreground border-success/30 hover:bg-success/20'}`}>
                    <ShieldCheck className={`h-10 w-10 mx-auto mb-3 ${manualZone === 'green' ? 'text-success-foreground' : 'text-success'}`} />
                    <h3 className="text-center font-bold text-lg">Green Zone</h3>
                    <p className="text-center text-sm mt-1 opacity-80">Excellent Progress</p>
                    {manualZone === 'green' && <Badge className="w-full mt-3 justify-center bg-card text-success hover:bg-card">Active</Badge>}
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Zone Analysis */}
              {zoneData && (
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionFadeUp}>
                  <StudentZoneAnalysis zoneStatus={zoneData} />
                </motion.div>
              )}

              {/* ── Section 2: Rankings ── */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionFadeUp}>
                <div className="flex items-center gap-4 mb-4">
                  <ReportCardIllustration />
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">Rankings & Performance</h2>
                </div>

                <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <motion.div variants={staggerGrid} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Overall', rank: progress?.analytics?.overall_rank, percentile: progress?.analytics?.overall_percentile },
                        { label: 'Zone', rank: progress?.analytics?.zone_rank, percentile: progress?.analytics?.zone_percentile },
                        { label: 'School', rank: progress?.analytics?.school_rank, percentile: progress?.analytics?.school_percentile },
                      ].map((r) => (
                        <motion.div key={r.label} variants={cardPop} className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">{r.label}</p>
                          <p className="text-3xl font-bold text-primary">#{r.rank ?? 'N/A'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {r.percentile ? `${r.percentile}th percentile` : 'Insufficient data'}
                          </p>
                        </motion.div>
                      ))}
                    </motion.div>
                  </CardContent>
                </Card>

                {/* Performance Stats */}
                <motion.div variants={staggerGrid} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {[
                    { icon: Trophy, label: 'Total XP', value: activity?.gamification?.total_xp || 0, iconColor: 'text-warning' },
                    { icon: Flame, label: 'Streak', value: `${activity?.gamification?.streak_days || 0} days`, iconColor: 'text-destructive' },
                    { icon: TrendingUp, label: 'Tests', value: progress?.analytics?.tests_attempted || 0, iconColor: 'text-primary' },
                    { icon: Target, label: 'Avg Score', value: `${(progress?.analytics?.average_score || 0).toFixed(1)}%`, iconColor: 'text-success' },
                  ].map((stat) => (
                    <motion.div key={stat.label} variants={cardPop}>
                      <Card className="border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                            {stat.label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* ── Section 3: Chapter Test Progress ── */}
              {roadmapCalendar?.subjectsData && roadmapCalendar.subjectsData.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} >
                  <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Chapter-wise Test Progress</CardTitle>
                      <CardDescription>Double-click any chapter to toggle completion. Green = Tests completed, Red = No tests completed</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChapterTestProgress roadmapData={roadmapCalendar.subjectsData} testAnalysis={testAnalysis} chapterStatuses={chapterStatuses} />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── Section 4: Roadmap Calendar ── */}
              {roadmapCalendar && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} >
                  <ParentRoadmapCalendar
                    startDate={new Date(roadmapCalendar.startDate)}
                    totalDays={roadmapCalendar.totalDays}
                    subjectsData={roadmapCalendar.subjectsData}
                    chapterStatuses={chapterStatuses}
                    testAnalysis={testAnalysis}
                  />
                </motion.div>
              )}

              {/* ── Section 5: Topic Breakdown ── */}
              {Object.keys(topicsBySubject).length > 0 && (
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionFadeUp}>
                  <TopicWiseBreakdown topicsBySubject={topicsBySubject} />
                </motion.div>
              )}

              {/* ── Section 6: Racing ── */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionFadeUp}>
                <div className="flex items-center gap-4 mb-4">
                  <TrophyMomentIllustration />
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">Racing & Leaderboard</h2>
                </div>
                <RaceTypeSelector selectedRace={selectedRace} onRaceChange={setSelectedRace} />
                {racingData && (
                  <Card className="mt-4 border border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">🏁 {racingData.title || 'Live Racing Position'}</CardTitle>
                      <CardDescription>{racingData.description} • {racingData.totalRacers || 0} racers</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {racingData.topRacers?.length > 0 ? (
                        <div className="space-y-4">
                          <TopRacersSection racers={racingData.topRacers} />
                          {racingData.userPosition && racingData.userPosition.position > 15 && (
                            <UserPositionSection userPosition={racingData.userPosition} nearbyRacers={racingData.nearbyRacers || []} gapFromLeader={racingData.gapFromLeader || 0} leaderXP={racingData.leaderXP || 0} />
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">No racing data available yet.</p>
                          <p className="text-sm text-muted-foreground mt-2">Racing data will appear once the student participates in activities.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </motion.div>

              {/* ── Section 7: Pending Fees ── */}
              {fees?.pendingFees && fees.pendingFees.length > 0 && (
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionFadeUp}>
                  <Card className="border-destructive/50">
                    <CardHeader>
                      <CardTitle className="text-destructive">Pending Fees</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {fees.pendingFees.map((fee: any) => (
                          <div key={fee.id} className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5">
                            <div>
                              <p className="font-medium">{new Date(fee.year, fee.month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</p>
                              <p className="text-sm text-muted-foreground">Due: {new Date(fee.due_date).toLocaleDateString()}</p>
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
                </motion.div>
              )}

            </div>
          )}
        </div>
      </div>
    </ParentAppLayout>
  );
}
