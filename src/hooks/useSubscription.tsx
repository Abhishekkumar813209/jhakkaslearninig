import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  hasFreeTestUsed: boolean;
  subscriptionType: string;
  includesRoadmap: boolean;
  loading: boolean;
}

export const useSubscription = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    hasFreeTestUsed: false,
    subscriptionType: 'none',
    includesRoadmap: false,
    loading: true
  });
  const { toast } = useToast();

  const fetchSubscriptionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubscriptionStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      // Check for active subscription
      const { data: activeSubscription, error: activeErr } = await supabase
        .from('test_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
        .eq('subscription_type', 'premium')
        .maybeSingle();

      if (activeErr && activeErr.code !== 'PGRST116') {
        console.warn('[useSubscription] active subscription query error:', activeErr);
      }

      // Check if free test was used
      const { data: freeTestSubscription, error: freeErr } = await supabase
        .from('test_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('subscription_type', 'free')
        .eq('free_test_used', true)
        .maybeSingle();

      if (freeErr && freeErr.code !== 'PGRST116') {
        console.warn('[useSubscription] free test query error:', freeErr);
      }

      setSubscriptionStatus({
        hasActiveSubscription: !!activeSubscription,
        hasFreeTestUsed: !!freeTestSubscription,
        subscriptionType: activeSubscription?.subscription_type || 'none',
        includesRoadmap: activeSubscription?.includes_roadmap || false,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription status",
        variant: "destructive"
      });
      setSubscriptionStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const markFreeTestUsed = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create or update free test subscription
      const { error } = await supabase
        .from('test_subscriptions')
        .upsert({
          student_id: user.id,
          subscription_type: 'free',
          status: 'used',
          free_test_used: true,
          amount: 0,
          currency: 'INR'
        });

      if (error) {
        console.error('Error marking free test as used:', error);
        return;
      }

      // Refresh subscription status
      await fetchSubscriptionStatus();
    } catch (error) {
      console.error('Error in markFreeTestUsed:', error);
    }
  };

  const checkTestAccess = () => {
    const { hasActiveSubscription, hasFreeTestUsed } = subscriptionStatus;
    
    if (hasActiveSubscription) {
      return { canTakeTest: true, isFreeTrial: false };
    }
    
    if (!hasFreeTestUsed) {
      return { canTakeTest: true, isFreeTrial: true };
    }
    
    return { canTakeTest: false, isFreeTrial: false };
  };

  const checkRoadmapAccess = () => {
    const { hasActiveSubscription, includesRoadmap } = subscriptionStatus;
    return hasActiveSubscription && includesRoadmap;
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  return {
    ...subscriptionStatus,
    fetchSubscriptionStatus,
    markFreeTestUsed,
    checkTestAccess,
    checkRoadmapAccess
  };
};