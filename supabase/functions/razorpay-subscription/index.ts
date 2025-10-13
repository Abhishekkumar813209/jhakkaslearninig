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
    const { action, orderId, paymentId, signature, friendReferralCode, promoCode } = requestBody;

    // Handle referral code validation (workaround until validate-referral-code deploys)
    if (action === 'validate-referral') {
      const { code } = requestBody;
      
      console.log('[validate-referral] Validating code:', code);
      
      if (!code || typeof code !== 'string') {
        return new Response(
          JSON.stringify({ valid: false, reason: 'invalid_input' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      const normalizedCode = code.toUpperCase().trim();

      // Use service role client to bypass RLS
      // UNIQUE constraint on referral_code ensures max 1 row, use limit(1) for deterministic results
      const { data: referral } = await supabaseService
        .from('referrals')
        .select('referrer_id')
        .eq('referral_code', normalizedCode)
        .limit(1)
        .maybeSingle();

      if (!referral) {
        console.log('[validate-referral] Code not found');
        return new Response(
          JSON.stringify({ valid: false, reason: 'not_found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      if (referral.referrer_id === user.id) {
        console.log('[validate-referral] Self-referral detected');
        return new Response(
          JSON.stringify({ valid: false, reason: 'self_code' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Fetch referral config to get discount amount
      const { data: referralConfig } = await supabaseService
        .from('referral_config')
        .select('student_discount')
        .eq('is_active', true)
        .maybeSingle();

      const discount = referralConfig?.student_discount || 10;
      
      console.log(`[validate-referral] Valid code, discount: ₹${discount}`);

      return new Response(
        JSON.stringify({ valid: true, discount, code: normalizedCode }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'create-order') {
      const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      
      if (!razorpayKeyId || !razorpayKeySecret) {
        console.error('[razorpay-subscription] Missing credentials');
        throw new Error('Razorpay credentials not configured');
      }

      console.log('[razorpay-subscription] Creating order for user:', user.id);

      // Fetch active pricing config
      const { data: pricingConfig } = await supabaseService
        .from('pricing_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      const basePrice = pricingConfig?.base_price || 399;
      const displayPrice = pricingConfig?.display_price || 299;

      // Fetch active referral config
      const { data: referralConfig } = await supabaseService
        .from('referral_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      let friendDiscount = 0;
      let promoDiscount = 0;
      let referralData = null;

      // Validate friend referral code
      if (friendReferralCode) {
        const { data: referral } = await supabaseService
          .from('referrals')
          .select('*')
          .eq('referral_code', friendReferralCode.toUpperCase().trim())
          .maybeSingle();

        if (referral && referral.referrer_id !== user.id) {
          friendDiscount = referralConfig?.student_discount || 25;
          referralData = referral;
          console.log(`[Discount] Friend code ${friendReferralCode}: ₹${friendDiscount}`);
        }
      }

      // Validate promo code
      if (promoCode) {
        const { data: promo } = await supabaseService
          .from('promo_codes')
          .select('*')
          .eq('code', promoCode.toUpperCase().trim())
          .eq('is_active', true)
          .maybeSingle();

        if (promo) {
          const isExpired = promo.valid_until && new Date(promo.valid_until) < new Date();
          const isMaxedOut = promo.max_uses && promo.current_uses >= promo.max_uses;

          if (!isExpired && !isMaxedOut) {
            promoDiscount = promo.discount_value;
            console.log(`[Discount] Promo code ${promoCode}: ₹${promoDiscount}`);
          }
        }
      }

      // Fetch available credits
      const { data: credits } = await supabaseService
        .from('referral_credits')
        .select('available_credits')
        .eq('student_id', user.id)
        .maybeSingle();

      const availableCredits = credits?.available_credits || 0;
      const maxCreditsUsable = Math.max(0, displayPrice - friendDiscount - promoDiscount);
      const creditsToUse = Math.min(availableCredits, maxCreditsUsable);
      
      const finalAmount = Math.max(0, displayPrice - friendDiscount - promoDiscount - creditsToUse);
      const finalAmountPaise = Math.round(finalAmount * 100);

      console.log(`[Pricing] Base: ₹${basePrice}, Display: ₹${displayPrice}, Friend: -₹${friendDiscount}, Promo: -₹${promoDiscount}, Credits: -₹${creditsToUse}, Final: ₹${finalAmount}`);

      // Create Razorpay order with all discount details in notes
      const orderPayload = {
        amount: finalAmountPaise,
        currency: 'INR',
        receipt: `ord_${user.id.substring(0, 8)}_${Date.now().toString().substring(-8)}`.substring(0, 40),
        notes: {
          student_id: user.id,
          subscription_type: 'premium',
          validity_days: '30',
          base_price: basePrice.toString(),
          display_price: displayPrice.toString(),
          friend_discount: friendDiscount.toString(),
          promo_discount: promoDiscount.toString(),
          credits_used: creditsToUse.toString(),
          final_amount: finalAmount.toString(),
          friend_referral_code: friendReferralCode || '',
          promo_code: promoCode || '',
          referrer_id: referralData?.referrer_id || '',
          referrer_bonus: (referralConfig?.referrer_bonus || 25).toString()
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

      const order = await orderResponse.json();
      
      if (!orderResponse.ok) {
        console.error('[razorpay-subscription] Order creation failed:', order);
        throw new Error(`Razorpay order creation failed: ${order.error?.description || 'Unknown error'}`);
      }

      console.log('[razorpay-subscription] Order created successfully:', order.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: order.id,
          amount: finalAmountPaise,
          currency: 'INR',
          keyId: razorpayKeyId,
          friendDiscount,
          promoDiscount,
          creditsUsed: creditsToUse,
          finalAmount
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'verify-payment') {
      const crypto = await import('node:crypto');
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      
      console.log('[razorpay-subscription] Verifying payment:', { orderId, paymentId });
      
      // Verify signature
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

      // Fetch order to get all discount details from notes
      const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${Deno.env.get('RAZORPAY_KEY_ID')}:${razorpayKeySecret}`)}`
        }
      });
      const orderDetails = await orderResponse.json();
      const notes = orderDetails.notes || {};
      
      const creditsUsed = parseFloat(notes.credits_used || '0');
      const friendDiscount = parseFloat(notes.friend_discount || '0');
      const promoDiscount = parseFloat(notes.promo_discount || '0');
      const basePrice = parseFloat(notes.base_price || '399');
      const displayPrice = parseFloat(notes.display_price || '299');
      const finalAmount = parseFloat(notes.final_amount || '0');
      const friendReferralCode = notes.friend_referral_code || '';
      const promoCodeUsed = notes.promo_code || '';
      const referrerId = notes.referrer_id || '';
      const referrerBonus = parseFloat(notes.referrer_bonus || '25');

      // 1. Deduct used credits from wallet
      if (creditsUsed > 0) {
        const { error: creditsError } = await supabaseService.rpc('deduct_referral_credits', {
          p_student_id: user.id,
          p_amount: creditsUsed
        });

        if (creditsError) {
          console.error('[Credits] Deduction failed:', creditsError);
          throw new Error('Failed to deduct credits');
        }

        console.log(`[Credits] Deducted ₹${creditsUsed} from user ${user.id}'s wallet`);
      }

      // 2. Award referrer bonus if friend code was used
      if (referrerId && friendDiscount > 0) {
        const { error: bonusError } = await supabaseService.rpc('add_referrer_bonus', {
          p_referrer_id: referrerId,
          p_bonus: referrerBonus
        });

        if (bonusError) {
          console.error('[Referral] Bonus award failed:', bonusError);
        }

        // Create referral record linking referred student to referrer
        const { data: existingReferral } = await supabaseService
          .from('referrals')
          .select('id')
          .eq('referred_id', user.id)
          .eq('referrer_id', referrerId)
          .maybeSingle();

        if (existingReferral) {
          // Update existing referral to 'paid'
          await supabaseService
            .from('referrals')
            .update({
              status: 'paid',
              bonus_paid: referrerBonus,
              paid_at: new Date().toISOString()
            })
            .eq('id', existingReferral.id);
        } else {
          // Create new referral record
          await supabaseService
            .from('referrals')
            .insert({
              referrer_id: referrerId,
              referred_id: user.id,
              referral_code: friendReferralCode,
              status: 'paid',
              bonus_paid: referrerBonus,
              paid_at: new Date().toISOString()
            });
        }

        console.log(`[Referral] Awarded ₹${referrerBonus} to referrer ${referrerId}`);
      }

      // 3. Increment promo code usage if promo was used
      if (promoCodeUsed && promoDiscount > 0) {
        await supabaseService.rpc('increment_promo_usage', { 
          code: promoCodeUsed.toUpperCase() 
        });

        console.log(`[Promo] Incremented usage for code ${promoCodeUsed}`);
      }

      // 4. Log discount usage
      const discountLogs = [];
      
      if (friendDiscount > 0) {
        discountLogs.push({
          student_id: user.id,
          discount_type: 'friend_referral',
          discount_amount: friendDiscount,
          code_used: friendReferralCode
        });
      }

      if (promoDiscount > 0) {
        discountLogs.push({
          student_id: user.id,
          discount_type: 'promo_code',
          discount_amount: promoDiscount,
          code_used: promoCodeUsed
        });
      }

      if (creditsUsed > 0) {
        discountLogs.push({
          student_id: user.id,
          discount_type: 'referral_credit',
          discount_amount: creditsUsed,
          code_used: null
        });
      }

      if (discountLogs.length > 0) {
        await supabaseService
          .from('discount_usage_log')
          .insert(discountLogs);
      }

      // 5. Create subscription record with all discount details
      const subscriptionPayload = {
        student_id: user.id,
        subscription_type: 'premium',
        status: 'active',
        amount: finalAmount, // ✅ Store actual amount paid after discounts
        payment_id: paymentId,
        razorpay_order_id: orderId,
        payment_method: 'razorpay',
        currency: 'INR',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        includes_roadmap: true,
        subscription_name: 'Monthly Premium Subscription',
        base_price: basePrice,
        friend_discount_applied: friendDiscount,
        promo_discount_applied: promoDiscount,
        credits_discount_applied: creditsUsed,
        final_amount_paid: finalAmount,
        friend_referral_code: friendReferralCode || null,
        promo_code_used: promoCodeUsed || null
      };

      console.log('[Subscription] Creating with columns:', Object.keys(subscriptionPayload));
      
      const { data: subscriptionData, error: subscriptionError } = await supabaseService
        .from('test_subscriptions')
        .insert(subscriptionPayload)
        .select()
        .single();

      if (subscriptionError) {
        console.error('[razorpay-subscription] Subscription creation failed:', subscriptionError);
        throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
      }

      console.log('[razorpay-subscription] Subscription activated successfully for user:', user.id);

      // 5.1 Insert payment record with actual amount paid
      const { error: paymentError } = await supabaseService
        .from('payments')
        .insert({
          student_id: user.id,
          subscription_id: subscriptionData.id,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          amount: finalAmount, // ✅ Actual discounted amount user paid
          currency: 'INR',
          status: 'captured',
          payment_method: 'razorpay',
        });

      if (paymentError) {
        console.error('[Payment Record] Failed to insert:', paymentError);
        // Non-critical error, continue execution
      } else {
        console.log('[Payment Record] Created successfully with amount:', finalAmount);
      }

      // 6. Send invoice email
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const invoiceData = {
        studentName: profile?.full_name || 'Student',
        studentEmail: profile?.email || user.email,
        studentId: user.id,
        orderId: orderId,
        paymentId: paymentId,
        originalAmount: basePrice,
        basePrice: basePrice,
        displayPrice: displayPrice,
        friendDiscount: friendDiscount,
        promoDiscount: promoDiscount,
        creditsApplied: creditsUsed,
        finalAmount: finalAmount,
        currency: 'INR',
        paymentDate: new Date().toISOString(),
        validityDays: 30,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        planName: 'Monthly Premium Subscription',
        isTestMode: false,
        friendReferralCode: friendReferralCode || null,
        promoCode: promoCodeUsed || null
      };

      let invoiceEmailSent = false;
      try {
        console.log('[Invoice] Sending invoice to:', profile?.email);
        
        const invoiceResponse = await supabaseService.functions.invoke('send-payment-invoice', {
          body: invoiceData
        });
        
        if (invoiceResponse.error) {
          console.error('[Invoice] Failed:', JSON.stringify(invoiceResponse.error));
          await supabaseService.from('email_logs').insert({
            recipient: profile?.email || user.email,
            type: 'payment_invoice',
            status: 'failed',
            error_message: invoiceResponse.error.message || JSON.stringify(invoiceResponse.error),
            metadata: { orderId, paymentId, studentId: user.id }
          });
        } else {
          console.log('[Invoice] Sent successfully');
          invoiceEmailSent = true;
          await supabaseService.from('email_logs').insert({
            recipient: profile?.email || user.email,
            type: 'payment_invoice',
            status: 'sent',
            metadata: { orderId, paymentId, emailId: invoiceResponse.data?.emailId, studentId: user.id }
          });
        }
      } catch (invoiceError: any) {
        console.error('[Invoice] Exception:', invoiceError);
        await supabaseService.from('email_logs').insert({
          recipient: profile?.email || user.email,
          type: 'payment_invoice',
          status: 'error',
          error_message: invoiceError.message || 'Unknown error',
          metadata: { orderId, paymentId, studentId: user.id }
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Premium subscription activated',
          subscriptionType: 'premium',
          invoiceEmailSent: invoiceEmailSent,
          discountsSummary: {
            friendDiscount,
            promoDiscount,
            creditsUsed,
            totalSavings: friendDiscount + promoDiscount + creditsUsed,
            finalPaid: finalAmount
          }
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
