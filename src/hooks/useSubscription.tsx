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

      console.log('[useSubscription] Checking subscription status for user:', user.id);

      // Check for active subscription (premium or premium_monthly) with proper date validation
      const now = new Date().toISOString();
      console.log('[useSubscription] Current time:', now);
      
      const { data: activeSubscription, error: activeErr } = await supabase
        .from('test_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .in('subscription_type', ['premium', 'premium_monthly'])
        .gte('end_date', now) // Only get subscriptions that haven't expired
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (activeErr && activeErr.code !== 'PGRST116') {
        console.warn('[useSubscription] Active subscription query error:', activeErr);
      }

      console.log('[useSubscription] Active subscription found:', activeSubscription);

      // Also check for expired subscriptions to potentially mark them
      const { data: expiredSubscriptions, error: expiredErr } = await supabase
        .from('test_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .in('subscription_type', ['premium', 'premium_monthly'])
        .lt('end_date', now) // Get expired subscriptions
        .order('created_at', { ascending: false });

      if (expiredErr && expiredErr.code !== 'PGRST116') {
        console.warn('[useSubscription] Expired subscription query error:', expiredErr);
      }

      // Mark expired subscriptions as expired
      if (expiredSubscriptions && expiredSubscriptions.length > 0) {
        console.log('[useSubscription] Found expired subscriptions, marking as expired:', expiredSubscriptions.length);
        const expiredIds = expiredSubscriptions.map(sub => sub.id);
        
        const { error: updateError } = await supabase
          .from('test_subscriptions')
          .update({ status: 'expired' })
          .in('id', expiredIds);

        if (updateError) {
          console.error('[useSubscription] Error updating expired subscriptions:', updateError);
        } else {
          console.log('[useSubscription] Successfully marked subscriptions as expired');
        }
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
        console.warn('[useSubscription] Free test query error:', freeErr);
      }

      const hasValidSubscription = !!activeSubscription;
      
      console.log('[useSubscription] Subscription status determined:', {
        hasValidSubscription,
        hasFreeTestUsed: !!freeTestSubscription,
        subscriptionType: activeSubscription?.subscription_type || 'none',
        endDate: activeSubscription?.end_date
      });

      setSubscriptionStatus({
        hasActiveSubscription: hasValidSubscription,
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
          status: 'active',
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
    const { hasActiveSubscription } = subscriptionStatus;
    
    if (hasActiveSubscription) {
      return { canTakeTest: true, isFreeTrial: false };
    }
    
    // Allow unlimited free tests for now (development mode)
    return { canTakeTest: true, isFreeTrial: true };
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