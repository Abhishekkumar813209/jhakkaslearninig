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

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { roadmap_id, reordered_chapters } = await req.json();

    if (!roadmap_id || !reordered_chapters || !Array.isArray(reordered_chapters)) {
      return new Response(JSON.stringify({ error: 'roadmap_id and reordered_chapters array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user permissions - must be admin or roadmap creator
    const { data: roadmap, error: roadmapError } = await serviceClient
      .from('batch_roadmaps')
      .select('created_by')
      .eq('id', roadmap_id)
      .maybeSingle();

    if (roadmapError || !roadmap) {
      return new Response(JSON.stringify({ error: 'Roadmap not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin or creator
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const isAdmin = userRole?.role === 'admin';
    const isCreator = roadmap.created_by === user.id;

    if (!isAdmin && !isCreator) {
      return new Response(JSON.stringify({ error: 'You do not have permission to edit this roadmap' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update chapters with new order
    for (const chapter of reordered_chapters) {
      const { chapter_id, subject, order_num, day_start, day_end } = chapter;

      await serviceClient
        .from('roadmap_chapters')
        .update({
          subject,
          order_num,
          day_start: day_start || null,
          day_end: day_end || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', chapter_id)
        .eq('roadmap_id', roadmap_id);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Roadmap chapters reordered successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Roadmap reorder error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
