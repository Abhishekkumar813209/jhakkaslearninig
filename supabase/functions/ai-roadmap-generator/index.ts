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
      time_budget,
      intensity = 'balanced' // 'full' | 'important' | 'balanced'
    } = await req.json();

    console.log('Received request:', { batch_id, exam_type, exam_name, mode, time_budget, intensity });

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

    // Create AI prompt with time budget and intensity
    const systemPrompt = `You are an expert educational roadmap planner specialized in mathematical time budget distribution and adaptive chapter selection based on importance.

CRITICAL RULES - MUST FOLLOW:
1. Return ONLY valid JSON, no markdown or extra text
2. **The sum of estimated_days per subject MUST EXACTLY equal the time_budget**
3. **BUDGET ADHERENCE IS ABSOLUTE - If budget is tight (e.g., 30 days for 25 chapters), distribute proportionally even if it means 1-2 days per chapter**
4. **CHAPTER SELECTION BASED ON INTENSITY MODE** (see below)
5. **PARALLEL MODE: Each subject has an INDEPENDENT timeline starting from day 1**
   - Physics Day 1-30, Chemistry Day 1-30, Math Day 1-30 (all run concurrently)
   - Students can study all subjects in parallel, NOT sequentially
6. Distribute days based on chapter complexity AND available budget:
   - When budget allows (>5 days/chapter average): Complex chapters get 10-15 days, Moderate 6-9 days, Simple 4-6 days
   - When budget is tight (<3 days/chapter average): Distribute proportionally, e.g., Complex 2 days, Moderate 1 day, Simple 1 day
   - Always prioritize EXACT budget match over ideal day allocation

**INTENSITY MODES:**

A) "full" - Full Syllabus Coverage:
   - Include ALL chapters provided
   - Distribute days proportionally (even if 1-2 days/chapter)
   - For tight budgets (<2 days avg): Cluster related concepts into combined topics
   - Example: "Variables + Data Types + Operators" (1 combined chapter, 2 days)

B) "important" - Important Chapters Only:
   - Select top 70% of chapters based on importance_score
   - Prioritize chapters with exam_relevance="core" or "important"
   - Skip chapters with can_skip=true or importance_score < 5
   - Allocate 3-5 days per chapter for better learning outcomes

C) "balanced" - Balanced Mix:
   - Include ALL core chapters (exam_relevance="core")
   - Include 50% of important chapters (exam_relevance="important")
   - Allocate: Core chapters 4-6 days, Important 2-3 days
   - Skip optional chapters (exam_relevance="optional")

**CHAPTER CLUSTERING (for tight budgets in "full" mode):**
- If avg_days_per_chapter < 2: Combine related chapters
- Example: Instead of separate chapters, create:
  "Introduction to OS + OS Architecture" (combined, 2 days)
- Always maintain importance_score for transparency

Return format:
{
  "chapters": [
    {
      "chapter_name": "string",
      "subject": "string",
      "order_num": number, // order within this subject (1, 2, 3...)
      "estimated_days": number,
      "day_start": number, // independent timeline per subject, always starts from 1
      "day_end": number, // day_start + estimated_days - 1
      "importance_score": number, // from input data
      "is_clustered": boolean, // true if combining multiple concepts
      "topics": [
        {
          "topic_name": "string",
          "order_num": number,
          "estimated_hours": number
        }
      ]
    }
  ],
  "metadata": {
    "intensity": "full|important|balanced",
    "total_chapters_available": number,
    "total_chapters_included": number,
    "chapters_excluded": number,
    "clustering_applied": boolean,
    "parallel_mode": true
  }
}

IMPORTANT: For parallel mode, each subject's chapters start from day_start=1 independently.
Example: Physics Ch1 (Day 1-5), Physics Ch2 (Day 6-10), Chemistry Ch1 (Day 1-3), Chemistry Ch2 (Day 4-8)
This allows students to study multiple subjects simultaneously.`;
    
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

**INTENSITY MODE: ${intensity}**

**TIME BUDGET (MUST BE FULLY UTILIZED):**
${time_budget ? Object.entries(time_budget).map(([subject, days]) => {
  const subjectData = selected_subjects?.find((s: any) => s.subject === subject);
  const allChapters = subjectData?.selected_chapters || [];
  const chapterCount = allChapters.length;
  const avgDays = chapterCount > 0 ? Math.round((days as number) / chapterCount) : 0;
  const coreCount = allChapters.filter((c: any) => c.exam_relevance === 'core').length;
  const importantCount = allChapters.filter((c: any) => c.exam_relevance === 'important').length;
  
  return `- ${subject}: ${days} days total (${chapterCount} chapters, ~${avgDays} days/chapter average)
  🔴 Core: ${coreCount}, 🟡 Important: ${importantCount}`;
}).join('\n') : 'Not specified'}

