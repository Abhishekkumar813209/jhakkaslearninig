import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Trophy, BookOpen, Clock, Users, Tag, Users2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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
  
  // State for discount codes
  const [friendReferralCode, setFriendReferralCode] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [friendDiscount, setFriendDiscount] = useState(0);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [validatingFriend, setValidatingFriend] = useState(false);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Fetch pricing config
  const { data: pricingConfig } = useQuery({
    queryKey: ['pricing-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      return data;
    }
  });

  // Fetch referral config
  const { data: referralConfig } = useQuery({
    queryKey: ['referral-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('referral_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      return data;
    }
  });

  // Fetch available credits
  const { data: credits } = useQuery({
    queryKey: ['referral-credits', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('referral_credits')
        .select('available_credits')
        .eq('student_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id
  });

  const availableCredits = credits?.available_credits || 0;
  const basePrice = pricingConfig?.base_price || 399;
  const displayPrice = pricingConfig?.display_price || 299;
  const platformDiscount = basePrice - displayPrice;

  // Validate friend referral code
  const validateFriendCode = async () => {
    if (!friendReferralCode.trim()) {
      setFriendDiscount(0);
      return;
    }

    setValidatingFriend(true);
    try {
      const normalizedCode = friendReferralCode.toUpperCase().trim();
      
      // Get auth session for headers
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      // Use razorpay-subscription function with validate-referral action
      const { data, error } = await supabase.functions.invoke('razorpay-subscription', {
        body: { 
          action: 'validate-referral',
          code: normalizedCode
        },
        headers
      });

      if (error) {
        console.error('Referral validation error:', error);
        toast({
          title: "Validation Error",
          description: "Failed to validate referral code. Please try again.",
          variant: "destructive"
        });
        setFriendDiscount(0);
        return;
      }

      if (!data.valid) {
        if (data.reason === 'self_code') {
          toast({
            title: "Cannot Use Own Code",
            description: "You cannot use your own referral code.",
            variant: "destructive"
          });
        } else if (data.reason === 'not_found') {
          toast({
            title: "Invalid Referral Code",
            description: "The friend referral code you entered is not valid.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Validation Failed",
            description: "Failed to validate referral code. Please try again.",
            variant: "destructive"
          });
        }
        setFriendDiscount(0);
        return;
      }

      // Code is valid
      setFriendDiscount(data.discount);
      toast({
        title: "Referral Code Applied!",
        description: `You get ₹${data.discount} OFF!`,
      });
    } catch (error) {
      console.error('Friend code validation error:', error);
      toast({
        title: "Validation Error",
        description: "Failed to validate referral code. Please try again.",
        variant: "destructive"
      });
      setFriendDiscount(0);
    } finally {
      setValidatingFriend(false);
    }
  };

  // Validate promo code
  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoDiscount(0);
      return;
    }

    setValidatingPromo(true);
    try {
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !promo) {
        toast({
          title: "Invalid Promo Code",
          description: "The promo code you entered is not valid or has expired.",
          variant: "destructive"
        });
        setPromoDiscount(0);
        return;
      }

      // Check expiry
      if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        toast({
          title: "Promo Code Expired",
          description: "This promo code has expired.",
          variant: "destructive"
        });
        setPromoDiscount(0);
        return;
      }

      // Check max uses
      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        toast({
          title: "Promo Code Limit Reached",
          description: "This promo code has reached its usage limit.",
          variant: "destructive"
        });
        setPromoDiscount(0);
        return;
      }

      const discount = promo.discount_value;
      setPromoDiscount(discount);
      toast({
        title: "Promo Code Applied!",
        description: `You get ₹${discount} OFF!`,
      });
    } catch (error) {
      console.error('Promo code validation error:', error);
      setPromoDiscount(0);
    } finally {
      setValidatingPromo(false);
    }
  };

  const creditsToUse = Math.min(availableCredits, displayPrice - friendDiscount - promoDiscount);
  const finalPrice = Math.max(0, displayPrice - friendDiscount - promoDiscount - creditsToUse);
  const totalDiscount = friendDiscount + promoDiscount + creditsToUse;

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
      // Validate session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue with payment",
          variant: "destructive"
        });
        return;
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast({
          title: "Error",
          description: "Failed to load payment gateway",
          variant: "destructive"
        });
        return;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();

      // Create Razorpay order with discount codes
      console.log('[SubscriptionCard] Creating order with discounts...');
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { data, error } = await supabase.functions.invoke('razorpay-subscription', {
        body: { 
          action: 'create-order',
          friendReferralCode: friendReferralCode.trim() || null,
          promoCode: promoCode.trim() || null
        },
        headers
      });

      console.log('[SubscriptionCard] create-order result:', { data, error });

      if (error) {
        throw new Error(error.message || 'Edge function create-order failed');
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Jhakkas Learning',
        description: 'Monthly Premium Subscription',
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
                instruments: [{ method: 'netbanking' }]
              },
              other: {
                name: 'Other Payment Modes',
                instruments: [
                  { method: 'upi' },
                  { method: 'card' },
                  { method: 'wallet' }
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

            console.log('[SubscriptionCard] verify-payment result:', { verifyData, verifyError });

            if (verifyError) {
              throw new Error(`Payment verification failed: ${verifyError.message || 'Unknown error'}`);
            }

            const invoiceNote = verifyData?.invoiceEmailSent 
              ? "Invoice has been sent to your email." 
              : "Invoice will be sent shortly.";

            toast({
              title: "Premium Access Activated! 🎉",
              description: `Welcome to premium! ${invoiceNote}`,
            });

            onSubscriptionSuccess();
          } catch (error: any) {
            console.error('[SubscriptionCard] Payment verification failed:', error);
            toast({
              title: "Payment Verification Failed",
              description: `Error: ${error.message}. Please contact support if amount was deducted.`,
              variant: "destructive"
            });
          }
        },
        modal: {
          ondismiss: () => {
            console.log('[SubscriptionCard] Payment cancelled');
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
          <div className="text-right">
            <p className="text-sm text-muted-foreground line-through">₹{basePrice}</p>
            {totalDiscount > 0 ? (
              <>
                <Badge variant="secondary" className="text-primary font-semibold text-lg">
                  ₹{finalPrice}
                </Badge>
                <p className="text-xs text-green-600 mt-1 font-semibold">
                  ₹{totalDiscount} total savings!
                </p>
              </>
            ) : (
              <Badge variant="secondary" className="text-primary font-semibold">
                ₹{displayPrice}/month
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Discount Code Inputs */}
        <div className="space-y-3 p-4 bg-muted rounded-lg border">
          <div className="space-y-2">
            <Label htmlFor="friendCode" className="flex items-center gap-2 text-sm">
              <Users2 className="h-4 w-4" />
              Friend's Referral Code (Optional)
            </Label>
            <div className="flex gap-2">
              <Input
                id="friendCode"
                placeholder="JOHN-A3F9B2"
                value={friendReferralCode}
                onChange={(e) => setFriendReferralCode(e.target.value.toUpperCase())}
                onBlur={validateFriendCode}
                className="uppercase"
              />
              {validatingFriend && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {friendDiscount > 0 && (
              <p className="text-xs text-green-600">✓ ₹{friendDiscount} discount applied</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="promoCode" className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4" />
              Promo Code (Optional)
            </Label>
            <div className="flex gap-2">
              <Input
                id="promoCode"
                placeholder="DIWALI50"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                onBlur={validatePromoCode}
                className="uppercase"
              />
              {validatingPromo && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {promoDiscount > 0 && (
              <p className="text-xs text-green-600">✓ ₹{promoDiscount} discount applied</p>
            )}
          </div>

          {availableCredits > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Wallet Credits: <span className="font-semibold text-foreground">₹{availableCredits}</span>
                {creditsToUse > 0 && (
                  <span className="text-green-600 ml-1">(₹{creditsToUse} will be used)</span>
                )}
              </p>
            </div>
          )}

          {totalDiscount > 0 && (
            <div className="pt-2 border-t space-y-1">
              <p className="text-xs font-semibold">Discount Breakdown:</p>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Platform Offer:</span>
                  <span className="text-green-600">-₹{platformDiscount}</span>
                </div>
                {friendDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>Friend Referral:</span>
                    <span className="text-green-600">-₹{friendDiscount}</span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>Promo Code:</span>
                    <span className="text-green-600">-₹{promoDiscount}</span>
                  </div>
                )}
                {creditsToUse > 0 && (
                  <div className="flex justify-between">
                    <span>Wallet Credits:</span>
                    <span className="text-green-600">-₹{creditsToUse}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>You Pay:</span>
                  <span className="text-primary">₹{finalPrice}</span>
                </div>
              </div>
            </div>
          )}
        </div>

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
              <strong>Try Free:</strong> Take one free test before subscribing!
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
          {finalPrice === 0 ? 'Get Free Access' : `Pay ₹${finalPrice}`}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionCard;
