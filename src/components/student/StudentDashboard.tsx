import React from 'react';
import StudentLearningPaths from './StudentLearningPaths';
import SubscriptionCard from './SubscriptionCard';
import SubscriptionExpiryNotice from './SubscriptionExpiryNotice';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Trophy, Clock, TrendingUp, Flame, Heart, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { XPDisplay } from './XPDisplay';
import { HeartsDisplay } from './HeartsDisplay';
import { StreakTracker } from './StreakTracker';
import { WeeklyLeague } from './WeeklyLeague';
import { DailyQuests } from './DailyQuests';
import { AchievementPopup } from './AchievementPopup';
import { AttendanceButton } from './AttendanceButton';

const StudentDashboard: React.FC = () => {
  const { 
    hasActiveSubscription, 
    hasFreeTestUsed, 
    checkTestAccess, 
    checkRoadmapAccess,
    fetchSubscriptionStatus,
    loading 
  } = useSubscription();

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

  const hasRoadmapAccess = checkRoadmapAccess();

  if (loading) {
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
            {hasActiveSubscription 
              ? "Access unlimited tests and complete learning roadmaps" 
              : "Start with a free test or buy monthly access for unlimited features"
            }
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

      {/* Batch Info Card */}
      {profile?.batches && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Batch
            </CardTitle>
            <CardDescription>Current enrollment details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-lg font-semibold">{profile.batches.name}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{profile.batches.exam_type}</Badge>
                <Badge variant="outline">{profile.batches.exam_name}</Badge>
                {profile.batches.target_class && (
                  <Badge>Class {profile.batches.target_class}</Badge>
                )}
                {profile.batches.target_board && (
                  <Badge variant="secondary">{profile.batches.target_board}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {new Date(profile.batches.start_date).toLocaleDateString()} - {new Date(profile.batches.end_date).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Section */}
      <div className="lg:col-span-3">
        <SubscriptionCard
          hasActiveSubscription={hasActiveSubscription}
          hasFreeTestUsed={hasFreeTestUsed}
          onSubscriptionSuccess={fetchSubscriptionStatus}
        />
      </div>

      {/* Gamification Dashboard */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Your Progress</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Streak & Quests */}
          <div className="space-y-6">
            <StreakTracker />
            <DailyQuests />
          </div>

          {/* Column 2: Weekly League */}
          <div>
            <WeeklyLeague />
          </div>

          {/* Column 3: Quick Stats */}
          <div className="space-y-4">
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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Learning Paths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {hasRoadmapAccess ? "Unlimited" : "Limited"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasRoadmapAccess ? "Full access" : "Subscribe for full access"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Learning Paths Component */}
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
    </div>
  );
};

export default StudentDashboard;