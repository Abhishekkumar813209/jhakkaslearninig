import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AI Provider helper functions
async function callLovableAI(systemPrompt: string, userPrompt: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMIT: Lovable AI rate limit exceeded');
    }
    if (response.status === 402) {
      throw new Error('PAYMENT_REQUIRED: Lovable AI credits exhausted');
    }
    const errorText = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function callGeminiAI(systemPrompt: string, userPrompt: string) {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }, { text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const AI_PROVIDER = Deno.env.get('AI_PROVIDER') || 'lovable';
  
  console.log(`Primary AI Provider: ${AI_PROVIDER}`);
  
  try {
    if (AI_PROVIDER === 'lovable') {
      console.log('Using Lovable AI (google/gemini-2.5-flash)...');
      const data = await callLovableAI(systemPrompt, userPrompt);
      const aiText = data.choices?.[0]?.message?.content || '';
      console.log('✅ Lovable AI succeeded');
      return aiText;
    } else {
      console.log('Using Gemini API directly...');
      const data = await callGeminiAI(systemPrompt, userPrompt);
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✅ Gemini API succeeded');
      return aiText;
    }
  } catch (primaryError: any) {
    console.error(`${AI_PROVIDER} failed:`, primaryError.message);
    console.log('Attempting fallback...');
    
    const fallbackProvider = AI_PROVIDER === 'lovable' ? 'gemini' : 'lovable';
    
    try {
      if (fallbackProvider === 'lovable') {
        const data = await callLovableAI(systemPrompt, userPrompt);
        const aiText = data.choices?.[0]?.message?.content || '';
        console.log('✅ Fallback to Lovable AI succeeded');
        return aiText;
      } else {
        const data = await callGeminiAI(systemPrompt, userPrompt);
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('✅ Fallback to Gemini succeeded');
        return aiText;
      }
    } catch (fallbackError: any) {
      console.error(`Fallback ${fallbackProvider} also failed:`, fallbackError.message);
      throw new Error(`Both AI providers failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapter_library_id, force_regenerate = false } = await req.json();

    if (!chapter_library_id) {
      return new Response(
        JSON.stringify({ error: 'chapter_library_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch chapter details
    const { data: chapter, error: fetchError } = await supabase
      .from('chapter_library')
      .select('*')
      .eq('id', chapter_library_id)
      .single();

    if (fetchError) throw fetchError;
    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // Check if full_topics already populated
    if (!force_regenerate && chapter.full_topics && Array.isArray(chapter.full_topics) && chapter.full_topics.length > 0) {
      return new Response(
        JSON.stringify({
          message: 'Full topics already exist (use force_regenerate=true to regenerate)',
          topics: chapter.full_topics
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Generate comprehensive topic list using Gemini
    const systemPrompt = `You are an expert educational content architect for Indian ${chapter.exam_type} preparation.

Generate a COMPREHENSIVE list of 10-15 topics for the chapter "${chapter.chapter_name}" in ${chapter.subject}.

Requirements:
1. Cover ALL major concepts in this chapter
2. Topics should be granular enough for question assignment
3. Use standard terminology from ${chapter.exam_type} syllabus
4. Include both theoretical and application-based topics
5. Order topics from foundational to advanced

For each topic, provide:
- topic_name: Clear, concise topic name
- difficulty: easy/medium/hard (based on complexity and exam pattern)

Return ONLY valid JSON array:
[
  {
    "topic_name": "Introduction and Basic Concepts",
    "difficulty": "easy"
  },
  {
    "topic_name": "Advanced Applications",
    "difficulty": "hard"
  }
]

Generate 10-15 comprehensive topics covering the entire chapter.`;

    // Generate using Lovable AI with Gemini fallback
    const aiText = await callAI(systemPrompt, '');

    if (!aiText) {
      throw new Error('AI returned empty response');
    }
    
    // Clean and parse JSON
    const cleanText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const topics = JSON.parse(cleanText);

    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error('Invalid topics generated by AI');
    }

    // Update chapter_library with full_topics
    const { error: updateError } = await supabase
      .from('chapter_library')
      .update({
        full_topics: topics,
        topics_generated: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', chapter_library_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        message: 'Full topics generated successfully',
        chapter_name: chapter.chapter_name,
        topics,
        count: topics.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
