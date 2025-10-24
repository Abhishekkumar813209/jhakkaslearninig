import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roadmap_id, edited_until_day, remaining_chapter_ids } = await req.json();

    if (!roadmap_id) {
      throw new Error('roadmap_id is required');
    }

    console.log('Auto-adjusting roadmap:', roadmap_id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get roadmap details
    const { data: roadmap, error: roadmapError } = await supabase
      .from('batch_roadmaps')
      .select('*, study_configurations(*)')
      .eq('id', roadmap_id)
      .single();

    if (roadmapError || !roadmap) {
      throw new Error('Roadmap not found');
    }

    // Get study configuration
    const studyConfig = roadmap.study_configurations?.[0] || {
      chapters_per_day: 3,
      study_days_per_week: [1, 2, 3, 4, 5, 6],
      weekly_subject_distribution: {},
      parallel_study_enabled: true
    };

    // Get remaining chapters
    const { data: remainingChapters, error: chaptersError } = await supabase
      .from('roadmap_chapters')
      .select('*, roadmap_topics(*)')
      .eq('roadmap_id', roadmap_id)
      .in('id', remaining_chapter_ids || []);

    if (chaptersError) {
      throw new Error('Failed to fetch remaining chapters');
    }

    if (!remainingChapters || remainingChapters.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          rescheduled_chapters: 0,
          message: 'No chapters to reschedule'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate remaining days
    const startDate = new Date(roadmap.start_date);
    const endDate = new Date(roadmap.end_date);
    const currentDay = edited_until_day || 1;
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = totalDays - currentDay;

    console.log('Rescheduling', remainingChapters.length, 'chapters across', remainingDays, 'days');

    // Use AI to reschedule
    const systemPrompt = `You are an expert learning schedule optimizer. Reschedule the remaining chapters based on the study configuration.

Study Configuration:
- Chapters per Day (max): ${studyConfig.chapters_per_day}
- Study Days per Week: ${JSON.stringify(studyConfig.study_days_per_week)}
- Parallel Study: ${studyConfig.parallel_study_enabled ? 'YES' : 'NO'}
- Weekly Subject Distribution: ${JSON.stringify(studyConfig.weekly_subject_distribution)}
- Remaining Days: ${remainingDays}

Output a JSON array of day schedules:
[
  {
    "day_number": ${currentDay + 1},
    "chapters": ["chapter_id1", "chapter_id2"]
  }
]

Rules:
1. Distribute across only study_days_per_week
2. Respect weekly_subject_distribution limits
3. Max chapters_per_day per day
4. If parallel_study=false, one subject per day`;

    const chaptersInfo = remainingChapters.map(ch => ({
      id: ch.id,
      subject: ch.subject,
      chapter_name: ch.chapter_name,
      estimated_days: ch.estimated_days
    }));

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }, { text: `Reschedule these chapters:\n${JSON.stringify(chaptersInfo, null, 2)}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage limit reached. Please add credits to your Lovable workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    if (!aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected AI response structure:', aiData);
      throw new Error('Invalid AI response format');
    }
    
    const schedule = JSON.parse(aiData.candidates[0].content.parts[0].text);

    // Update database with new schedule
    for (const daySchedule of schedule) {
      for (const chapterId of daySchedule.chapters) {
        await supabase
          .from('roadmap_chapters')
          .update({
            day_start: daySchedule.day_number,
            day_end: daySchedule.day_number + 1
          })
          .eq('id', chapterId);
      }
    }

    console.log('Rescheduled', remainingChapters.length, 'chapters');

    return new Response(
      JSON.stringify({
        success: true,
        rescheduled_chapters: remainingChapters.length,
        new_end_date: endDate.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-adjust-roadmap:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
