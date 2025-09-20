import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { testId } = await req.json();

    console.log('Generating printable test for:', testId);

    // Get test details with questions
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError) throw testError;

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('position');

    if (questionsError) throw questionsError;

    // Generate HTML content for the printable test
    const htmlContent = generateTestHTML(test, questions);

    // For now, we'll return a success message
    // In a real implementation, you would use a PDF generation library
    // like puppeteer or similar to convert HTML to PDF
    
    const fileName = `test_${test.title.replace(/\s+/g, '_')}_${Date.now()}.html`;
    
    // Store the HTML file in Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('test-files')
      .upload(fileName, new Blob([htmlContent], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('test-files')
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({ 
      success: true,
      fileUrl: urlData.publicUrl,
      fileName: fileName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating printable test:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateTestHTML(test: any, questions: any[]): string {
  const mcqQuestions = questions.filter(q => q.qtype === 'mcq');
  const subjectiveQuestions = questions.filter(q => q.qtype === 'subjective');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${test.title}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            margin: 40px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .test-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .test-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
        }
        .instructions {
            background: #e8f4fd;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            border-left: 4px solid #2196F3;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin: 30px 0 20px 0;
            padding: 10px;
            background: #333;
            color: white;
            text-align: center;
        }
        .question {
            margin-bottom: 25px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .question-number {
            font-weight: bold;
            margin-bottom: 10px;
        }
        .question-text {
            margin-bottom: 15px;
            font-size: 16px;
        }
        .options {
            margin-left: 20px;
        }
        .option {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
        }
        .option-letter {
            font-weight: bold;
            margin-right: 10px;
            min-width: 20px;
        }
        .answer-space {
            border-bottom: 1px solid #333;
            min-height: 60px;
            margin: 10px 0;
            page-break-inside: avoid;
        }
        .marks {
            text-align: right;
            font-weight: bold;
            color: #666;
            margin-top: 10px;
        }
        .page-break {
            page-break-before: always;
        }
        @media print {
            body { margin: 20px; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="test-title">${test.title}</div>
        <div style="font-size: 16px; color: #666;">
            ${test.subject} • ${test.class}
        </div>
    </div>

    <div class="test-info">
        <div><strong>Duration:</strong> ${test.duration_minutes} minutes</div>
        <div><strong>Total Marks:</strong> ${test.total_marks}</div>
        <div><strong>Passing Marks:</strong> ${test.passing_marks}%</div>
    </div>

    <div class="instructions">
        <h3>Instructions:</h3>
        <ul>
            <li>Read all questions carefully before attempting.</li>
            <li>All questions are compulsory.</li>
            <li>Write your answers clearly and legibly.</li>
            <li>Time management is crucial.</li>
            ${test.instructions ? `<li>${test.instructions}</li>` : ''}
        </ul>
    </div>

    ${mcqQuestions.length > 0 ? `
    <div class="section-title">Section A: Multiple Choice Questions</div>
    <p><strong>Instructions:</strong> Choose the correct answer and mark it clearly.</p>
    
    ${mcqQuestions.map((question, index) => {
      const options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
      return `
        <div class="question">
            <div class="question-number">Q${index + 1}.</div>
            <div class="question-text">${question.question_text}</div>
            <div class="options">
                ${options?.map((option: any, optIndex: number) => `
                    <div class="option">
                        <span class="option-letter">${String.fromCharCode(65 + optIndex)})</span>
                        <span>${option.text}</span>
                    </div>
                `).join('') || ''}
            </div>
            <div class="marks">[${question.marks} mark${question.marks > 1 ? 's' : ''}]</div>
        </div>
      `;
    }).join('')}
    ` : ''}

    ${subjectiveQuestions.length > 0 ? `
    <div class="section-title page-break">Section B: Subjective Questions</div>
    <p><strong>Instructions:</strong> Answer the following questions in detail. Use the space provided.</p>
    
    ${subjectiveQuestions.map((question, index) => `
        <div class="question">
            <div class="question-number">Q${mcqQuestions.length + index + 1}.</div>
            <div class="question-text">${question.question_text}</div>
            ${question.word_limit ? `<p><em>Word Limit: ${question.word_limit} words</em></p>` : ''}
            <div class="answer-space" style="min-height: ${Math.max(100, question.marks * 30)}px;"></div>
            <div class="marks">[${question.marks} mark${question.marks > 1 ? 's' : ''}]</div>
        </div>
    `).join('')}
    ` : ''}

    <div style="margin-top: 50px; text-align: center; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
        <p>End of Test</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
  `;
}