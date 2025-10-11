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
    const { subject, exam_type, exam_name, input_mode, chapters_text, syllabus_image } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let contentToProcess = '';

    // If image/file mode, extract text using Vision API first
    if (input_mode === 'file' && syllabus_image) {
      console.log('Processing file with Vision API...');
      
      const visionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract ALL chapter names and topics from this ${subject} syllabus document/image. Return ONLY the chapter names in a clear list format. Be thorough and extract every chapter mentioned.`
                },
                {
                  type: 'image_url',
                  image_url: { url: syllabus_image }
                }
              ]
            }
          ],
          max_tokens: 2000
        }),
      });

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error('Vision API error:', visionResponse.status, errorText);
        throw new Error(`Vision API failed: ${visionResponse.status}`);
      }
      
      const visionData = await visionResponse.json();
      contentToProcess = visionData.choices?.[0]?.message?.content || '';
      console.log('Extracted text from file:', contentToProcess.substring(0, 200));
    } else {
      contentToProcess = chapters_text || '';
    }

    if (!contentToProcess.trim()) {
      throw new Error('No content to process');
    }

    // Now extract structured chapter data
    const systemPrompt = `You are a chapter extraction expert. Given text containing chapter names for ${subject} (${exam_type} - ${exam_name}), extract a structured list.

RULES:
1. Extract ONLY chapter names, remove all numbering, bullets, prefixes
2. Clean up the chapter names (proper capitalization, remove extra spaces)
3. Suggest realistic days based on typical chapter complexity (2-5 days)
4. Return VALID JSON ONLY: { "chapters": [{ "chapter_name": "Clean Chapter Name", "suggested_days": 3 }] }
5. NO markdown, NO code blocks, NO explanations - ONLY raw JSON object
6. If you see topics/subtopics, extract only the main chapter names
7. Remove any chapter numbers, bullets, or formatting symbols`;

    const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract chapters from this text:\n\n${contentToProcess}` }
        ],
        max_tokens: 3000
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error('Extraction API error:', extractionResponse.status, errorText);
      throw new Error(`Chapter extraction failed: ${extractionResponse.status}`);
    }

    const extractionData = await extractionResponse.json();
    const rawResponse = extractionData.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', rawResponse);

    // Try to parse JSON - handle markdown code blocks
    let parsed;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = rawResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Try to find JSON object
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', rawResponse);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
      throw new Error('Invalid response format: missing chapters array');
    }

    console.log(`Successfully extracted ${parsed.chapters.length} chapters`);

    return new Response(
      JSON.stringify({ success: true, chapters: parsed.chapters }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in extract-chapters-bulk:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
