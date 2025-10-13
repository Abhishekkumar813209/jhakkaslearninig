import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Battery, BatteryLow, BatteryMedium, BatteryFull, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SubscriptionBatteryCardProps {
  userId: string;
}

export const SubscriptionBatteryCard: React.FC<SubscriptionBatteryCardProps> = ({ userId }) => {
  const [subscription, setSubscription] = useState<any>(null);
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscription();
  }, [userId]);

  const fetchSubscription = async () => {
    const { data } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('student_id', userId)
      .eq('status', 'active')
      .eq('subscription_type', 'premium')
      .single();

    if (data) {
      setSubscription(data);
      const endDate = new Date(data.end_date);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysLeft(Math.max(0, diffDays));
      
      // Calculate battery level (30 days = 100%)
      const level = Math.round((diffDays / 30) * 100);
      setBatteryLevel(Math.max(0, Math.min(100, level)));
    }
  };

  const getBatteryIcon = () => {
    if (batteryLevel >= 70) return <BatteryFull className="h-6 w-6 text-green-600" />;
    if (batteryLevel >= 30) return <BatteryMedium className="h-6 w-6 text-yellow-600" />;
    return <BatteryLow className="h-6 w-6 text-red-600" />;
  };

  const getBatteryColor = () => {
    if (batteryLevel >= 70) return 'bg-green-500';
    if (batteryLevel >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!subscription) return null;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getBatteryIcon()}
          Subscription Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Battery Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Active Premium</span>
            <span className="text-muted-foreground">{daysLeft} days left</span>
          </div>
          
          <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getBatteryColor()} transition-all duration-500`}
              style={{ width: `${batteryLevel}%` }}
            />
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Valid until: {new Date(subscription.end_date).toLocaleDateString('en-IN')}</span>
          </div>
        </div>

        {daysLeft <= 7 && (
          <Button 
            size="sm" 
            className="w-full" 
            variant={daysLeft === 0 ? "destructive" : "default"}
            onClick={() => navigate('/student')}
          >
            {daysLeft === 0 ? 'Renew Now' : 'Renew Subscription'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
