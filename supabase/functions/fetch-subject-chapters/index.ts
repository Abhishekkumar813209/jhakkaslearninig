import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exam_type, subject, student_class, board } = await req.json();

    if (!exam_type || !subject) {
      throw new Error('exam_type and subject are required');
    }

    console.log('Fetching chapters for:', { exam_type, subject, student_class, board });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from('chapter_library')
      .select('*')
      .eq('exam_type', exam_type)
      .eq('subject', subject)
      .eq('is_active', true);

    if (cached && cached.length > 0 && !cacheError) {
      console.log('Found cached chapters:', cached.length);
      return new Response(
        JSON.stringify({
          chapters: cached.map(ch => ({
            id: ch.id,
            chapter_name: ch.chapter_name,
            suggested_days: ch.suggested_days,
            difficulty: ch.difficulty,
            topics: ch.topics
          })),
          source: 'cache'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate using AI
    console.log('Generating chapters using AI');
    
    const systemPrompt = `You are an expert syllabus designer. Generate a comprehensive list of chapters for the given subject and exam type.

Output MUST be a JSON array of objects with this exact structure:
[
  {
    "chapter_name": "Chapter Name",
    "suggested_days": 3,
    "difficulty": "easy/medium/hard",
    "topics": ["Topic 1", "Topic 2"]
  }
]

Rules:
- suggested_days should be 2-7 days based on complexity
- difficulty: "easy", "medium", or "hard"
- Include 5-15 main topics per chapter
- Be specific and comprehensive`;

    let userPrompt = `Generate chapters for:\nExam Type: ${exam_type}\nSubject: ${subject}`;
    if (student_class) userPrompt += `\nClass: ${student_class}`;
    if (board) userPrompt += `\nBoard: ${board}`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    const aiData = await aiResponse.json();
    const chapters = JSON.parse(aiData.choices[0].message.content);

    // Save to chapter library
    const chaptersToInsert = chapters.map((ch: any) => ({
      exam_type,
      subject,
      chapter_name: ch.chapter_name,
      suggested_days: ch.suggested_days || 3,
      difficulty: ch.difficulty || 'medium',
      topics: ch.topics || [],
      is_custom: false,
      is_active: true
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('chapter_library')
      .insert(chaptersToInsert)
      .select();

    if (insertError) {
      console.error('Error caching chapters:', insertError);
    }

    console.log('Generated chapters:', chapters.length);

    return new Response(
      JSON.stringify({
        chapters: inserted || chapters,
        source: 'ai'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-subject-chapters:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
