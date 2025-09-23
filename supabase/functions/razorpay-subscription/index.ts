import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!;
    
    // Verify and get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (userError || !user) {
      console.error('User verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const requestBody = await req.json();
    const { action, orderId, paymentId, signature, subscriptionId } = requestBody;

    if (action === 'create-order') {
      // Create Razorpay subscription for monthly billing
      const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      
      if (!razorpayKeyId || !razorpayKeySecret) {
        throw new Error('Razorpay credentials not configured');
      }

      console.log('[razorpay-subscription] Creating monthly subscription for user:', user.id);

      // Create Razorpay plan first
      const planResponse = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period: 'monthly',
          interval: 1,
          item: {
            name: 'Test Series + Learning Paths Monthly',
            amount: 29900, // ₹299 in paise
            currency: 'INR'
          },
          notes: {
            description: 'Monthly subscription for test series and learning paths'
          }
        }),
      });

      const plan = await planResponse.json();
      
      if (!planResponse.ok) {
        console.error('[razorpay-subscription] Plan creation failed:', plan);
        throw new Error(`Razorpay plan creation failed: ${plan.error?.description || 'Unknown error'}`);
      }

      console.log('[razorpay-subscription] Plan created:', plan.id);

      // Now create subscription
      const subscriptionResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: plan.id,
          customer_notify: 1,
          quantity: 1,
          total_count: 12, // 12 monthly payments (1 year)
          notes: {
            student_id: user.id,
            subscription_type: 'premium_monthly',
            includes_roadmap: 'true'
          }
        }),
      });

      const subscription = await subscriptionResponse.json();
      
      if (!subscriptionResponse.ok) {
        console.error('[razorpay-subscription] Subscription creation failed:', subscription);
        throw new Error(`Razorpay subscription creation failed: ${subscription.error?.description || 'Unknown error'}`);
      }

      console.log('[razorpay-subscription] Monthly subscription created:', subscription.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          subscriptionId: subscription.id,
          amount: 29900,
          currency: 'INR',
          keyId: razorpayKeyId,
          subscription: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'verify-payment') {
      // Verify subscription payment signature
      const crypto = await import('node:crypto');
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      
      console.log('[razorpay-subscription] Verifying payment:', { subscriptionId, paymentId });
      
      // For subscription payments, verify using payment_id + subscription_id
      const body = paymentId + "|" + subscriptionId;
      const expectedSignature = crypto.createHmac('sha256', razorpayKeySecret!)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('[razorpay-subscription] Signature verification failed');
        return new Response(
          JSON.stringify({ error: 'Payment verification failed' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('[razorpay-subscription] Payment verified successfully');

      // Create subscription record for monthly billing
      const { error: subscriptionError } = await supabaseClient
        .from('test_subscriptions')
        .insert({
          student_id: user.id,
          subscription_type: 'premium_monthly',
          status: 'active',
          amount: 299,
          payment_id: paymentId,
          razorpay_subscription_id: subscriptionId,
          payment_method: 'razorpay',
          currency: 'INR',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          includes_roadmap: true,
          subscription_name: 'Monthly Test Series + Learning Paths'
        });

      if (subscriptionError) {
        console.error('[razorpay-subscription] Subscription creation failed:', subscriptionError);
        throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
      }

      console.log('[razorpay-subscription] Monthly subscription activated for user:', user.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Monthly subscription activated successfully',
          subscriptionType: 'premium_monthly'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Razorpay subscription error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'Failed to process subscription request'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});