import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily battery level update...');
    
    // Call the database function to update battery levels
    const { error } = await supabase.rpc('update_battery_level');
    
    if (error) {
      console.error('Error updating battery levels:', error);
      throw error;
    }

    // Get current stats after update
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const { data: stats, error: statsError } = await supabase
      .from('fee_records')
      .select('battery_level, is_paid')
      .eq('month', currentMonth)
      .eq('year', currentYear);

    if (statsError) {
      console.error('Error fetching stats:', statsError);
    }

    const totalRecords = stats?.length || 0;
    const paidRecords = stats?.filter(r => r.is_paid).length || 0;
    const unpaidRecords = totalRecords - paidRecords;
    const lowBatteryCount = stats?.filter(r => !r.is_paid && r.battery_level < 25).length || 0;
    const criticalBatteryCount = stats?.filter(r => !r.is_paid && r.battery_level < 10).length || 0;

    console.log(`Battery update complete:
      - Total fee records: ${totalRecords}
      - Paid: ${paidRecords}
      - Unpaid: ${unpaidRecords}
      - Low battery (<25%): ${lowBatteryCount}
      - Critical battery (<10%): ${criticalBatteryCount}
    `);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Battery levels updated successfully',
      stats: {
        totalRecords,
        paidRecords,
        unpaidRecords,
        lowBatteryCount,
        criticalBatteryCount
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Battery update error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});