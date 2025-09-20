import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = userData.user.id

    switch (req.method) {
      case 'GET':
        // Get user profile with role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            email,
            full_name,
            avatar_url,
            batch_id,
            created_at,
            updated_at,
            user_roles(role)
          `)
          .eq('id', userId)
          .single()

        if (profileError) {
          return new Response(
            JSON.stringify({ error: profileError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get batch info if user has batch_id
        let batchInfo = null
        if (profile.batch_id) {
          const { data: batch } = await supabase
            .from('batches')
            .select('id, name, level')
            .eq('id', profile.batch_id)
            .single()
          batchInfo = batch
        }

        return new Response(
          JSON.stringify({ 
            profile: {
              ...profile,
              role: profile.user_roles?.role || 'student',
              batch: batchInfo
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'PUT':
        // Update user profile
        const updateData = await req.json()
        const allowedFields = ['full_name', 'avatar_url']
        
        const profileUpdates = Object.keys(updateData)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updateData[key]
            return obj
          }, {} as any)

        if (Object.keys(profileUpdates).length === 0) {
          return new Response(
            JSON.stringify({ error: 'No valid fields to update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            ...profileUpdates,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select(`
            id,
            email,
            full_name,
            avatar_url,
            batch_id,
            created_at,
            updated_at,
            user_roles(role)
          `)
          .single()

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ 
            message: 'Profile updated successfully',
            profile: {
              ...updatedProfile,
              role: updatedProfile.user_roles?.role || 'student'
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Profile management error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})