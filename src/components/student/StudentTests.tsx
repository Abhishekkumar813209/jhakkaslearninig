import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, FileText, Play, AlertCircle, CheckCircle, BookOpen, Trophy, User, History } from 'lucide-react';
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
  is_free?: boolean;
  xp_reward?: number;
}

const StudentTests: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [completedTests, setCompletedTests] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasActiveSubscription, hasFreeTestUsed, fetchSubscriptionStatus, markFreeTestUsed } = useSubscription();
  const { profile } = useProfile();

  useEffect(() => {
    fetchAvailableTests();
    fetchCompletedTests();
  }, []);

  const fetchCompletedTests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('test_attempts')
        .select(`
          id,
          test_id,
          score,
          total_marks,
          percentage,
          submitted_at,
          rank,
          tests (
            title,
            subject,
            difficulty
          )
        `)
        .eq('student_id', user.id)
        .in('status', ['submitted', 'auto_submitted'])
        .order('submitted_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCompletedTests(data || []);
    } catch (error) {
      console.error('Error fetching completed tests:', error);
    }
  };

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

      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { data, error } = await supabase.functions.invoke('razorpay-subscription', {
        body: { action: 'create-order' },
        headers
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
          const { data: { session } } = await supabase.auth.getSession();
          const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
          
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-subscription', {
            body: {
              action: 'verify-payment',
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            },
            headers
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
      console.log("🟦 [StudentTests] Fetching available tests...");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's profile to find batch
      const { data: profileData } = await supabase
        .from('profiles')
        .select('batch_id')
        .eq('id', user.id)
        .single();

      console.log("👤 [StudentTests] User batch_id:", profileData?.batch_id);

      // Fetch batch-assigned tests only
      if (profileData?.batch_id) {
        console.log("📦 [StudentTests] Fetching batch-assigned tests...");
        
        const { data, error } = await supabase
          .from('batch_tests')
          .select(`
            *,
            tests (
              id,
              title,
              description,
              subject,
              difficulty,
              duration_minutes,
              total_marks,
              passing_marks,
              is_published,
              target_class,
              target_board
            )
          `)
          .eq('batch_id', profileData.batch_id);

        if (error) throw error;

        // Transform to expected format
        const batchTests = (data || []).map(bt => {
          const test = bt.tests as any;
          return {
            ...test,
            is_free: bt.is_free,
            xp_reward: bt.xp_override || test.default_xp || 100,
            question_count: 0 // Will be fetched separately if needed
          };
        }).filter(t => t.id); // Filter out null tests

        console.log("✅ [StudentTests] Batch tests loaded:", batchTests.length);
        setTests(batchTests);
      } else {
        console.log("⚠️ [StudentTests] No batch assigned to student");
        setTests([]);
      }
    } catch (error) {
      console.error('❌ [StudentTests] Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available tests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (test: Test) => {
    // Check if test is marked as free by admin
    if (test.is_free) {
      navigate(`/test/${test.id}`);
      return;
    }
    
    // If not free, require subscription
    if (!hasActiveSubscription) {
      // Scroll to subscription section with highlight
      const subscriptionSection = document.getElementById('subscription-section');
      if (subscriptionSection) {
        subscriptionSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        subscriptionSection.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          subscriptionSection.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }
      return;
    }
    
    navigate(`/test/${test.id}`);
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

      {/* Premium Feature Lock - Minimal Banner for expired users */}
      {showPaywall && (
        <PremiumFeatureLock
          featureName="Premium Tests"
          description="Your premium access has expired. Scroll down to renew for ₹299/month."
          onUpgrade={() => {
            const subscriptionSection = document.getElementById('subscription-section');
            if (subscriptionSection) {
              subscriptionSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              subscriptionSection.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
              setTimeout(() => {
                subscriptionSection.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
              }, 2000);
            }
          }}
        />
      )}

      {/* Available Tests */}
      {availableTests.length === 0 ? (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="text-center py-12">
            <BookOpen className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Tests Assigned Yet</h3>
            <p className="text-muted-foreground">
              Your teacher hasn't assigned any tests for your batch yet. Check back later!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableTests.map((test, index) => {
            // Check if test is free (admin marked) or requires subscription
            const isFreeTest = test.is_free === true;
            const isPremiumTest = !hasActiveSubscription && !isFreeTest;
            const shouldShowLockOverlay = isPremiumTest;
            
            return (
              <Card 
                key={test.id} 
                className={`hover:shadow-lg transition-all ${isPremiumTest ? 'border-2 border-primary/30' : ''}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{test.title}</CardTitle>
                      {isFreeTest && (
                        <Badge variant="secondary" className="text-xs bg-green-500 text-white">✅ Free</Badge>
                      )}
                      {isPremiumTest && (
                        <Badge variant="outline" className="text-xs text-primary border-primary">🔒 Premium</Badge>
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
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      <span>{test.xp_reward || 100} XP</span>
                    </div>
                  </div>

                   <Button 
                      className="w-full" 
                      onClick={() => handleStartTest(test)}
                      disabled={!test.question_count || test.question_count === 0}
                      variant={isPremiumTest ? "outline" : "default"}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {test.question_count === 0 
                        ? 'No Questions' 
                        : isPremiumTest
                          ? 'Unlock with Premium' 
                          : 'Start Test'
                      }
                   </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Test History Section */}
      {completedTests.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <History className="h-6 w-6" />
            Recent Test History
          </h2>
          <div className="space-y-4">
          {completedTests.map((attempt) => {
            const test = attempt.tests;
            const percentage = attempt.percentage || 0;
            const passed = percentage >= (test?.passing_marks || 50);

            return (
              <Card key={attempt.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{test?.title}</h3>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {test?.subject}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(attempt.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-2xl font-bold">{attempt.score}/{attempt.total_marks}</div>
                          <div className="text-sm text-muted-foreground">Score</div>
                        </div>
                        <div>
                          <div className={`text-2xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                            {percentage.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Percentage</div>
                        </div>
                        {attempt.rank && (
                          <div>
                            <div className="text-2xl font-bold text-purple-600">#{attempt.rank}</div>
                            <div className="text-sm text-muted-foreground">Rank</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={passed ? 'default' : 'destructive'} className="ml-4">
                      {passed ? '✓ Passed' : '✗ Failed'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </div>
      )}

      {/* Subscription Section - Only visible if no active subscription */}
      {!hasActiveSubscription && (
        <div id="subscription-section" className="scroll-mt-20 transition-all duration-300">
          <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                <CardTitle>Get Premium Access</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Unlock unlimited tests, learning paths, analytics, and rankings
              </p>
            </CardHeader>
            <CardContent>
              <SubscriptionCard onSubscribeSuccess={fetchAvailableTests} />
            </CardContent>
          </Card>
        </div>
      )}

      <PaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        onSubscribe={handleSubscribeNow}
        title="Premium Required"
        message="This test requires an active premium subscription. Subscribe now for ₹299/month to access unlimited tests and features."
      />
    </div>
  );
};

export default StudentTests;
