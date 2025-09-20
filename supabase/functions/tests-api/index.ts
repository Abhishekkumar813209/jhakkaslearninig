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

    const url = new URL(req.url)
    const testId = url.pathname.split('/')[1]
    const action = url.pathname.split('/')[2]

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
          // Get all tests
          const { data: tests, error } = await supabase
            .from('tests')
            .select(`
              *,
              courses (title, subject)
            `)
            .order('created_at', { ascending: false })

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
        // Get current user to check authentication
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('Auth error:', userError)
          return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (action === 'attempt') {
          // Submit test attempt
          const { answers } = await req.json()
          
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
        } else {
          // Create new test
          const body = await req.json()
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