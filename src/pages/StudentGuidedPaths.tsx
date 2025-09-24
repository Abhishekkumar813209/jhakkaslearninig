import React from 'react';
import SEOHead from '@/components/SEOHead';
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import GuidedPathsExplorer from "@/components/student/GuidedPathsExplorer";
import SubscriptionCard from "@/components/student/SubscriptionCard";
import PremiumFeatureLock from '@/components/common/PremiumFeatureLock';
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

const StudentGuidedPaths = () => {
  const { user, loading } = useAuth();
  const { hasActiveSubscription, hasFreeTestUsed, fetchSubscriptionStatus, checkRoadmapAccess } = useSubscription();
  const { toast } = useToast();
  const hasRoadmapAccess = checkRoadmapAccess();
  const { profile } = useProfile();
  const navigate = useNavigate();

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
    <>
      <SEOHead 
        title={hasRoadmapAccess ? "Guided Learning Paths" : "Learning Paths - Premium Required"}
        description="Explore structured learning paths with curated video content, study materials, and expert guidance for comprehensive education."
        keywords="guided learning, learning paths, structured education, video tutorials, study materials"
        noIndex={!hasRoadmapAccess}
      />
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Guided Learning Paths</h1>
            <p className="text-muted-foreground">
              Explore structured learning paths created by your teachers with curated video content and study materials
            </p>
          </div>

          {hasRoadmapAccess ? (
            <GuidedPathsExplorer />
          ) : (
            <div className="max-w-2xl mx-auto">
              <PremiumFeatureLock
                featureName="Guided Learning Paths"
                description="Access complete guided learning paths with structured curriculum, video playlists, and progress tracking. Perfect for systematic exam preparation."
                onUpgrade={() => {
                  // Scroll to subscription card
                  const subscriptionCard = document.querySelector('[data-subscription-card]') as HTMLElement;
                  if (subscriptionCard) {
                    subscriptionCard.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />
              
              <div className="mt-8">
                <SubscriptionCard
                  hasActiveSubscription={hasActiveSubscription}
                  hasFreeTestUsed={hasFreeTestUsed}
                  onSubscriptionSuccess={async () => {
                    await fetchSubscriptionStatus();
                    toast({
                      title: "Premium Activated! 🎉",
                      description: "You now have access to all guided learning paths.",
                    });
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default StudentGuidedPaths;