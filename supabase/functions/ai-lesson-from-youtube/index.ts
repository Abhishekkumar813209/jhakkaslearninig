import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { summary, language, videoTitle, topicName, subject } = await req.json();

    if (!summary || !language) {
      return new Response(
        JSON.stringify({ error: 'Summary and language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating AI-enhanced lessons for: ${videoTitle} (${language})`);

    const systemPrompt = `You are an expert educational content creator specializing in gamified learning experiences.

Create engaging, interactive lesson content from YouTube video summaries for Indian students.

Subject: ${subject || 'General'}
Topic: ${topicName || videoTitle}
Language: ${language}

Generate 3-5 lessons with these types:
1. THEORY: Educational text content (use the ${language} summary)
2. INTERACTIVE_SVG: Visual animations based on subject (math graphs, physics simulations, etc.)
3. GAME: Interactive learning games (match pairs, fill blanks, typing race)
4. QUIZ: Multiple choice questions based on video content

For each lesson, specify:
- lesson_type: 'theory' | 'interactive_svg' | 'game' | 'quiz'
- theory_text: Main educational content (for theory lessons)
- svg_type: Type of animation ('math_graph' | 'physics_motion' | 'chemistry_molecule' | 'algorithm_viz')
- game_type: Type of game ('match_pairs' | 'fill_blanks' | 'typing_race' | 'drag_drop')
- game_data: Game configuration (pairs for match_pairs, blanks for fill_blanks, etc.)
- estimated_time_minutes: Time to complete
- xp_reward: XP points (10-50)
- coin_reward: Coins (2-10)

Respond ONLY with valid JSON:
{
  "lessons": [
    {
      "lesson_type": "theory",
      "theory_text": "detailed content in ${language}",
      "estimated_time_minutes": 5,
      "xp_reward": 20,
      "coin_reward": 5
    },
    {
      "lesson_type": "game",
      "game_type": "match_pairs",
      "game_data": {
        "pairs": [
          {"term": "concept", "definition": "explanation"},
          ...
        ]
      },
      "estimated_time_minutes": 3,
      "xp_reward": 15,
      "coin_reward": 3
    },
    ...
  ]
}`;

    const userContent = `
Video: ${videoTitle}

Summary:
${summary.detailed}

Key Points:
${summary.keypoints.join('\n')}

Create engaging lessons based on this content.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const lessonsText = data.choices[0].message.content;
    
    // Parse JSON from AI response
    let lessonsData;
    try {
      const jsonMatch = lessonsText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       lessonsText.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        lessonsData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      
      // Fallback: Create basic theory lesson
      lessonsData = {
        lessons: [
          {
            lesson_type: 'theory',
            theory_text: summary.detailed,
            estimated_time_minutes: 10,
            xp_reward: 20,
            coin_reward: 5,
          }
        ]
      };
    }

    // Validate and clean lessons
    const validatedLessons = (lessonsData.lessons || []).map((lesson: any) => ({
      lesson_type: lesson.lesson_type || 'theory',
      theory_text: lesson.theory_text || '',
      svg_type: lesson.svg_type,
      svg_data: lesson.svg_data,
      game_type: lesson.game_type,
      game_data: lesson.game_data,
      estimated_time_minutes: lesson.estimated_time_minutes || 5,
      xp_reward: lesson.xp_reward || 10,
      coin_reward: lesson.coin_reward || 2,
    }));

    console.log(`Generated ${validatedLessons.length} lessons successfully`);

    return new Response(
      JSON.stringify({ 
        lessons: validatedLessons,
        videoTitle,
        language,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Lesson generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate lessons' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
