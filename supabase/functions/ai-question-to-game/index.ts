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
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    const requestBody = await req.json();
    const { mode, files, text, useJson, lessonType, question_text, options, question_type, subject, chapter_name, topic_name, game_type, image_data, extract_mode, convert_to } = requestBody;

    console.log('Request mode:', mode, 'Lesson type:', lessonType);

    // For bulk_mixed mode, auth is optional (no DB access)
    let user = null;
    if (mode !== 'bulk_mixed') {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      user = authUser;
      if (!user) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Unauthorized - please log in'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Handle bulk_mixed mode for lesson content builder
    if (mode === 'bulk_mixed') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      let systemPrompt = '';
      let userPrompt = text || '';

      if (lessonType === 'theory') {
        systemPrompt = `You are an educational content expert. Process the provided text/questions and create comprehensive theory content.
Format the content in a structured, easy-to-understand manner suitable for students.`;
        
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
        const content = data.choices[0].message.content;

        return new Response(JSON.stringify({ 
          success: true,
          content: content
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (lessonType === 'game') {
        systemPrompt = `You are an expert gamification designer for educational content aimed at children.

ANALYZE the provided questions/text and:
1. Extract all questions with proper difficulty classification
2. Recommend the BEST game type based on content
3. Generate progressive game data (easy → medium → hard)

DIFFICULTY CRITERIA:
- Easy: Direct recall, simple matching, basic concepts (suitable for beginners)
- Medium: Application, understanding relationships (requires thinking)
- Hard: Analysis, complex problem-solving (challenging)

Return JSON with this EXACT structure:
{
  "questionCount": <number>,
  "difficultyDistribution": {
    "easy": <count of easy questions>,
    "medium": <count of medium questions>,
    "hard": <count of hard questions>
  },
  "bestGameType": "match_pairs" | "drag_drop" | "fill_blank" | "typing_race",
  "reasoning": "<why this game type suits the content>",
  "suggestions": {
    "match_pairs": {
      "pairs": [
        {"id": "1", "left": "...", "right": "...", "difficulty": "easy"},
        {"id": "2", "left": "...", "right": "...", "difficulty": "medium"},
        {"id": "3", "left": "...", "right": "...", "difficulty": "hard"}
      ]
    },
    "fill_blank": {
      "questions": [
        {"question": "The ____ is the powerhouse of the cell", "answer": "mitochondria", "difficulty": "easy", "hint": "organelle that produces energy"},
        {"question": "Photosynthesis converts ____ into glucose", "answer": "carbon dioxide", "difficulty": "medium", "hint": "gas from atmosphere"}
      ]
    },
    "drag_drop": {
      "items": ["step1", "step2", "step3"],
      "correctOrder": [0, 1, 2],
      "difficulty": "medium",
      "title": "Order the steps"
    },
    "typing_race": {
      "questions": [
        {"question": "What is H2O?", "answer": "water", "difficulty": "easy"}
      ]
    }
  }
}

IMPORTANT RULES:
- Generate at least 5-8 items per game type when possible
- Ensure clear progression: start with 2-3 easy, then medium, then hard
- Include helpful hints for medium/hard questions
- Make content child-friendly and engaging
- For match_pairs: create clear, unambiguous pairs
- For fill_blank: use underscores (____) to mark blanks
- For drag_drop: create logical sequences (steps, timelines, processes)`;

        const contextInfo = requestBody.context ? 
          `\n\nCONTEXT:\nSubject: ${requestBody.context.subject}\nChapter: ${requestBody.context.chapter}\nTopic: ${requestBody.context.topic}` : '';

        userPrompt = `${userPrompt}${contextInfo}\n\nPlease analyze and create progressive difficulty games from this content.`;

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
        let content = data.choices[0].message.content;
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(content);

        return new Response(JSON.stringify({ 
          success: true,
          suggestions: {
            questionCount: parsed.questionCount,
            bestGameType: parsed.bestGameType,
            reasoning: parsed.reasoning
          },
          games: parsed.suggestions
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Content processed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Handle MCQ to other format conversion
    if (convert_to) {
      systemPrompt = `Convert this MCQ question to ${convert_to} format.
${convert_to === 'fill_blank' ? 'Replace ONE key word/phrase in the question with "_____". Make it challenging but fair.' : ''}
${convert_to === 'true_false' ? 'Convert to a true/false statement. Use the correct answer to form a true statement.' : ''}

Return ONLY valid JSON based on the target format.`;

      userPrompt = `MCQ Question: ${question_text}
Correct Option: ${options ? options[0] : 'Not specified'}
Options: ${options ? JSON.stringify(options) : 'None'}

Convert to: ${convert_to}`;

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
        throw new Error(`Conversion failed: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return new Response(JSON.stringify({
        success: true,
        game_type: convert_to,
        exercise_data: JSON.parse(content),
        conversion_performed: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-suggest game type if not provided
    if (!game_type) {
      systemPrompt = `You are a gamification expert. Analyze the question and suggest the BEST game type.

ANALYSIS CRITERIA:
- MCQ: Questions with clear options
- Fill Blank: Questions testing specific terms/formulas
- True/False: Single statement verification
- Match Pairs: Questions with relationships/mappings (laws↔formulas, terms↔definitions)
- Drag Drop: Questions about sequences/processes/order

Return ONLY a JSON object with this structure:
{
  "suggested_game": "mcq" | "fill_blank" | "true_false" | "match_pairs" | "drag_drop",
  "reason": "detailed explanation why this game type is best",
  "confidence": 0.0 to 1.0,
  "alternative_options": ["other_game_type1", "other_game_type2"],
  "difficulty_estimate": "easy" | "medium" | "hard"
}`;

      userPrompt = `Question Type: ${question_type}
Question: ${question_text}
${options ? `Options: ${JSON.stringify(options)}` : ''}
Subject: ${subject || 'General'}
Chapter: ${chapter_name || 'N/A'}

Analyze and suggest the BEST game type for maximum learning engagement.`;

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
        systemPrompt = `Generate match-the-column pairs. 
CRITICAL RULES:
1. If the question already has pairs, extract them and EXPAND to exactly 4 pairs
2. If fewer than 4 pairs exist, generate similar additional pairs from the same topic
3. If no pairs exist, create 4 related pairs based on the question topic
4. Ensure all pairs are factually correct and related

Return ONLY valid JSON:
{
  "pairs": [
    {"id": "1", "left": "item1", "right": "match1"},
    {"id": "2", "left": "item2", "right": "match2"},
    {"id": "3", "left": "item3", "right": "match3"},
    {"id": "4", "left": "item4", "right": "match4"}
  ],
  "auto_expanded": true/false
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
