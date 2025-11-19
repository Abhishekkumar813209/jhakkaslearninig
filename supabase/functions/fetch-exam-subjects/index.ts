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
    
    const systemPrompt = `Expert in Indian education. Generate subject list as JSON array only.

Classes 9-10: Science, Math, Social Science, English, Hindi, Computer
Classes 11-12 Science: Physics, Chemistry, Math, Biology/CS, English, PE
Classes 11-12 Commerce: Accountancy, Business, Economics, Math, English
Classes 11-12 Arts: History, Political Science, Geography, Economics, English
Competitive: SSC (Reasoning, Quant, English, GK), UPSC (History, Geography, Polity, Economics, Current Affairs)

Output: ["Subject1", "Subject2"] - NO markdown.`;

    const userPrompt = exam_name && student_class && board
      ? `${exam_type} - ${exam_name}, Class ${student_class}, ${board}${parseInt(student_class) >= 11 ? ' (Science stream)' : ''}`
      : exam_name
      ? `${exam_type} - ${exam_name}`
      : `${exam_type}`;

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }, { text: userPrompt }] }],
        generationConfig: { 
          temperature: 0.7, 
          maxOutputTokens: 2000
        }
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
