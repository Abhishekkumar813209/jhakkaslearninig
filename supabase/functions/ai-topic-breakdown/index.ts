import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      topic_id,
      topic_name,
      chapter_name,
      subject,
      estimated_hours
    } = await req.json();

    if (!topic_id || !topic_name || !subject) {
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

    // Create AI prompt for topic breakdown
    const systemPrompt = `You are an expert educator creating engaging, gamified learning experiences. Break down topics into bite-sized, interactive exercises.`;
    
    const userPrompt = `Create a detailed learning breakdown for:
- Topic: ${topic_name}
- Chapter: ${chapter_name}
- Subject: ${subject}
- Estimated Time: ${estimated_hours} hours

Generate a JSON response with this structure:
{
  "exercises": [
    {
      "order_num": 1,
      "exercise_type": "theory",
      "title": "Introduction to ${topic_name}",
      "content": "Theory content here...",
      "xp_value": 10,
      "is_required": true
    },
    {
      "order_num": 2,
      "exercise_type": "mcq",
      "question_text": "What is...?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "explanation": "Explanation...",
      "xp_value": 15,
      "is_required": true
    },
    {
      "order_num": 3,
      "exercise_type": "drag_drop_sort",
      "question_text": "Arrange these steps in order:",
      "items": ["Step 1", "Step 2", "Step 3"],
      "correct_order": [0, 1, 2],
      "xp_value": 20,
      "is_required": true
    }
  ]
}

Exercise types available: theory, mcq, fill_up, true_false, match_column, subjective, drag_drop_sort, interactive_label

IMPORTANT:
- Create 5-8 exercises per topic
- Mix different exercise types for engagement
- Theory exercises should be concise (200-300 words)
- Include gamified elements (drag-drop, labeling)
- Progressive difficulty
- Each exercise worth 10-30 XP based on complexity`;

    // Call Lovable AI Gateway
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
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
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
    
    let exerciseData;
    try {
      const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : generatedContent;
      exerciseData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert exercises into database
    const insertedExercises = [];
    for (const exercise of exerciseData.exercises) {
      // First insert topic_content_mapping
      const { data: contentMapping, error: mappingError } = await supabase
        .from('topic_content_mapping')
        .insert({
          topic_id,
          content_type: exercise.exercise_type,
          order_num: exercise.order_num,
          is_required: exercise.is_required ?? true,
          xp_value: exercise.xp_value ?? 10
        })
        .select()
        .single();

      if (mappingError) {
        console.error('Content mapping error:', mappingError);
        continue;
      }

      // Then insert gamified exercise
      const { data: gamifiedExercise, error: exerciseError } = await supabase
        .from('gamified_exercises')
        .insert({
          topic_content_id: contentMapping.id,
          exercise_type: exercise.exercise_type,
          exercise_data: {
            title: exercise.title,
            question_text: exercise.question_text,
            content: exercise.content,
            options: exercise.options,
            items: exercise.items
          },
          correct_answer: exercise.correct_answer || exercise.correct_order,
          explanation: exercise.explanation,
          difficulty: 'medium',
          xp_reward: exercise.xp_value ?? 10,
          coin_reward: Math.round((exercise.xp_value ?? 10) / 5)
        })
        .select()
        .single();

      if (!exerciseError) {
        insertedExercises.push(gamifiedExercise);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      topic_id,
      exercises_created: insertedExercises.length,
      exercises: insertedExercises
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-topic-breakdown:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
