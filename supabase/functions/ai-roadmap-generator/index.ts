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
      title,
      time_budget
    } = await req.json();

    console.log('Received request:', { batch_id, exam_type, exam_name, mode, time_budget });

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

    // Create AI prompt with time budget
    const systemPrompt = `You are an expert educational roadmap planner specialized in mathematical time budget distribution.

CRITICAL RULES - MUST FOLLOW:
1. Return ONLY valid JSON, no markdown or extra text
2. **The sum of estimated_days per subject MUST EXACTLY equal the time_budget**
3. Distribute days based on chapter complexity:
   - Complex chapters (Puzzles, Calculus, Organic Chemistry, Modern Physics): 10-15 days
   - Moderate chapters (Algebra, Mechanics, Inorganic Chemistry): 6-9 days
   - Simple chapters (Basic concepts, Definitions, Short topics): 4-6 days
4. Reserve 3-5% of total budget for revision within complex chapters

**MATHEMATICAL EXAMPLE:**
Subject: Reasoning
Time Budget: 100 days
Total Chapters: 13
Average per chapter: 100 ÷ 13 = ~7.7 days

CORRECT Distribution Strategy:
- Puzzles (complex): 12 days
- Seating Arrangement (complex): 11 days
- Logical Reasoning: 10 days
- Blood Relations: 9 days
- Coding-Decoding: 8 days
- Syllogism: 8 days
- Series: 7 days
- Analogy: 7 days
- Data Sufficiency: 6 days
- Verbal Reasoning: 6 days
- Direction Sense: 6 days
- Non-Verbal: 5 days
- Revision & Practice: 5 days
**TOTAL = 100 days ✓**

WRONG Example (DO NOT DO THIS):
- All chapters: 3-5 days = Only 45 days used ❌
- Wastes 55 days of budget ❌

Return format:
{
  "chapters": [
    {
      "chapter_name": "string",
      "subject": "string",
      "order_num": number,
      "estimated_days": number,
      "topics": [
        {
          "topic_name": "string",
          "order_num": number,
          "estimated_hours": number
        }
      ]
    }
  ]
}`;
    
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

    const userPrompt = `Create a learning roadmap for:

${studentContext}
Subjects: ${extractedSubjects.join(', ')}

**TIME BUDGET (MUST BE FULLY UTILIZED):**
${time_budget ? Object.entries(time_budget).map(([subject, days]) => {
  const chapterCount = selected_subjects?.find((s: any) => s.subject === subject)?.selected_chapters?.length || 10;
  const avgDays = Math.round((days as number) / chapterCount);
  return `- ${subject}: ${days} days total (${chapterCount} chapters, ~${avgDays} days/chapter average)`;
}).join('\n') : 'Not specified'}

${existing_syllabus ? `Context: ${existing_syllabus}` : ''}

${selected_subjects ? `
CHAPTERS TO INCLUDE (with client-computed suggested days as hints):
${selected_subjects.map((s: any) => {
  const budget = time_budget?.[s.subject] || 0;
  return `${s.subject} (${budget} days budget):\n${s.selected_chapters.map((c: any) => 
    `  - ${c.chapter_name} (suggested: ${c.suggested_days || 'auto'} days)`
  ).join('\n')}`;
}).join('\n\n')}

