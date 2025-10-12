import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // ✅ CREATE AUTHENTICATED CLIENT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // ✅ VERIFY USER IS ADMIN
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      throw new Error('Authentication failed');
    }

    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.error('❌ Admin access required. Role:', roleData?.role);
      throw new Error('Admin access required');
    }

    // ✅ NOW PROCEED WITH DATE SHIFTING
    const { roadmap_id, days_shift } = await req.json();

    console.log(`✅ [shift-roadmap-dates] Admin ${user.email} shifting roadmap ${roadmap_id} by ${days_shift} days`);

    // Use service role for actual DB updates
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch roadmap
    const { data: roadmap, error: roadmapError } = await supabaseAdmin
      .from('batch_roadmaps')
      .select('start_date, end_date')
      .eq('id', roadmap_id)
      .single();

    if (roadmapError) {
      console.error('❌ Error fetching roadmap:', roadmapError);
      throw roadmapError;
    }

    // Shift dates
    const newStartDate = new Date(roadmap.start_date);
    newStartDate.setDate(newStartDate.getDate() + days_shift);
    
    const newEndDate = new Date(roadmap.end_date);
    newEndDate.setDate(newEndDate.getDate() + days_shift);

    const { error: updateError } = await supabaseAdmin
      .from('batch_roadmaps')
      .update({
        start_date: newStartDate.toISOString().split('T')[0],
        end_date: newEndDate.toISOString().split('T')[0]
      })
      .eq('id', roadmap_id);

    if (updateError) {
      console.error('❌ Error updating roadmap:', updateError);
      throw updateError;
    }

    console.log(`✅ Roadmap ${roadmap_id} dates shifted successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        days_shift,
        new_start_date: newStartDate.toISOString().split('T')[0],
        new_end_date: newEndDate.toISOString().split('T')[0]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error shifting roadmap dates:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
