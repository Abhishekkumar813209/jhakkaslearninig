import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, FileText, Play, AlertCircle, CheckCircle, BookOpen, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import SubscriptionCard from '@/components/student/SubscriptionCard';
import PaywallModal from '@/components/PaywallModal';
import { useSubscription } from '@/hooks/useSubscription';

interface Test {
  id: string;
  title: string;
  description: string;
  subject: string;
  class?: string;
  target_class?: string;
  target_board?: string;
  difficulty: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  is_published: boolean;
  question_count?: number;
}

const StudentTests: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasActiveSubscription, hasFreeTestUsed, fetchSubscriptionStatus, markFreeTestUsed } = useSubscription();

  useEffect(() => {
    fetchAvailableTests();
  }, []);

  const fetchAvailableTests = async () => {
    try {
      setLoading(true);
      
      // Get current user's profile to filter tests
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use tests-api which automatically filters by class/board for students
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'getAllTests' }
      })

      if (error) throw error;

      setTests(data.tests || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available tests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (testId: string) => {
    // Check if user needs subscription for this test
    if (!hasActiveSubscription && hasFreeTestUsed) {
      setShowPaywallModal(true);
      return;
    }
    
    // If this is the first test and user hasn't used free test, mark it as used
    if (!hasActiveSubscription && !hasFreeTestUsed) {
      await markFreeTestUsed();
    }
    
    navigate(`/test/${testId}`);
  };

  const getDifficultyBadge = (difficulty: string) => {
    const difficultyConfig = {
      easy: { variant: 'default' as const, className: 'bg-green-500' },
      medium: { variant: 'default' as const, className: 'bg-yellow-500' },
      hard: { variant: 'default' as const, className: 'bg-red-500' }
    };
    
    const config = difficultyConfig[difficulty.toLowerCase() as keyof typeof difficultyConfig] || difficultyConfig.medium;
    return <Badge variant={config.variant} className={config.className}>{difficulty}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading available tests...</p>
        </div>
      </div>
    );
  }

  const availableTests = tests.filter((t) => (t.question_count || 0) > 0);
  let visibleTests = availableTests;
  let showPaywall = false;
  
  // Show all tests but gate them at click level for better UX
  if (!hasActiveSubscription) {
    if (hasFreeTestUsed) {
      showPaywall = true;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Available Tests</h1>
        <p className="text-muted-foreground">Practice tests and assessments to enhance your learning</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Tests</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableTests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {availableTests.reduce((sum, test) => sum + (test.question_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Marks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {availableTests.reduce((sum, test) => sum + test.total_marks, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Paywall for premium */}
      {showPaywall && (
        <div className="mb-6">
          <SubscriptionCard
            hasActiveSubscription={hasActiveSubscription}
            hasFreeTestUsed={hasFreeTestUsed}
            onSubscriptionSuccess={async () => {
              await fetchSubscriptionStatus();
              await fetchAvailableTests();
            }}
          />
        </div>
      )}

      {/* Tests Grid */}
      {availableTests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tests available</h3>
            <p className="text-muted-foreground">Check back later for new tests and assessments</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableTests.map((test, index) => {
            const isPremiumTest = !hasActiveSubscription && hasFreeTestUsed && index > 0;
            const isFirstTest = index === 0;
            
            return (
              <Card key={test.id} className={`hover:shadow-lg transition-shadow ${isPremiumTest ? 'relative' : ''}`}>
                {isPremiumTest && (
                  <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px] rounded-lg z-10 flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg text-center">
                      <Trophy className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="text-sm font-medium">Premium Required</p>
                    </div>
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{test.title}</CardTitle>
                      {isFirstTest && !hasActiveSubscription && !hasFreeTestUsed && (
                        <Badge variant="secondary" className="text-xs">Free</Badge>
                      )}
                    </div>
                    {getDifficultyBadge(test.difficulty)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {test.subject} • Class {test.target_class} • {test.target_board}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{test.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{test.duration_minutes}m</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{test.question_count} questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span>{test.total_marks} marks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span>{test.passing_marks}% to pass</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => handleStartTest(test.id)}
                    disabled={!test.question_count || test.question_count === 0}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {test.question_count === 0 ? 'No Questions' : 'Start Test'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        onSubscribe={async () => {
          setShowPaywallModal(false);
          // Trigger subscription flow
          const subscriptionCard = document.querySelector('[data-subscription-card]') as HTMLElement;
          if (subscriptionCard) {
            subscriptionCard.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        title="Premium Test Access"
        description="You've used your free test! Subscribe to access unlimited tests, learning paths, and analytics."
      />
    </div>
  );
};

export default StudentTests;