import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Dashboard schedule request received');

    // Mock upcoming classes data
    const upcomingClasses = [
      {
        id: 1,
        title: "Quantum Mechanics - Wave Function",
        instructor: "Dr. Rajesh Kumar",
        time: "Today, 4:00 PM",
        duration: "1.5 hours",
        subject: "Physics",
        meetingLink: "https://zoom.us/j/123456789"
      },
      {
        id: 2,
        title: "Calculus - Integration by Parts",
        instructor: "Prof. Priya Sharma",
        time: "Tomorrow, 2:00 PM", 
        duration: "2 hours",
        subject: "Mathematics",
        meetingLink: "https://zoom.us/j/987654321"
      },
      {
        id: 3,
        title: "Organic Chemistry - Reaction Mechanisms",
        instructor: "Dr. Amit Verma",
        time: "Friday, 3:30 PM",
        duration: "1.5 hours",
        subject: "Chemistry",
        meetingLink: "https://zoom.us/j/456789123"
      }
    ];

    console.log('Dashboard schedule response prepared');

    return new Response(JSON.stringify({
      success: true,
      data: upcomingClasses
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in dashboard-schedule function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});