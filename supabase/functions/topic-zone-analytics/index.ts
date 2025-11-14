import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    // Verify user authentication
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    console.log('Fetching topic zone analytics...');

    // Overall distribution
    const { data: overallData, error: overallError } = await supabaseClient
      .rpc('get_topic_zone_distribution');

    if (overallError) {
      console.error('Error fetching overall distribution:', overallError);
    }

    // Subject-wise distribution
    const { data: subjectData, error: subjectError } = await supabaseClient
      .from('student_topic_status')
      .select(`
        status,
        roadmap_topics!inner(
          roadmap_chapters!inner(
            batch_roadmaps!inner(
              selected_subjects
            )
          )
        )
      `);

    if (subjectError) {
      console.error('Error fetching subject data:', subjectError);
    }

    // Batch-wise distribution
    const { data: batchData, error: batchError } = await supabaseClient
      .from('student_topic_status')
      .select(`
        status,
        student_id,
        profiles!inner(
          batch_id,
          batches!inner(
            name
          )
        )
      `);

    if (batchError) {
      console.error('Error fetching batch data:', batchError);
    }

    // Problem topics (red zone with details)
    const { data: problemTopics, error: problemError } = await supabaseClient
      .from('student_topic_status')
      .select(`
        topic_id,
        status,
        game_completion_rate,
        student_id,
        roadmap_topics!inner(
          topic_name,
          roadmap_chapters!inner(
            chapter_name,
            batch_roadmaps!inner(
              selected_subjects
            )
          )
        )
      `)
      .eq('status', 'red')
      .order('game_completion_rate', { ascending: true });

    if (problemError) {
      console.error('Error fetching problem topics:', problemError);
    }

    // Process overall distribution
    const overall = {
      green: 0,
      grey: 0,
      red: 0,
    };

    if (overallData && overallData.length > 0) {
      overallData.forEach((row: any) => {
        if (row.status === 'green') overall.green = row.count;
        if (row.status === 'grey') overall.grey = row.count;
        if (row.status === 'red') overall.red = row.count;
      });
    }

    // Process subject-wise distribution
    const bySubject: Record<string, { green: number; grey: number; red: number }> = {};
    
    if (subjectData) {
      subjectData.forEach((row: any) => {
        const subjects = row.roadmap_topics?.roadmap_chapters?.batch_roadmaps?.selected_subjects;
        if (subjects && Array.isArray(subjects)) {
          subjects.forEach((subject: string) => {
            if (!bySubject[subject]) {
              bySubject[subject] = { green: 0, grey: 0, red: 0 };
            }
            if (row.status === 'green') bySubject[subject].green++;
            if (row.status === 'grey') bySubject[subject].grey++;
            if (row.status === 'red') bySubject[subject].red++;
          });
        }
      });
    }

    // Process batch-wise distribution
    const byBatch: Record<string, { green: number; grey: number; red: number }> = {};
    
    if (batchData) {
      batchData.forEach((row: any) => {
        const batchName = row.profiles?.batches?.name;
        if (batchName) {
          if (!byBatch[batchName]) {
            byBatch[batchName] = { green: 0, grey: 0, red: 0 };
          }
          if (row.status === 'green') byBatch[batchName].green++;
          if (row.status === 'grey') byBatch[batchName].grey++;
          if (row.status === 'red') byBatch[batchName].red++;
        }
      });
    }

    // Process problem topics
    const topicDetailsMap: Map<string, any> = new Map();
    
    if (problemTopics) {
      problemTopics.forEach((row: any) => {
        const topicId = row.topic_id;
        const topicName = row.roadmap_topics?.topic_name;
        const chapterName = row.roadmap_topics?.roadmap_chapters?.chapter_name;
        const subjects = row.roadmap_topics?.roadmap_chapters?.batch_roadmaps?.selected_subjects;
        
        if (!topicDetailsMap.has(topicId)) {
          topicDetailsMap.set(topicId, {
            topic_id: topicId,
            topic_name: topicName,
            chapter_name: chapterName,
            subject: subjects?.[0] || 'Unknown',
            avg_completion: 0,
            completion_sum: 0,
            student_count: 0,
            struggling_count: 0,
          });
        }
        
        const topic = topicDetailsMap.get(topicId);
        topic.completion_sum += row.game_completion_rate || 0;
        topic.student_count++;
        if (row.status === 'red') {
          topic.struggling_count++;
        }
      });
    }

    // Calculate averages for problem topics
    const topicDetails = Array.from(topicDetailsMap.values()).map(topic => ({
      ...topic,
      avg_completion: topic.student_count > 0 ? Math.round((topic.completion_sum / topic.student_count) * 10) / 10 : 0,
    })).sort((a, b) => a.avg_completion - b.avg_completion).slice(0, 20);

    const analytics = {
      overall,
      bySubject,
      byBatch,
      topicDetails,
    };

    console.log('Analytics generated:', {
      overall,
      subjectCount: Object.keys(bySubject).length,
      batchCount: Object.keys(byBatch).length,
      problemTopicCount: topicDetails.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        analytics,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in topic-zone-analytics:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
