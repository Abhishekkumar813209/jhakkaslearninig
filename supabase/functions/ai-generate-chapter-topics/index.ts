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
      existing_topics_count = 0,
      input_mode = 'auto',
      syllabus_text,
      syllabus_image
    } = await req.json();

    console.log('Generating topics for:', { 
      chapter_name, 
      subject, 
      exam_type, 
      exam_name, 
      estimated_days,
      input_mode,
      has_text: !!syllabus_text,
      has_image: !!syllabus_image
    });

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    let contentToProcess = syllabus_text || '';

    // If image mode, use Vision API to extract text first
    if (input_mode === 'image' && syllabus_image) {
      console.log('Processing image with Vision API...');
      
      const visionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Extract ALL text from this syllabus image. Preserve structure, bullets, numbering, and headings. Return only the extracted text, nothing else.` },
              { inline_data: { mime_type: syllabus_image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg', data: syllabus_image.split(',')[1] } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 3000 }
        }),
      });

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error('Vision API Error:', visionResponse.status, errorText);
        throw new Error('Failed to process image with Vision API');
      }

      const visionData = await visionResponse.json();
      contentToProcess = visionData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      console.log('Extracted text from image:', contentToProcess.substring(0, 200));
      
      if (!contentToProcess.trim()) {
        throw new Error('Could not extract text from image. Please ensure the image contains readable text.');
      }
    }

    // Build budget-aware prompt with clustering logic
    const maxTopics = Math.max(2, Math.min(10, estimated_days));
    const shouldCluster = estimated_days < 3;
    
    const systemPrompt = `You are an expert educational content creator specializing in ${exam_type} exam preparation.
Your task is to ${contentToProcess ? 'PARSE the provided syllabus content and extract' : 'generate a'} BUDGET-AWARE list of topics that STRICTLY respects the ${estimated_days}-day time budget.

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

    const userPrompt = contentToProcess 
      ? `Parse this syllabus content and extract BUDGET-AWARE topics:

SYLLABUS CONTENT:
${contentToProcess}

Chapter: ${chapter_name}
Subject: ${subject}
Exam: ${exam_name} (${exam_type})
TIME BUDGET: ${estimated_days} days (STRICT LIMIT)
Already Added Topics: ${existing_topics_count}

Extract individual topics/concepts from the syllabus, allocate days based on complexity, and ensure total days ≈ ${estimated_days}.`
      : `Generate BUDGET-AWARE topics for this chapter:
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }, { text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
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
    const generatedText = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

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

    // XP mapping based on difficulty (matching xpConfig.ts)
    const XP_BY_DIFFICULTY = {
      easy: 30,
      medium: 40,
      hard: 50
    };

    const validatedTopics = topics.map((topic, index) => {
      // Validate difficulty first
      const difficulty = ['easy', 'medium', 'hard'].includes(topic.difficulty) 
        ? topic.difficulty 
        : 'medium';
      
      return {
        topic_name: topic.topic_name || `Topic ${existing_topics_count + index + 1}`,
        day_number: Math.min(Math.max(topic.day_number || (index + 1), 1), estimated_days),
        xp_reward: XP_BY_DIFFICULTY[difficulty],
        coin_reward: Math.min(Math.max(topic.coin_reward || 10, 5), 20),
        difficulty: difficulty,
        animation_type: topic.animation_type || 'interactive_svg'
      };
    });

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
