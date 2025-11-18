import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { data: existing, error: checkError } = await supabase
      .from('chapter_library')
      .select('id, chapter_name, full_topics')
      .eq('exam_type', exam_type)
      .eq('subject', subject)
      .eq('is_active', true);

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: systemPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const aiData = await response.json();
    const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean and parse JSON
    const cleanText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const chapters = JSON.parse(cleanText);

    // Insert chapters into chapter_library
    const insertPromises = chapters.map((ch: any) =>
      supabase.from('chapter_library').insert({
        exam_type,
        subject,
        chapter_name: ch.chapter_name,
        difficulty: ch.difficulty || 'medium',
        importance_score: ch.importance_score || 5,
        suggested_days: ch.suggested_days || 3,
        can_skip: ch.can_skip || false,
        exam_relevance: ch.exam_relevance,
        full_topics: [], // Will be populated by generate-full-chapter-topics
        topics_strategy: 'comprehensive',
        is_active: true,
        is_custom: false
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
