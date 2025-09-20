import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { testId } = await req.json()

    // Get test with questions
    const { data: test, error } = await supabase
      .from('tests')
      .select(`
        *,
        questions (*)
      `)
      .eq('id', testId)
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Test not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate HTML for PDF
    const htmlContent = generateTestHTML(test)

    // For now, return HTML content that can be converted to PDF on client side
    // In production, you might want to use a PDF generation service
    return new Response(
      JSON.stringify({ 
        success: true, 
        htmlContent,
        test: {
          title: test.title,
          subject: test.subject,
          duration_minutes: test.duration_minutes,
          total_marks: test.questions.reduce((sum: number, q: any) => sum + q.marks, 0)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('PDF export error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateTestHTML(test: any) {
  const questions = test.questions || []
  const totalMarks = questions.reduce((sum: number, q: any) => sum + q.marks, 0)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${test.title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .test-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .question { margin-bottom: 25px; page-break-inside: avoid; }
        .question-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .question-number { font-weight: bold; }
        .marks { font-weight: bold; color: #666; }
        .options { margin-left: 20px; margin-top: 10px; }
        .option { margin-bottom: 8px; }
        .answer-space { border-bottom: 1px solid #ccc; height: 60px; margin-top: 15px; }
        .instructions { background: #f5f5f5; padding: 15px; margin-bottom: 30px; border-radius: 5px; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${test.title}</h1>
        <h3>${test.subject} ${test.class ? `- Class ${test.class}` : ''}</h3>
      </div>

      <div class="test-info">
        <div><strong>Duration:</strong> ${test.duration_minutes} minutes</div>
        <div><strong>Total Marks:</strong> ${totalMarks}</div>
        <div><strong>Passing Marks:</strong> ${test.passing_marks}</div>
      </div>

      ${test.instructions ? `
        <div class="instructions">
          <h4>Instructions:</h4>
          <p>${test.instructions}</p>
        </div>
      ` : ''}

      <div class="questions">
        ${questions.map((question: any, index: number) => `
          <div class="question">
            <div class="question-header">
              <span class="question-number">Q${index + 1}.</span>
              <span class="marks">[${question.marks} marks]</span>
            </div>
            
            ${question.image_url ? `
              <div style="margin-bottom: 10px;">
                <img src="${question.image_url}" alt="Question image" style="max-width: 400px; height: auto;">
              </div>
            ` : ''}
            
            <p><strong>${question.question_text}</strong></p>
            
            ${question.question_type === 'mcq' && question.options ? `
              <div class="options">
                ${JSON.parse(question.options).map((option: any, optIndex: number) => `
                  <div class="option">
                    ${option.image_url ? `
                      <img src="${option.image_url}" alt="Option image" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px; vertical-align: middle;">
                    ` : ''}
                    (${String.fromCharCode(65 + optIndex)}) ${option.text}
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="answer-space"></div>
            `}
            
            ${question.explanation ? `
              <div style="margin-top: 15px; font-size: 12px; color: #666;">
                <strong>Note:</strong> ${question.explanation}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
        --- End of Test ---
      </div>
    </body>
    </html>
  `
}