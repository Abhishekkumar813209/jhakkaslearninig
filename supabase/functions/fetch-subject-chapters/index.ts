import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
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
2. Chapter names MUST be CLEAN and CRISP - NO section prefixes like "Section A:", "Part B:" etc.
3. Include ALL chapters from official syllabus (compulsory + optional for ICSE)
4. For CBSE, follow NCERT textbook chapter sequence
5. Return 15-40 chapters in ONE response (complete syllabus)

CHAPTER NAMING RULES:
✅ CORRECT: "Matrices", "Trigonometry", "Coordinate Geometry", "Electric Charges and Fields"
❌ WRONG: "Section A: Matrices", "Part B: Trigonometry", "Unit 3: Coordinate Geometry"

BOARD-SPECIFIC RULES:

**CBSE (Classes 9-12):**
- Strictly follow NCERT textbook chapter names
- Example: CBSE Class 12 Physics has 15 chapters
- Example chapters: "Electric Charges and Fields", "Current Electricity", "Moving Charges and Magnetism"

**ICSE (Classes 9-12):**
- Include ALL chapters (compulsory + optional)
- Mark optional chapters with is_optional: true
- Example: ICSE Class 10 Math has ~25-30 chapters including optional ones
- Example chapters: "Matrices", "Algebra", "Coordinate Geometry", "Trigonometry", "Statistics", "Probability"

**ICSE Mathematics Specific:**
- Section A (Compulsory): Commercial Mathematics, Algebra, Geometry, Mensuration
- Section B (Optional): Coordinate Geometry, Trigonometry
- Section C (Optional): Statistics, Probability
- ALL chapters should be returned, just mark optional ones with is_optional: true

**CBSE Economics (Class 12):**
- Part A: Microeconomics (6 chapters)
- Part B: Macroeconomics (6 chapters)
- Chapter names should be clean: "Introduction to Microeconomics", "Theory of Consumer Behaviour", etc.

Output MUST be JSON array:
[
  {
    "chapter_name": "Clean Chapter Name",
    "suggested_days": 3,
    "difficulty": "easy/medium/hard",
    "is_optional": false,
    "section": "A"
  }
]

EXAMPLES:

ICSE Class 10 Mathematics:
[
  {"chapter_name": "Commercial Mathematics", "suggested_days": 5, "difficulty": "medium", "is_optional": false, "section": "A"},
  {"chapter_name": "Algebra", "suggested_days": 6, "difficulty": "hard", "is_optional": false, "section": "A"},
  {"chapter_name": "Coordinate Geometry", "suggested_days": 7, "difficulty": "hard", "is_optional": true, "section": "B"},
  {"chapter_name": "Trigonometry", "suggested_days": 7, "difficulty": "hard", "is_optional": true, "section": "B"},
  {"chapter_name": "Statistics", "suggested_days": 5, "difficulty": "medium", "is_optional": true, "section": "C"},
  {"chapter_name": "Probability", "suggested_days": 4, "difficulty": "medium", "is_optional": true, "section": "C"}
]

CBSE Class 12 Physics:
[
  {"chapter_name": "Electric Charges and Fields", "suggested_days": 6, "difficulty": "medium", "is_optional": false},
  {"chapter_name": "Electrostatic Potential and Capacitance", "suggested_days": 5, "difficulty": "medium", "is_optional": false},
  {"chapter_name": "Current Electricity", "suggested_days": 7, "difficulty": "hard", "is_optional": false}
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
2. Chapter names MUST be CLEAN - NO prefixes like "Section A:", "Part B:", "Unit 3:"
3. Return ALL chapters in ONE response (15-40 chapters for complete syllabus)
4. For ICSE optional chapters, set is_optional: true but keep chapter_name clean
5. For CBSE, follow exact NCERT chapter sequence

Examples of CORRECT chapter names:
✅ "Matrices" (not "Section A: Matrices")
✅ "Coordinate Geometry" (not "Section B: Coordinate Geometry")
✅ "Electric Charges and Fields" (not "Chapter 1: Electric Charges")
✅ "Introduction to Microeconomics" (not "Part A: Introduction to Microeconomics")

Return COMPLETE syllabus in ONE response.`;

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }, { text: userPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4000 }
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
    
    if (!aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected AI response structure:', aiData);
      throw new Error('Invalid AI response format');
    }
    
    let chapters;
    try {
      const cleanedContent = stripMarkdownCodeBlocks(aiData.candidates[0].content.parts[0].text);
      chapters = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', aiData.candidates[0].content.parts[0].text);
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
