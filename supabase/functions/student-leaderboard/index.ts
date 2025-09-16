import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'overall'; // overall, subject, streak, batch

    // Mock student data with individual rankings by score
    const mockStudents = [
      { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Anita Gupta', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', score: 90, streak: 15, tests: 18, batch: 'JEE Advanced 2024', rank: 1, change: 1 },
      { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Arjun Kumar', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', score: 88, streak: 14, tests: 17, batch: 'JEE Advanced 2024', rank: 2, change: -1 },
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Priya Patel', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b190?w=150', score: 87, streak: 12, tests: 15, batch: 'JEE Advanced 2024', rank: 3, change: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Rohit Mehta', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', score: 86, streak: 11, tests: 16, batch: 'NEET Foundation', rank: 4, change: 2 },
      { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Kavya Reddy', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', score: 85, streak: 10, tests: 14, batch: 'JEE Advanced 2024', rank: 5, change: -1 },
      { id: '550e8400-e29b-41d4-a716-446655440010', name: 'Karthik Rao', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150', score: 83, streak: 9, tests: 13, batch: 'NEET Foundation', rank: 6, change: 1 },
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Rahul Sharma', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', score: 81, streak: 8, tests: 12, batch: 'JEE Advanced 2024', rank: 7, change: -2 },
      { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Sneha Joshi', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', score: 79, streak: 6, tests: 10, batch: 'NEET Foundation', rank: 8, change: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Pooja Agarwal', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', score: 75, streak: 7, tests: 9, batch: 'NEET Foundation', rank: 9, change: 1 },
      { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Vikram Singh', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', score: 72, streak: 5, tests: 8, batch: 'JEE Advanced 2024', rank: 10, change: -1 }
    ];

    let leaderboardData = {};

    switch (type) {
      case 'overall':
        leaderboardData = {
          title: 'Overall Performance',
          description: 'Ranked by average test scores',
          students: mockStudents.map((student, index) => ({
            rank: index + 1,
            name: student.name,
            avatar: student.avatar,
            score: student.score,
            streak: student.streak,
            tests: student.tests,
            change: student.change
          }))
        };
        break;

      case 'subject':
        // Subject-wise toppers
        const subjects = {
          'Mathematics': [
            { name: 'Rahul Sharma', score: 95, batch: 'JEE Advanced 2024', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
            { name: 'Vikram Singh', score: 92, batch: 'JEE Advanced 2024', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
            { name: 'Priya Patel', score: 89, batch: 'JEE Advanced 2024', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b190?w=150' }
          ],
          'Physics': [
            { name: 'Sneha Joshi', score: 96, batch: 'NEET Foundation', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
            { name: 'Pooja Agarwal', score: 91, batch: 'NEET Foundation', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
            { name: 'Arjun Kumar', score: 87, batch: 'JEE Advanced 2024', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' }
          ],
          'Chemistry': [
            { name: 'Priya Patel', score: 94, batch: 'JEE Advanced 2024', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b190?w=150' },
            { name: 'Rahul Sharma', score: 90, batch: 'JEE Advanced 2024', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
            { name: 'Rohit Mehta', score: 86, batch: 'NEET Foundation', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' }
          ],
          'Biology': [
            { name: 'Sneha Joshi', score: 98, batch: 'NEET Foundation', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
            { name: 'Pooja Agarwal', score: 93, batch: 'NEET Foundation', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
            { name: 'Karthik Rao', score: 88, batch: 'NEET Foundation', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150' }
          ]
        };
        leaderboardData = { title: 'Subject Toppers', description: 'Top performers by subject', subjects };
        break;

      case 'streak':
        const streakLeaders = mockStudents
          .sort((a, b) => b.streak - a.streak)
          .slice(0, 10)
          .map((student, index) => ({
            rank: index + 1,
            name: student.name,
            avatar: student.avatar,
            streak: student.streak,
            batch: student.batch
          }));
        leaderboardData = { title: 'Streak Leaders', description: 'Longest consecutive study days', students: streakLeaders };
        break;

      case 'batch':
        const batchLeaders = [
          { batch: 'JEE Advanced 2024', avgScore: 86.2, students: 150, leader: 'Rahul Sharma', leaderScore: 92.3 },
          { batch: 'NEET Foundation', avgScore: 88.5, students: 120, leader: 'Sneha Joshi', leaderScore: 94.7 },
          { batch: 'Foundation Math', avgScore: 79.3, students: 200, leader: 'Alex Johnson', leaderScore: 89.1 },
          { batch: 'Advanced Physics', avgScore: 84.7, students: 80, leader: 'Maria Garcia', leaderScore: 91.2 }
        ];
        leaderboardData = { title: 'Batch Leaders', description: 'Performance by batch', batches: batchLeaders };
        break;

      default:
        leaderboardData = { error: 'Invalid leaderboard type' };
    }

    console.log(`Leaderboard data fetched for type: ${type}`);

    return new Response(JSON.stringify({
      success: true,
      data: leaderboardData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in student-leaderboard function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});