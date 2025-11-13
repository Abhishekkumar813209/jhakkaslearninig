import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to build system prompt (extracted to reduce file complexity)
function buildSystemPrompt(intensity: string) {
  return `You are an AI roadmap generator. Create a personalized learning roadmap based on the provided parameters.

**CRITICAL BUDGET CONSTRAINT:**
The time_budget provided is ABSOLUTE and NON-NEGOTIABLE. You MUST distribute days EXACTLY as allocated.

**❌ INCORRECT BUDGET EXAMPLES (THESE WILL FAIL VALIDATION):**

Example A - Physics: 120 days budget, 15 chapters
❌ WRONG: 15 chapters × 7 days = 105 days (SHORT by 15 days)
❌ WRONG: 15 chapters × 8 days = 120 days BUT 3 chapters × 10 days = 150 days (EXCEEDED)
✅ CORRECT: 
   - 10 chapters × 7 days = 70 days
   - 5 chapters × 10 days = 50 days
   - TOTAL: 70 + 50 = 120 days ✅

Example B - Chemistry: 88 days budget, 20 chapters
❌ WRONG: 20 chapters × 4 days = 80 days (SHORT by 8 days)
❌ WRONG: Generating only 15 chapters = 88 days but ignored 5 chapters
✅ CORRECT (if "full" mode):
   - 12 chapters × 4 days = 48 days
   - 8 chapters × 5 days = 40 days
   - TOTAL: 48 + 40 = 88 days ✅

**RULE #1 - INTENSITY MODES:**
- full: Include ALL chapters, merge if needed to fit budget
- important: Select top 60-70% by importance
- balanced: All core + 50% important + 0% optional

**RULE #2 - PARALLEL MODE (MANDATORY):**
Each subject runs independently with its own timeline starting from day 1.

**RULE #3 - TIME BUDGET ENFORCEMENT:**
NEVER exceed allocated days. If budget is tight, merge chapters or reduce scope.

**RULE #4 - CLUSTERING STRATEGY:**
When budget < 2 days/chapter average, merge related chapters into combined units.

**RULE #5 - MANDATORY BUDGET DISTRIBUTION ALGORITHM:**

STEP 1: Calculate base allocation
   base_days_per_chapter = budget / selected_chapter_count
   
STEP 2: Initial assignment by complexity
   - Simple chapters: floor(base_days_per_chapter)
   - Moderate chapters: round(base_days_per_chapter)
   - Complex chapters: ceil(base_days_per_chapter)

STEP 3: Calculate running total
   current_total = sum(all chapter estimated_days)

STEP 4: Adjust to exact match
   difference = budget - current_total
   
   IF difference > 0:
      - Sort chapters by (importance_score × complexity)
      - Add 1 day to top 'difference' chapters
   
   IF difference < 0:
      - Sort chapters by (low importance × low complexity)
      - Subtract 1 day from bottom 'abs(difference)' chapters (min 1 day)
   
STEP 5: Final verification
   ASSERT: sum(estimated_days) === budget
   IF NOT EQUAL → START OVER from STEP 1 with different base allocation

**NEVER return JSON without this verification passing!**

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
}

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
      board,
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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
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

    // Use helper function for system prompt to reduce bundle size
    const systemPrompt = buildSystemPrompt(intensity);
    
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
  ${needsClustering ? '  → MERGE related chapters to fit budget (e.g., Ch1 + Ch2 Fundamentals)' : ''}
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

Return ONLY the JSON structure (no markdown, no extra text).` : ''}
`;

    // RETRY LOGIC - Try up to 3 times if budget validation fails
    const MAX_RETRIES = 3;
    let attemptNumber = 1;
    let roadmapData: any = null;
    let generationSuccess = false;

    while (attemptNumber <= MAX_RETRIES && !generationSuccess) {
      console.log(`\n🔄 GENERATION ATTEMPT ${attemptNumber}/${MAX_RETRIES}`);
      
      // Modify prompt strictness based on attempt number
      let attemptSystemPrompt = systemPrompt;
      
      if (attemptNumber === 2) {
        attemptSystemPrompt += `\n\n🚨 RETRY ATTEMPT #2 - PREVIOUS ATTEMPT FAILED BUDGET VALIDATION!
    - Double-check every subject's total before returning JSON
    - Use STEP 4 adjustment algorithm MANDATORY
    - Penalty for mismatch: 2x importance on exact matching`;
      } else if (attemptNumber === 3) {
        attemptSystemPrompt += `\n\n🚨🚨 FINAL ATTEMPT #3 - THIS IS YOUR LAST CHANCE!
    - CRITICAL: Budget mismatch will result in complete failure
    - Verify EACH subject sum BEFORE generating JSON
    - If unsure, distribute days evenly first, then adjust
    - Penalty for mismatch: MAXIMUM - This attempt MUST succeed`;
      }

      try {
        // Make API call to Gemini
        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: attemptSystemPrompt },
                  { text: userPrompt }
                ]
              }],
              generationConfig: {
                temperature: attemptNumber === 1 ? 0.7 : attemptNumber === 2 ? 0.5 : 0.3, // Decrease creativity on retries
                maxOutputTokens: 8000,
              }
            })
          }
        );

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
          throw new Error(`API error: ${aiResponse.status}`);
        }

        const result = await aiResponse.json();
        const generatedText = result.candidates[0]?.content?.parts[0]?.text;
        
        if (!generatedText) {
          throw new Error('No content generated from Gemini');
        }

        // Parse JSON
        const cleanedText = generatedText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        roadmapData = JSON.parse(cleanedText);

        // INLINE BUDGET VALIDATION (happens INSIDE retry loop)
        console.log('\n📊 BUDGET VALIDATION (Attempt ' + attemptNumber + '):');
        let hasError = false;
        const subjectDaysMap = new Map<string, number>();

        roadmapData.chapters.forEach((ch: any) => {
          const current = subjectDaysMap.get(ch.subject) || 0;
          subjectDaysMap.set(ch.subject, current + (ch.estimated_days || 0));
        });

        if (time_budget) {
          for (const [subject, budgetDays] of Object.entries(time_budget)) {
            const assignedDays = subjectDaysMap.get(subject) || 0;
            const diff = assignedDays - (budgetDays as number);
            const status = diff === 0 ? '✅' : '❌';
            
            console.log(`${status} ${subject}: Budget=${budgetDays}d, Assigned=${assignedDays}d, Diff=${diff}d`);
            
            if (Math.abs(diff) > 0) {
              hasError = true;
            }
          }
        }

        // If validation passed, we're done!
        if (!hasError) {
          console.log(`✅ ATTEMPT ${attemptNumber} SUCCEEDED - Budget validation passed!`);
          generationSuccess = true;
          break;
        } else {
          console.log(`❌ ATTEMPT ${attemptNumber} FAILED - Budget mismatch detected`);
          
          if (attemptNumber < MAX_RETRIES) {
            console.log(`   → Will retry with stricter prompt (Attempt ${attemptNumber + 1})`);
          } else {
            console.log(`   → All ${MAX_RETRIES} attempts exhausted`);
          }
        }

      } catch (parseError) {
        console.error(`❌ ATTEMPT ${attemptNumber} ERROR:`, parseError);
      }

      attemptNumber++;
    }

    // Final check after all retries
    if (!generationSuccess || !roadmapData) {
      console.error('❌ GENERATION FAILED after all retries');
      return new Response(JSON.stringify({ 
        error: 'Failed to generate roadmap matching budget allocation after 3 attempts.',
        details: 'AI could not distribute the allocated days exactly. Please try: 1) Adjusting time budget, 2) Selecting fewer chapters, or 3) Using different intensity mode.',
        suggestion: 'Try increasing budget by 10-20% or reducing chapter count by 20-30%.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ ROADMAP GENERATION SUCCESSFUL (took ${attemptNumber - 1} attempt(s))`);

    // Validate time budget distribution (final verification)
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
        const status = diff === 0 ? '✅' : '❌';  // Only perfect match gets ✅
        
        console.log(`${status} ${subject}: Budget=${budgetDays}d, Assigned=${assignedDays}d, Diff=${diff}d`);
        
        if (Math.abs(diff) > 0) {  // Trigger rebalancing for ANY deviation
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

        if (Math.abs(diff) > 0) {  // Rebalance even 1 day difference
          console.log(`  📊 ${subject}: Current=${currentTotal}d, Budget=${budgetDays}d, Diff=${diff}d`);
          
          // Calculate dynamic minimum based on budget
          const avgDaysPerChapter = (budgetDays as number) / subjectChapters.length;
          const minDays = Math.max(1, Math.floor(avgDaysPerChapter * 0.6));
          
          if (diff > 0) {
            // Need to add days - distribute proportionally to all chapters
            console.log(`  ➕ Adding ${diff} days...`);
            let remaining = diff;
            
            // Distribute evenly across all chapters first
            const increment = Math.floor(diff / subjectChapters.length);
            
            for (const ch of subjectChapters) {
              if (increment > 0) {
                ch.estimated_days += increment;
                remaining -= increment;
                console.log(`    → ${ch.chapter_name}: +${increment} days (now ${ch.estimated_days}d)`);
              }
            }
            
            // Distribute remaining days to most important chapters
            if (remaining > 0) {
              const sortedByImportance = [...subjectChapters].sort((a, b) => 
                (b.importance_score || 5) - (a.importance_score || 5)
              );
              
              for (const ch of sortedByImportance) {
                if (remaining <= 0) break;
                ch.estimated_days += 1;
                remaining -= 1;
                console.log(`    → ${ch.chapter_name}: +1 day bonus (now ${ch.estimated_days}d)`);
              }
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

    // Final strict validation BEFORE inserting roadmap
    console.log('🔍 FINAL BUDGET VALIDATION:');
    let finalValidationFailed = false;

    if (time_budget) {
      for (const [subject, budgetDays] of Object.entries(time_budget)) {
        const subjectChapters = roadmapData.chapters.filter((ch: any) => ch.subject === subject);
        const actualTotal = subjectChapters.reduce((sum: number, ch: any) => sum + ch.estimated_days, 0);
        
        if (actualTotal !== budgetDays) {
          console.error(`❌ ${subject}: Budget=${budgetDays}d but actual=${actualTotal}d (diff: ${actualTotal - budgetDays}d)`);
          finalValidationFailed = true;
        } else {
          console.log(`✅ ${subject}: Perfect match at ${budgetDays} days`);
        }
      }
    }

    if (finalValidationFailed) {
      return new Response(JSON.stringify({ 
        error: 'Budget allocation failed validation. Please try regenerating the roadmap.',
        details: 'AI generated roadmap does not match allocated budget exactly. This is a system error, not your fault.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        exam_name: finalExamType === 'school' && (board || extractedBoard) && extractedClass 
          ? `${board || extractedBoard} Class ${extractedClass}`
          : finalExamName,
        board: finalExamType === 'school' ? (board || extractedBoard) : undefined,
        target_board: extractedBoard || board,
        target_class: extractedClass,
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

    // Build budget status for UI feedback
    const budgetStatusMap: any = {};
    if (time_budget) {
      for (const [subject, budgetDays] of Object.entries(time_budget)) {
        const subjectChapters = roadmapData.chapters.filter((ch: any) => ch.subject === subject);
        const actualTotal = subjectChapters.reduce((sum: number, ch: any) => sum + ch.estimated_days, 0);
        budgetStatusMap[subject] = {
          allocated: budgetDays,
          generated: actualTotal,
          status: actualTotal === budgetDays ? 'match' : 'mismatch'
        };
      }
    }

    return new Response(JSON.stringify({
      success: true,
      roadmap_id: roadmap.id,
      roadmap: roadmapData,
      attempts: attemptNumber - 1,
      message: `Roadmap generated successfully on attempt ${attemptNumber - 1}`,
      budgetStatus: budgetStatusMap
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