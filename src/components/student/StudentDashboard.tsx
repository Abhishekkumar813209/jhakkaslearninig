import React, { useState, useEffect } from 'react';
import StudentLearningPaths from './StudentLearningPaths';
import SubscriptionCard from './SubscriptionCard';
import SubscriptionExpiryNotice from './SubscriptionExpiryNotice';
import { useSubscription } from '@/hooks/useSubscription';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Trophy, Clock, TrendingUp, Flame, Heart, Zap, Award, Target, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { XPDisplay } from './XPDisplay';
import { HeartsDisplay } from './HeartsDisplay';
import { StreakTracker } from './StreakTracker';
import { WeeklyLeague } from './WeeklyLeague';
import { DailyQuests } from './DailyQuests';
import { AchievementPopup } from './AchievementPopup';
import { AttendanceButton } from './AttendanceButton';
import { ReferralCard } from './ReferralCard';
import { ProfileSidebar } from './ProfileSidebar';
import { SubjectProgressCircles } from './SubjectProgressCircles';
import { StudyHoursChart } from './StudyHoursChart';
import { LearningJourneySummary } from './LearningJourneySummary';
import { StudentAnalytics } from './StudentAnalytics';
import { ContinueWatchingCard } from './ContinueWatchingCard';

const StudentDashboard: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  
  const { 
    hasActiveSubscription, 
    hasFreeTestUsed, 
    checkTestAccess, 
    checkRoadmapAccess,
    fetchSubscriptionStatus,
    loading 
  } = useSubscription();

  const {
    overview,
    upcomingClasses,
    achievements,
    isLoading: dashboardLoading,
  } = useDashboard();

  const { data: profile } = useQuery({
    queryKey: ["student-profile-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          batches:batch_id (
            id,
            name,
            exam_type,
            exam_name,
            target_class,
            target_board,
            start_date,
            end_date
          )
        `)
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    
    initializeUser();
  }, []);

  const hasRoadmapAccess = checkRoadmapAccess();

  if (loading || dashboardLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Achievement Popup */}
      <AchievementPopup />
      
      {/* Expiry Notice */}
      <SubscriptionExpiryNotice />
      
      {/* Daily Attendance - Top Banner */}
      <AttendanceButton />
      
      {/* Header with XP & Hearts */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Hub</h1>
          <p className="text-muted-foreground">
            Track your progress and achievements
          </p>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <XPDisplay />
          <HeartsDisplay />
        </div>
      </div>
      
      {/* Mobile XP & Hearts */}
      <div className="md:hidden grid grid-cols-2 gap-4">
        <XPDisplay compact />
        <HeartsDisplay compact />
      </div>

      {/* Tabs for Dashboard and Analytics */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">
            <Zap className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            My Analytics
          </TabsTrigger>
          <TabsTrigger value="learning">
            <BookOpen className="h-4 w-4 mr-2" />
            Learning Paths
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Profile Sidebar */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <ProfileSidebar />
          </div>
        </div>

        {/* Right Column - Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Analytics Stats Cards */}
          {overview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Study Time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.stats.totalStudyTime.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <TrendingUp className={`h-3 w-3 ${overview.stats.totalStudyTime.changeType === 'increase' ? 'text-success' : 'text-destructive'}`} />
                    {overview.stats.totalStudyTime.change}% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Average Score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.stats.averageScore.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <TrendingUp className={`h-3 w-3 ${overview.stats.averageScore.changeType === 'increase' ? 'text-success' : 'text-destructive'}`} />
                    {overview.stats.averageScore.change}% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Flame className="h-4 w-4" />
                    Current Streak
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.stats.currentStreak.value}</div>
                  <p className="text-xs text-muted-foreground">{overview.stats.currentStreak.description}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Batch Rank
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.stats.batchRank.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <TrendingUp className={`h-3 w-3 ${overview.stats.batchRank.changeType === 'increase' ? 'text-success' : 'text-destructive'}`} />
                    {Math.abs(overview.stats.batchRank.change)} positions
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Continue Watching Section */}
          <ContinueWatchingCard />

          {/* Subject Progress Circles */}
          <SubjectProgressCircles />

          {/* Study Hours Chart & Learning Journey */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StudyHoursChart />
            <LearningJourneySummary />
          </div>

          {/* Batch Info Card */}
          {profile?.batches && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Your Batch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{profile.batches.name}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">{profile.batches.exam_type}</Badge>
                    <Badge variant="outline">{profile.batches.exam_name}</Badge>
                    {profile.batches.target_class && (
                      <Badge>Class {profile.batches.target_class}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Section */}
          <SubscriptionCard
            hasActiveSubscription={hasActiveSubscription}
            hasFreeTestUsed={hasFreeTestUsed}
            onSubscriptionSuccess={fetchSubscriptionStatus}
          />

          {/* Gamification Dashboard */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Your Progress</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6">
                <StreakTracker />
                <DailyQuests />
              </div>
              <div>
                <WeeklyLeague />
              </div>
              <div className="space-y-4">
                <ReferralCard />
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Test Access
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {hasActiveSubscription ? "Unlimited" : !hasFreeTestUsed ? "1 Free" : "0"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {hasActiveSubscription ? "Premium member" : !hasFreeTestUsed ? "Try for free" : "Subscribe needed"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

        </div>
      </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {userId && <StudentAnalytics userId={userId} />}
        </TabsContent>

        <TabsContent value="learning" className="space-y-6 mt-6">
          {(hasRoadmapAccess || !hasActiveSubscription) && (
            <>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Learning Roadmaps</h2>
                {!hasRoadmapAccess && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Premium Feature
                  </span>
                )}
              </div>
              <StudentLearningPaths />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentDashboard;