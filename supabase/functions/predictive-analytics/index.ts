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
    const studentId = url.searchParams.get('studentId');
    const timeframe = url.searchParams.get('timeframe') || '3months';

    if (!studentId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Student ID is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mock student data for predictions
    const mockStudents = {
      '550e8400-e29b-41d4-a716-446655440001': { name: 'Priya Patel', currentScore: 87.5, trend: 'stable', performance: 'good' },
      '550e8400-e29b-41d4-a716-446655440002': { name: 'Rahul Sharma', currentScore: 92.3, trend: 'improving', performance: 'excellent' },
      '550e8400-e29b-41d4-a716-446655440003': { name: 'Anita Gupta', currentScore: 78.9, trend: 'declining', performance: 'average' },
      '550e8400-e29b-41d4-a716-446655440004': { name: 'Vikram Singh', currentScore: 89.1, trend: 'improving', performance: 'good' },
      '550e8400-e29b-41d4-a716-446655440005': { name: 'Kavya Reddy', currentScore: 73.4, trend: 'stable', performance: 'below_average' },
      '550e8400-e29b-41d4-a716-446655440006': { name: 'Arjun Kumar', currentScore: 85.2, trend: 'stable', performance: 'good' },
      '550e8400-e29b-41d4-a716-446655440007': { name: 'Sneha Joshi', currentScore: 94.7, trend: 'improving', performance: 'excellent' },
      '550e8400-e29b-41d4-a716-446655440008': { name: 'Rohit Mehta', currentScore: 81.3, trend: 'declining', performance: 'average' },
      '550e8400-e29b-41d4-a716-446655440009': { name: 'Pooja Agarwal', currentScore: 88.6, trend: 'improving', performance: 'good' },
      '550e8400-e29b-41d4-a716-446655440010': { name: 'Karthik Rao', currentScore: 76.8, trend: 'stable', performance: 'average' }
    };

    const student = (mockStudents as any)[studentId];
    if (!student) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Student not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate predictive data based on current performance and trend
    const generatePredictions = (currentScore: number, trend: string, timeframeMonths = 3) => {
      const predictions = [];
      let score = currentScore;
      
      const trendMultiplier = {
        'improving': 1.02,
        'stable': 1.001,
        'declining': 0.98
      };

      const multiplier = (trendMultiplier as any)[trend] || 1.001;

      for (let i = 1; i <= timeframeMonths; i++) {
        score = Math.min(100, Math.max(0, score * multiplier + (Math.random() - 0.5) * 2));
        predictions.push({
          month: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' }),
          predictedScore: Math.round(score * 10) / 10,
          confidence: Math.max(60, 95 - i * 5) // Confidence decreases with time
        });
      }

      return predictions;
    };

    const timeframeMap = {
      '1month': 1,
      '3months': 3,
      '6months': 6,
      '1year': 12
    };

    const months = (timeframeMap as any)[timeframe] || 3;
    const scorePredictions = generatePredictions(student.currentScore, student.trend, months);

    // Rank prediction based on current trajectory
    const currentRank = Math.floor(Math.random() * 10) + 1;
    const predictedRankChange = student.trend === 'improving' ? -2 : student.trend === 'declining' ? 3 : 0;
    const predictedRank = Math.max(1, Math.min(150, currentRank + predictedRankChange));

    // Risk assessment
    const riskFactors = [];
    if (student.currentScore < 75) riskFactors.push('Below average performance');
    if (student.trend === 'declining') riskFactors.push('Declining performance trend');
    if (Math.random() < 0.3) riskFactors.push('Inconsistent study schedule');
    if (Math.random() < 0.2) riskFactors.push('Missing assignments');

    const riskLevel = riskFactors.length === 0 ? 'low' : riskFactors.length <= 2 ? 'medium' : 'high';

    // Success probability for different scenarios
    const successProbabilities = {
      examPass: student.currentScore > 80 ? 85 + Math.random() * 10 : 60 + Math.random() * 20,
      topPercentile: student.currentScore > 90 ? 70 + Math.random() * 20 : 30 + Math.random() * 30,
      improvement: student.trend === 'improving' ? 80 + Math.random() * 15 : 50 + Math.random() * 25
    };

    // Recommendations based on predictions
    const recommendations = [];
    if (student.trend === 'declining') {
      recommendations.push('Schedule immediate intervention sessions');
      recommendations.push('Focus on weak subject areas');
    }
    if (student.currentScore < 80) {
      recommendations.push('Increase practice test frequency');
      recommendations.push('Consider additional tutoring support');
    }
    if (riskLevel === 'high') {
      recommendations.push('Implement structured study schedule');
      recommendations.push('Regular progress monitoring required');
    }
    recommendations.push('Maintain consistent study routine');
    recommendations.push('Set achievable short-term goals');

    // Subject-wise predictions
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'];
    const subjectPredictions = subjects.map(subject => ({
      subject,
      currentScore: Math.round(student.currentScore + (Math.random() - 0.5) * 20),
      predictedScore: Math.round(student.currentScore + (Math.random() - 0.5) * 15),
      improvement: Math.round((Math.random() - 0.5) * 10),
      confidence: 70 + Math.random() * 25
    }));

    // Goal achievement probability
    const goals = [
      { goal: 'Score 90% in next exam', probability: student.currentScore > 85 ? 75 : 45, timeframe: '1 month' },
      { goal: 'Improve by 10 points', probability: student.trend === 'improving' ? 80 : 55, timeframe: '2 months' },
      { goal: 'Reach top 10 in batch', probability: student.currentScore > 88 ? 70 : 35, timeframe: '3 months' }
    ];

    const responseData = {
      student: {
        id: studentId,
        name: student.name,
        currentScore: student.currentScore,
        trend: student.trend,
        performance: student.performance
      },
      predictions: {
        scoreProgression: scorePredictions,
        rankPrediction: {
          current: currentRank,
          predicted: predictedRank,
          change: predictedRankChange,
          confidence: 78
        },
        subjectWise: subjectPredictions
      },
      riskAssessment: {
        level: riskLevel,
        factors: riskFactors,
        probability: riskLevel === 'low' ? 15 : riskLevel === 'medium' ? 35 : 65
      },
      successProbabilities,
      goalAchievement: goals,
      recommendations: recommendations.slice(0, 5),
      insights: [
        `Based on current trend, student is ${student.trend === 'improving' ? 'likely to improve' : student.trend === 'declining' ? 'at risk of declining' : 'maintaining stable performance'}`,
        `Predicted score improvement of ${scorePredictions[scorePredictions.length - 1].predictedScore - student.currentScore > 0 ? '+' : ''}${(scorePredictions[scorePredictions.length - 1].predictedScore - student.currentScore).toFixed(1)} points in ${months} months`,
        `${riskLevel === 'low' ? 'Low risk profile - continue current approach' : riskLevel === 'medium' ? 'Medium risk - monitor progress closely' : 'High risk - immediate intervention recommended'}`
      ]
    };

    console.log(`Predictive analytics generated for: ${student.name}`);

    return new Response(JSON.stringify({
      success: true,
      data: responseData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in predictive-analytics function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});