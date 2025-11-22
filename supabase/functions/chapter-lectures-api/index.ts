import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { action, chapter_id, lecture_id, student_id, watch_time_seconds, is_completed } = await req.json();

    switch (action) {
      case 'get_chapter_lectures': {
        // Fetch all lectures for a chapter with student progress
        const { data: lectures, error: lecturesError } = await supabaseClient
          .from('chapter_lectures')
          .select('*')
          .eq('chapter_id', chapter_id)
          .eq('is_published', true)
          .order('lecture_order');

        if (lecturesError) throw lecturesError;

        // Fetch student progress (gracefully handle no progress yet)
        const { data: progress, error: progressError } = await supabaseClient
          .from('student_lecture_progress')
          .select('*')
          .eq('student_id', student_id);

        // Don't throw on missing progress - it's normal for new students
        if (progressError && progressError.code !== 'PGRST116') {
          console.error('Progress fetch error:', progressError);
        }

        // Merge progress with lectures
        const lecturesWithProgress = lectures.map(lecture => {
          const prog = progress?.find(p => p.chapter_lecture_id === lecture.id);
          return {
            ...lecture,
            progress: prog || null
          };
        });

        return new Response(
          JSON.stringify({ lectures: lecturesWithProgress }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'track_lecture_progress': {
        // Update or insert lecture progress
        const { data, error } = await supabaseClient
          .from('student_lecture_progress')
          .upsert({
            student_id,
            chapter_lecture_id: lecture_id,
            watch_time_seconds,
            is_completed: is_completed || false,
            last_watched_at: new Date().toISOString()
          }, {
            onConflict: 'student_id,chapter_lecture_id'
          })
          .select()
          .single();

        if (error) throw error;

        // If completed and not already awarded XP, award it
        if (is_completed && data) {
          const { data: lecture, error: lectureError } = await supabaseClient
            .from('chapter_lectures')
            .select('xp_reward')
            .eq('id', lecture_id)
            .single();

          if (!lectureError && lecture.xp_reward > 0) {
            // Call jhakkas-points-system to award XP
            const token = req.headers.get('Authorization')?.replace('Bearer ', '');
            await supabaseClient.functions.invoke('jhakkas-points-system', {
              body: {
                action: 'add',
                student_id,
                amount: lecture.xp_reward,
                source: 'lecture_completed'
              },
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
          }
        }

        return new Response(
          JSON.stringify({ success: true, progress: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_lecture': {
        const { chapter_id, title, description, youtube_video_id, video_duration_seconds, thumbnail_url, xp_reward, lecture_order } = await req.json();

        const { data, error } = await supabaseClient
          .from('chapter_lectures')
          .insert({
            chapter_id,
            title,
            description,
            youtube_video_id,
            video_duration_seconds,
            thumbnail_url,
            xp_reward: xp_reward || 10,
            lecture_order: lecture_order || 1,
            is_published: true
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, lecture: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_lecture': {
        const { lecture_id, title, description, xp_reward } = await req.json();

        const { data, error } = await supabaseClient
          .from('chapter_lectures')
          .update({ title, description, xp_reward })
          .eq('id', lecture_id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, lecture: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_lecture': {
        const { lecture_id } = await req.json();

        const { error } = await supabaseClient
          .from('chapter_lectures')
          .delete()
          .eq('id', lecture_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_continue_watching': {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: continueData, error: continueError } = await supabaseClient
          .from('student_lecture_progress')
          .select(`
            watch_time_seconds,
            chapter_lecture_id,
            chapter_lectures!inner (
              id,
              title,
              thumbnail_url,
              video_duration_seconds,
              chapter_id
            )
          `)
          .eq('student_id', user.id)
          .eq('is_completed', false)
          .gt('watch_time_seconds', 0)
          .eq('chapter_lectures.is_published', true)
          .order('last_watched_at', { ascending: false })
          .limit(1)
          .single();

        if (continueError || !continueData) {
          return new Response(
            JSON.stringify({ success: true, data: null }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: chapterData } = await supabaseClient
          .from('roadmap_chapters')
          .select('chapter_name')
          .eq('id', continueData.chapter_lectures.chapter_id)
          .maybeSingle();

        const responseData = {
          lectureId: continueData.chapter_lectures.id,
          lectureTitle: continueData.chapter_lectures.title,
          thumbnailUrl: continueData.chapter_lectures.thumbnail_url,
          videoDurationSeconds: continueData.chapter_lectures.video_duration_seconds,
          watchTimeSeconds: continueData.watch_time_seconds,
          chapterId: continueData.chapter_lectures.chapter_id,
          chapterName: chapterData?.chapter_name || 'Unknown Chapter',
        };

        return new Response(
          JSON.stringify({ success: true, data: responseData }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: any) {
    console.error('Chapter lectures API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
