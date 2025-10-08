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

    // Fallback: Fetch exam_type and exam_name from batch if not provided
    let finalExamType = exam_type;
    let finalExamName = exam_name;
    
    if ((!finalExamType || !finalExamName) && batch_id) {
      console.log('📦 Fetching exam info from batch...');
      const { data: batch } = await supabase
        .from('batches')
        .select('exam_type, exam_name')
        .eq('id', batch_id)
        .single();
      
      if (batch) {
        finalExamType = finalExamType || batch.exam_type;
        finalExamName = finalExamName || batch.exam_name;
        console.log('📦 Fetched from batch:', { finalExamType, finalExamName });
      }
    }

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

    // Pre-generation budget check and warnings
    const budgetAnalysis: any = {};
    let needsClustering = false;
    
    if (time_budget && selected_subjects) {
      console.log('\n🔍 PRE-GENERATION BUDGET ANALYSIS:');
      for (const subj of selected_subjects) {
        const budget = time_budget[subj.subject] || 0;
        const chapterCount = subj.selected_chapters?.length || 0;
        const avgDays = chapterCount > 0 ? budget / chapterCount : 0;
        
        budgetAnalysis[subj.subject] = {
          budget,
          chapters: chapterCount,
          avgDays: avgDays.toFixed(2)
        };
        
        if (avgDays < 1.5 && intensity === 'full') {
          needsClustering = true;
          console.log(`⚠️ ${subj.subject}: TIGHT BUDGET - ${budget} days for ${chapterCount} chapters (${avgDays.toFixed(2)} days/chapter)`);
          console.log(`   → Will apply chapter clustering or aggressive filtering`);
        } else {
          console.log(`✅ ${subj.subject}: ${budget} days for ${chapterCount} chapters (${avgDays.toFixed(2)} days/chapter)`);
        }
      }
      console.log('');
    }

    // Create AI prompt with CRITICAL budget enforcement
    const systemPrompt = `You are an expert educational roadmap planner. Your PRIMARY MISSION is EXACT time budget allocation.

🚨 CRITICAL ERROR CONDITIONS - THESE WILL CAUSE FAILURE:
❌ If sum of chapter days ≠ time_budget → REGENERATE
❌ If any subject exceeds its budget → INVALID
❌ If chapters don't fit in budget → REDUCE chapters or MERGE them

**RULE #1 - ABSOLUTE BUDGET COMPLIANCE (NON-NEGOTIABLE):**
The sum of estimated_days for each subject MUST EXACTLY equal the time_budget for that subject.
- Example: Physics budget = 40 days, 25 chapters → Must total EXACTLY 40 days
- If 25 chapters × 1 day = 25 days ≠ 40 days → DISTRIBUTE the remaining 15 days
- Solution: Give some chapters 2 days instead of 1 day to reach exactly 40

**MATHEMATICAL EXAMPLES:**
Example 1: 40 days budget, 25 chapters
- Average: 40 ÷ 25 = 1.6 days/chapter
- Distribution: 15 chapters × 1 day + 10 chapters × 2 day = 15 + 20 = 35... WRONG!
- Correct: 10 chapters × 1 day + 15 chapters × 2 days = 10 + 30 = 40 ✅

Example 2: 15 days budget, 25 chapters (TIGHT!)
- Average: 15 ÷ 25 = 0.6 days/chapter → IMPOSSIBLE
- Solution in "full" mode: Merge chapters → Create 8-10 combined chapters
- Solution in "important" mode: Select only top 15 chapters × 1 day each = 15 ✅

Example 3: 30 days budget, 20 chapters
- Average: 30 ÷ 20 = 1.5 days/chapter
- Distribution: 10 chapters × 1 day + 10 chapters × 2 days = 10 + 20 = 30 ✅

**RULE #2 - RETURN ONLY VALID JSON:**
No markdown, no code blocks, no extra text. Start with { and end with }

**RULE #3 - PARALLEL MODE:**
Each subject has INDEPENDENT timeline starting from day 1
- Physics: Day 1-40, Chemistry: Day 1-30, Math: Day 1-35 (all concurrent)

**RULE #4 - INTENSITY MODES:**

A) "full" - ALL chapters must be included:
   - If budget allows (>1.5 days/chapter avg): Distribute naturally
   - If budget TIGHT (<1.5 days/chapter avg): MERGE related chapters
   - Example: Merge "Intro to OS" + "OS Architecture" → "OS Fundamentals" (2 days)
   - NEVER skip chapters in full mode, ALWAYS merge if needed

B) "important" - Select top 60-70% by importance:
   - Take top chapters by importance_score
   - Prioritize exam_relevance="core" or "important"
   - Skip can_skip=true chapters
   - Ensure selected chapters × avg_days = budget EXACTLY

C) "balanced" - Smart selection:
   - Include ALL exam_relevance="core" chapters
   - Include ~50% of "important" chapters
   - Skip "optional" chapters
   - Distribute days to match budget EXACTLY

**RULE #5 - BUDGET DISTRIBUTION STRATEGY:**
1. Calculate: available_budget ÷ selected_chapters = base_avg
2. Assign days based on complexity:
   - If base_avg ≥ 3: Complex (base_avg + 2), Moderate (base_avg), Simple (base_avg - 1)
   - If base_avg < 3: Complex (base_avg + 1), Moderate (base_avg), Simple (base_avg)
3. After initial assignment, calculate total
4. If total ≠ budget: Add/subtract days to largest chapters until exact match

Return format:
{
  "chapters": [
    {
      "chapter_name": "string",
      "subject": "string",
      "order_num": number,
      "estimated_days": number,
      "day_start": number,
      "day_end": number,
      "importance_score": number,
      "is_clustered": boolean,
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

**🎯 INTENSITY MODE: ${intensity}**
${needsClustering ? '⚠️ CLUSTERING REQUIRED - Budget is very tight, merge related chapters' : ''}

**💰 TIME BUDGET (MUST MATCH EXACTLY - NO DEVIATION ALLOWED):**
${time_budget ? Object.entries(time_budget).map(([subject, days]) => {
  const subjectData = selected_subjects?.find((s: any) => s.subject === subject);
  const allChapters = subjectData?.selected_chapters || [];
  const chapterCount = allChapters.length;
  const avgDays = chapterCount > 0 ? (days as number) / chapterCount : 0;
  const coreCount = allChapters.filter((c: any) => c.exam_relevance === 'core').length;
  const importantCount = allChapters.filter((c: any) => c.exam_relevance === 'important').length;
  const optionalCount = allChapters.length - coreCount - importantCount;
  
  return `
