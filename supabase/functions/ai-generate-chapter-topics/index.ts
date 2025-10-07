import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      chapter_id,
      chapter_name, 
      subject, 
      exam_type, 
      exam_name,
      estimated_days,
      existing_topics_count = 0
    } = await req.json();

    console.log('Generating topics for:', { chapter_name, subject, exam_type, exam_name, estimated_days });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build budget-aware prompt with clustering logic
    const maxTopics = Math.max(2, Math.min(10, estimated_days));
    const shouldCluster = estimated_days < 3;
    
    const systemPrompt = `You are an expert educational content creator specializing in ${exam_type} exam preparation.
Your task is to generate a BUDGET-AWARE list of topics that STRICTLY respects the ${estimated_days}-day time budget.

CRITICAL TIME BUDGET RULES:
- Chapter has ONLY ${estimated_days} days total
- Maximum topics: ${maxTopics}
- ${shouldCluster ? 'CLUSTER multiple concepts into consolidated topics to fit budget' : 'Distribute topics across available days'}
- NEVER generate topics exceeding the day budget
- If budget is tight (1-2 days), create 2-3 CONSOLIDATED topics that combine related concepts

TOPIC DISTRIBUTION:
${estimated_days >= 5 ? `- Generate ${Math.min(estimated_days, 7)} detailed topics (1 per day)` : ''}
${estimated_days === 3 || estimated_days === 4 ? `- Generate ${estimated_days} focused topics (1 per day)` : ''}
${estimated_days <= 2 ? `- Generate 2-3 CONSOLIDATED topics combining multiple concepts\n  Example: "Introduction + Core Concepts + Applications" (1 combined topic for 1 day)` : ''}

TOPIC QUALITY:
- Make topics exam-specific and highly relevant
- Topics should be actionable learning objectives
- Use ${exam_type} exam terminology
- Topics should build on each other logically

OUTPUT FORMAT: Return ONLY a valid JSON array, no markdown:
[
  {
    "topic_name": "string (specific, may combine concepts if budget tight)",
    "day_number": number (1 to ${estimated_days}, MUST NOT exceed this),
    "xp_reward": number (30-100 based on complexity),
    "coin_reward": number (5-20 based on difficulty),
    "difficulty": "easy" | "medium" | "hard",
    "animation_type": "interactive_svg" | "physics_animation" | "concept_puzzle"
  }
]`;

    const userPrompt = `Generate BUDGET-AWARE topics for this chapter:
Chapter: ${chapter_name}
Subject: ${subject}
Exam: ${exam_name} (${exam_type})
TIME BUDGET: ${estimated_days} days (STRICT LIMIT)
Already Added Topics: ${existing_topics_count}

MANDATORY BUDGET COMPLIANCE:
- You MUST fit topics within ${estimated_days} days
- day_number MUST NOT exceed ${estimated_days}
- If ${estimated_days} <= 2: Combine multiple related concepts into single topics
- If ${estimated_days} >= 5: Create detailed, separated topics (1 per day)
- Each topic must be exam-relevant and cover essential concepts

EXAM CONTEXT:
- Prioritize ${exam_type} exam pattern and syllabus
- Focus on high-weightage ${exam_name} topics first
- Include practical, exam-oriented content
- Topics should prepare students effectively within the time budget`;

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
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to your workspace.');
      }
      const errorText = await response.text();
      console.error('AI API Error:', response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const generatedText = aiResponse.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error('No content generated from AI');
    }

    console.log('AI Response:', generatedText);

    // Parse JSON from response (handle markdown code blocks)
    let topics;
    try {
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      } else {
        topics = JSON.parse(generatedText);
      }
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error('Failed to parse AI response. Please try again.');
    }

    // Validate and sanitize topics
    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error('AI generated invalid topics format');
    }

    const validatedTopics = topics.map((topic, index) => ({
      topic_name: topic.topic_name || `Topic ${existing_topics_count + index + 1}`,
      day_number: Math.min(Math.max(topic.day_number || (index + 1), 1), estimated_days),
      xp_reward: Math.min(Math.max(topic.xp_reward || 50, 30), 100),
      coin_reward: Math.min(Math.max(topic.coin_reward || 10, 5), 20),
      difficulty: ['easy', 'medium', 'hard'].includes(topic.difficulty) ? topic.difficulty : 'medium',
      animation_type: topic.animation_type || 'interactive_svg'
    }));

    console.log(`Generated ${validatedTopics.length} topics successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        topics: validatedTopics,
        count: validatedTopics.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in ai-generate-chapter-topics:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate topics',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
