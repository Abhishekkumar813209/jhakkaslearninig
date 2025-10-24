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
    const { exam_type, exam_name, student_class, board } = await req.json();

    if (!exam_type) {
      throw new Error('exam_type is required');
    }

    console.log('Fetching subjects for:', { exam_type, exam_name, student_class, board });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from('exam_templates')
      .select('*')
      .eq('exam_type', exam_type)
      .eq('exam_name', exam_name || '')
      .eq('student_class', student_class || '')
      .eq('board', board || '')
      .eq('is_active', true)
      .maybeSingle();

    if (cached && !cacheError) {
      console.log('Found cached subjects');
      return new Response(
        JSON.stringify({
          subjects: cached.standard_subjects,
          from_cache: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate using AI
    console.log('Generating subjects using AI');
    
    const systemPrompt = `You are an expert Indian education consultant with deep knowledge of CBSE, ICSE, and State Board syllabi.

CRITICAL INSTRUCTIONS:
1. Generate subjects based on EXACT class level and board specifications
2. Use LATEST 2025-26 academic year official syllabus
3. For Classes 11-12, subjects are STREAM-SPECIFIC (Science/Commerce/Humanities)
4. DO NOT include generic subjects like "Science" or "Social Science" for senior classes
5. Include optional subjects where applicable (ICSE)

CLASS-WISE SUBJECT MAPPING:

**Classes 9-10 (Both CBSE & ICSE):**
- Science (Physics, Chemistry, Biology combined)
- Mathematics
- Social Science / History & Civics (ICSE)
- English Language & Literature
- Hindi / Second Language
- Computer Applications (ICSE optional)

**Classes 11-12 SCIENCE STREAM:**
- Physics
- Chemistry
- Mathematics
- Biology (for Medical) OR Computer Science (for Non-Medical)
- English Core / English Language
- Physical Education / Informatics Practices (optional 5th subject)

**Classes 11-12 COMMERCE STREAM:**
- Accountancy
- Business Studies
- Economics
- Mathematics / Applied Mathematics
- English Core
- Informatics Practices / Physical Education (optional)

**Classes 11-12 HUMANITIES/ARTS:**
- History
- Political Science
- Geography
- Economics
- English Core
- Psychology / Sociology / Philosophy (optional)

**ICSE-SPECIFIC RULES:**
- Class 11-12 ICSE has MORE optional subjects
- Commerce stream includes: Accounts, Commerce, Economics, Computer Science
- Mathematics has optional sections

**CBSE-SPECIFIC RULES:**
- Strictly follows NCERT textbooks
- Applied subjects available (Applied Mathematics, etc.)

**SSC EXAMS:**
- Reasoning, Quantitative Aptitude, English, General Knowledge

**BANKING EXAMS:**
- Reasoning, Quantitative Aptitude, English, General Awareness, Computer Knowledge

**UPSC:**
- History, Geography, Polity, Economics, Science & Technology, Environment, Current Affairs

Output ONLY a JSON array of subject names, nothing else.
Example: ["Subject1", "Subject2", "Subject3"]
NO explanations, NO markdown, ONLY JSON array.`;

    const userPrompt = exam_name && student_class && board
      ? `Generate subjects for ${exam_type} - ${exam_name}, Class ${student_class}, Board: ${board}.

Context:
- Academic Year: 2025-26
- Board: ${board}
- Class: ${student_class}
${parseInt(student_class) >= 11 ? '- Stream: Specify if Science/Commerce/Humanities (default: Science)' : ''}

Return ONLY subjects that are officially prescribed for this exact class and board combination.`
      : exam_name
      ? `Generate subjects for ${exam_type} exam: ${exam_name}`
      : `Generate standard subjects for ${exam_type} exam type`;

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }, { text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
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
    
    let subjects;
    try {
      const cleanedContent = stripMarkdownCodeBlocks(aiData.candidates[0].content.parts[0].text);
      subjects = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', aiData.candidates[0].content.parts[0].text);
      throw new Error('Failed to parse subjects from AI response');
    }

    // Save to cache
    const { error: insertError } = await supabase
      .from('exam_templates')
      .insert({
        exam_type,
        exam_name: exam_name || exam_type,
        student_class: student_class || '',
        board: board || '',
        standard_subjects: subjects,
        is_active: true
      });

    if (insertError) {
      console.error('Error caching subjects:', insertError);
    }

    console.log('Generated subjects:', subjects);

    return new Response(
      JSON.stringify({
        subjects,
        from_cache: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-exam-subjects:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
