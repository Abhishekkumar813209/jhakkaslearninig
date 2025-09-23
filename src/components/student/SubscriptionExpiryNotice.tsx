import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

const SubscriptionExpiryNotice: React.FC = () => {
  const { hasActiveSubscription } = useSubscription();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);

  useEffect(() => {
    // Check subscription expiry status
    const checkExpiry = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: subscriptions } = await supabase
          .from('test_subscriptions')
          .select('*')
          .eq('student_id', user.id)
          .eq('status', 'active')
          .in('subscription_type', ['premium', 'premium_monthly'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (subscriptions && subscriptions.length > 0) {
          const subscription = subscriptions[0];
          if (subscription.end_date) {
            const endDate = new Date(subscription.end_date);
            const today = new Date();
            const timeDiff = endDate.getTime() - today.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            setDaysLeft(daysDiff);
            
            // Show expired notice if subscription has expired
            if (daysDiff <= 0) {
              setShowExpiredNotice(true);
            }
          }
        }
      } catch (error) {
        console.error('Error checking subscription expiry:', error);
      }
    };

    if (hasActiveSubscription) {
      checkExpiry();
    }
  }, [hasActiveSubscription]);

  // Don't show anything if user doesn't have active subscription
  if (!hasActiveSubscription) return null;

  // Show expired notice
  if (showExpiredNotice || (daysLeft !== null && daysLeft <= 0)) {
    return (
      <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20 mb-6">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <div className="flex items-center justify-between">
            <div>
              <strong>Premium Access Expired!</strong>
              <p className="text-sm mt-1">Your monthly access has expired. Renew now to continue enjoying unlimited tests and learning paths.</p>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              className="ml-4"
              onClick={() => {
                // Scroll to subscription card
                const subscriptionCard = document.querySelector('[data-subscription-card]') as HTMLElement;
                if (subscriptionCard) {
                  subscriptionCard.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Renew Now
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show expiry warning (5 days or less)
  if (daysLeft !== null && daysLeft <= 5 && daysLeft > 0) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 mb-6">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <strong>Premium Access Expiring Soon!</strong>
              <p className="text-sm mt-1">
                Your premium access expires in {daysLeft} day{daysLeft === 1 ? '' : 's'}. 
                Renew now to avoid interruption.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="ml-4 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              onClick={() => {
                // Scroll to subscription card
                const subscriptionCard = document.querySelector('[data-subscription-card]') as HTMLElement;
                if (subscriptionCard) {
                  subscriptionCard.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <Zap className="h-3 w-3 mr-1" />
              Renew Early
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default SubscriptionExpiryNotice;