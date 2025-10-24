import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, fileName, examType, subject } = await req.json();
    
    if (!pdfText) {
      throw new Error('PDF text is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    console.log('Extracting topics from PDF:', fileName);

    const systemPrompt = `You are an expert educational content analyzer specialized in Indian curriculum (NCERT, CBSE, ICSE, State Boards, JEE, NEET, etc.).

Your task is to analyze the PDF content and extract a structured chapter-topic hierarchy that will be used to create gamified lessons for students.

**CRITICAL OUTPUT FORMAT - RETURN VALID JSON ONLY:**

{
  "chapters": [
    {
      "chapter_name": "Chapter name",
      "chapter_number": 1,
      "topics": [
        {
          "topic_name": "Topic name",
          "page_references": "Pages 10-15",
          "suggested_days": 2,
          "difficulty": "medium",
          "importance_score": 8,
          "can_skip": false,
          "exam_relevance": "High - appears in 80% of exams",
          "animation_type": "graph_animation",
          "game_suggestions": ["match_pairs", "fill_blanks", "typing_race"],
          "key_concepts": ["concept1", "concept2"]
        }
      ]
    }
  ],
  "metadata": {
    "total_chapters": 10,
    "total_topics": 45,
    "exam_type": "JEE Mains",
    "subject": "Mathematics",
    "class": "11"
  }
}

**Guidelines:**
- Extract ALL chapters and topics from the PDF
- For difficulty: use "easy", "medium", "hard"
- For animation_type: use "graph_animation", "physics_motion", "chemistry_molecule", "algorithm_viz", "none"
- For importance_score: 1-10 scale based on exam relevance
- For can_skip: true only if topic is rarely asked in exams
- For game_suggestions: suggest 2-3 game types that would work best for this topic
- Ensure page_references are accurate
- suggested_days should be realistic (1-5 days per topic)`;

    const userContent = `Analyze this PDF content and extract chapter-topic structure:

**File Name:** ${fileName}
**Exam Type:** ${examType || 'General'}
**Subject:** ${subject || 'Not specified'}

**PDF Content:**
${pdfText.substring(0, 15000)} ${pdfText.length > 15000 ? '... (truncated)' : ''}

Extract the complete chapter-topic hierarchy following the JSON format specified.`;

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: userContent }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Gemini API Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('AI Response:', aiContent.substring(0, 200));

    let extractedData;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('AI Content:', aiContent);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!extractedData.chapters || !Array.isArray(extractedData.chapters)) {
      throw new Error('Invalid response format: chapters array missing');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        fileName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-pdf-topic-extractor:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});