import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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

    const aiText = await callAI(systemPrompt, userPrompt);

    if (!aiText) {
      throw new Error('Empty response from AI');
    }

    let subjects;
    try {
      const cleanedContent = stripMarkdownCodeBlocks(aiText);
      subjects = JSON.parse(cleanedContent);
      
      if (!Array.isArray(subjects)) {
        throw new Error('AI response is not an array');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', aiText);
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
