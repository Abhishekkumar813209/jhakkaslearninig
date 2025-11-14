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

    // Verify admin role
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    console.log('Starting batch recalculation of topic statuses...');

    // Fetch all distinct (student_id, topic_id) pairs from student_topic_status
    const { data: statusRecords, error: fetchError } = await supabaseClient
      .from('student_topic_status')
      .select('student_id, topic_id')
      .not('calculated_at', 'is', null)
      .order('student_id')
      .order('topic_id');

    if (fetchError) {
      throw new Error(`Failed to fetch status records: ${fetchError.message}`);
    }

    console.log(`Found ${statusRecords?.length || 0} status records to recalculate`);

    let processed = 0;
    let updated = 0;
    let failed = 0;
    const errors: any[] = [];

    // Process each record
    for (const record of statusRecords || []) {
      try {
        // Call the calculate_topic_status function
        const { error: calcError } = await supabaseClient.rpc(
          'calculate_topic_status',
          {
            p_student_id: record.student_id,
            p_topic_id: record.topic_id,
          }
        );

        if (calcError) {
          console.error(`Failed to recalculate for student ${record.student_id}, topic ${record.topic_id}:`, calcError);
          failed++;
          errors.push({
            student_id: record.student_id,
            topic_id: record.topic_id,
            error: calcError.message,
          });
        } else {
          updated++;
        }

        processed++;

        // Log progress every 10 records
        if (processed % 10 === 0) {
          console.log(`Progress: ${processed}/${statusRecords.length} processed, ${updated} updated, ${failed} failed`);
        }
      } catch (error) {
        console.error(`Exception while processing student ${record.student_id}, topic ${record.topic_id}:`, error);
        failed++;
        errors.push({
          student_id: record.student_id,
          topic_id: record.topic_id,
          error: error.message,
        });
        processed++;
      }
    }

    const summary = {
      total: statusRecords?.length || 0,
      processed,
      updated,
      failed,
      errors: errors.slice(0, 10), // Return first 10 errors
    };

    console.log('Batch recalculation complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully recalculated ${updated} out of ${processed} topic statuses`,
        summary,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in recalculate-topic-statuses:', error);
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
