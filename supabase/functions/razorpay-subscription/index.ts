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

    const { action, orderId, paymentId, signature } = await req.json();

    if (action === 'create-order') {
      // Create Razorpay order
      const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      
      if (!razorpayKeyId || !razorpayKeySecret) {
        throw new Error('Razorpay credentials not configured');
      }

      // Create a short receipt to satisfy Razorpay's 40-char limit
      const shortUser = user.id.slice(0, 8);
      const shortTs = Date.now().toString().slice(-8);
      const receipt = `sub_${shortUser}_${shortTs}`; // always < 40 chars
      console.log('[razorpay-subscription] Creating order for', user.id, 'receipt:', receipt);

      const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 29900, // ₹299 in paise
          currency: 'INR',
          receipt,
          notes: {
            student_id: user.id,
            subscription_type: 'premium',
            includes_roadmap: 'true',
            subscription_name: 'Test Series + Learning Paths'
          }
        }),
      });

      const order = await orderResponse.json();
      
      if (!orderResponse.ok) {
        throw new Error(`Razorpay order creation failed: ${order.error?.description || 'Unknown error'}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: razorpayKeyId
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'verify-payment') {
      // Verify payment signature
      const crypto = await import('node:crypto');
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      
      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto.createHmac('sha256', razorpayKeySecret!)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== signature) {
        return new Response(
          JSON.stringify({ error: 'Payment verification failed' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Create subscription record
      const { error: subscriptionError } = await supabaseClient
        .from('test_subscriptions')
        .insert({
          student_id: user.id,
          subscription_type: 'premium',
          status: 'active',
          amount: 299,
          payment_id: paymentId,
          payment_method: 'razorpay',
          currency: 'INR',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          includes_roadmap: true,
          subscription_name: 'Test Series + Learning Paths'
        });

      if (subscriptionError) {
        console.error('Subscription creation failed:', subscriptionError);
        throw new Error('Failed to create subscription');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment verified and subscription activated',
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