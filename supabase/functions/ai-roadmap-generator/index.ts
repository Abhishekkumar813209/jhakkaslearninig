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

CRITICAL: 65-25-10 DISTRIBUTED REVISION STRATEGY
This is our competitive edge. You MUST implement extensive revision throughout the roadmap:

**65-25-10 Rule (Daily Time Distribution):**
- 65% New Content Learning
- 25% Distributed Revision (spread throughout the week, NOT a single day)
- 10% Testing & Problem Solving

**Daily Revision Integration:**
Every single day MUST include revision topics alongside new content:
- Morning: Quick 15-30 min micro-revision of previous day's concepts
- During study: Mini-revision (30-60 min) of topics from 2-3 days ago
- Evening: Practice problems mixing new + old topics (10% testing component)

**Weekly Revision Pattern (7-Day Cycle Example):**
Day 1: 65% New (Ch1 Topic1) + 25% Revision (Formulas/basics from prerequisites) + 10% Quick MCQs
Day 2: 65% New (Ch1 Topic2) + 25% Revision (Day 1 topics + quick recap) + 10% Problem solving
Day 3: 65% New (Ch1 Topic3) + 25% Revision (Day 1-2 consolidation) + 10% Mixed practice
Day 4: 65% New (Ch2 Topic1) + 25% Revision (Ch1 full recap) + 10% Chapter-wise test
Day 5: 65% New (Ch2 Topic2) + 25% Revision (Day 4 + Ch1 weak areas) + 10% Problem solving
Day 6: 65% New (Ch2 Topic3) + 25% Revision (Day 4-5 + Ch1 formulas) + 10% Quick quiz
Day 7: 40% New (Ch3 Topic1) + 40% Full Week Revision (Ch1-2 complete) + 20% Weekly mock test

**Revision Types to Include in Topics:**
1. **Micro-Revision (Daily - 15-30 min)**: 
   - Topic name format: "Quick Revision: [Previous topic formulas/key points]"
   - Example: "Quick Revision: Newton's Laws formulas + previous day concepts"

2. **Mini-Revision (Every 3 days - 1 hour)**:
   - Topic name format: "Mini Revision: [Last 3 days consolidation]"
   - Example: "Mini Revision: Kinematics full recap + problem solving"

3. **Weekly Revision (Every 7th day - 2-3 hours)**:
   - Create dedicated chapter: "chapter_name": "Weekly Revision: Week [N]"
   - Topics: Full week recap, formula sheets, chapter-wise mock test

4. **Monthly Major Revision (Every 30 days - 4-5 hours)**:
   - Create dedicated chapter: "chapter_name": "Monthly Mega Revision: Month [N]"
   - Topics: Complete month syllabus, subject-wise full test, PYQs practice, weak area focus

5. **Grand Pre-Exam Revision (Last 15-20 days)**:
   - Final intensive chapters with ONLY revision + mock tests + formula consolidation
   - 70% revision + 30% full-length tests

**Student-Specific Revision Intensity:**
${extractedClass === 'Dropper' ? `- DROPPER FOCUS: 40% New + 40% Intensive Revision + 20% Mock Tests
  - Every day must have heavy revision component
  - Weekly: 3 full mock tests minimum
  - Monthly: Complete syllabus revision cycle
  - Focus on weak areas and PYQs` : ''}

${extractedClass === '12th' ? `- CLASS 12 FOCUS: 50% New (12th syllabus) + 30% Revision (11th + 12th) + 20% Testing
  - Parallel 11th revision throughout
  - Weekly: 2 mock tests (1 for 11th revision, 1 for 12th new)
  - Monthly: Full 11th subject-wise revision` : ''}

${extractedClass === '11th' && roadmap_type === 'combined' ? `- CLASS 11 (2-YEAR PLAN): 70% New + 20% Revision + 10% Testing (Year 1)
  - Year 1: Foundation building, less revision pressure
  - Year 2: 50% New (12th) + 35% Revision (11th+12th) + 15% Mock Tests
  - Monthly 11th revision starts from Year 2` : ''}

