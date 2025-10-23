import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get batch size from request (default: 100)
    const { batchSize = 100 } = await req.json().catch(() => ({ batchSize: 100 }));
    
    console.log(`Starting MCQ migration - batch size: ${batchSize}`);
    
    // Helper to detect index format
    const isIndexFormat = (value: string): boolean => {
      return /^\d$/.test(value);
    };
    
    // Get unmigrated MCQ questions (where correct_answer is NOT a single digit)
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .eq('qtype', 'mcq')
      .limit(batchSize);
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No questions to migrate',
        migrated: 0,
        remaining: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Filter to only unmigrated questions
    const unmigratedQuestions = questions.filter(q => !isIndexFormat(q.correct_answer));
    
    console.log(`Found ${unmigratedQuestions.length} unmigrated questions`);
    
    let migratedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Process each question
    for (const question of unmigratedQuestions) {
      try {
        // Parse options
        const options = typeof question.options === 'string' 
          ? JSON.parse(question.options) 
          : question.options;
        
        if (!Array.isArray(options)) {
          errors.push(`Question ${question.id}: Invalid options format`);
          errorCount++;
          continue;
        }
        
        // Find the correct option index
        const correctIndex = options.findIndex((opt: any) => opt.isCorrect === true);
        
        if (correctIndex === -1) {
          errors.push(`Question ${question.id}: No correct option found`);
          errorCount++;
          continue;
        }
        
        // Update the question with index-based correct_answer
        const { error: updateError } = await supabase
          .from('questions')
          .update({ correct_answer: correctIndex.toString() })
          .eq('id', question.id);
        
        if (updateError) {
          errors.push(`Question ${question.id}: Update failed - ${updateError.message}`);
          errorCount++;
        } else {
          migratedCount++;
          console.log(`Migrated question ${question.id}: "${question.correct_answer}" -> "${correctIndex}"`);
        }
      } catch (error) {
        errors.push(`Question ${question.id}: ${(error as Error).message}`);
        errorCount++;
      }
    }
    
    // Count remaining unmigrated questions
    const { count: remainingCount } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('qtype', 'mcq');
    
    const totalRemaining = (remainingCount || 0) - migratedCount;
    
    console.log(`Migration complete: ${migratedCount} migrated, ${errorCount} errors, ${totalRemaining} remaining`);
    
    return new Response(JSON.stringify({
      success: true,
      migrated: migratedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      remaining: Math.max(0, totalRemaining),
      message: `Successfully migrated ${migratedCount} questions. ${totalRemaining} questions remaining.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in MCQ migration:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: (error as Error).message || 'Unknown error',
      migrated: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
