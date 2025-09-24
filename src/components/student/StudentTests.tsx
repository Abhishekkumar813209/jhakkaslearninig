import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, FileText, Play, AlertCircle, CheckCircle, BookOpen, Trophy, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import SubscriptionCard from '@/components/student/SubscriptionCard';
import PremiumFeatureLock from '@/components/common/PremiumFeatureLock';
import { useSubscription } from '@/hooks/useSubscription';
import PaywallModal from '@/components/PaywallModal';
import { useProfile } from '@/hooks/useProfile';

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
  const { profile } = useProfile();

  useEffect(() => {
    fetchAvailableTests();
  }, [profile]);

  const loadRazorpayScript = () => new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handleSubscribeNow = async () => {
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast({ title: 'Error', description: 'Failed to load payment gateway', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('razorpay-subscription', {
        body: { action: 'create-order' }
      });

      if (error) throw new Error(error.message || 'Failed to create order');

      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'EduTech Learning Platform',
        description: 'Monthly Test Series + Learning Paths Access',
        order_id: data.orderId,
        method: { upi: true, card: true, netbanking: true, wallet: true, emi: false },
        handler: async (response: any) => {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-subscription', {
            body: {
              action: 'verify-payment',
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            }
          });
          if (verifyError) {
            throw new Error(verifyError.message || 'Payment verification failed');
          }
          toast({ title: 'Premium Activated', description: '30 days access unlocked!' });
          setShowPaywallModal(false);
          await fetchSubscriptionStatus();
          await fetchAvailableTests();
        },
        modal: { ondismiss: () => setShowPaywallModal(false) },
        retry: { enabled: true, max_count: 3 },
        theme: { color: '#3B82F6' }
      });

      rzp.open();
    } catch (err: any) {
      console.error('[StudentTests] subscribe error:', err);
      toast({
        title: 'Subscription Failed',
        description: err?.message?.includes('non-2xx') ? 'Payment service temporarily unavailable. Try again.' : (err?.message || 'Please try again later.'),
        variant: 'destructive'
      });
    }
  };

  const fetchAvailableTests = async () => {
    try {
      setLoading(true);
      
      // Check if user has completed profile (class and board set)
      if (!profile?.student_class || !profile?.education_board) {
        setTests([]);
        setLoading(false);
        return;
      }

      // Use tests-api which automatically filters by class/board for students
      // Order by creation date (newest first) so oldest test is last in array
      const { data, error } = await supabase.functions.invoke('tests-api', {
        body: { action: 'getAllTests', orderBy: 'created_at', order: 'desc' }
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

  const handleStartTest = async (testId: string, testIndex: number) => {
    // Logic: Oldest test (last in array) is always free for everyone
    // All other tests require premium subscription
    const isOldestTest = testIndex === availableTests.length - 1;
    
    if (!isOldestTest && !hasActiveSubscription) {
      // Show subscription card instead of just modal
      const subscriptionCard = document.querySelector('[data-subscription-card]') as HTMLElement;
      if (subscriptionCard) {
        subscriptionCard.scrollIntoView({ behavior: 'smooth' });
      } else {
        setShowPaywallModal(true);
      }
      return;
    }
    
    // Mark free test as used if this is oldest test and user hasn't used it yet
    if (isOldestTest && !hasFreeTestUsed) {
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

  // Show profile completion message if not completed
  if (!profile?.student_class || !profile?.education_board) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Available Tests</h1>
          <p className="text-muted-foreground">Practice tests and assessments to enhance your learning</p>
        </div>
        
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-12">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-xl font-semibold mb-4">Complete Your Profile First</h3>
            <p className="text-muted-foreground mb-6">
              To see tests relevant to your academic level, please complete your profile by setting your class and education board.
            </p>
            <Button onClick={() => navigate('/complete-profile')} className="w-full max-w-xs">
              <User className="h-4 w-4 mr-2" />
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableTests = tests.filter((t) => (t.question_count || 0) > 0);
  
  // Always show all tests - lock them at the UI level, not hide them
  let showPaywall = false;
  if (!hasActiveSubscription && hasFreeTestUsed) {
    showPaywall = true;
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

      {/* Premium Feature Lock for expired users */}
      {showPaywall && (
        <div className="mb-6">
          <PremiumFeatureLock
            featureName="Unlimited Tests"
            description="Your free test has been used and your premium access has expired. Renew your subscription to continue taking unlimited tests and access all learning materials."
            onUpgrade={() => {
              // Scroll to subscription card below
              const subscriptionCard = document.querySelector('[data-subscription-card]') as HTMLElement;
              if (subscriptionCard) {
                subscriptionCard.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
          
          <div className="mt-6">
            <SubscriptionCard
              hasActiveSubscription={hasActiveSubscription}
              hasFreeTestUsed={hasFreeTestUsed}
              onSubscriptionSuccess={async () => {
                await fetchSubscriptionStatus();
                await fetchAvailableTests();
              }}
            />
          </div>
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
            // Show oldest test (last in array) as free, rest as premium if no subscription
            const isOldestTest = index === availableTests.length - 1;
            const isPremiumTest = !hasActiveSubscription && !isOldestTest;
            const shouldShowLockOverlay = isPremiumTest && hasFreeTestUsed;
            
            return (
              <Card key={test.id} className={`hover:shadow-lg transition-shadow ${shouldShowLockOverlay ? 'relative' : ''}`}>
                {shouldShowLockOverlay && (
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
                      {isOldestTest && !hasActiveSubscription && (
                        <Badge variant="secondary" className="text-xs">Free</Badge>
                      )}
                      {isPremiumTest && (
                        <Badge variant="outline" className="text-xs text-primary border-primary">Premium</Badge>
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
                     onClick={() => handleStartTest(test.id, index)}
                     disabled={!test.question_count || test.question_count === 0}
                     variant={isPremiumTest && hasFreeTestUsed ? "outline" : "default"}
                   >
                     <Play className="h-4 w-4 mr-2" />
                     {test.question_count === 0 
                       ? 'No Questions' 
                       : isPremiumTest && hasFreeTestUsed 
                         ? 'Subscribe to Access' 
                         : 'Start Test'
                     }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Subscription Card - Always show for non-premium users */}
      {!hasActiveSubscription && (
        <div data-subscription-card className="mt-8">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold mb-2">Unlock All Tests & Learning Paths</h2>
            <p className="text-muted-foreground">Get unlimited access to all premium features</p>
          </div>
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

      <PaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        onSubscribe={handleSubscribeNow}
        title="Premium Test Access"
        description="You've used your free test. Subscribe for ₹299 to unlock unlimited tests and learning paths."
      />

    </div>
  );
};

export default StudentTests;