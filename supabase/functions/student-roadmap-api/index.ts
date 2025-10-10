import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const body = req.method === "POST" ? await req.json() : {};
    const { action, subject_order, topic_id, progress_percentage, status, subject_name, chapter_order } = body;

    // GET: Fetch student's roadmap with progress
    if (action === "get" || req.method === "GET") {
      console.log(`Fetching roadmap for user: ${user.id}`);
      
      // Get student's active roadmap
      const { data: studentRoadmap, error: srError } = await supabaseClient
        .from("student_roadmaps")
        .select("*, batch_roadmap:batch_roadmaps(*)")
        .eq("student_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (srError) {
        console.error("Error fetching student roadmap:", srError);
        throw srError;
      }
      
      if (!studentRoadmap) {
        console.log("No active roadmap found for user");
        return new Response(
          JSON.stringify({ success: false, message: "No active roadmap found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Found roadmap: ${studentRoadmap.batch_roadmap_id}`);

      // Get roadmap chapters
      const { data: chapters, error: chaptersError } = await supabaseClient
        .from("roadmap_chapters")
        .select("*")
        .eq("roadmap_id", studentRoadmap.batch_roadmap_id)
        .order("order_num");

      if (chaptersError) throw chaptersError;

      // Get topics for each chapter
      const { data: topics, error: topicsError } = await supabaseClient
        .from("roadmap_topics")
        .select("*")
        .in("chapter_id", chapters.map(c => c.id))
        .order("order_num");

      if (topicsError) throw topicsError;

      // Get student progress
      const { data: progress, error: progressError } = await supabaseClient
        .from("student_topic_progress")
        .select("*")
        .eq("student_id", user.id);

      if (progressError) throw progressError;

      // Organize data by subject
      const subjectMap = new Map();
      
      chapters.forEach(chapter => {
        if (!subjectMap.has(chapter.subject)) {
          subjectMap.set(chapter.subject, { name: chapter.subject, chapters: [] });
        }

        const chapterTopics = topics.filter(t => t.chapter_id === chapter.id);
        const topicsWithProgress = chapterTopics.map(topic => {
          const topicProgress = progress?.find(p => p.topic_id === topic.id);
          return {
            ...topic,
            status: topicProgress?.status || "locked",
            progress_percentage: topicProgress?.progress_percentage || 0
          };
        });

        const chapterProgress = topicsWithProgress.length > 0
          ? topicsWithProgress.reduce((sum, t) => sum + t.progress_percentage, 0) / topicsWithProgress.length
          : 0;

        subjectMap.get(chapter.subject).chapters.push({
          ...chapter,
          topics: topicsWithProgress,
          progress: Math.round(chapterProgress)
        });
      });

      let subjects = Array.from(subjectMap.values());

      // Apply custom subject order if exists
      if (studentRoadmap.subject_order && Array.isArray(studentRoadmap.subject_order)) {
        const orderedSubjects = [];
        studentRoadmap.subject_order.forEach(subjectName => {
          const subject = subjects.find(s => s.name === subjectName);
          if (subject) orderedSubjects.push(subject);
        });
        subjects.forEach(s => {
          if (!studentRoadmap.subject_order.includes(s.name)) {
            orderedSubjects.push(s);
          }
        });
        subjects = orderedSubjects;
      }

      // Apply custom chapter order if exists
      const { data: customChapterOrders } = await supabaseClient
        .from('student_chapter_order')
        .select('*')
        .eq('student_id', user.id)
        .eq('roadmap_id', studentRoadmap.batch_roadmap_id);

      if (customChapterOrders && customChapterOrders.length > 0) {
        console.log(`Applying custom chapter orders for ${customChapterOrders.length} subjects`);
        subjects = subjects.map(subject => {
          const customOrder = customChapterOrders.find(co => co.subject === subject.name);
          if (customOrder && customOrder.chapter_order) {
            const orderedChapters = [];
            customOrder.chapter_order.forEach((chapterId: string) => {
              const chapter = subject.chapters.find((c: any) => c.id === chapterId);
              if (chapter) orderedChapters.push(chapter);
            });
            subject.chapters.forEach((c: any) => {
              if (!customOrder.chapter_order.includes(c.id)) {
                orderedChapters.push(c);
              }
            });
            return { ...subject, chapters: orderedChapters };
          }
          return subject;
        });
      }

      const roadmapData = {
        id: studentRoadmap.batch_roadmap_id,
        title: studentRoadmap.batch_roadmap?.title || "My Roadmap",
        description: studentRoadmap.batch_roadmap?.description || "",
        total_days: studentRoadmap.batch_roadmap?.total_days || 0,
        start_date: studentRoadmap.batch_roadmap?.start_date,
        end_date: studentRoadmap.batch_roadmap?.end_date,
        subjects,
        subject_order: studentRoadmap.subject_order
      };

      return new Response(
        JSON.stringify({ success: true, roadmap: roadmapData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UPDATE SUBJECT ORDER
    if (action === "update_subject_order") {
      const { error } = await supabaseClient
        .from("student_roadmaps")
        .update({ subject_order })
        .eq("student_id", user.id)
        .eq("is_active", true);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Subject order updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UPDATE CHAPTER ORDER
    if (action === "update_chapter_order") {
      if (!subject_name || !chapter_order || !Array.isArray(chapter_order)) {
        throw new Error("subject_name and chapter_order array required");
      }

      console.log(`Updating chapter order for subject: ${subject_name}`);

      // Get roadmap_id
      const { data: studentRoadmap } = await supabaseClient
        .from("student_roadmaps")
        .select("batch_roadmap_id")
        .eq("student_id", user.id)
        .eq("is_active", true)
        .single();

      if (!studentRoadmap) {
        throw new Error("No active roadmap found");
      }

      // Step 1: Fetch all chapters for this subject with their estimated_days
      const { data: chapters, error: chaptersError } = await supabaseClient
        .from("roadmap_chapters")
        .select("id, estimated_days, order_num")
        .eq("roadmap_id", studentRoadmap.batch_roadmap_id)
        .eq("subject", subject_name);

      if (chaptersError) throw chaptersError;
      if (!chapters || chapters.length === 0) {
        throw new Error("No chapters found for this subject");
      }

      // Step 2: Reorder chapters based on chapter_order array
      const reorderedChapters = chapter_order.map((chapterId: string) => 
        chapters.find(ch => ch.id === chapterId)
      ).filter(Boolean); // Remove any undefined entries

      // Step 3: Recalculate day_start and day_end
      let currentDay = 1;
      const updatedChapters = [];

      for (let i = 0; i < reorderedChapters.length; i++) {
        const chapter = reorderedChapters[i];
        const days = chapter.estimated_days || 3; // default 3 days if not set
        updatedChapters.push({
          id: chapter.id,
          day_start: currentDay,
          day_end: currentDay + days - 1,
          order_num: i + 1
        });
        currentDay += days;
      }

      console.log(`Recalculated days for ${updatedChapters.length} chapters`);

      // Step 4: Update roadmap_chapters table with new days and order
      for (const ch of updatedChapters) {
        const { error: updateError } = await supabaseClient
          .from("roadmap_chapters")
          .update({ 
            day_start: ch.day_start, 
            day_end: ch.day_end,
            order_num: ch.order_num
          })
          .eq("id", ch.id);

        if (updateError) {
          console.error(`Error updating chapter ${ch.id}:`, updateError);
          throw updateError;
        }
      }

      // Step 5: Save custom order in student_chapter_order
      const { error: upsertError } = await supabaseClient
        .from("student_chapter_order")
        .upsert({
          student_id: user.id,
          roadmap_id: studentRoadmap.batch_roadmap_id,
          subject: subject_name,
          chapter_order
        }, {
          onConflict: "student_id,roadmap_id,subject"
        });

      if (upsertError) throw upsertError;

      console.log(`Successfully updated chapter order and days for ${subject_name}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Chapter order and days updated",
          updated_chapters: updatedChapters
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UPDATE TOPIC PROGRESS
    if (action === "update_progress") {
      const { error } = await supabaseClient
        .from("student_topic_progress")
        .upsert({
          student_id: user.id,
          topic_id,
          progress_percentage: progress_percentage || 0,
          status: status || "in_progress"
        }, {
          onConflict: "student_id,topic_id"
        });

      if (error) throw error;

      // If topic completed, unlock next topic
      if (status === "completed") {
        const { data: currentTopic } = await supabaseClient
          .from("roadmap_topics")
          .select("chapter_id, order_num")
          .eq("id", topic_id)
          .single();

        if (currentTopic) {
          const { data: nextTopic } = await supabaseClient
            .from("roadmap_topics")
            .select("id")
            .eq("chapter_id", currentTopic.chapter_id)
            .eq("order_num", currentTopic.order_num + 1)
            .maybeSingle();

          if (nextTopic) {
            await supabaseClient
              .from("student_topic_progress")
              .upsert({
                student_id: user.id,
                topic_id: nextTopic.id,
                status: "unlocked",
                progress_percentage: 0
              }, {
                onConflict: "student_id,topic_id"
              });
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Progress updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
