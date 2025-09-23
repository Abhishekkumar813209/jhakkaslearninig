import React from 'react';
import StudentLearningPaths from './StudentLearningPaths';
import SubscriptionCard from './SubscriptionCard';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Trophy, Clock, TrendingUp } from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const { 
    hasActiveSubscription, 
    hasFreeTestUsed, 
    checkTestAccess, 
    checkRoadmapAccess,
    fetchSubscriptionStatus,
    loading 
  } = useSubscription();

  const { canTakeTest, isFreeTrial } = checkTestAccess();
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learning Hub</h1>
        <p className="text-muted-foreground">
          {hasActiveSubscription 
            ? "Access unlimited tests and complete learning roadmaps" 
            : "Start with a free test or subscribe for unlimited access"
          }
        </p>
      </div>

      {/* Subscription Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Card */}
        <div className="lg:col-span-2">
          <SubscriptionCard
            hasActiveSubscription={hasActiveSubscription}
            hasFreeTestUsed={hasFreeTestUsed}
            onSubscriptionSuccess={fetchSubscriptionStatus}
          />
        </div>

        {/* Quick Stats */}
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
                {hasActiveSubscription ? "Unlimited" : canTakeTest ? "1 Free" : "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                {hasActiveSubscription ? "Premium member" : isFreeTrial ? "Try for free" : "Subscribe needed"}
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