**Use these suggested_days as baseline hints, but ensure final distribution sums to exact budget.**
` : ''}

**CRITICAL INSTRUCTIONS:**
1. Calculate: total_budget ÷ number_of_chapters = average_days
2. Distribute days around this average (complex chapters +3 to +5, simple -2 to -3)
3. Complex/difficult chapters get MORE than average
4. Simple/easy chapters get LESS than average
5. **VERIFY BEFORE RETURNING: Sum of all chapter days = time_budget EXACTLY**
6. Add small revision/buffer in last chapter (3-5% of total)

Mathematical Example:
- Budget: 100 days, Chapters: 13 → Average = 7.7 days
- Assign days: [12, 11, 10, 9, 8, 8, 7, 7, 6, 6, 6, 5, 5] = 100 ✓
- NOT: [3, 4, 5, 3, 4, 5...] = Only 50 days ❌

Return JSON with chapters array containing:
- chapter_name
- subject
- order_num
- estimated_days (MUST sum to budget)
- topics array (topic_name, order_num, estimated_hours)`;

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

    console.log('Generated roadmap with', roadmapData.chapters?.length || 0, 'chapters');

    // Validate time budget distribution
    const subjectDaysMap = new Map();
    roadmapData.chapters.forEach((chapter: any) => {
      const current = subjectDaysMap.get(chapter.subject) || 0;
      subjectDaysMap.set(chapter.subject, current + (chapter.estimated_days || 0));
    });

    console.log('📊 Time Budget Validation:');
    let hasError = false;
    if (time_budget) {
      for (const [subject, budgetDays] of Object.entries(time_budget)) {
        const assignedDays = subjectDaysMap.get(subject) || 0;
        const diff = assignedDays - (budgetDays as number);
        const status = Math.abs(diff) <= 5 ? '✅' : '❌';
        
        console.log(`${status} ${subject}: Budget=${budgetDays}d, Assigned=${assignedDays}d, Diff=${diff}d`);
        
        if (Math.abs(diff) > 10) {
          hasError = true;
        }
      }
    }

    // Rebalance if needed
    if (hasError && time_budget) {
      console.log('🔧 Rebalancing time budget distribution...');
      
      for (const [subject, budgetDays] of Object.entries(time_budget)) {
        const subjectChapters = roadmapData.chapters.filter((ch: any) => ch.subject === subject);
        if (subjectChapters.length === 0) continue;

        const currentTotal = subjectChapters.reduce((sum: number, ch: any) => sum + (ch.estimated_days || 0), 0);
        const diff = (budgetDays as number) - currentTotal;

        if (Math.abs(diff) > 2) {
          // Distribute difference proportionally
          const totalWeight = subjectChapters.reduce((sum: number, ch: any) => sum + (ch.estimated_days || 3), 0);
          
          subjectChapters.forEach((ch: any) => {
            const proportion = (ch.estimated_days || 3) / totalWeight;
            ch.estimated_days = Math.max(3, Math.round((ch.estimated_days || 3) + (diff * proportion)));
          });

          // Final normalization
          const newTotal = subjectChapters.reduce((sum: number, ch: any) => sum + ch.estimated_days, 0);
          const finalDiff = (budgetDays as number) - newTotal;
          
          if (finalDiff !== 0) {
            subjectChapters[0].estimated_days += finalDiff;
          }

          console.log(`✅ Rebalanced ${subject}: ${currentTotal}d → ${budgetDays}d`);
        }
      }
    }

    // Insert roadmap with metadata
    const { data: roadmap, error: roadmapError } = await supabase
      .from('batch_roadmaps')
      .insert({
        batch_id,
        title: roadmapData.title || title || 'AI Generated Roadmap',
        description: roadmapData.description || 'AI generated learning path',
        total_days: null, // Will be calculated from parallel mode
        start_date: null,
        end_date: null,
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
            time_budget
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

    // Insert chapters with AI-assigned days
    for (const chapter of roadmapData.chapters) {
      const { data: insertedChapter, error: chapterError } = await supabase
        .from('roadmap_chapters')
        .insert({
          roadmap_id: roadmap.id,
          chapter_name: chapter.chapter_name,
          subject: chapter.subject,
          order_num: chapter.order_num,
          estimated_days: chapter.estimated_days || 3,
          day_start: null,
          day_end: null,
          xp_reward: 100
        })
        .select()
        .single();

      if (chapterError) {
        console.error('Chapter insert error:', chapterError);
        continue;
      }

      // Insert topics for this chapter
      if (chapter.topics && Array.isArray(chapter.topics)) {
        for (const topic of chapter.topics) {
          await supabase
            .from('roadmap_topics')
            .insert({
              chapter_id: insertedChapter.id,
              topic_name: topic.topic_name,
              order_num: topic.order_num,
              estimated_hours: topic.estimated_hours || 2,
              day_number: null,
              xp_reward: 50,
              coin_reward: 10
            });
        }
      }
    }

    console.log('✅ Roadmap created successfully with AI-assigned time budget');

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