📚 ${subject}: ${days} days TOTAL (EXACT - NOT ${days-1} OR ${days+1})
   - Total chapters available: ${chapterCount}
   - Average per chapter: ${avgDays.toFixed(2)} days
   - Distribution: 🔴 Core: ${coreCount} | 🟡 Important: ${importantCount} | ⚪ Optional: ${optionalCount}
   ${avgDays < 1.5 ? `   ⚠️ TIGHT! Consider: ${intensity === 'full' ? 'Merge chapters into ' + Math.ceil(days / 2) + ' combined units' : 'Select only top ' + Math.floor(days) + ' chapters'}` : ''}
   ${avgDays >= 1.5 && avgDays < 3 ? `   ✅ MODERATE: Distribute ${Math.floor(chapterCount * 0.4)} chapters × 1 day, ${Math.ceil(chapterCount * 0.6)} chapters × 2 days` : ''}
   ${avgDays >= 3 ? `   ✅ COMFORTABLE: Can allocate 3-5 days per chapter` : ''}`;
}).join('\n') : 'Not specified'}

${existing_syllabus ? `Context: ${existing_syllabus}` : ''}

${selected_subjects ? `
📋 CHAPTERS WITH IMPORTANCE METADATA:
${selected_subjects.map((s: any) => {
  const budget = time_budget?.[s.subject] || 0;
  const analysis = budgetAnalysis[s.subject] || {};
  return `
${s.subject} - BUDGET: ${budget} days | AVG: ${analysis.avgDays || 0} days/chapter | MODE: ${intensity}
${s.selected_chapters.map((c: any, idx: number) => {
    const importanceBadge = c.exam_relevance === 'core' ? '🔴' : c.exam_relevance === 'important' ? '🟡' : '⚪';
    const skipIndicator = c.can_skip ? '[SKIP OK]' : '';
    return `  ${idx + 1}. ${importanceBadge} ${c.chapter_name} (importance: ${c.importance_score || 5}/10, suggested: ${c.suggested_days || 'auto'} days) ${skipIndicator}`;
  }).join('\n')}`;
}).join('\n\n')}

**🎯 APPLY INTENSITY STRATEGY (MANDATORY STEPS):**

Step 1 - SELECT CHAPTERS based on intensity:
- intensity='full': Include ALL ${selected_subjects?.reduce((sum: number, s: any) => sum + s.selected_chapters.length, 0)} chapters
  ${needsClustering ? '  → MERGE related chapters to fit budget (e.g., "Ch1 + Ch2 Fundamentals")' : ''}
- intensity='important': Select ONLY top 60-70% by importance_score, MUST skip can_skip=true
- intensity='balanced': Include ALL 🔴 core + 50% of 🟡 important + 0% of ⚪ optional

Step 2 - CALCULATE EXACT DISTRIBUTION:
For each subject:
  a) Count selected chapters: N
  b) Calculate base_avg = budget ÷ N (e.g., 40 ÷ 25 = 1.6)
  c) Distribute around base_avg:
     - Complex chapters: ceil(base_avg) days
     - Moderate chapters: round(base_avg) days  
     - Simple chapters: floor(base_avg) days
  d) Sum all assigned days
  e) If sum ≠ budget: Add/subtract difference to/from largest chapters
  f) **VERIFY: sum === budget** (CRITICAL!)

Step 3 - ASSIGN PARALLEL TIMELINES:
For each subject independently:
  - First chapter: day_start=1, day_end=estimated_days
  - Second chapter: day_start=previous_day_end+1, day_end=day_start+estimated_days-1
  - Continue for all chapters in sequence

