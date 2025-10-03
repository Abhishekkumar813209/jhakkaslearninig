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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exam_type, exam_name } = await req.json();

    if (!exam_type) {
      throw new Error('exam_type is required');
    }

    console.log('Fetching subjects for:', exam_type, exam_name);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from('exam_templates')
      .select('*')
      .eq('exam_type', exam_type)
      .eq('exam_name', exam_name || '')
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
    
    const systemPrompt = `You are an expert education consultant. Generate a comprehensive list of subjects for the given exam type.

EXAM TYPES AND TYPICAL SUBJECTS:
- SSC: Reasoning, Quantitative Aptitude, English, General Knowledge
- Banking: Reasoning, Quantitative Aptitude, English, General Awareness, Computer Knowledge
- UPSC: History, Geography, Polity, Economics, Science & Technology, Environment, Current Affairs
- School (CBSE/ICSE): Science, Mathematics, Social Science, English, Hindi/Regional Language
- Custom: Based on user input

Output ONLY a JSON array of subject names, nothing else.
Example: ["Subject1", "Subject2", "Subject3"]`;

    const userPrompt = exam_name 
      ? `Generate subjects for ${exam_type} exam: ${exam_name}`
      : `Generate standard subjects for ${exam_type} exam type`;

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
        max_tokens: 500
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
    
    const subjects = JSON.parse(aiData.choices[0].message.content);

    // Save to cache
    const { error: insertError } = await supabase
      .from('exam_templates')
      .insert({
        exam_type,
        exam_name: exam_name || exam_type,
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
