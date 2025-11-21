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
    const { exam_type, subject, class_level } = await req.json();

    if (!exam_type || !subject) {
      return new Response(
        JSON.stringify({ error: 'exam_type and subject are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if chapter library already exists for this combination
    // Build query with conditional class_level filter
    let query = supabase
      .from('chapter_library')
      .select('id, chapter_name, full_topics')
      .eq('exam_type', exam_type)
      .eq('subject', subject)
      .eq('is_active', true);

    // Add class_level filter only if provided (for school/board exams)
    if (class_level) {
      query = query.eq('class_level', class_level);
    }

    const { data: existing, error: checkError } = await query;

    if (checkError) throw checkError;

    // If library exists and has full_topics populated, return it
    if (existing && existing.length > 0) {
      const hasFullTopics = existing.every((ch: any) => 
        ch.full_topics && Array.isArray(ch.full_topics) && ch.full_topics.length > 0
      );
      
      if (hasFullTopics) {
        return new Response(
          JSON.stringify({
            message: 'Chapter library already exists with full topics',
            chapters: existing,
            status: 'exists'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Call Gemini to get comprehensive chapter list
    const systemPrompt = `You are an expert educational content architect for Indian education system.
Generate a comprehensive list of ALL chapters for ${subject} at ${class_level || 'standard'} level for ${exam_type}.

For each chapter, provide:
1. chapter_name - Standard chapter name
2. difficulty - easy/medium/hard
3. importance_score - 1-10 (exam relevance)
4. suggested_days - Number of days needed to cover
5. can_skip - boolean (whether chapter can be skipped for fast-track)
6. exam_relevance - Brief note on exam importance

Return ONLY valid JSON array, no markdown:
[
  {
    "chapter_name": "Chapter Name",
    "difficulty": "medium",
    "importance_score": 8,
    "suggested_days": 5,
    "can_skip": false,
    "exam_relevance": "High weightage, frequently asked"
  }
]`;

    // Generate using Lovable AI with Gemini fallback
    const aiText = await callAI(systemPrompt, '');

    if (!aiText) {
      throw new Error('AI returned empty response');
    }
    
    // Clean and parse JSON
    const cleanText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const chapters = JSON.parse(cleanText);

    // Insert chapters into chapter_library
    const insertPromises = chapters.map((ch: any) =>
      supabase.from('chapter_library').insert({
        exam_type,
        subject,
        class_level: classLevel || null,
        chapter_name: ch.chapter_name,
        suggested_days: ch.suggested_days || 3,
        full_topics: [],
        entry_source: 'ai',
        topics_generated: false,
        is_active: true
      }).select()
    );

    const results = await Promise.all(insertPromises);
    const insertedChapters = results.map(r => r.data?.[0]).filter(Boolean);

    return new Response(
      JSON.stringify({
        message: 'Chapter library generated successfully',
        chapters: insertedChapters,
        count: insertedChapters.length
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
