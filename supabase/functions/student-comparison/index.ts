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

    const { studentIds, compareWith = 'batch' } = await req.json();

    if (!studentIds || !Array.isArray(studentIds)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Student IDs array is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mock student data
    const mockStudents = {
      '550e8400-e29b-41d4-a716-446655440001': { name: 'Priya Patel', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b190?w=150', score: 87.5, streak: 12, studyTime: 142, rank: 4 },
      '550e8400-e29b-41d4-a716-446655440002': { name: 'Rahul Sharma', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', score: 92.3, streak: 18, studyTime: 154, rank: 1 },
      '550e8400-e29b-41d4-a716-446655440003': { name: 'Anita Gupta', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', score: 78.9, streak: 9, studyTime: 131, rank: 6 },
      '550e8400-e29b-41d4-a716-446655440004': { name: 'Vikram Singh', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', score: 89.1, streak: 15, studyTime: 146, rank: 2 },
      '550e8400-e29b-41d4-a716-446655440005': { name: 'Kavya Reddy', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', score: 73.4, streak: 7, studyTime: 109, rank: 8 },
      '550e8400-e29b-41d4-a716-446655440006': { name: 'Arjun Kumar', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', score: 85.2, streak: 11, studyTime: 135, rank: 5 },
      '550e8400-e29b-41d4-a716-446655440007': { name: 'Sneha Joshi', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', score: 94.7, streak: 21, studyTime: 160, rank: 1 },
      '550e8400-e29b-41d4-a716-446655440008': { name: 'Rohit Mehta', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', score: 81.3, streak: 8, studyTime: 120, rank: 3 },
      '550e8400-e29b-41d4-a716-446655440009': { name: 'Pooja Agarwal', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', score: 88.6, streak: 14, studyTime: 147, rank: 2 },
      '550e8400-e29b-41d4-a716-446655440010': { name: 'Karthik Rao', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150', score: 76.8, streak: 6, studyTime: 115, rank: 4 }
    };

    const comparisonData = studentIds.map(id => {
      const student = (mockStudents as any)[id];
      if (!student) return null;

      // Generate subject-wise comparison data
      const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'];
      const subjectScores = subjects.map(subject => ({
        subject,
        score: Math.round(student.score + (Math.random() - 0.5) * 15),
        percentile: Math.round(70 + Math.random() * 25)
      }));

      // Generate monthly performance trend
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const performanceTrend = months.map(month => ({
        month,
        score: Math.round(student.score + (Math.random() - 0.5) * 10),
        testsCompleted: Math.round(2 + Math.random() * 3)
      }));

      // Generate test-wise comparison
      const recentTests = [
        { name: 'Mathematics Mock Test', score: Math.round(student.score + (Math.random() - 0.5) * 20), maxScore: 100, date: '2024-01-15' },
        { name: 'Physics Chapter Test', score: Math.round(student.score + (Math.random() - 0.5) * 15), maxScore: 50, date: '2024-01-10' },
        { name: 'Chemistry Quiz', score: Math.round(student.score + (Math.random() - 0.5) * 10), maxScore: 25, date: '2024-01-08' }
      ];

      return {
        studentId: id,
        name: student.name,
        avatar: student.avatar,
        overallStats: {
          averageScore: student.score,
          currentStreak: student.streak,
          totalStudyTime: student.studyTime,
          batchRank: student.rank,
          testsCompleted: Math.round(student.score / 5)
        },
        subjectPerformance: subjectScores,
        performanceTrend,
        recentTests,
        strengthsAndWeaknesses: {
          strengths: subjectScores.filter(s => s.score > student.score).slice(0, 2).map(s => s.subject),
          weaknesses: subjectScores.filter(s => s.score < student.score).slice(0, 2).map(s => s.subject),
          improvementAreas: ['Time management', 'Problem solving speed']
        }
      };
    }).filter(Boolean);

    // Calculate comparison metrics
    const comparisonMetrics = {
      averageScore: {
        data: comparisonData.filter(s => s).map(s => ({ name: s!.name, value: s!.overallStats.averageScore })),
        insight: `${comparisonData[0]?.name} leads with highest average score`
      },
      studyTime: {
        data: comparisonData.filter(s => s).map(s => ({ name: s!.name, value: s!.overallStats.totalStudyTime })),
        insight: `Study time varies by ${Math.max(...comparisonData.filter(s => s).map(s => s!.overallStats.totalStudyTime)) - Math.min(...comparisonData.filter(s => s).map(s => s!.overallStats.totalStudyTime))} hours`
      },
      consistency: {
        data: comparisonData.filter(s => s).map(s => ({ name: s!.name, value: s!.overallStats.currentStreak })),
        insight: 'Consistency in study schedule affects performance'
      }
    };

    // Batch/Class averages for context
    const batchAverages = {
      averageScore: 84.2,
      averageStudyTime: 138,
      averageStreak: 11.5,
      totalStudents: 150
    };

    const responseData = {
      students: comparisonData,
      comparisonMetrics,
      batchAverages,
      insights: [
        'Students with higher study time tend to have better scores',
        'Consistency in daily study (streak) correlates with performance',
        'Subject-wise performance varies significantly among students',
        'Top performers excel in multiple subjects simultaneously'
      ]
    };

    console.log(`Comparison data generated for ${studentIds.length} students`);

    return new Response(JSON.stringify({
      success: true,
      data: responseData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in student-comparison function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});