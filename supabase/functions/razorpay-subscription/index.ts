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
    // Initialize Supabase clients
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

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
    const { action, orderId, paymentId, signature } = requestBody;

    if (action === 'create-order') {
      // Create one-time Razorpay order for monthly access
      const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      
      if (!razorpayKeyId || !razorpayKeySecret) {
        console.error('[razorpay-subscription] Missing credentials:', { 
          hasKeyId: !!razorpayKeyId, 
          hasKeySecret: !!razorpayKeySecret 
        });
        throw new Error('Razorpay credentials not configured');
      }

      console.log('[razorpay-subscription] Creating one-time order for monthly access, user:', user.id);

      // Create one-time order instead of subscription
      const orderPayload = {
        amount: 29900, // ₹299 in paise
        currency: 'INR',
        receipt: `ord_${user.id.substring(0, 8)}_${Date.now().toString().substring(-8)}`.substring(0, 40),
        notes: {
          student_id: user.id,
          subscription_type: 'premium',
          includes_roadmap: 'true',
          validity_days: '30'
        }
      };

      console.log('[razorpay-subscription] Order payload:', JSON.stringify(orderPayload, null, 2));

      const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      console.log('[razorpay-subscription] Order response status:', orderResponse.status);

      const order = await orderResponse.json();
      
      if (!orderResponse.ok) {
        console.error('[razorpay-subscription] Order creation failed:', {
          status: orderResponse.status,
          statusText: orderResponse.statusText,
          response: order,
        });
        throw new Error(`Razorpay order creation failed: ${order.error?.description || 'Unknown error'}`);
      }

      console.log('[razorpay-subscription] Order created successfully:', order.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: order.id,
          amount: 29900,
          currency: 'INR',
          keyId: razorpayKeyId,
          isOneTime: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'verify-payment') {
      // Verify one-time payment signature
      const crypto = await import('node:crypto');
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      
      console.log('[razorpay-subscription] Verifying payment:', { orderId, paymentId });
      
      // For one-time payments, verify using order_id + payment_id
      const body = orderId + "|" + paymentId;
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

      // Create subscription record for 30-day access using service role client
      const { error: subscriptionError } = await supabaseService
        .from('test_subscriptions')
        .insert({
          student_id: user.id,
          subscription_type: 'premium',
          status: 'active',
          amount: 299,
          payment_id: paymentId,
          razorpay_order_id: orderId,
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
          message: 'Monthly access activated successfully',
          subscriptionType: 'premium'
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
        error: (error as Error).message || 'Internal server error',
        details: 'Failed to process subscription request'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});