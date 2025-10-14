import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueItem {
  id: string;
  student_id: string;
  share_id: string;
  xp_amount: number;
  activity_type: string;
  attempts: number;
  max_attempts: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('=== XP QUEUE PROCESSOR STARTED ===');
    console.log('Time:', new Date().toISOString());

    // Get pending items that are due for processing
    const { data: pendingItems, error: fetchError } = await supabaseClient
      .from('xp_award_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 5)
      .order('created_at', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error('Error fetching queue items:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingItems?.length || 0} items to process`);

    const results = {
      processed: 0,
      completed: 0,
      failed: 0,
      retrying: 0
    };

    for (const item of (pendingItems || [])) {
      console.log(`Processing queue item ${item.id} for student ${item.student_id}`);
      
      // Mark as processing
      await supabaseClient
        .from('xp_award_queue')
        .update({ status: 'processing' })
        .eq('id', item.id);

      try {
        // Call the jhakkas-points-system function
        const { data: awardResult, error: awardError } = await supabaseClient.functions.invoke(
          'jhakkas-points-system',
          {
            body: {
              action: 'add',
              activity_type: item.activity_type,
              xp_amount: item.xp_amount,
              share_id: item.share_id
            },
            headers: {
              Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            }
          }
        );

        if (awardError) {
          throw awardError;
        }

        // Handle different award results
        if (awardResult?.xp_awarded === true) {
          // Success: either just awarded or already processed
          await supabaseClient
            .from('xp_award_queue')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              error_message: null
            })
            .eq('id', item.id);

          console.log(`✅ XP awarded for queue item ${item.id} (reason: ${awardResult.reason})`);
          results.completed++;
        } else if (awardResult?.reason === 'cooldown') {
          // Cooldown active - reschedule for 2 hours later
          const nextSchedule = new Date(Date.now() + 2 * 60 * 60000);
          await supabaseClient
            .from('xp_award_queue')
            .update({
              status: 'pending',
              scheduled_for: nextSchedule.toISOString(),
              error_message: `Cooldown: ${awardResult.message}`
            })
            .eq('id', item.id);

          console.log(`⏰ Queue item ${item.id} rescheduled due to cooldown`);
          results.retrying++;
        } else {
          throw new Error(`XP award failed: ${awardResult?.message || 'Unknown reason'}`);
        }

        results.processed++;

      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);
        
        const newAttempts = item.attempts + 1;
        const shouldRetry = newAttempts < item.max_attempts;

        if (shouldRetry) {
          // Calculate exponential backoff
          const delays = [2, 5, 15, 60, 360]; // minutes
          const delayMinutes = delays[newAttempts - 1] || 360;
          const nextSchedule = new Date(Date.now() + delayMinutes * 60000);

          await supabaseClient
            .from('xp_award_queue')
            .update({
              status: 'pending',
              attempts: newAttempts,
              scheduled_for: nextSchedule.toISOString(),
              error_message: error.message
            })
            .eq('id', item.id);

          console.log(`⏰ Retrying queue item ${item.id} in ${delayMinutes} minutes (attempt ${newAttempts})`);
          results.retrying++;
        } else {
          await supabaseClient
            .from('xp_award_queue')
            .update({
              status: 'failed',
              attempts: newAttempts,
              error_message: error.message
            })
            .eq('id', item.id);

          console.log(`❌ Queue item ${item.id} failed after ${item.max_attempts} attempts`);
          results.failed++;
        }

        results.processed++;
      }
    }

    console.log('=== XP QUEUE PROCESSOR COMPLETED ===');
    console.log('Results:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Fatal error in queue processor:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
