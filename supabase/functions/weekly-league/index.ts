import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get user's exam domain and class
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('exam_domain, student_class')
      .eq('id', user.id)
      .single();

    if (!profile?.exam_domain || !profile?.student_class) {
      throw new Error('Profile incomplete - exam domain and class required');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get';

    if (action === 'get') {
      // Get current week's league data for user's domain and class
      const today = new Date();
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
      weekStart.setHours(0, 0, 0, 0);

      const { data: leagueData, error: leagueError } = await supabaseClient
        .from('student_leagues')
        .select('*')
        .eq('student_id', user.id)
        .eq('exam_domain', profile.exam_domain)
        .eq('student_class', profile.student_class)
        .gte('league_week_start', weekStart.toISOString().split('T')[0])
        .single();

      if (leagueError && leagueError.code !== 'PGRST116') {
        throw leagueError;
      }

      // Get leaderboard for current league (domain and class specific)
      const { data: leaderboard, error: lbError } = await supabaseClient
        .from('student_leagues')
        .select(`
          student_id,
          weekly_xp,
          rank_in_league,
          profiles!inner(full_name, avatar_url)
        `)
        .eq('league_tier', leagueData?.league_tier || 'bronze')
        .eq('exam_domain', profile.exam_domain)
        .eq('student_class', profile.student_class)
        .gte('league_week_start', weekStart.toISOString().split('T')[0])
        .order('rank_in_league', { ascending: true })
        .limit(50);

      if (lbError) throw lbError;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            league: leagueData,
            leaderboard: leaderboard,
            context: {
              exam_domain: profile.exam_domain,
              student_class: profile.student_class
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in weekly-league function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});