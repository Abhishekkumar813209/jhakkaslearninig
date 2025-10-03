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
    const formData = await req.formData();
    const pdfFile = formData.get('file') as File;
    const examType = formData.get('exam_type') as string;

    if (!pdfFile) {
      throw new Error('PDF file is required');
    }

    console.log('Extracting syllabus from PDF:', pdfFile.name);

    // Convert PDF to text (using a simple extraction for now)
    const pdfBuffer = await pdfFile.arrayBuffer();
    const pdfText = new TextDecoder().decode(pdfBuffer);

    // Use AI to parse structure
    const systemPrompt = `You are an expert at extracting educational syllabus information from documents.

Extract the following from the provided syllabus text:
1. All subjects mentioned
2. All chapters under each subject
3. Suggested days for each chapter (estimate 3-5 days if not specified)

Output MUST be valid JSON with this exact structure:
{
  "subjects": ["Subject1", "Subject2"],
  "chapters_by_subject": {
    "Subject1": [
      {
        "chapter_name": "Chapter Name",
        "suggested_days": 3
      }
    ],
    "Subject2": [...]
  }
}`;

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
          { role: 'user', content: `Extract syllabus structure from this ${examType} syllabus:\n\n${pdfText.substring(0, 10000)}` }
        ],
        temperature: 0.3,
        max_tokens: 3000
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage limit reached. Please add credits to your Lovable workspace.' }), {
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
      throw new Error('Failed to extract syllabus structure from PDF');
    }

    const extractedData = JSON.parse(aiData.choices[0].message.content);

    console.log('Extracted:', {
      subjects: extractedData.subjects.length,
      total_chapters: Object.values(extractedData.chapters_by_subject).reduce(
        (sum: number, chapters: any) => sum + chapters.length, 0
      )
    });

    return new Response(
      JSON.stringify(extractedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-syllabus-structure:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
