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
    
    const systemPrompt = `You are an expert at generating CONCISE topics for ${subject} (${exam_type} - ${exam_name}).

CRITICAL RULES:
1. Generate exactly ${estimated_days} topics (1 per day)
2. Keep topic names UNDER 65 characters - be brief!
3. Return ONLY valid JSON array: [{"topic_name": "...", "day_number": 1, "xp_reward": 60, "coin_reward": 10, "difficulty": "medium", "animation_type": "interactive_svg"}]
4. NO markdown, NO code blocks, NO explanations - ONLY raw JSON array starting with [ and ending with ]
5. difficulty: "easy" (30 XP) | "medium" (40 XP) | "hard" (50 XP)
6. animation_type: "interactive_svg" | "physics_animation" | "concept_puzzle"
7. Keep topic names focused - avoid long descriptions`;

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

    let topics;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      const tokenLimit = retryCount === 0 ? 4000 : retryCount === 1 ? 3000 : 2500;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }, { text: userPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: tokenLimit }
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

      console.log(`AI Response (attempt ${retryCount + 1}, length: ${generatedText.length} chars):`);
      console.log('Preview:', generatedText.substring(0, 150) + '...');
      console.log('End:', '...' + generatedText.substring(Math.max(0, generatedText.length - 100)));

      // Check if response is complete
      const trimmed = generatedText.trim();
      if (!trimmed.endsWith(']') && !trimmed.endsWith('}')) {
        if (retryCount < maxRetries) {
          console.warn(`⚠️ Response truncated (${generatedText.length} chars). Retrying with ${tokenLimit === 4000 ? 3000 : 2500} tokens...`);
          retryCount++;
          continue;
        }
        console.error('❌ Response still truncated after retries');
        throw new Error('AI response was incomplete. Please try with fewer topics or shorter chapter name.');
      }

      // Parse JSON from response
      try {
        const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          topics = JSON.parse(jsonMatch[0]);
        } else {
          topics = JSON.parse(generatedText);
        }

        if (!Array.isArray(topics) || topics.length === 0) {
          throw new Error('Invalid topics format');
        }

        console.log(`✅ Successfully parsed ${topics.length} topics`);
        break; // Success!

      } catch (parseError) {
        if (retryCount < maxRetries) {
          console.warn(`⚠️ Parse failed (attempt ${retryCount + 1}):`, parseError.message);
          retryCount++;
          continue;
        }
        console.error('❌ Final parse error:', parseError);
        console.error('Raw response:', generatedText);
        throw new Error('Failed to parse AI response after retries. Please try again.');
      }
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
