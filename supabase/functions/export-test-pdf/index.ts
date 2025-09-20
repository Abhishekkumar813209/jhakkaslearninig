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

  // Split questions into two columns for better space utilization
  const midPoint = Math.ceil(questions.length / 2)
  const leftQuestions = questions.slice(0, midPoint)
  const rightQuestions = questions.slice(midPoint)

  const generateQuestionHTML = (question: any, index: number) => `
    <div class="question">
      <div class="question-header">
        <span class="question-line">Q${index + 1}. ${question.question_text}</span>
        <span class="marks">[${question.marks} marks]</span>
      </div>
      
      ${question.image_url ? `
        <div class="question-image">
          <img src="${question.image_url}" alt="Question image">
        </div>
      ` : ''}
      
      ${question.question_type === 'mcq' && question.options ? `
        <div class="options">
          ${JSON.parse(question.options).map((option: any, optIndex: number) => `
            <div class="option">
              ${option.image_url ? `
                <img src="${option.image_url}" alt="Option image" class="option-image">
              ` : ''}
              <span class="option-text">(${String.fromCharCode(65 + optIndex)}) ${option.text}</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="answer-space"></div>
      `}
      
      ${question.explanation ? `
        <div class="explanation">
          <strong>Note:</strong> ${question.explanation}
        </div>
      ` : ''}
    </div>
  `

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${test.title}</title>
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: 'Times New Roman', serif; 
          margin: 20mm 15mm; 
          line-height: 1.3; 
          font-size: 10.5pt;
          color: #000;
          width: 210mm;
          min-height: 297mm;
        }
        
        .header { 
          text-align: center; 
          border-bottom: 2px solid #000; 
          padding-bottom: 15px; 
          margin-bottom: 20px; 
        }
        
        .header h1 { 
          margin: 0 0 5px 0; 
          font-size: 18pt; 
          font-weight: bold; 
        }
        
        .header h3 { 
          margin: 0; 
          font-size: 12pt; 
          font-weight: normal; 
        }
        
        .test-info { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 20px; 
          padding: 10px 0;
          border-bottom: 1px solid #ccc;
          font-size: 10pt;
        }
        
        .instructions { 
          background: #f8f8f8; 
          padding: 12px; 
          margin-bottom: 20px; 
          border: 1px solid #ddd;
          font-size: 10pt;
        }
        
        .content-container {
          display: flex;
          gap: 0;
          min-height: 600px;
        }
        
        .column {
          flex: 1;
          padding: 0 8px;
        }
        
        .column-separator {
          width: 1px;
          background-color: #000;
          margin: 0 10px;
        }
        
        .question { 
          margin-bottom: 15px; 
          page-break-inside: avoid; 
        }
        
        .question-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start;
          margin-bottom: 6px; 
        }
        
        .question-line { 
          font-weight: bold; 
          font-size: 11pt;
          flex: 1;
          margin-right: 10px;
        }
        
        .marks { 
          font-weight: bold; 
          color: #666; 
          font-size: 9pt;
        }
        
        .question-image {
          margin: 8px 0;
          text-align: center;
        }
        
        .question-image img {
          max-width: 100%;
          max-height: 120px;
          border: 1px solid #ddd;
        }
        
        
        .options { 
          margin-left: 15px; 
          margin-top: 6px; 
        }
        
        .option { 
          margin-bottom: 4px; 
          display: flex;
          align-items: center;
          font-size: 10pt;
        }
        
        .option-image {
          width: 30px;
          height: 30px;
          object-fit: cover;
          margin-right: 8px;
          border: 1px solid #ddd;
        }
        
        .option-text {
          flex: 1;
        }
        
        .answer-space { 
          border-bottom: 1px solid #000; 
          height: 40px; 
          margin-top: 10px; 
        }
        
        .explanation {
          margin-top: 8px; 
          font-size: 9pt; 
          color: #666;
          font-style: italic;
        }
        
        .footer {
          margin-top: 30px; 
          text-align: center; 
          font-size: 10pt; 
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
        
        @media print { 
          body { 
            margin: 15mm; 
            width: auto;
            min-height: auto;
          }
          .content-container { min-height: auto; }
          .question { page-break-inside: avoid; }
        }
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
        <div><strong>Passing Marks:</strong> ${test.passing_marks || 'N/A'}</div>
      </div>

      ${test.instructions ? `
        <div class="instructions">
          <h4 style="margin: 0 0 8px 0;">Instructions:</h4>
          <p style="margin: 0;">${test.instructions}</p>
        </div>
      ` : ''}

      <div class="content-container">
        <div class="column">
          ${leftQuestions.map((question: any, index: number) => 
            generateQuestionHTML(question, index)
          ).join('')}
        </div>
        
        <div class="column-separator"></div>
        
        <div class="column">
          ${rightQuestions.map((question: any, index: number) => 
            generateQuestionHTML(question, index + midPoint)
          ).join('')}
        </div>
      </div>

      <div class="footer">
        --- End of Test ---
      </div>
    </body>
    </html>
  `
}