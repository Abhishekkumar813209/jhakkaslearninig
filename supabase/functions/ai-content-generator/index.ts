import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { source_id, content_text, subject, chapter_name, topic_name, content_type = 'theory', target_class, target_board } = await req.json();

    if (!content_text || !subject || !chapter_name || !topic_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating ${content_type} for ${subject} - ${chapter_name} - ${topic_name}`);

    const systemPrompt = `You are an expert educator creating ${content_type} for ${target_class || 'class 10'} students studying ${subject} under ${target_board || 'CBSE'} curriculum. Generate clear, comprehensive, and age-appropriate content.`;

    let userPrompt = '';
    if (content_type === 'theory') {
      userPrompt = `Generate comprehensive theory explanation for:
Chapter: ${chapter_name}
Topic: ${topic_name}

Source Content:
${content_text.substring(0, 3000)}

Include:
1. Clear concept explanations
2. Real-world examples
3. Key definitions and formulas
4. Important points to remember

Generate in markdown format.`;
    } else if (content_type === 'summary') {
      userPrompt = `Generate a concise summary for:
Chapter: ${chapter_name}
Topic: ${topic_name}

Source Content:
${content_text.substring(0, 3000)}

Create a bullet-point summary covering all key concepts.`;
    } else if (content_type === 'key_points') {
      userPrompt = `Extract key points from:
Chapter: ${chapter_name}
Topic: ${topic_name}

Source Content:
${content_text.substring(0, 3000)}

List 5-10 most important points as concise bullet points.`;
    }

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
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;

    // Store generated content
    const { data: studyContent, error: insertError } = await supabaseClient
      .from('study_content')
      .insert({
        source_id,
        subject,
        chapter_name,
        topic_name,
        content_type,
        content: generatedContent,
        target_class,
        target_board,
        is_approved: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to store content' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create approval queue entry
    await supabaseClient
      .from('content_approval_queue')
      .insert({
        source_id,
        content_type: 'study_content',
        content_id: studyContent.id,
        status: 'pending',
      });

    console.log('Content generated successfully:', studyContent.id);

    return new Response(JSON.stringify({
      success: true,
      content_id: studyContent.id,
      content: generatedContent,
      message: 'Content generated and queued for approval'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Content generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