**🚨 FINAL VERIFICATION CHECKLIST:**
Before returning JSON, verify:
✓ Each subject's chapter days sum EXACTLY equals its budget
✓ No subject exceeds its allocated days
✓ All day_start and day_end are calculated correctly
✓ Metadata reflects actual chapters included/excluded
✓ If tight budget + full mode → clustering_applied = true

Return ONLY the JSON structure (no markdown, no extra text).`;


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

    // Enhanced Rebalancing Algorithm
    if (hasError && time_budget) {
      console.log('🔧 AGGRESSIVE REBALANCING - Budget mismatch detected');
      
      for (const [subject, budgetDays] of Object.entries(time_budget)) {
        const subjectChapters = roadmapData.chapters.filter((ch: any) => ch.subject === subject);
        if (subjectChapters.length === 0) continue;

        const currentTotal = subjectChapters.reduce((sum: number, ch: any) => sum + (ch.estimated_days || 0), 0);
        const diff = (budgetDays as number) - currentTotal;

        if (Math.abs(diff) > 2) {
          console.log(`  📊 ${subject}: Current=${currentTotal}d, Budget=${budgetDays}d, Diff=${diff}d`);
          
          // Calculate dynamic minimum based on budget
          const avgDaysPerChapter = (budgetDays as number) / subjectChapters.length;
          const minDays = Math.max(1, Math.floor(avgDaysPerChapter * 0.6));
          
          if (diff > 0) {
            // Need to add days - distribute to complex/important chapters
            console.log(`  ➕ Adding ${diff} days...`);
            let remaining = diff;
            
            // Sort by importance and add days
            const sortedChapters = [...subjectChapters].sort((a, b) => 
              (b.importance_score || 5) - (a.importance_score || 5)
            );
            
            for (const ch of sortedChapters) {
              if (remaining <= 0) break;
              const addDays = Math.min(remaining, Math.ceil(avgDaysPerChapter * 0.5));
              ch.estimated_days += addDays;
              remaining -= addDays;
              console.log(`    → ${ch.chapter_name}: +${addDays} days (now ${ch.estimated_days}d)`);
            }
          } else {
            // Need to remove days - take from optional/less important chapters
            console.log(`  ➖ Removing ${Math.abs(diff)} days...`);
            let remaining = Math.abs(diff);
            
            // Sort by importance (ascending) and remove days
            const sortedChapters = [...subjectChapters].sort((a, b) => 
              (a.importance_score || 5) - (b.importance_score || 5)
            );
            
            for (const ch of sortedChapters) {
              if (remaining <= 0) break;
              const removeDays = Math.min(remaining, ch.estimated_days - minDays);
              ch.estimated_days -= removeDays;
              remaining -= removeDays;
              console.log(`    → ${ch.chapter_name}: -${removeDays} days (now ${ch.estimated_days}d)`);
            }
          }

          // Final exact normalization
          const newTotal = subjectChapters.reduce((sum: number, ch: any) => sum + ch.estimated_days, 0);
          const finalDiff = (budgetDays as number) - newTotal;
          
          if (finalDiff !== 0) {
            console.log(`  🎯 Final adjustment: ${finalDiff} days`);
            if (finalDiff > 0) {
              // Add to most important chapter
              const mostImportant = subjectChapters.reduce((max, ch) => 
                (ch.importance_score || 5) > (max.importance_score || 5) ? ch : max
              );
              mostImportant.estimated_days += finalDiff;
              console.log(`    → Added to ${mostImportant.chapter_name}`);
            } else {
              // Remove from least important chapter
              const leastImportant = subjectChapters.reduce((min, ch) => 
                (ch.importance_score || 5) < (min.importance_score || 5) && ch.estimated_days > minDays ? ch : min
              );
              leastImportant.estimated_days = Math.max(minDays, leastImportant.estimated_days + finalDiff);
              console.log(`    → Removed from ${leastImportant.chapter_name}`);
            }
          }

          const finalTotal = subjectChapters.reduce((sum: number, ch: any) => sum + ch.estimated_days, 0);
          console.log(`  ✅ ${subject}: ${currentTotal}d → ${finalTotal}d (target: ${budgetDays}d)`);
        }
      }
      
      // Recalculate timeline for each subject
      console.log('🔄 Recalculating parallel timelines...');
      const subjectTimelines: any = {};
      
      roadmapData.chapters.forEach((ch: any) => {
        if (!subjectTimelines[ch.subject]) {
          subjectTimelines[ch.subject] = 1;
        }
        ch.day_start = subjectTimelines[ch.subject];
        ch.day_end = ch.day_start + ch.estimated_days - 1;
        subjectTimelines[ch.subject] = ch.day_end + 1;
      });
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
        exam_type: finalExamType,
        exam_name: finalExamName,
        ai_generated_plan: {
          ...roadmapData,
          metadata: {
            exam_type: finalExamType,
            exam_name: finalExamName,
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