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

    const { study_content_id, source_id, content_text, subject, chapter_name, topic_name, question_type, count = 5, difficulty = 'medium' } = await req.json();

    if (!question_type || !subject) {
      return new Response(JSON.stringify({ error: 'Missing question_type or subject' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validTypes = ['mcq', 'fill_up', 'true_false', 'match_column', 'subjective'];
    if (!validTypes.includes(question_type)) {
      return new Response(JSON.stringify({ error: 'Invalid question_type' }), {
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

    console.log(`Generating ${count} ${question_type} questions for ${subject}`);

    let systemPrompt = '';
    let userPrompt = '';

    if (question_type === 'mcq') {
      systemPrompt = `You are an expert educator creating multiple choice questions for ${subject}. Generate ${count} MCQs with 4 options each.`;
      userPrompt = `Create ${count} multiple choice questions based on:
Subject: ${subject}
Chapter: ${chapter_name || 'N/A'}
Topic: ${topic_name || 'N/A'}
Difficulty: ${difficulty}

Content:
${content_text?.substring(0, 2000) || 'General knowledge'}

Return ONLY a valid JSON array of objects with this exact structure:
[
  {
    "question_text": "Question here?",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ],
    "explanation": "Why the correct answer is right",
    "marks": 1
  }
]`;
    } else if (question_type === 'fill_up') {
      systemPrompt = `You are creating fill-in-the-blank questions for ${subject}.`;
      userPrompt = `Create ${count} fill-in-the-blank questions based on:
Subject: ${subject}
Chapter: ${chapter_name || 'N/A'}
Topic: ${topic_name || 'N/A'}

Return ONLY a valid JSON array:
[
  {
    "question_text": "The mitochondria is the _____ of the cell.",
    "correct_answer": "powerhouse",
    "explanation": "Explanation here",
    "marks": 1
  }
]`;
    } else if (question_type === 'true_false') {
      systemPrompt = `You are creating true/false questions for ${subject}.`;
      userPrompt = `Create ${count} true/false questions based on:
Subject: ${subject}

Return ONLY a valid JSON array:
[
  {
    "question_text": "Statement here",
    "correct_answer": "true",
    "explanation": "Why this is true/false",
    "marks": 1
  }
]`;
    } else if (question_type === 'match_column') {
      systemPrompt = `You are creating match-the-column questions for ${subject}.`;
      userPrompt = `Create ${count} match-the-column questions based on:
Subject: ${subject}

Return ONLY a valid JSON array:
[
  {
    "question_text": "Match Column A with Column B",
    "options": {
      "columnA": [{"id": "1", "text": "Item 1"}],
      "columnB": [{"id": "a", "text": "Match 1"}],
      "correctMatches": [{"a": "1", "b": "a"}]
    },
    "explanation": "Matching explanation",
    "marks": 2
  }
]`;
    } else if (question_type === 'subjective') {
      systemPrompt = `You are creating subjective questions for ${subject}.`;
      userPrompt = `Create ${count} subjective questions based on:
Subject: ${subject}
Difficulty: ${difficulty}

Return ONLY a valid JSON array:
[
  {
    "question_text": "Explain the concept...",
    "sample_answer": "A detailed sample answer",
    "word_limit": 150,
    "marks": 5,
    "explanation": "Key points to cover"
  }
]`;
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
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    let generatedQuestions = aiData.choices[0].message.content;

    // Extract JSON from markdown code blocks if present
    if (generatedQuestions.includes('```json')) {
      generatedQuestions = generatedQuestions.split('```json')[1].split('```')[0].trim();
    } else if (generatedQuestions.includes('```')) {
      generatedQuestions = generatedQuestions.split('```')[1].split('```')[0].trim();
    }

    const questions = JSON.parse(generatedQuestions);

    const insertedQuestions = [];
    for (const q of questions) {
      const questionData: any = {
        source_id,
        study_content_id,
        question_type,
        question_text: q.question_text,
        explanation: q.explanation || null,
        difficulty,
        marks: q.marks || 1,
        subject,
        chapter_name,
        topic_name,
        is_approved: false,
      };

      if (question_type === 'mcq') {
        questionData.options = q.options;
        const correctOption = q.options.find((opt: any) => opt.isCorrect);
        questionData.correct_answer = correctOption?.text || '';
      } else if (question_type === 'fill_up' || question_type === 'true_false') {
        questionData.correct_answer = q.correct_answer;
      } else if (question_type === 'match_column') {
        questionData.options = q.options;
        questionData.correct_answer = JSON.stringify(q.options.correctMatches);
      } else if (question_type === 'subjective') {
        questionData.correct_answer = q.sample_answer;
        questionData.options = { word_limit: q.word_limit || 150 };
      }

      const { data, error } = await supabaseClient
        .from('generated_questions')
        .insert(questionData)
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        continue;
      }

      await supabaseClient
        .from('content_approval_queue')
        .insert({
          source_id,
          content_type: 'question',
          content_id: data.id,
          status: 'pending',
        });

      insertedQuestions.push(data);
    }

    console.log(`Generated ${insertedQuestions.length} ${question_type} questions`);

    return new Response(JSON.stringify({
      success: true,
      count: insertedQuestions.length,
      questions: insertedQuestions,
      message: `${insertedQuestions.length} questions generated and queued for approval`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Question generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
