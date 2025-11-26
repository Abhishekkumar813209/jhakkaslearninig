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

    const { phone, new_password, reset_id } = await req.json()

    if (!phone || !new_password || !reset_id) {
      return new Response(
        JSON.stringify({ error: 'Phone, new password, and reset_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the reset is valid and verified
    const { data: resetRecord, error: findError } = await supabase
      .from('parent_password_resets')
      .select('*')
      .eq('reset_id', reset_id)
      .eq('phone', phone)
      .eq('verified', true)
      .eq('used', false)
      .single()

    if (findError || !resetRecord) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid reset request. Please verify OTP first.' 
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
          error: 'Reset request has expired. Please start over.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find parent by phone
    const parentEmail = `${phone}@parent.app`
    
    // Get parent's auth user ID
    const { data: authUser } = await supabase.auth.admin.listUsers()
    const parent = authUser.users.find(u => u.email === parentEmail)

    if (!parent) {
      return new Response(
        JSON.stringify({ 
          error: 'Parent account not found. Please sign up first.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      parent.id,
      { password: new_password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      throw new Error('Failed to update password')
    }

    // Mark reset as used
    await supabase
      .from('parent_password_resets')
      .update({ used: true })
      .eq('reset_id', reset_id)

    console.log(`Password reset successful for phone ${phone.substring(0, 3)}***`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password reset successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Reset password error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
