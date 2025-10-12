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

    const { email, password, full_name, role = 'student', student_class, education_board, exam_domain, exam_name, target_exam, referral_code, phone_number } = await req.json()

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and full_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for immediate login
      user_metadata: { full_name, role }
    })

    if (authError) {
      console.error('❌ User creation failed:', authError.message)
      const status = authError.message.includes('already been registered') ? 409 : 400
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User created successfully:', authData.user.id)

    // Sign in immediately to get session tokens
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError || !signInData.session) {
      console.error('❌ Auto-login failed:', signInError?.message)
      // User created but auto-login failed - return success and ask them to login
      return new Response(
        JSON.stringify({ 
          message: 'User registered successfully. Please login with your credentials.',
          user: {
            id: authData.user.id,
            email: authData.user.email,
            full_name
          },
          requiresLogin: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Session generated successfully')

    // Profile is automatically created via trigger
    // Set role using UPSERT to override default 'student' role from trigger
    console.log(`🔐 Attempting role assignment: ${role} for user ${authData.user.id} (${email})`);
    
    const { error: roleError } = await supabase.from('user_roles').upsert({
      user_id: authData.user.id,
      role: role as any
    }, { onConflict: 'user_id' })

    if (roleError) {
      console.error('❌ Failed to assign role:', roleError.message, '| User:', authData.user.id, '| Email:', email, '| Role:', role)
    } else {
      console.log(`✅ Role assigned successfully: ${role} for ${email}`)
    }

    // Auto-assign to batch if exam domain and name are provided
    let assignedBatchId = null;
    if (exam_domain && exam_name) {
      const { data: batchId, error: batchError } = await supabase.rpc('get_active_intake_batch', {
        p_exam_domain: exam_domain,
        p_exam_name: exam_name,
        p_student_class: student_class || 'general',
        p_signup_date: new Date().toISOString().split('T')[0]
      });

      if (batchError) {
        console.error('❌ Failed to find batch:', batchError.message)
      } else if (batchId) {
        assignedBatchId = batchId;
        console.log(`✅ Auto-assigned student to batch ${batchId}`);
      } else {
        console.log('ℹ️ No matching batch found for auto-assignment')
      }
    }

    // Update profile with class, board, exam info, phone number and batch assignment
    const profileUpdates: any = {
      updated_at: new Date().toISOString()
    };
    
    // Only save phone number for parents, not students
    if (phone_number && role === 'parent') profileUpdates.phone_number = phone_number;
    if (student_class) profileUpdates.student_class = student_class;
    if (education_board) profileUpdates.education_board = education_board;
    if (exam_domain) profileUpdates.exam_domain = exam_domain;
    if (target_exam) profileUpdates.target_exam = target_exam;
    if (assignedBatchId) profileUpdates.batch_id = assignedBatchId;

    const { error: profileError } = await supabase.from('profiles').update(profileUpdates).eq('id', authData.user.id);
    
    if (profileError) {
      console.error('❌ Failed to update profile:', profileError.message)
    } else {
      console.log('✅ Profile updated successfully')
    }

    // Handle referral code if provided
    if (referral_code) {
      const { data: referrer } = await supabase
        .from('referrals')
        .select('referrer_id, referral_code')
        .eq('referral_code', referral_code)
        .maybeSingle();

      if (referrer) {
        // Create referral record
        const { error: referralError } = await supabase.from('referrals').insert({
          referrer_id: referrer.referrer_id,
          referred_id: authData.user.id,
          referral_code: referral_code,
          referred_email: email,
          referred_name: full_name,
          status: 'joined',
          joined_at: new Date().toISOString()
        });

        if (referralError) {
          console.error('❌ Failed to create referral record:', referralError.message)
        } else {
          console.log(`✅ Referral recorded: ${referrer.referrer_id} → ${authData.user.id}`)
        }

        // Award +10 XP to referrer
        await supabase.functions.invoke('xp-coin-reward-system', {
          body: {
            student_id: referrer.referrer_id,
            action: 'referral_signup',
            metadata: {
              referred_user: authData.user.id,
              referred_email: email
            }
          }
        });
      } else {
        console.log('ℹ️ Invalid referral code provided')
      }
    }

    // If batch has auto-assign roadmap, assign it to student
    if (assignedBatchId) {
      const { data: batch } = await supabase
        .from('batches')
        .select('linked_roadmap_id, auto_assign_roadmap')
        .eq('id', assignedBatchId)
        .maybeSingle();

      if (batch?.auto_assign_roadmap && batch.linked_roadmap_id) {
        const { error: roadmapError } = await supabase.from('student_roadmaps').insert({
          student_id: authData.user.id,
          batch_roadmap_id: batch.linked_roadmap_id
        });
        
        if (roadmapError) {
          console.error('❌ Failed to assign roadmap:', roadmapError.message)
        } else {
          console.log(`✅ Auto-assigned roadmap ${batch.linked_roadmap_id}`)
        }
      }
    }

    console.log('✅ Registration completed successfully for:', email)
    
    return new Response(
      JSON.stringify({ 
        message: 'User registered successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name
        },
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Registration error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})