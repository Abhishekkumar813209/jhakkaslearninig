import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth client for user validation
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service role client for DB operations (bypasses RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check if user is admin
    const { data: roleData } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin role required for this operation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`💾 User ${user.id} (role: ${roleData.role}) saving questions...`);

    const { questions, subject, chapter_name, topic_name, source_id } = await req.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('Questions array is required');
    }

    console.log(`💾 Saving ${questions.length} questions to database...`);

    const insertedQuestions = [];
    const approvalQueueEntries = [];

    // Insert questions into generated_questions table using service client
    for (const q of questions) {
      const questionData = {
        question_text: q.question_text,
        question_type: q.question_type,
        correct_answer: q.correct_answer || null,
        options: q.options || null,
        marks: q.marks || 1,
        difficulty: q.difficulty || 'medium',
        subject: subject || null,
        chapter_name: chapter_name || null,
        topic_name: topic_name || null,
        source_id: source_id || null,
        is_approved: false, // Requires approval
        explanation: null // Can be added later
      };

      // Insert into generated_questions using service client (bypasses RLS)
      const { data: inserted, error: insertError } = await serviceClient
        .from('generated_questions')
        .insert(questionData)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting question:', insertError);
        throw insertError;
      }

      insertedQuestions.push(inserted);

      // Add to content approval queue
      const { error: approvalError } = await serviceClient
        .from('content_approval_queue')
        .insert({
          content_type: 'question',
          content_id: inserted.id,
          source_id: source_id || null,
          status: 'pending'
        });

      if (approvalError) {
        console.error('Error adding to approval queue:', approvalError);
      } else {
        approvalQueueEntries.push(inserted.id);
      }
    }

    console.log(`✅ Saved ${insertedQuestions.length} questions, ${approvalQueueEntries.length} added to approval queue`);

    return new Response(
      JSON.stringify({
        success: true,
        count: insertedQuestions.length,
        question_ids: insertedQuestions.map(q => q.id),
        approval_queue_count: approvalQueueEntries.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-extracted-questions:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
