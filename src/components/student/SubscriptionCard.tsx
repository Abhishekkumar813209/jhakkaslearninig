import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Trophy, BookOpen, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface SubscriptionCardProps {
  hasActiveSubscription: boolean;
  hasFreeTestUsed: boolean;
  onSubscriptionSuccess: () => void;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  hasActiveSubscription,
  hasFreeTestUsed,
  onSubscriptionSuccess
}) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscription = async () => {
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast({
          title: "Error",
          description: "Failed to load payment gateway",
          variant: "destructive"
        });
        return;
      }

      // Fetch user profile for phone number
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();

      // Create Razorpay order
      console.log('[SubscriptionCard] Creating order...');
      const { data, error } = await supabase.functions.invoke('razorpay-subscription', {
        body: { action: 'create-order' }
      });

      console.log('[SubscriptionCard] create-order result:', { data, error });

      if (error) {
        throw new Error(error.message || 'Edge function create-order failed');
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'EduTech Learning Platform',
        description: 'Monthly Test Series + Learning Paths Access',
        order_id: data.orderId,
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          emi: false
        },
        config: {
          display: {
            blocks: {
              banks: {
                name: 'Pay using Net Banking',
                instruments: [
                  {
                    method: 'netbanking'
                  }
                ]
              },
              other: {
                name: 'Other Payment Modes',
                instruments: [
                  {
                    method: 'upi'
                  },
                  {
                    method: 'card'
                  },
                  {
                    method: 'wallet'
                  }
                ]
              }
            },
            sequence: ['block.other', 'block.banks'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        handler: async (response: any) => {
          try {
            console.log('[SubscriptionCard] Payment success, verifying:', response);
            // Verify one-time payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-subscription', {
              body: {
                action: 'verify-payment',
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature
              }
            });

            console.log('[SubscriptionCard] verify-payment result:', { verifyData, verifyError });

            if (verifyError) {
              throw new Error(`Payment verification failed: ${verifyError.message || 'Unknown error'}`);
            }

            toast({
              title: "Premium Access Activated! 🎉",
              description: "Welcome to premium! You now have 30 days of unlimited access to tests and learning paths.",
            });

            onSubscriptionSuccess();
          } catch (error: any) {
            console.error('[SubscriptionCard] Payment verification failed:', error);
            toast({
              title: "Payment Verification Failed",
              description: `Error: ${error.message || 'Unknown error'}. Please contact support if amount was deducted.`,
              variant: "destructive"
            });
          }
        },
        modal: {
          ondismiss: () => {
            console.log('[SubscriptionCard] Payment cancelled by user');
            toast({
              title: "Payment Cancelled",
              description: "You can try again anytime.",
            });
          },
          confirm_close: true,
          escape: true
        },
        prefill: {
          name: profile?.full_name || user?.user_metadata?.full_name || 'Student',
          email: profile?.email || user?.email || ''
        },
        theme: {
          color: '#3B82F6',
          backdrop_color: 'rgba(0, 0, 0, 0.6)'
        },
        retry: {
          enabled: true,
          max_count: 3
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error: any) {
      console.error('[SubscriptionCard] Subscription error:', error);
      
      let errorMessage = "Please try again later.";
      if (error.message) {
        errorMessage = error.message.includes('Edge Function returned a non-2xx status code')
          ? "Payment service temporarily unavailable. Please try again."
          : error.message;
      }
      
      toast({
        title: "Subscription Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  if (hasActiveSubscription) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-primary">Premium Active</CardTitle>
          </div>
          <CardDescription>
            You have unlimited access to tests and learning paths
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Unlimited weekly tests</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Complete learning roadmaps</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Detailed analytics & rankings</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">YouTube playlist integration</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-dashed border-primary/20" data-subscription-card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Premium Subscription
            </CardTitle>
            <CardDescription>
              Get unlimited tests + complete learning roadmaps
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-primary font-semibold">
            ₹299/month
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Weekly Tests</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Learning Paths</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Rankings</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Analytics</span>
            </div>
          </div>
        </div>

        {!hasFreeTestUsed && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Try Free:</strong> Take one free test to see your performance analysis before subscribing!
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            ✓ UPI, Cards, Net Banking supported
          </p>
          <p className="text-xs text-muted-foreground">
            ✓ Cancel anytime, no hidden charges
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubscription}
          className="w-full"
          size="lg"
        >
          Buy Monthly Access ₹299
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionCard;