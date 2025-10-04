import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate parallel timeline
const calculateParallelTimeline = (selectedSubjects: any[], totalDays: number) => {
  // Find max number of chapters across subjects
  const maxChapters = Math.max(...selectedSubjects.map(s => s.selected_chapters.length));
  
  const cycles: any[] = [];
  let currentDay = 1;
  
  for (let cycleIndex = 0; cycleIndex < maxChapters; cycleIndex++) {
    const cycleChapters: any[] = [];
    let maxCycleDuration = 7; // Default 7 days per cycle (1 week)
    
    // For each subject, pick the chapter at this cycle index
    selectedSubjects.forEach(subject => {
      const chapter = subject.selected_chapters[cycleIndex];
      if (chapter) {
        const chapterDays = chapter.suggested_days || 7;
        cycleChapters.push({
          subject: subject.subject,
          chapter_name: chapter.chapter_name,
          suggested_days: chapterDays,
        });
        // Track the longest chapter in this cycle
        maxCycleDuration = Math.max(maxCycleDuration, chapterDays);
      }
    });
    
    // All chapters in this cycle run from currentDay to currentDay + maxCycleDuration
    cycleChapters.forEach(ch => {
      ch.day_start = currentDay;
      ch.day_end = currentDay + maxCycleDuration - 1;
    });
    
    cycles.push({
      cycle_number: cycleIndex + 1,
      start_day: currentDay,
      end_day: currentDay + maxCycleDuration - 1,
      duration: maxCycleDuration,
      chapters: cycleChapters
    });
    
    currentDay += maxCycleDuration;
  }
  
  return {
    cycles,
    total_duration: currentDay - 1,
    mode: 'parallel'
  };
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
      conditional_class,
      conditional_board,
      exam_type,
      exam_name,
      roadmap_type,
      selected_subjects,
      existing_syllabus,
      auto_detect = true,
      mode = 'parallel',
      title
    } = await req.json();

    console.log('Received request:', { batch_id, total_days, exam_type, exam_name, mode });

    // Smart extraction
    let extractedClass = conditional_class || target_class;
    let extractedBoard = conditional_board || target_board;
    let extractedSubjects = subjects || selected_subjects?.map((s: any) => s.subject);

    if (auto_detect && existing_syllabus && (!target_class || !subjects || subjects.length === 0)) {
      console.log('Auto-detecting class and subjects from description...');
      
      if (!extractedClass) {
        const classMatch = existing_syllabus.match(/(?:class|grade)\s*(\d+|[IVX]+)/i);
        if (classMatch) {
          extractedClass = classMatch[1];
          console.log('Auto-detected class:', extractedClass);
        }
      }

      if (!extractedSubjects || extractedSubjects.length === 0) {
        const commonSubjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Hindi', 'Science', 'Social Science', 'Computer Science'];
        extractedSubjects = commonSubjects.filter(subject => 
          existing_syllabus.toLowerCase().includes(subject.toLowerCase())
        );
        console.log('Auto-detected subjects:', extractedSubjects);
      }
    }

    // Validation
    if (!batch_id) {
      return new Response(JSON.stringify({ error: 'Batch ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (['School', 'Engineering', 'Medical-UG', 'Medical-PG'].includes(exam_type) && !extractedClass) {
      return new Response(JSON.stringify({ 
        error: `Student category is required for ${exam_type} exams` 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!extractedSubjects || extractedSubjects.length === 0) {
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

    // Calculate parallel timeline structure
    const timelineStructure = mode === 'parallel' && selected_subjects 
      ? calculateParallelTimeline(selected_subjects, total_days)
      : null;

    // Create AI prompt
    const systemPrompt = mode === 'parallel' 
      ? `You are an expert educational curriculum planner. Create a PARALLEL study roadmap (school timetable style).

CRITICAL: All subjects run SIMULTANEOUSLY in cycles (weeks).

Rules:
- Each cycle = 1 week (or based on longest chapter in that cycle)
- ALL subjects have chapters running in the SAME week
- Example:
  Week 1 (Day 1-7): Physics Ch1 + Chemistry Ch1 + Biology Ch1 (all run together)
  Week 2 (Day 8-14): Physics Ch2 + Chemistry Ch2 + Biology Ch2 (all run together)
- If one subject has fewer chapters, leave it blank in later cycles
- Duration of each cycle = MAX(chapter durations in that cycle)
- Total roadmap days = sum of all cycle durations (NOT sum of all chapters)`
      : `You are an expert educational curriculum planner. Create a ${total_days}-day learning roadmap.`;
    
    let studentContext = '';
    if (exam_type === 'School') {
      studentContext = `- Class: ${extractedClass}\n- Board: ${extractedBoard || 'General'}`;
    } else if (exam_type === 'Engineering' || exam_type === 'Medical-UG' || exam_type === 'Medical-PG') {
      const examName = exam_type === 'Engineering' ? 'IIT JEE' : exam_type === 'Medical-UG' ? 'NEET UG' : 'NEET PG';
      
      if (extractedClass === '11') {
        if (roadmap_type === 'single_year') {
          studentContext = `- Exam: ${examName}\n- Student: Class 11th (Foundation Year)\n- Focus: Complete Class 11 syllabus for strong foundation`;
        } else if (roadmap_type === 'combined') {
          studentContext = `- Exam: ${examName}\n- Student: Class 11th (2-Year Plan)\n- Focus: Complete 11th + 12th syllabus with revision buffer`;
        }
      } else if (extractedClass === '12') {
        studentContext = `- Exam: ${examName}\n- Student: Class 12th (Final Year)\n- Focus: Complete 12th syllabus + 11th revision + exam strategy`;
      } else if (extractedClass === 'dropper') {
        studentContext = `- Exam: ${examName}\n- Student: Dropper (12th Passed)\n- Focus: Full syllabus revision + advanced problem solving + test series`;
      }
    } else {
      studentContext = `- Exam: ${exam_name || exam_type}`;
    }

    const userPrompt = mode === 'parallel' && timelineStructure
      ? `Generate a PARALLEL study roadmap for:
${studentContext}
- Subjects: ${extractedSubjects.join(', ')}
${existing_syllabus ? `- Context/Goals: ${existing_syllabus}` : ''}

TIMELINE STRUCTURE (use this):
${JSON.stringify(timelineStructure, null, 2)}

Create a JSON response with this structure:
{
  "title": "${title || 'Parallel Learning Roadmap'}",
  "description": "Brief description",
  "chapters": [
    {
      "chapter_name": "Chapter name",
      "subject": "Subject name",
      "order_num": 1,
      "estimated_days": 7,
      "day_start": 1,
      "day_end": 7,
      "topics": [
        {
          "topic_name": "Topic name",
          "order_num": 1,
          "estimated_hours": 2.5,
          "day_number": 1
        }
      ]
    }
  ]
}

CRITICAL REQUIREMENTS for PARALLEL MODE:
- ALL subjects must run in the SAME week
- Week 1: Physics Ch1 + Chemistry Ch1 + Biology Ch1 (days 1-7)
- Week 2: Physics Ch2 + Chemistry Ch2 + Biology Ch2 (days 8-14)
- Use the cycle structure provided above
- Each cycle's duration = MAX(chapter durations in that cycle)
- Total duration = ${timelineStructure.total_duration} days (NOT ${total_days})`
      : `Generate a ${total_days}-day learning roadmap for:
${studentContext}
- Subjects: ${extractedSubjects.join(', ')}
${existing_syllabus ? `- Context/Goals: ${existing_syllabus}` : ''}

Create a JSON response with this structure:
{
  "title": "${title || 'Learning Roadmap'}",
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
          "day_number": 1
        }
      ]
    }
  ]
}`;

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
    const actualTotalDays = mode === 'parallel' && timelineStructure 
      ? timelineStructure.total_duration 
      : total_days;
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + actualTotalDays);

    // Insert roadmap with metadata
    const { data: roadmap, error: roadmapError } = await supabase
      .from('batch_roadmaps')
      .insert({
        batch_id,
        title: roadmapData.title,
        description: roadmapData.description,
        total_days: actualTotalDays,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'draft',
        mode: mode,
        selected_subjects: extractedSubjects,
        exam_type,
        exam_name,
        ai_generated_plan: {
          ...roadmapData,
          metadata: {
            exam_type,
            exam_name,
            roadmap_type,
            target_class: extractedClass,
            target_board: extractedBoard,
            subjects: extractedSubjects,
            mode,
            timeline_structure: timelineStructure
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