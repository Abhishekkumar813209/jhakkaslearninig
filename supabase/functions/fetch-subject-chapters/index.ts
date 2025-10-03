import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function stripMarkdownCodeBlocks(content: string): string {
  let cleaned = content.trim();
  
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  return cleaned.trim();
}

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
    
    const systemPrompt = `You are an expert syllabus designer. Generate a comprehensive list of ALL chapters for the given subject and exam type.

Output MUST be a JSON array of objects with this exact structure:
[
  {
    "chapter_name": "Chapter Name",
    "suggested_days": 3,
    "difficulty": "easy/medium/hard"
  }
]

Rules:
- Generate 20-40 chapters based on the ACTUAL COMPLETE syllabus for competitive exams like NEET/JEE
- Include ALL major chapters - don't skip important topics
- suggested_days should be 2-7 days based on chapter complexity
- difficulty: "easy", "medium", or "hard"
- Be specific and exam-focused
- For NEET Physics: ~30 chapters, Chemistry: ~28 chapters, Biology: ~38 chapters
- For JEE: Cover complete syllabus comprehensively
- Only return chapter names, NOT topics`;

    let userPrompt = `Generate chapters for:\nExam Type: ${exam_type}\nSubject: ${subject}`;
    if (student_class) userPrompt += `\nClass: ${student_class}`;
    if (board) userPrompt += `\nBoard: ${board}`;

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
        temperature: 0.7,
        max_tokens: 4000
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
      throw new Error('Invalid AI response format');
    }
    
    let chapters;
    try {
      const cleanedContent = stripMarkdownCodeBlocks(aiData.choices[0].message.content);
      chapters = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', aiData.choices[0].message.content);
      throw new Error('Failed to parse chapters from AI response');
    }

    // Save to chapter library (without topics for now)
    const chaptersToInsert = chapters.map((ch: any) => ({
      exam_type,
      subject,
      chapter_name: ch.chapter_name,
      suggested_days: ch.suggested_days || 3,
      difficulty: ch.difficulty || 'medium',
      topics: [],
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

    console.log('Generated chapters (Phase 1):', chapters.length);

    // Phase 2: If we got many chapters but might have more, fetch remaining
    if (chapters.length >= 35) {
      console.log('Attempting Phase 2 for remaining chapters');
      
      const phase2Prompt = `Continue generating remaining chapters for:\nExam Type: ${exam_type}\nSubject: ${subject}\n\nAlready covered: ${chapters.map(ch => ch.chapter_name).join(', ')}\n\nGenerate any remaining important chapters NOT in the above list.`;
      
      const phase2Response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: phase2Prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }),
      });

      if (phase2Response.ok) {
        const phase2Data = await phase2Response.json();
        if (phase2Data.choices?.[0]?.message?.content) {
          try {
            const cleanedPhase2 = stripMarkdownCodeBlocks(phase2Data.choices[0].message.content);
            const phase2Chapters = JSON.parse(cleanedPhase2);
            if (Array.isArray(phase2Chapters) && phase2Chapters.length > 0) {
              console.log('Phase 2 added:', phase2Chapters.length, 'chapters');
              chapters = [...chapters, ...phase2Chapters];
            }
          } catch (e) {
            console.log('Phase 2 parsing failed, continuing with Phase 1 only');
          }
        }
      }
    }

    console.log('Total chapters generated:', chapters.length);

    // Save all chapters to library
    const chaptersToInsert = chapters.map((ch: any) => ({
      exam_type,
      subject,
      chapter_name: ch.chapter_name,
      suggested_days: ch.suggested_days || 3,
      difficulty: ch.difficulty || 'medium',
      topics: [],
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
