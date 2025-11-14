import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { Resend } from 'npm:resend@2.0.0';

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

    // Parse request body for notify parameter
    let notify = false;
    let threshold = 0.4;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        notify = body.notify === true;
        threshold = body.threshold || 0.4;
      } catch {
        // If body parsing fails, continue with defaults
      }
    }

    console.log('Fetching topic zone analytics...', { notify, threshold });

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

    // Check if we should send admin notifications
    let flaggedBatches: Array<{ name: string; redPercent: number; red: number; total: number }> = [];
    
    if (notify) {
      // Calculate red zone percentage for each batch
      for (const [batchName, counts] of Object.entries(byBatch)) {
        const total = counts.green + counts.grey + counts.red;
        const redPercent = total > 0 ? counts.red / total : 0;
        
        if (redPercent >= threshold) {
          flaggedBatches.push({
            name: batchName,
            redPercent: Math.round(redPercent * 100),
            red: counts.red,
            total,
          });
        }
      }

      console.log('Flagged batches:', flaggedBatches);

      // Send email if there are flagged batches
      if (flaggedBatches.length > 0) {
        try {
          // Fetch admin emails
          const { data: adminUsers, error: adminError } = await supabaseClient
            .from('user_roles')
            .select('user_id, profiles!inner(email)')
            .eq('role', 'admin');

          if (adminError) throw adminError;

          const adminEmails = adminUsers
            .map((u: any) => u.profiles?.email)
            .filter(Boolean);

          console.log('Admin emails:', adminEmails.length);

          if (adminEmails.length > 0) {
            const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

            // Build email HTML
            const batchTable = flaggedBatches
              .map(b => `<tr><td style="padding:8px;border:1px solid #ddd;">${b.name}</td><td style="padding:8px;border:1px solid #ddd;">${b.red}</td><td style="padding:8px;border:1px solid #ddd;">${b.total}</td><td style="padding:8px;border:1px solid #ddd;color:#ef4444;font-weight:bold;">${b.redPercent}%</td></tr>`)
              .join('');

            const topTopics = topicDetails.slice(0, 10)
              .map(t => `<tr><td style="padding:8px;border:1px solid #ddd;">${t.topic_name}</td><td style="padding:8px;border:1px solid #ddd;">${t.subject}</td><td style="padding:8px;border:1px solid #ddd;">${t.chapter_name}</td><td style="padding:8px;border:1px solid #ddd;">${t.avg_completion.toFixed(1)}%</td><td style="padding:8px;border:1px solid #ddd;">${t.struggling_count}</td></tr>`)
              .join('');

            const emailHtml = `
              <html>
                <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
                  <h1 style="color:#ef4444;">🚨 Red Zone Alert: ${flaggedBatches.length} Batch(es) Need Attention</h1>
                  <p>The following batches have exceeded <strong>${Math.round(threshold * 100)}%</strong> red zone topics:</p>
                  
                  <h2>Flagged Batches</h2>
                  <table style="border-collapse:collapse;width:100%;max-width:600px;margin:20px 0;">
                    <thead>
                      <tr style="background:#f3f4f6;">
                        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Batch Name</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Red Topics</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Total Topics</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Red %</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${batchTable}
                    </tbody>
                  </table>

                  <h2>Top Problem Topics (Lowest Completion)</h2>
                  <table style="border-collapse:collapse;width:100%;max-width:800px;margin:20px 0;">
                    <thead>
                      <tr style="background:#f3f4f6;">
                        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Topic</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Subject</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Chapter</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Avg Completion</th>
                        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Students Struggling</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${topTopics}
                    </tbody>
                  </table>

                  <p style="margin-top:30px;color:#6b7280;">
                    <strong>Recommended Actions:</strong><br/>
                    • Review and update content for problem topics<br/>
                    • Schedule intervention sessions for struggling students<br/>
                    • Consider adding more practice games or explanations
                  </p>

                  <p style="margin-top:20px;color:#9ca3af;font-size:12px;">
                    This is an automated alert from the Topic Zone Analytics system.
                  </p>
                </body>
              </html>
            `;

            await resend.emails.send({
              from: 'Topic Zone Analytics <alerts@resend.dev>',
              to: adminEmails,
              subject: `🚨 Alert: ${flaggedBatches.length} batch(es) exceed ${Math.round(threshold * 100)}% red topics`,
              html: emailHtml,
            });

            console.log('Alert emails sent to', adminEmails.length, 'admins');
          }
        } catch (emailError) {
          console.error('Error sending admin alerts:', emailError);
          // Don't fail the whole request if email fails
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analytics,
        flaggedBatches: notify ? flaggedBatches : undefined,
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
