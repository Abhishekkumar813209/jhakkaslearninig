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

    const { phone, otp, reset_id } = await req.json()

    if (!phone || !otp || !reset_id) {
      return new Response(
        JSON.stringify({ error: 'Phone, OTP, and reset_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the reset record
    const { data: resetRecord, error: findError } = await supabase
      .from('parent_password_resets')
      .select('*')
      .eq('reset_id', reset_id)
      .eq('phone', phone)
      .eq('used', false)
      .single()

    if (findError || !resetRecord) {
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: 'Invalid or expired reset request' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(resetRecord.expires_at)
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: 'OTP has expired. Please request a new one.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify OTP
    if (resetRecord.otp !== otp) {
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: 'Incorrect OTP' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('parent_password_resets')
      .update({ verified: true })
      .eq('reset_id', reset_id)

    if (updateError) {
      console.error('Error updating verification status:', updateError)
      throw new Error('Failed to verify OTP')
    }

    return new Response(
      JSON.stringify({ 
        verified: true,
        message: 'OTP verified successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Verify OTP error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
