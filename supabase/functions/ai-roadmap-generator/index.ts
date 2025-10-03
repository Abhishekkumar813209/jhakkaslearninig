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
      batch_id,
      total_days = 15,
      subjects,
      target_class,
      target_board,
      conditional_class,    // From wizard frontend
      conditional_board,    // From wizard frontend
      exam_type,            // 'School', 'Engineering', 'Medical', 'SSC', etc.
      exam_name,            // Specific exam name
      roadmap_type,         // 'single_year' | 'combined' (for Engineering/Medical)
      selected_subjects,    // New structure from wizard
      existing_syllabus,
      auto_detect = true
    } = await req.json();

    console.log('Received request:', { batch_id, total_days, subjects, target_class, target_board, conditional_class, conditional_board, exam_type, exam_name, roadmap_type, auto_detect });

    // Smart extraction from description if auto_detect is enabled
    // Use conditional fields if provided (from wizard), fallback to target fields
    let extractedClass = conditional_class || target_class;
    let extractedBoard = conditional_board || target_board;
    let extractedSubjects = subjects || selected_subjects?.map(s => s.subject);

    if (auto_detect && existing_syllabus && (!target_class || !subjects || subjects.length === 0)) {
      console.log('Auto-detecting class and subjects from description...');
      
      // Extract class (look for "Class 10", "Class X", "10th", etc.)
      if (!extractedClass) {
        const classMatch = existing_syllabus.match(/(?:class|grade)\s*(\d+|[IVX]+)/i);
        if (classMatch) {
          extractedClass = classMatch[1];
          console.log('Auto-detected class:', extractedClass);
        }
      }

      // Extract subjects (common subject names)
      if (!extractedSubjects || extractedSubjects.length === 0) {
        const commonSubjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Hindi', 'Science', 'Social Science', 'Computer Science'];
        extractedSubjects = commonSubjects.filter(subject => 
          existing_syllabus.toLowerCase().includes(subject.toLowerCase())
        );
        console.log('Auto-detected subjects:', extractedSubjects);
      }
    }

    // Final validation
    if (!batch_id) {
      console.error('Validation failed: Missing batch_id');
      return new Response(JSON.stringify({ error: 'Batch ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Class is required for School, Engineering, and Medical exams
    if (['School', 'Engineering', 'Medical'].includes(exam_type) && !extractedClass) {
      console.error(`Validation failed: Missing class for ${exam_type} exam`);
      return new Response(JSON.stringify({ 
        error: `Student category is required for ${exam_type} exams` 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Roadmap type is required for 11th class Engineering/Medical students
    if (['Engineering', 'Medical'].includes(exam_type) && extractedClass === '11th' && !roadmap_type) {
      console.error('Validation failed: Missing roadmap_type for 11th class');
      return new Response(JSON.stringify({ 
        error: 'Please select roadmap duration (11th only or 11th+12th combined)' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!extractedSubjects || extractedSubjects.length === 0) {
      console.error('Validation failed: Missing subjects');
      return new Response(JSON.stringify({ error: 'At least one subject is required. Please specify or enable auto-detect.' }), {
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

    // Create AI prompt for roadmap generation
    const systemPrompt = `You are an expert educational curriculum planner. Create a detailed ${total_days}-day learning roadmap.`;
    
    // Construct context based on exam type and student category
    let studentContext = '';
    if (exam_type === 'School') {
      studentContext = `- Class: ${extractedClass}\n- Board: ${extractedBoard || 'General'}`;
    } else if (exam_type === 'Engineering' || exam_type === 'Medical') {
      const examName = exam_type === 'Engineering' ? 'IIT JEE' : 'NEET';
      
      if (extractedClass === '11th') {
        if (roadmap_type === 'single_year') {
          studentContext = `- Exam: ${examName}\n- Student: Class 11th (Foundation Year)\n- Focus: Complete Class 11 syllabus for strong foundation\n- Timeline: Current academic year (till March)\n- Strategy: NCERT mastery + conceptual clarity + basic problem solving`;
        } else if (roadmap_type === 'combined') {
          studentContext = `- Exam: ${examName}\n- Student: Class 11th (2-Year Plan)\n- Focus: Complete 11th + 12th syllabus with revision buffer\n- Timeline: 2 years (11th + 12th combined)\n- Strategy: Year 1 - 11th syllabus + foundation. Year 2 - 12th syllabus + advanced topics + mock tests + revision`;
        }
      } else if (extractedClass === '12th') {
        studentContext = `- Exam: ${examName}\n- Student: Class 12th (Final Year)\n- Focus: Complete 12th syllabus + 11th revision + exam strategy\n- Timeline: Current academic year (till exam in May)\n- Strategy: Fast-paced 12th completion + parallel 11th revision + problem solving + mock tests`;
      } else if (extractedClass === 'Dropper') {
        studentContext = `- Exam: ${examName}\n- Student: Dropper (12th Passed)\n- Focus: Full syllabus revision + advanced problem solving + test series\n- Timeline: Drop year preparation\n- Strategy: Intensive revision + previous year questions + mock tests + weak areas improvement`;
      }
    } else {
      studentContext = `- Exam: ${exam_name || exam_type}`;
    }

    const userPrompt = `Generate a ${total_days}-day learning roadmap for:
${studentContext}
- Subjects: ${extractedSubjects.join(', ')}
${existing_syllabus ? `- Context/Goals: ${existing_syllabus}` : ''}

Create a JSON response with this structure:
{
  "title": "Roadmap title",
  "description": "Brief description",
  "chapters": [
    {
      "chapter_name": "Chapter name",
      "subject": "Subject name",
      "order_num": 1,
      "estimated_days": 3,
      "day_start": 1,
      "day_end": 3,
      "topics": [
        {
          "topic_name": "Topic name",
          "order_num": 1,
          "estimated_hours": 2.5,
          "day_number": 1,
          "learning_objectives": ["objective1", "objective2"]
        }
      ]
    }
  ]
}

IMPORTANT GUIDELINES:
1. Distribute ${total_days} days evenly across chapters
2. ${roadmap_type === 'combined' ? 'Year 1: Focus on 11th syllabus. Year 2: Focus on 12th syllabus with revision' : 'Optimize for the given timeline'}
3. Each topic should have realistic estimated_hours (1-4 hours)
4. Ensure progressive difficulty
5. ${extractedClass === 'Dropper' ? 'Emphasize mock tests and previous year questions' : 'Progress from basic to advanced'}
6. Include variety: theory, practice, tests
7. day_start and day_end must be within 1-${total_days}`;

    // Call Lovable AI Gateway (Gemini 2.5 Flash)
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
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;
    
    // Parse AI response
    let roadmapData;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : generatedContent;
      roadmapData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + total_days);

    // Insert roadmap with metadata
    const { data: roadmap, error: roadmapError } = await supabase
      .from('batch_roadmaps')
      .insert({
        batch_id,
        title: roadmapData.title,
        description: roadmapData.description,
        total_days,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'draft',
        ai_generated_plan: {
          ...roadmapData,
          metadata: {
            exam_type,
            exam_name,
            roadmap_type,
            target_class: extractedClass,
            target_board: extractedBoard,
            subjects: extractedSubjects,
            auto_detected: auto_detect && (extractedClass !== target_class || JSON.stringify(extractedSubjects) !== JSON.stringify(subjects))
          }
        },
        created_by: user.id
      })
      .select()
      .single();

    console.log('Roadmap created:', roadmap?.id);

    if (roadmapError) {
      console.error('Roadmap insert error:', roadmapError);
      return new Response(JSON.stringify({ error: 'Failed to save roadmap' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert chapters and topics
    for (const chapter of roadmapData.chapters) {
      const { data: insertedChapter, error: chapterError } = await supabase
        .from('roadmap_chapters')
        .insert({
          roadmap_id: roadmap.id,
          chapter_name: chapter.chapter_name,
          subject: chapter.subject,
          order_num: chapter.order_num,
          estimated_days: chapter.estimated_days,
          day_start: chapter.day_start,
          day_end: chapter.day_end,
          xp_reward: chapter.estimated_days * 100
        })
        .select()
        .single();

      if (chapterError) {
        console.error('Chapter insert error:', chapterError);
        continue;
      }

      // Insert topics for this chapter
      if (chapter.topics) {
        for (const topic of chapter.topics) {
          await supabase
            .from('roadmap_topics')
            .insert({
              chapter_id: insertedChapter.id,
              topic_name: topic.topic_name,
              order_num: topic.order_num,
              estimated_hours: topic.estimated_hours,
              day_number: topic.day_number,
              xp_reward: Math.round(topic.estimated_hours * 25),
              coin_reward: Math.round(topic.estimated_hours * 5)
            });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      roadmap_id: roadmap.id,
      roadmap: roadmapData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-roadmap-generator:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
