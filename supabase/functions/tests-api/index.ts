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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    )

    // Handle both URL path and JSON body methods
    const url = new URL(req.url)
    let requestData = {}
    
    if (req.method === 'POST') {
      requestData = await req.json()
    }

    const testId = url.pathname.split('/')[1] !== 'tests-api' ? url.pathname.split('/')[1] : (requestData as any)?.testId
    const action = (requestData as any)?.action || url.pathname.split('/')[2]

    console.log('Tests API called with:', { method: req.method, testId, action, requestData })

    switch (req.method) {
      case 'GET':
        if (testId && testId !== 'tests-api') {
          // Get single test with questions
          const { data: test, error } = await supabase
            .from('tests')
            .select(`
              *,
              questions (*),
              courses (title)
            `)
            .eq('id', testId)
            .single()

          if (error) {
            console.error('Error fetching test:', error)
            return new Response(
              JSON.stringify({ error: 'Test not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ test }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Get all tests with student filtering
          const authHeader = req.headers.get('Authorization') ?? ''
          const token = authHeader.startsWith('Bearer ')
            ? authHeader.replace('Bearer ', '')
            : authHeader

          const { data: userData } = await supabase.auth.getUser(token)
          const user = userData?.user
          
          let query = supabase
            .from('tests')
            .select(`
              *,
              courses (title, subject)
            `)
          
          // If user is logged in, filter tests by their class and board if they are a student
          if (user) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('student_class, education_board')
              .eq('id', user.id)
              .maybeSingle()
            
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .maybeSingle()
            
            // Only filter for students with class and board set
            if (roleData?.role === 'student' && profileData?.student_class && profileData?.education_board) {
              query = query
                .eq('target_class', profileData.student_class)
                .eq('target_board', profileData.education_board)
            }
          }
          
          const { data: tests, error } = await query
            .eq('is_published', true)
            .order('created_at', { ascending: false })

          if (error) {
            console.error('Error fetching tests:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Use service role to count questions for each test (bypasses RLS)
          const serviceSupabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          )

          const testsWithCounts = await Promise.all(
            (tests || []).map(async (test) => {
              const { count } = await serviceSupabase
                .from('questions')
                .select('id', { count: 'exact' })
                .eq('test_id', test.id)

              return {
                ...test,
                question_count: count || 0
              }
            })
          )

          return new Response(
            JSON.stringify({ tests: testsWithCounts }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

          if (error) {
            console.error('Error fetching tests:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ tests }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'POST':
        // Authenticate user and determine role
        const authHeader = req.headers.get('Authorization') ?? ''
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.replace('Bearer ', '')
          : authHeader

        const { data: userData, error: userError } = await supabase.auth.getUser(token)
        const user = userData?.user

        if (userError || !user) {
          console.error('Auth error:', userError)
          return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()

        const isAdminTeacher = roleData?.role === 'admin' || roleData?.role === 'teacher'

        console.log('Authenticated user:', user.id, 'role:', roleData?.role, 'Action:', action)

        // Handle different actions
        switch (action) {
          case 'getTestWithQuestions':
            // Use service role for admins/teachers to bypass RLS safely after verifying role
            const clientToUse = isAdminTeacher
              ? createClient(
                  Deno.env.get('SUPABASE_URL') ?? '',
                  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )
              : supabase

            const { data: testWithQuestions, error: testError } = await clientToUse
              .from('tests')
              .select(`
                *,
                questions (*)
              `)
              .eq('id', testId)
              .single()

            if (testError) {
              console.error('Error fetching test with questions:', testError)
              return new Response(
                JSON.stringify({ error: 'Test not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            return new Response(
              JSON.stringify({ 
                success: true, 
                test: testWithQuestions, 
                questions: testWithQuestions.questions || [] 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

          case 'addQuestion':
            const { questionData } = requestData as any
            console.log('Adding question:', questionData)

            const { data: newQuestion, error: questionError } = await supabase
              .from('questions')
              .insert([{
                test_id: questionData.test_id,
                question_text: questionData.question_text,
                question_type: questionData.qtype === 'mcq' ? 'mcq' : 'subjective',
                options: questionData.options ? JSON.stringify(questionData.options) : null,
                correct_answer: questionData.correct_answer || (
                  questionData.options?.find((opt: any) => opt.isCorrect)?.text || null
                ),
                marks: questionData.marks,
                order_num: questionData.position,
                explanation: questionData.explanation,
                sample_answer: questionData.sample_answer,
                word_limit: questionData.word_limit,
                tags: questionData.tags || [],
                allow_multiple_correct: questionData.allow_multiple_correct || false,
                image_url: questionData.image_url,
                image_alt: questionData.image_alt
              }])
              .select()
              .single()

            if (questionError) {
              console.error('Error adding question:', questionError)
              return new Response(
                JSON.stringify({ error: questionError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            return new Response(
              JSON.stringify({ success: true, question: newQuestion }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

          case 'updateQuestion':
            const { questionId, updates } = requestData as any
            console.log('Updating question:', questionId, updates)

            const { data: updatedQuestion, error: updateError } = await supabase
              .from('questions')
              .update({
                question_text: updates.question_text,
                question_type: updates.qtype === 'mcq' ? 'mcq' : 'subjective',
                options: updates.options ? JSON.stringify(updates.options) : null,
                correct_answer: updates.correct_answer || (
                  updates.options?.find((opt: any) => opt.isCorrect)?.text || null
                ),
                marks: updates.marks,
                order_num: updates.position,
                explanation: updates.explanation,
                sample_answer: updates.sample_answer,
                word_limit: updates.word_limit,
                tags: updates.tags || [],
                allow_multiple_correct: updates.allow_multiple_correct || false,
                image_url: updates.image_url,
                image_alt: updates.image_alt
              })
              .eq('id', questionId)
              .select()
              .single()

            if (updateError) {
              console.error('Error updating question:', updateError)
              return new Response(
                JSON.stringify({ error: updateError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            return new Response(
              JSON.stringify({ success: true, question: updatedQuestion }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

          case 'deleteQuestion':
            const { questionId: deleteId } = requestData as any
            console.log('Deleting question:', deleteId)

            const { error: deleteError } = await supabase
              .from('questions')
              .delete()
              .eq('id', deleteId)

            if (deleteError) {
              console.error('Error deleting question:', deleteError)
              return new Response(
                JSON.stringify({ error: deleteError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            return new Response(
              JSON.stringify({ success: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

          case 'updateTest':
            const { updates: testUpdates } = requestData as any
            console.log('Updating test:', testId, testUpdates)

            const { data: updatedTest, error: updateTestError } = await supabase
              .from('tests')
              .update(testUpdates)
              .eq('id', testId)
              .select()
              .single()

            if (updateTestError) {
              console.error('Error updating test:', updateTestError)
              return new Response(
                JSON.stringify({ error: updateTestError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            return new Response(
              JSON.stringify({ success: true, test: updatedTest }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

          case 'attempt':
            // Submit test attempt
            const { answers } = requestData as any
            
            // Get test questions
            const { data: test } = await supabase
              .from('tests')
              .select('*, questions (*)')
              .eq('id', testId)
              .single()

            if (!test) {
              return new Response(
                JSON.stringify({ error: 'Test not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            // Calculate score
            let score = 0
            let total_marks = 0
            const results = []

            for (const question of test.questions) {
              total_marks += question.marks
              const userAnswer = answers[question.id]
              const isCorrect = userAnswer === question.correct_answer
              
              if (isCorrect) {
                score += question.marks
              }

              results.push({
                question_id: question.id,
                user_answer: userAnswer,
                is_correct: isCorrect,
                marks_obtained: isCorrect ? question.marks : 0
              })
            }

            // Save attempt
            const { data: attempt, error: attemptError } = await supabase
              .from('test_attempts')
              .insert({
                student_id: user.id,
                test_id: testId,
                score,
                total_marks,
                percentage: Math.round((score / total_marks) * 100),
                started_at: new Date().toISOString(),
                submitted_at: new Date().toISOString(),
                status: 'submitted'
              })
              .select()
              .single()

            if (attemptError) {
              console.error('Error saving attempt:', attemptError)
              return new Response(
                JSON.stringify({ error: attemptError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            return new Response(
              JSON.stringify({ 
                attempt,
                score,
                total_marks,
                percentage: Math.round((score / total_marks) * 100)
              }),
              { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

          default:
            // Create new test (fallback for non-action requests)
            const body = requestData as any
            const { data: newTest, error: createError } = await supabase
              .from('tests')
              .insert([{
                ...body,
                created_by: user.id
              }])
              .select()
              .single()

            if (createError) {
              console.error('Error creating test:', createError)
              return new Response(
                JSON.stringify({ error: createError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            return new Response(
              JSON.stringify({ test: newTest }),
              { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Tests API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})