${existing_syllabus ? `Context: ${existing_syllabus}` : ''}

${selected_subjects ? `
CHAPTERS WITH IMPORTANCE METADATA:
${selected_subjects.map((s: any) => {
  const budget = time_budget?.[s.subject] || 0;
  return `${s.subject} (${budget} days budget, Intensity: ${intensity}):\n${s.selected_chapters.map((c: any) => {
    const importanceBadge = c.exam_relevance === 'core' ? '🔴' : c.exam_relevance === 'important' ? '🟡' : '⚪';
    const skipIndicator = c.can_skip ? '[SKIPPABLE]' : '';
    return `  ${importanceBadge} ${c.chapter_name} (score: ${c.importance_score || 5}/10, days: ${c.suggested_days || 'auto'}) ${skipIndicator}`;
  }).join('\n')}`;
}).join('\n\n')}

**APPLY INTENSITY STRATEGY:**
- If intensity='full': Include ALL chapters above, distribute days proportionally
- If intensity='important': Select top 70% by importance_score, exclude can_skip=true
- If intensity='balanced': Include ALL core (🔴), 50% of important (🟡), skip optional (⚪)
` : ''}

**CRITICAL INSTRUCTIONS:**
1. Apply intensity filter FIRST to select chapters
2. Calculate: selected_budget ÷ number_of_selected_chapters = average_days
3. Distribute days around this average (complex +3 to +5, simple -2 to -3)
4. **VERIFY: Sum of all chapter days = time_budget EXACTLY**
5. If avg < 2 days AND intensity='full': Apply clustering (combine related chapters)
6. Always include importance_score in output for transparency
7. **PARALLEL MODE: Calculate day_start and day_end for each chapter within its subject timeline**
   - Each subject starts from day 1 independently
   - Example: Physics has 3 chapters (5, 7, 3 days) → Ch1: 1-5, Ch2: 6-12, Ch3: 13-15
   - Chemistry has 2 chapters (4, 6 days) → Ch1: 1-4, Ch2: 5-10
   - Both timelines run in parallel (students study both simultaneously)

Return JSON with chapters array (including day_start/day_end) and metadata object.`;


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
          // Calculate dynamic minimum based on budget
          const avgDaysPerChapter = (budgetDays as number) / subjectChapters.length;
          const minDays = Math.max(1, Math.floor(avgDaysPerChapter * 0.5)); // Half of average, minimum 1
          
          // Distribute difference proportionally
          const totalWeight = subjectChapters.reduce((sum: number, ch: any) => sum + (ch.estimated_days || minDays), 0);
          
          subjectChapters.forEach((ch: any) => {
            const proportion = (ch.estimated_days || minDays) / totalWeight;
            ch.estimated_days = Math.max(minDays, Math.round((ch.estimated_days || minDays) + (diff * proportion)));
          });

          // Final normalization - ensure exact budget match
          const newTotal = subjectChapters.reduce((sum: number, ch: any) => sum + ch.estimated_days, 0);
          const finalDiff = (budgetDays as number) - newTotal;
          
          if (finalDiff !== 0) {
            // Add remaining days to the first chapter
            subjectChapters[0].estimated_days = Math.max(minDays, subjectChapters[0].estimated_days + finalDiff);
          }

          console.log(`✅ Rebalanced ${subject}: ${currentTotal}d → ${budgetDays}d (min: ${minDays}d/chapter)`);
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
            time_budget,
            intensity,
            generation_timestamp: new Date().toISOString()
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

    // Insert chapters with AI-assigned days (including parallel timeline)
    for (const chapter of roadmapData.chapters) {
      const { data: insertedChapter, error: chapterError } = await supabase
        .from('roadmap_chapters')
        .insert({
          roadmap_id: roadmap.id,
          chapter_name: chapter.chapter_name,
          subject: chapter.subject,
          order_num: chapter.order_num,
          estimated_days: chapter.estimated_days || 3,
          day_start: chapter.day_start || null,
          day_end: chapter.day_end || null,
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