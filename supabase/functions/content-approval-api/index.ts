import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
        auth: { persistSession: false },
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    
    // GET: Fetch pending items
    if (req.method === 'GET') {
      const contentType = url.searchParams.get('type'); // 'study_content' or 'question'
      const status = url.searchParams.get('status') || 'pending';
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      let query = supabaseClient
        .from('content_approval_queue')
        .select(`
          *,
          content_sources (
            file_name,
            uploaded_by
          )
        `, { count: 'exact' })
        .eq('status', status)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data: queueItems, error: queueError, count } = await query;

      if (queueError) {
        console.error('Queue fetch error:', queueError);
        return new Response(JSON.stringify({ error: 'Failed to fetch queue' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch actual content details
      const enrichedItems = await Promise.all(queueItems.map(async (item) => {
        let contentDetails = null;
        
        if (item.content_type === 'study_content') {
          const { data } = await supabaseClient
            .from('study_content')
            .select('*')
            .eq('id', item.content_id)
            .single();
          contentDetails = data;
        } else if (item.content_type === 'question') {
          const { data } = await supabaseClient
            .from('generated_questions')
            .select('*')
            .eq('id', item.content_id)
            .single();
          contentDetails = data;
        }

        return {
          ...item,
          content_details: contentDetails,
        };
      }));

      return new Response(JSON.stringify({
        success: true,
        items: enrichedItems,
        total: count,
        page,
        limit,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: Approve/Reject/Request Revision
    if (req.method === 'POST') {
      const { queue_id, action, admin_feedback } = await req.json();

      if (!queue_id || !action) {
        return new Response(JSON.stringify({ error: 'Missing queue_id or action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!['approve', 'reject', 'needs_revision'].includes(action)) {
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get queue item
      const { data: queueItem, error: queueError } = await supabaseClient
        .from('content_approval_queue')
        .select('*')
        .eq('id', queue_id)
        .single();

      if (queueError || !queueItem) {
        return new Response(JSON.stringify({ error: 'Queue item not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update queue status
      const { error: updateQueueError } = await supabaseClient
        .from('content_approval_queue')
        .update({
          status: action === 'approve' ? 'approved' : (action === 'reject' ? 'rejected' : 'needs_revision'),
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_feedback: admin_feedback || null,
        })
        .eq('id', queue_id);

      if (updateQueueError) {
        console.error('Queue update error:', updateQueueError);
        return new Response(JSON.stringify({ error: 'Failed to update queue' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If approved, update content table
      if (action === 'approve') {
        const tableName = queueItem.content_type === 'study_content' ? 'study_content' : 'generated_questions';
        
        const { error: contentUpdateError } = await supabaseClient
          .from(tableName)
          .update({
            is_approved: true,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
          })
          .eq('id', queueItem.content_id);

        if (contentUpdateError) {
          console.error('Content update error:', contentUpdateError);
          return new Response(JSON.stringify({ error: 'Failed to approve content' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      console.log(`Content ${action}ed: ${queueItem.content_type} - ${queueItem.content_id}`);

      return new Response(JSON.stringify({
        success: true,
        action,
        message: `Content ${action}ed successfully`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Approval API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
