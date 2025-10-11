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
    const { exam_type, exam_name, subject, student_class, board, fetch_mode = 'initial', already_fetched = [] } = await req.json();

    if (!exam_type || !subject) {
      throw new Error('exam_type and subject are required');
    }

    console.log('Fetching chapters for:', { exam_type, exam_name, subject, student_class, board });

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
    
    const systemPrompt = `You are an expert Indian education syllabus designer with OFFICIAL knowledge of CBSE NCERT and ICSE CISCE syllabi.

CRITICAL INSTRUCTIONS:
1. Use LATEST 2025-26 academic year official syllabus ONLY
2. Chapter names MUST match official textbook/board curriculum EXACTLY
3. For ICSE, include ALL sections (compulsory + optional)
4. For CBSE, follow NCERT textbook chapter sequence
5. For Classes 11-12, use subject-specific textbooks

BOARD-SPECIFIC RULES:

**CBSE (Classes 9-12):**
- Strictly follow NCERT textbook chapter names and sequence
- Do NOT add extra chapters not in NCERT
- Example: CBSE Class 12 Physics has exactly 15 chapters

**ICSE (Classes 9-12):**
- Include COMPULSORY chapters (Section A)
- Include OPTIONAL chapters with clear section labels (Section B, Section C)
- Example: ICSE Class 10 Math has Sections A, B, C with different geometry/algebra options

SUBJECT-SPECIFIC EXAMPLES:

**ICSE Mathematics (Class 10):**
Section A (Compulsory): Commercial Mathematics, Algebra, Geometry
Section B (Choose One): Coordinate Geometry OR Trigonometry
Section C (Choose One): Statistics OR Probability

**CBSE Physics (Class 12):**
1. Electric Charges and Fields
2. Electrostatic Potential and Capacitance
3. Current Electricity
... (15 chapters total as per NCERT)

**CBSE Economics (Class 12):**
Part A - Microeconomics (6 chapters)
Part B - Macroeconomics (6 chapters)

Output MUST be JSON array:
[
  {
    "chapter_name": "Official Chapter Name (with section if ICSE)",
    "suggested_days": 3,
    "difficulty": "easy/medium/hard"
  }
]

NO explanations, NO markdown, ONLY JSON.`;

    const userPrompt = `Generate COMPLETE chapter list for:

Subject: ${subject}
Exam Type: ${exam_type}
${student_class ? `Class: ${student_class}` : ''}
${board ? `Board: ${board}` : ''}
Academic Year: 2025-26

STRICT RULES:
1. Use OFFICIAL ${board === 'ICSE' ? 'ICSE CISCE' : 'CBSE NCERT'} syllabus for ${student_class ? `Class ${student_class}` : 'this level'}
2. Chapter names MUST be EXACTLY as in official textbook
3. Include ALL chapters (compulsory + optional for ICSE)
4. For ICSE Math: Include Sections A, B, C with clear labels
5. For CBSE: Follow NCERT chapter sequence
6. Return 15-30 chapters (complete syllabus)

Examples of correct chapter names:
- CBSE Class 12 Physics: "Electric Charges and Fields" (not just "Electricity")
- ICSE Class 10 Math: "Section A: Commercial Mathematics - Banking" (with section label)
- CBSE Class 12 Economics: "Part A: Introduction to Microeconomics"`;

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

    console.log(`Generated ${chapters.length} chapters`);

    return new Response(
      JSON.stringify({
        chapters,
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
