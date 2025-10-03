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

    const { method } = req;
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get';

    // GET: Fetch student's roadmap with progress
    if (method === 'GET' && action === 'get') {
      // Get student's batch
      const { data: profile } = await supabase
        .from('profiles')
        .select('batch_id')
        .eq('id', user.id)
        .single();

      if (!profile?.batch_id) {
        return new Response(JSON.stringify({ error: 'Student not assigned to batch' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get active roadmap for batch
      const { data: roadmap, error: roadmapError } = await supabase
        .from('batch_roadmaps')
        .select(`
          *,
          roadmap_chapters (
            *,
            roadmap_topics (
              *,
              topic_content_mapping (
                *,
                gamified_exercises (*)
              )
            )
          )
        `)
        .eq('batch_id', profile.batch_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (roadmapError || !roadmap) {
        return new Response(JSON.stringify({ error: 'No active roadmap found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get student's progress for all topics
      const { data: progressData } = await supabase
        .from('student_roadmap_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('roadmap_id', roadmap.id);

      // Initialize progress for topics if not exists
      if (roadmap.roadmap_chapters) {
        for (const chapter of roadmap.roadmap_chapters) {
          if (chapter.roadmap_topics) {
            for (const topic of chapter.roadmap_topics) {
              const existingProgress = progressData?.find(p => p.topic_id === topic.id);
              
              if (!existingProgress) {
                // Determine initial status (first topic unlocked, rest locked)
                const isFirstTopic = chapter.order_num === 1 && topic.order_num === 1;
                
                await supabase
                  .from('student_roadmap_progress')
                  .insert({
                    student_id: user.id,
                    roadmap_id: roadmap.id,
                    topic_id: topic.id,
                    status: isFirstTopic ? 'unlocked' : 'locked',
                    total_exercises: topic.topic_content_mapping?.length || 0
                  });
              }
            }
          }
        }

        // Refresh progress data
        const { data: updatedProgress } = await supabase
          .from('student_roadmap_progress')
          .select('*')
          .eq('student_id', user.id)
          .eq('roadmap_id', roadmap.id);

        // Merge progress into roadmap structure
        roadmap.roadmap_chapters.forEach((chapter: any) => {
          if (chapter.roadmap_topics) {
            chapter.roadmap_topics.forEach((topic: any) => {
              const progress = updatedProgress?.find(p => p.topic_id === topic.id);
              topic.progress = progress || {
                status: 'locked',
                progress_percentage: 0,
                completed_exercises: 0,
                total_exercises: topic.topic_content_mapping?.length || 0
              };
            });
          }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        roadmap
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: Update progress
    if (method === 'POST') {
      const { topic_id, exercise_completed, time_spent_minutes } = await req.json();

      if (!topic_id) {
        return new Response(JSON.stringify({ error: 'Missing topic_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get current progress
      const { data: currentProgress } = await supabase
        .from('student_roadmap_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('topic_id', topic_id)
        .single();

      if (!currentProgress) {
        return new Response(JSON.stringify({ error: 'Progress record not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const completedExercises = exercise_completed 
        ? currentProgress.completed_exercises + 1 
        : currentProgress.completed_exercises;

      const totalExercises = currentProgress.total_exercises;
      const progressPercentage = totalExercises > 0 
        ? Math.round((completedExercises / totalExercises) * 100) 
        : 0;

      const isCompleted = progressPercentage >= 100;
      const newStatus = isCompleted ? 'completed' : 'in_progress';

      // Update progress
      const { error: updateError } = await supabase
        .from('student_roadmap_progress')
        .update({
          status: newStatus,
          progress_percentage: progressPercentage,
          completed_exercises: completedExercises,
          time_spent_minutes: currentProgress.time_spent_minutes + (time_spent_minutes || 0),
          started_at: currentProgress.started_at || new Date().toISOString(),
          completed_at: isCompleted ? new Date().toISOString() : null,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', currentProgress.id);

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Failed to update progress' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If completed, unlock next topic
      if (isCompleted) {
        const { data: currentTopic } = await supabase
          .from('roadmap_topics')
          .select('chapter_id, order_num')
          .eq('id', topic_id)
          .single();

        if (currentTopic) {
          // Find next topic
          const { data: nextTopic } = await supabase
            .from('roadmap_topics')
            .select('id')
            .eq('chapter_id', currentTopic.chapter_id)
            .eq('order_num', currentTopic.order_num + 1)
            .single();

          if (nextTopic) {
            await supabase
              .from('student_roadmap_progress')
              .update({ status: 'unlocked' })
              .eq('student_id', user.id)
              .eq('topic_id', nextTopic.id);
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        progress_percentage: progressPercentage,
        status: newStatus,
        completed: isCompleted
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in student-roadmap-api:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
