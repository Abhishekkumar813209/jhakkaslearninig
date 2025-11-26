import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { phone } = await req.json()

    if (!phone || phone.length !== 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid 10-digit phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP with 10 minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('parent_password_resets')
      .insert({
        phone,
        otp,
        expires_at: expiresAt,
        verified: false,
        used: false
      })
      .select('reset_id')
      .single()

    if (error) {
      console.error('Error creating reset:', error)
      throw new Error('Failed to generate OTP')
    }

    // Get environment
    const env = Deno.env.get('NODE_ENV') || 'development'

    if (env === 'production') {
      // Production: Send real SMS via Twilio
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
      const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')

      if (!accountSid || !authToken || !fromNumber) {
        console.error('Twilio credentials not configured')
        throw new Error('SMS service not configured')
      }

      try {
        // Call Twilio API directly using fetch
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
        const auth = btoa(`${accountSid}:${authToken}`)

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: `+91${phone}`,
            From: fromNumber,
            Body: `Your Jhakkas Learning verification code is: ${otp}. Valid for 10 minutes.`,
          }),
        })

        if (!twilioResponse.ok) {
          const twilioError = await twilioResponse.text()
          console.error('Twilio API error:', twilioError)
          throw new Error('Failed to send SMS')
        }


        return new Response(
          JSON.stringify({
            success: true,
            message: 'OTP sent successfully',
            reset_id: data.reset_id,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (twilioError) {
        console.error('Twilio error:', twilioError)
        throw new Error('Failed to send SMS. Please try again.')
      }
    } else {
      // Development mode: Return OTP in response (no SMS)
      // Silent logging - OTP only in response for dev testing

      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP generated (dev mode)',
          reset_id: data.reset_id,
          otp_dev: otp, // Only in development
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Send OTP error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
