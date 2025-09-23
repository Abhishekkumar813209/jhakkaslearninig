import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import GuidedPathsExplorer from "@/components/student/GuidedPathsExplorer";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionCard from "@/components/student/SubscriptionCard";

const StudentGuidedPaths = () => {
  const { user, loading } = useAuth();
  const { hasActiveSubscription, hasFreeTestUsed, fetchSubscriptionStatus } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Guided Learning Paths</h1>
          <p className="text-muted-foreground">
            Explore structured learning paths created by your teachers with curated video content and study materials
          </p>
        </div>
        {hasActiveSubscription ? (
          <GuidedPathsExplorer />
        ) : (
          <div className="max-w-xl">
            <p className="text-muted-foreground mb-4">
              Roadmaps are part of Premium. Subscribe to unlock structured learning paths.
            </p>
            <SubscriptionCard
              hasActiveSubscription={hasActiveSubscription}
              hasFreeTestUsed={hasFreeTestUsed}
              onSubscriptionSuccess={async () => {
                await fetchSubscriptionStatus();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentGuidedPaths;