import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_content, subject, chapter, topic } = await req.json();

    if (!file_content) {
      throw new Error('File content is required');
    }

    console.log('Extracting questions from document, content length:', file_content.length);

    const systemPrompt = `You are an expert educational content analyzer specialized in extracting questions from documents.

EXTRACTION RULES:
1. Identify ALL questions in the document (look for Q1, 1., Question 1, etc.)
2. Auto-detect question type based on structure:
   - MCQ: Has options like a), b), c), d) or (A), (B), (C), (D)
   - Match Column: Contains "Match column I with II" or table format with two columns to match
   - Assertion-Reason: Has "Assertion (A):" and "Reason (R):" statements
   - Fill in the Blanks: Contains _____ or "fill in the blank"
   - True/False: Options are True/False or T/F
   - Short Answer: Paragraph/descriptive questions without specific options

3. Extract complete question text preserving formatting
4. For MCQ: extract all options (usually 4)
5. For Match Column: extract left column items and right column items as separate arrays
6. For Assertion-Reason: separate assertion text and reason text
7. For Fill Blanks: identify number of blanks and their positions
8. Preserve mathematical symbols, chemical formulas, and special formatting

9. Assign difficulty based on complexity:
   - easy: Direct recall, simple concepts
   - medium: Application, 2-step problems
   - hard: Analysis, multi-step problems, complex reasoning

10. Assign marks based on question type and difficulty:
    - MCQ easy: 1 mark
    - MCQ medium/hard: 2 marks
    - Match Column: 2-3 marks
    - Fill Blanks: 1 mark per blank
    - Short Answer: 2-5 marks

OUTPUT REQUIREMENTS:
Return a valid JSON object with this EXACT structure:
{
  "questions": [
    {
      "question_number": "1",
      "question_type": "mcq",
      "question_text": "Complete question text here",
      "options": ["a) First option", "b) Second option", "c) Third option", "d) Fourth option"],
      "marks": 1,
      "difficulty": "easy"
    },
    {
      "question_number": "3",
      "question_type": "match_column",
      "question_text": "Match column I with column II",
      "left_column": ["Item 1", "Item 2", "Item 3"],
      "right_column": ["Match A", "Match B", "Match C"],
      "marks": 3,
      "difficulty": "medium"
    },
    {
      "question_number": "17",
      "question_type": "assertion_reason",
      "question_text": "Assertion and Reason type question",
      "assertion": "Assertion (A): Complete assertion text",
      "reason": "Reason (R): Complete reason text",
      "marks": 1,
      "difficulty": "medium"
    },
    {
      "question_number": "22",
      "question_type": "fill_blank",
      "question_text": "The gravitational constant G has a value of _____ in SI units.",
      "blanks_count": 1,
      "marks": 1,
      "difficulty": "easy"
    },
    {
      "question_number": "25",
      "question_type": "true_false",
      "question_text": "The value of g is same at all places on earth.",
      "marks": 1,
      "difficulty": "easy"
    },
    {
      "question_number": "26",
      "question_type": "short_answer",
      "question_text": "Explain Newton's law of universal gravitation.",
      "marks": 3,
      "difficulty": "medium"
    }
  ],
  "total_found": 41
}

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations.`;

    const userPrompt = `Extract ALL questions from this ${subject || 'educational'} document${chapter ? ` (Chapter: ${chapter})` : ''}${topic ? ` (Topic: ${topic})` : ''}:

${file_content}

Remember to:
- Find ALL questions (don't miss any)
- Correctly identify each question type
- Extract complete text
- Preserve formatting and symbols
- Return valid JSON only`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 8000
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'AI usage limit reached. Please add credits to your Lovable workspace.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    if (!aiData.choices?.[0]?.message?.content) {
      console.error('Unexpected AI response structure:', aiData);
      throw new Error('Failed to extract questions from document');
    }

    let extractedContent = aiData.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (extractedContent.startsWith('```json')) {
      extractedContent = extractedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (extractedContent.startsWith('```')) {
      extractedContent = extractedContent.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const extractedData = JSON.parse(extractedContent);

    console.log('Extracted:', {
      total_questions: extractedData.total_found || extractedData.questions?.length || 0,
      types: extractedData.questions?.map((q: any) => q.question_type) || []
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_questions: extractedData.total_found || extractedData.questions?.length || 0,
        questions: extractedData.questions || [],
        metadata: {
          file_name: 'document',
          extraction_time: new Date().toISOString(),
          subject,
          chapter,
          topic
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-extract-all-questions:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