${extractedClass === '11th' && roadmap_type === 'single_year' ? `- CLASS 11 (SINGLE YEAR): 70% New + 20% Revision + 10% Testing
  - Focus on NCERT mastery
  - Weekly: Concept revision + basic problem solving
  - Monthly: Chapter-wise tests only` : ''}

**Mandatory Revision Chapters to Create:**
1. After every 7 days: "Weekly Revision: Week [N]" with topics:
   - "Quick Revision: All topics from Week [N]"
   - "Formula Consolidation: Week [N]"
   - "Weekly Mock Test: Week [N] assessment"

2. After every 30 days: "Monthly Mega Revision: Month [N]" with topics:
   - "Subject-wise Full Revision: [Subject]"
   - "Monthly Full Test: [All subjects covered]"
   - "PYQ Practice: Previous Year Questions"
   - "Weak Areas Focus Session"

3. Last 15-20 days (if total_days > 100): "Final Revision Sprint" chapters:
   - "Grand Revision: Full Syllabus Day [N]"
   - "Full-Length Mock Test [N]"
   - "Formula & Concept Sheet Mastery"
   - "Exam Strategy & Time Management"

**Example Roadmap Output with Revision:**
{
  "chapters": [
    {
      "chapter_name": "Mechanics: Kinematics",
      "subject": "Physics",
      "day_start": 1,
      "day_end": 4,
      "topics": [
        {"topic_name": "Motion in Straight Line (New)", "estimated_hours": 2.0, "day_number": 1},
        {"topic_name": "Quick Revision: Basic math prerequisites", "estimated_hours": 0.5, "day_number": 1},
        {"topic_name": "Practice: Motion problems (10% testing)", "estimated_hours": 0.5, "day_number": 1},
        {"topic_name": "Relative Motion (New)", "estimated_hours": 2.0, "day_number": 2},
        {"topic_name": "Mini Revision: Day 1 concepts + formulas", "estimated_hours": 0.75, "day_number": 2},
        {"topic_name": "Graphs of Motion (New)", "estimated_hours": 1.5, "day_number": 3},
        {"topic_name": "Mini Revision: Day 1-2 consolidation", "estimated_hours": 1.0, "day_number": 3},
        {"topic_name": "Projectile Motion (New)", "estimated_hours": 1.5, "day_number": 4},
        {"topic_name": "Chapter Revision: Full Kinematics recap", "estimated_hours": 1.0, "day_number": 4},
        {"topic_name": "Chapter Test: Kinematics assessment", "estimated_hours": 0.5, "day_number": 4}
      ]
    },
    {
      "chapter_name": "Weekly Revision: Week 1",
      "subject": "Multi-subject",
      "day_start": 7,
      "day_end": 7,
      "topics": [
        {"topic_name": "Quick Revision: All Week 1 topics recap", "estimated_hours": 1.5, "day_number": 7},
        {"topic_name": "Formula Consolidation: Week 1 formulas", "estimated_hours": 1.0, "day_number": 7},
        {"topic_name": "Weekly Mock Test: Week 1 comprehensive test", "estimated_hours": 1.5, "day_number": 7}
      ]
    }
  ]
}

IMPORTANT FINAL GUIDELINES:
1. Distribute ${total_days} days with 25% dedicated to revision activities
2. ${roadmap_type === 'combined' ? 'Year 1: 70-20-10. Year 2: 50-35-15 (more revision)' : 'Follow 65-25-10 strictly'}
3. Every topic must have realistic estimated_hours (0.5-4 hours)
4. Revision topics are MANDATORY - they give us competitive advantage
5. Create explicit "Weekly Revision" and "Monthly Revision" chapters
6. Mix new content + revision + testing EVERY SINGLE DAY
7. day_start and day_end must be within 1-${total_days}
8. Include variety: theory (65%), distributed revision (25%), tests (10%)`;

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
