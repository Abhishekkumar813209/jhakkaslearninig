import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, language, videoTitle } = await req.json();

    if (!transcript || !language) {
      return new Response(
        JSON.stringify({ error: 'Transcript and language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    console.log(`Generating ${language} summary for: ${videoTitle}`);

    const languageInstructions = {
      hinglish: `
        Create summaries in Hinglish (mixed Hindi-English):
        - Use conversational mixing of Hindi and English
        - Example: "Yeh video bahut important hai for students"
        - Keep technical terms in English
        - Use simple, relatable language
      `,
      hindi: `
        Create summaries in Easy Hindi:
        - Use simple, clear Hindi
        - Avoid complex Sanskrit words
        - Use common everyday Hindi words
        - Technical terms can be in English with Hindi explanation
      `,
      english: `
        Create summaries in Simple English:
        - Use clear, simple English
        - Avoid jargon
        - Explain complex terms
        - Keep sentences short and direct
      `,
    };

    const systemPrompt = `You are an expert educational content creator specializing in making YouTube educational content accessible to Indian students.

${languageInstructions[language as keyof typeof languageInstructions]}

Your task is to create 4 types of summaries:
1. SHORT: 2-3 sentence overview
2. DETAILED: Comprehensive paragraph-format summary
3. KEYPOINTS: 5-8 bullet points of main concepts
4. TIMESTAMPED: Break content into 4-6 time-coded sections

Video Title: ${videoTitle}

Respond ONLY with valid JSON in this exact format:
{
  "short": "short summary text",
  "detailed": "detailed paragraph summary",
  "keypoints": ["point 1", "point 2", ...],
  "timestamped": [
    {"time": "0:00", "content": "intro section"},
    {"time": "2:30", "content": "main concept 1"},
    ...
  ]
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: `Transcript:\n\n${transcript.substring(0, 8000)}` }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON from AI response
    let summary;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = summaryText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       summaryText.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw response:', summaryText);
      
      // Fallback summary
      summary = {
        short: summaryText.substring(0, 200),
        detailed: summaryText,
        keypoints: ['Summary generation in progress', 'Please review the detailed text'],
        timestamped: [{ time: '0:00', content: summaryText }],
      };
    }

    console.log('Summary generated successfully in', language);

    return new Response(
      JSON.stringify({ summary }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Summary generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate summary' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});