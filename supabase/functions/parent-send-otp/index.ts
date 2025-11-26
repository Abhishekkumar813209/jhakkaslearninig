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

    const { phone, action } = await req.json()

    if (!phone || phone.length !== 10) {
      return new Response(
        JSON.stringify({ error: 'Valid 10-digit phone number is required' }),
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

    console.log(`OTP generated for phone ${phone.substring(0, 3)}***: ${otp}`)
    
    // TODO: In production, send OTP via SMS service (Twilio, MSG91, etc.)
    // For now, we'll just log it (and it will appear in edge function logs)

    return new Response(
      JSON.stringify({ 
        message: 'OTP sent successfully',
        reset_id: data.reset_id,
        // DEVELOPMENT ONLY: Remove this in production
        otp_dev: otp
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send OTP error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
