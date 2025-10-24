import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

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
    const { prompt, subject, class: className, difficulty, count = 5, type = 'mcq' } = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'mcq') {
      systemPrompt = `You are an expert educator creating multiple choice questions. Generate high-quality, academically sound questions that test understanding, not just memorization. Each question should have exactly 4 options with only one correct answer.

Return ONLY a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question_text": "Clear, well-formed question",
      "options": [
        {"text": "Option A text", "isCorrect": true},
        {"text": "Option B text", "isCorrect": false},
        {"text": "Option C text", "isCorrect": false},
        {"text": "Option D text", "isCorrect": false}
      ],
      "marks": 2,
      "explanation": "Brief explanation of why the correct answer is right"
    }
  ]
}`;

      userPrompt = `Generate ${count} multiple choice questions for:
- Subject: ${subject}
- Class/Level: ${className}
- Difficulty: ${difficulty}

Requirements:
- Questions should be appropriate for ${className} level
- Difficulty should be ${difficulty}
- Test conceptual understanding
- Include clear, unambiguous options
- Provide brief explanations
- Avoid trick questions
- Make distractors plausible but clearly wrong
- In the options array, only ONE option should have "isCorrect": true`;

    } else if (type === 'subjective') {
      systemPrompt = `You are an expert educator creating subjective questions that encourage critical thinking and detailed responses. Focus on questions that require analysis, synthesis, and evaluation.

Return ONLY a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question_text": "Thought-provoking question that requires detailed response",
      "marks": 5,
      "word_limit": 200,
      "sample_answer": "Comprehensive sample answer",
      "explanation": "What the question aims to test"
    }
  ]
}`;

      userPrompt = `Generate ${count} subjective questions for:
- Subject: ${subject}
- Class/Level: ${className}
- Difficulty: ${difficulty}

Requirements:
- Questions should require analytical thinking
- Appropriate for ${className} level
- Difficulty should be ${difficulty}
- Include word limits (100-300 words)
- Provide sample answers
- Test understanding, not rote learning`;
    }

    console.log('Generating questions with prompt:', userPrompt);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: userPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2000,
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded. Please try again in a moment.',
          details: 'Too many AI requests'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'AI usage limit reached. Please add credits to your workspace.',
          details: 'Payment required'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response:', data);

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse the JSON response
    let questions;
    try {
      const jsonResponse = JSON.parse(generatedText);
      questions = jsonResponse.questions;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', generatedText);
      throw new Error('Invalid AI response format');
    }

    if (!questions || !Array.isArray(questions)) {
      throw new Error('Invalid questions format from AI');
    }

    console.log('Generated questions:', questions);

    return new Response(JSON.stringify({ 
      success: true,
      questions: questions,
      count: questions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-question-generator function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: (error as Error).message || 'Unknown error',
      details: 'Failed to generate questions using AI'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});