import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { question_text, options, question_type, subject, chapter_name, topic_name, game_type, image_data, extract_mode } = await req.json();

    console.log('Processing question for game:', { question_type, game_type, extract_mode });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Handle OCR extraction from image
    if (extract_mode === 'ocr' && image_data) {
      systemPrompt = `You are an OCR expert for educational content. Extract questions from the image and return ONLY valid JSON:
{
  "extracted_questions": [
    {
      "question_text": "the question",
      "options": ["opt1", "opt2", "opt3", "opt4"],
      "question_type": "mcq" | "match_column" | "fill_blank" | "true_false"
    }
  ]
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'user', 
              content: [
                { type: 'text', text: systemPrompt },
                { type: 'image_url', image_url: { url: image_data } }
              ]
            }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OCR extraction failed: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return new Response(JSON.stringify(JSON.parse(content)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let systemPrompt = '';
    let userPrompt = '';
    let gameData: any = {};

    // Auto-suggest game type if not provided
    if (!game_type) {
      systemPrompt = `You are a gamification expert. Analyze the question and suggest the BEST game type.
Return ONLY a JSON object with this structure:
{
  "suggested_game": "mcq" | "fill_blank" | "true_false" | "match_pairs" | "drag_drop",
  "reason": "why this game type is best",
  "confidence": 0.0 to 1.0
}`;

      userPrompt = `Question Type: ${question_type}
Question: ${question_text}
${options ? `Options: ${JSON.stringify(options)}` : ''}

Suggest the best game type for this question.`;

      const suggestionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

      if (!suggestionResponse.ok) {
        throw new Error(`AI suggestion failed: ${suggestionResponse.status}`);
      }

      const suggestionData = await suggestionResponse.json();
      const suggestion = JSON.parse(suggestionData.choices[0].message.content);
      
      return new Response(JSON.stringify({ 
        success: true, 
        suggestion 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate game data based on game type
    switch (game_type) {
      case 'mcq':
        systemPrompt = `Generate MCQ game data. Return ONLY valid JSON:
{
  "question": "the question text",
  "options": ["option1", "option2", "option3", "option4"]
}`;
        break;

      case 'fill_blank':
        systemPrompt = `Convert this question to fill-in-the-blanks. Replace ONE key word/phrase with "_____". Return ONLY valid JSON:
{
  "question": "text with _____ for blank",
  "answer": "the missing word/phrase"
}`;
        break;

      case 'true_false':
        systemPrompt = `Convert to true/false statement. Return ONLY valid JSON:
{
  "statement": "true or false statement"
}`;
        break;

      case 'match_pairs':
        systemPrompt = `Generate match-the-column pairs. If the question already has pairs, use them. Otherwise, create 4 related pairs based on the question topic. Return ONLY valid JSON:
{
  "pairs": [
    {"id": "1", "left": "item1", "right": "match1"},
    {"id": "2", "left": "item2", "right": "match2"},
    {"id": "3", "left": "item3", "right": "match3"},
    {"id": "4", "left": "item4", "right": "match4"}
  ]
}`;
        break;

      case 'drag_drop':
        systemPrompt = `Create drag-and-drop sequence. Return ONLY valid JSON:
{
  "items": ["step1", "step2", "step3", "step4"],
  "correctOrder": [0, 1, 2, 3]
}`;
        break;

      default:
        throw new Error(`Unknown game type: ${game_type}`);
    }

    userPrompt = `Question: ${question_text}
${options ? `Options: ${JSON.stringify(options)}` : ''}
Subject: ${subject || 'General'}
Chapter: ${chapter_name || 'N/A'}
Topic: ${topic_name || 'N/A'}

Generate the game data.`;

    console.log('Calling AI to generate game data...');

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    let generatedContent = data.choices[0].message.content;

    // Clean up markdown code blocks if present
    generatedContent = generatedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    gameData = JSON.parse(generatedContent);

    console.log('Generated game data:', gameData);

    return new Response(JSON.stringify({ 
      success: true, 
      game_type,
      exercise_data: gameData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-question-to-game:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
