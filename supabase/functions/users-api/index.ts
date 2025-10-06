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
    const url = new URL(req.url)
    const path = url.pathname
    
    // Get auth token
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create client with Authorization header for RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Resolve current user
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (req.method) {
      case 'GET':
        if (path.includes('/me')) {
          // Get current user profile
          const { data: profile, error } = await supabase
            .from('profiles')
            .select(`
              *,
              user_roles (role),
              batches (name, level)
            `)
            .eq('id', user?.id)
            .single()

          if (error) {
            return new Response(
              JSON.stringify({ error: 'Profile not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ 
              user: {
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                role: profile.user_roles?.role,
                batch: profile.batches
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else if (path.includes('/students')) {
          // Admin-only: list students with optional search (avoid PostgREST relationship to user_roles)
          const { data: roleRow, error: roleErr } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user?.id)
            .maybeSingle()

          if (roleErr || roleRow?.role !== 'admin') {
            return new Response(
              JSON.stringify({ error: 'Admin access required' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const service = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          )

          const search = url.searchParams.get('search')?.trim()
          console.log('🔍 [Edge Function] Received search parameter:', search || '(none)')

          // 1) Get IDs of users with 'student' role
          const { data: studentIdsRows, error: roleListErr } = await service
            .from('user_roles')
            .select('user_id')
            .eq('role', 'student')

          if (roleListErr) {
            console.log('❌ [Edge Function] Role fetch error:', roleListErr)
            return new Response(
              JSON.stringify({ error: `Role fetch error: ${roleListErr.message}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          console.log(`✅ [Edge Function] Found ${studentIdsRows?.length || 0} student roles`)

          const studentIds = (studentIdsRows || []).map((r: any) => r.user_id)
          if (studentIds.length === 0) {
            console.log('⚠️ [Edge Function] No students found in user_roles')
            return new Response(
              JSON.stringify({ students: [] }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // 2) Fetch profiles for those IDs (with batch, zone, and school info)
          let query = service
            .from('profiles')
            .select(`
              id,
              email,
              full_name,
              avatar_url,
              batch_id,
              zone_id,
              school_id,
              exam_domain,
              student_class,
              education_board,
              preparation_level,
              created_at,
              batches!profiles_batch_id_fkey (id, name, level),
              zones!fk_profiles_zone (name),
              schools!fk_profiles_school (name)
            `)
            .in('id', studentIds)
            .order('created_at', { ascending: false })

          if (search) {
            console.log(`🔎 [Edge Function] Applying search filter: full_name OR email ILIKE %${search}%`)
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
          }

          const { data: students, error } = await query

          if (error) {
            console.log('❌ [Edge Function] Profiles fetch error:', error)
            return new Response(
              JSON.stringify({ error: `Profiles fetch error: ${error.message}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          console.log(`✅ [Edge Function] Successfully fetched ${students?.length || 0} student profiles`)
          if (search && students && students.length > 0) {
            console.log('📋 [Edge Function] Sample matched student:', {
              email: students[0].email,
              full_name: students[0].full_name
            })
          }

          return new Response(
            JSON.stringify({ students }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break

      case 'PUT':
        if (path.includes('/profile')) {
          // Update profile (self)
          const body = await req.json()
          const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update(body)
            .eq('id', user?.id)
            .select()
            .single()

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ profile: updatedProfile }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else if (/\/students\/.+\/batch$/.test(path)) {
          // Assign a student to a batch (admin only)
          const { data: roleRow } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user?.id)
            .single()

          if (roleRow?.role !== 'admin') {
            return new Response(
              JSON.stringify({ error: 'Admin access required' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const segments = path.split('/').filter(Boolean)
          const targetUserId = segments[segments.length - 2]
          const body = await req.json().catch(() => ({}))
          const batchId = body.batch_id || body.batchId

          if (!batchId) {
            return new Response(
              JSON.stringify({ error: 'batch_id is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const service = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          )

          const { data: updated, error } = await service
            .from('profiles')
            .update({ batch_id: batchId })
            .eq('id', targetUserId)
            .select('*')
            .single()

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ profile: updated, success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // If we reach here, method not supported
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.log(error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})