import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      topic_id, 
      topic_name, 
      lesson_types, 
      difficulty = 'medium',
      book_page_reference,
      subject,
      chapter_name 
    } = await req.json();

    console.log('Generating AI content for:', { topic_name, lesson_types, difficulty });

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Build comprehensive prompt
    const systemPrompt = `You are an expert educational content creator. Generate comprehensive, engaging learning content that is pedagogically sound and student-friendly. 

**CRITICAL XP & DIFFICULTY ASSIGNMENT:**
- Assign difficulty levels (easy/medium/hard) to ALL content
- Theory difficulty based on concept complexity
- Exercise difficulty based on question complexity  
- Game difficulty based on challenge level

**XP Allocation (MUST follow):**
- Easy: 30 XP (simple concepts, basic recall)
- Medium: 40 XP (moderate complexity, application)
- Hard: 50 XP (advanced concepts, analysis)

Guidelines:
- Theory should be clear, concise, and age-appropriate
- Use examples and analogies to explain concepts
- Interactive SVGs should have clear step-by-step animations
- Games should be engaging and reinforce learning
- Exercises should progress from easy to challenging
- Always include detailed explanations for correct answers
- EVERY piece of content MUST have a difficulty field`;

    const userPrompt = `Generate complete lesson content for:

**Topic**: ${topic_name}
**Subject**: ${subject || 'General'}
**Chapter**: ${chapter_name || 'N/A'}
**Target Difficulty**: ${difficulty}
**Reference**: ${book_page_reference || 'N/A'}
**Content Types Requested**: ${lesson_types.join(', ')}

Generate the following in JSON format:

${lesson_types.includes('theory') ? `
1. **Theory Section** (theory):
   - html: Rich HTML content with headings, paragraphs, lists
   - difficulty: "${difficulty}" (easy/medium/hard)
   - xp_reward: ${difficulty === 'easy' ? 30 : difficulty === 'hard' ? 50 : 40}
   - key_points: Array of 3-5 key takeaways
   - examples: 2-3 real-world examples
` : ''}

${lesson_types.includes('interactive_svg') ? `
2. **Interactive SVG Animation** (svg_animation):
   - svg_type: Choose from "math_graph", "physics_motion", "chemistry_molecule", "algorithm_viz"
   - svg_data: Complete SVG markup with appropriate elements
   - steps: Array of animation steps with title, description, and highlight areas
   - total_duration: Estimated time in seconds
` : ''}

${lesson_types.includes('game') ? `
3. **Gamified Learning** (games):
   Array of 2-3 games, each with:
   - title, description, game_type, game_data
   - difficulty: (easy/medium/hard)
   - xp_reward: 30 (easy), 40 (medium), or 50 (hard)
` : ''}

${lesson_types.includes('quiz') ? `
4. **Practice Exercises** (exercises):
   Array of 5-8 questions with progressive difficulty:
   - Questions 1-2: difficulty: "easy", xp_reward: 30
   - Questions 3-5: difficulty: "medium", xp_reward: 40
   - Questions 6-8: difficulty: "hard", xp_reward: 50
   - Include question_text, options, correct_answer, explanation, difficulty, xp_reward
` : ''}

Return ONLY valid JSON. No markdown formatting, no code blocks.`;

    // Call Gemini API directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: userPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response received');

    let content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('No content generated');
    }

    // Clean up content - remove markdown code blocks if present
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    let generatedContent;
    try {
      generatedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw content:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate and structure the response
    const result = {
      topic_id,
      topic_name,
      generated_at: new Date().toISOString(),
      content: generatedContent,
      metadata: {
        difficulty,
        subject,
        chapter_name,
        book_page_reference,
        lesson_types,
        ai_model: 'gemini-2.5-flash'
      }
    };

    console.log('Content generation successful');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-lesson-generator:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
