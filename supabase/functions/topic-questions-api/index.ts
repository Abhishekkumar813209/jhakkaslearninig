import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, Authorization, x-client-info, apikey, content-type',
};

// HTML Stripping helpers
function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')  // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')   // Replace &nbsp; with space
    .replace(/&amp;/g, '&')    // Decode &amp;
    .replace(/&lt;/g, '<')     // Decode &lt;
    .replace(/&gt;/g, '>')     // Decode &gt;
    .replace(/&quot;/g, '"')   // Decode &quot;
    .trim()
    .replace(/\s+/g, ' ');     // Collapse multiple spaces
}

function stripHtmlFromOptions(options: string[] | null): string[] | null {
  if (!options || !Array.isArray(options)) return options;
  return options.map(opt => stripHtmlTags(opt));
}

// Normalize correct answer to plain format (MCQ = number, others = structured)
function normalizeCorrectAnswer(questionType: string, correctAnswer: any, options: string[] | null): any {
  console.log('🔧 Normalizing answer:', { questionType, correctAnswer, options });
  
  if (questionType === 'mcq') {
    // For MCQ, return ONLY the numeric index (simplified storage)
    if (typeof correctAnswer === 'object' && correctAnswer !== null) {
      if ('index' in correctAnswer && typeof correctAnswer.index === 'number') {
        console.log('✅ Normalized object { index } format:', correctAnswer.index);
        return correctAnswer.index;
      }
      if ('value' in correctAnswer && typeof correctAnswer.value === 'number') {
        console.log('✅ Normalized object { value } format:', correctAnswer.value);
        return correctAnswer.value;
      }
    }
    
    if (typeof correctAnswer === 'number') {
      console.log('✅ Normalized number format:', correctAnswer);
      return correctAnswer;
    }
    
    if (typeof correctAnswer === 'string') {
      try {
        const parsed = JSON.parse(correctAnswer);
        if (typeof parsed === 'object' && parsed !== null) {
          if ('value' in parsed && typeof parsed.value === 'number') {
            console.log('✅ Normalized JSON string with value:', parsed.value);
            return parsed.value;
          }
          if ('index' in parsed && typeof parsed.index === 'number') {
            console.log('✅ Normalized JSON string with index:', parsed.index);
            return parsed.index;
          }
        }
      } catch {
        // Not JSON, continue
      }
      
      const normalized = correctAnswer.trim().toUpperCase();
      
      if (normalized.length === 1 && normalized >= 'A' && normalized <= 'Z') {
        const index = normalized.charCodeAt(0) - 65;
        console.log('✅ Normalized letter format:', normalized, '→', index);
        return index;
      }
      
      if (options && options.length > 0) {
        const index = options.findIndex(opt => 
          opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
        );
        if (index !== -1) {
          console.log('✅ Normalized text match format:', index);
          return index;
        }
      }
      
      const parsed = parseInt(correctAnswer);
      if (!isNaN(parsed)) {
        console.log('✅ Normalized numeric string format:', parsed);
        return parsed;
      }
    }
    
    console.error('❌ Unhandled correctAnswer format:', correctAnswer);
    return 0;
  }
  
  if (questionType === 'true_false') {
    const value = String(correctAnswer).toLowerCase() === 'true';
    return { type: 'boolean', value };
  }
  
  if (questionType === 'fill_blank' || questionType === 'subjective') {
    return { type: 'text', value: String(correctAnswer) };
  }
  
  return correctAnswer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header present:', !!authHeader, authHeader ? `(length: ${authHeader.length})` : '(missing)');
    
    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token from Bearer header
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    console.log('🔑 JWT extracted (length:', jwt.length, ')');

    // Auth client for user validation
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Explicitly pass JWT to getUser() instead of relying on global headers
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError || !user) {
      console.error('❌ getUser() failed:', userError?.message || 'Invalid JWT token');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ User authenticated:', user.id, 'email:', user.email?.substring(0, 15) + '...');

    // Service role client for DB operations (bypasses RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check if user is admin
    const { data: roleData, error: roleError } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('❌ Role check failed:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = roleData?.role === 'admin';
    console.log('👤 Admin role check:', isAdmin ? '✅ Authorized' : '❌ Not admin');
    
    // Admin enforcement is action-scoped below; not enforced globally here


    const body = await req.json();
    const { action } = body;
    console.log(`🎯 Action requested: ${action}, user: ${user.id}`);

    // Enforce admin only for specific actions
    const adminActions = ['get_topic_questions', 'update_question_answer', 'finalize_and_link', 'save_draft_questions', 'delete_question', 'update_question', 'get_unanswered_questions', 'get_questions_by_filter', 'bulk_mark_reviewed'];
    if (adminActions.includes(action) && !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin role required for this operation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== get_topic_questions: Load all questions from question_bank for a topic ==========
    if (action === 'get_topic_questions') {
      const { topic_id } = body;
      if (!topic_id) {
        console.error('❌ Missing topic_id in get_topic_questions');
        throw new Error('Missing topic_id');
      }

      console.log(`📚 Fetching questions for topic: ${topic_id}`);

      const { data: questions, error } = await serviceClient
        .from('question_bank')
        .select('*')
        .eq('topic_id', topic_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log(`✅ Found ${questions?.length || 0} questions in question_bank`);

      // Map to UI-friendly format for admin tool
      const normalized = (questions || []).map(q => {
        let ans = q.correct_answer;
        
        // For MCQ, ensure 0-based index format
        if (q.question_type === 'mcq' && ans !== null && ans !== undefined) {
          if (typeof ans === 'string' && /^\d+$/.test(ans)) {
            // Already 0-based string index after migration
            ans = parseInt(ans);
          } else if (typeof ans === 'number') {
            // Already 0-based number
            ans = ans;
          }
        }
        
        return { ...q, correct_answer: ans };
      });

      return new Response(
        JSON.stringify({ success: true, questions: normalized }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== update_question_answer ==========
    if (action === 'update_question_answer') {
      const { question_id, correct_answer, explanation } = body;
      if (!question_id || correct_answer === undefined) {
        throw new Error('Missing question_id or correct_answer');
      }

      // Try generated_questions first (Answer Management flow)
      let { data: question } = await serviceClient
        .from('generated_questions')
        .select('*')
        .eq('id', question_id)
        .single();

      let table = 'generated_questions';
      
      // Fallback to question_bank if not found (legacy flow)
      if (!question) {
        const { data: qbQuestion } = await serviceClient
          .from('question_bank')
          .select('*')
          .eq('id', question_id)
          .single();
        
        question = qbQuestion;
        table = 'question_bank';
      }

      if (!question) throw new Error('Question not found');

      let sanitizedCorrectAnswer = correct_answer;
      
      // For MCQ questions in question_bank, ensure 0-based index
      if (table === 'question_bank' && question.question_type === 'mcq' && sanitizedCorrectAnswer !== null && sanitizedCorrectAnswer !== undefined) {
        if (typeof sanitizedCorrectAnswer === 'string' && /^\d+$/.test(sanitizedCorrectAnswer)) {
          const index = parseInt(sanitizedCorrectAnswer);
          if (index >= 0 && index < (question.options?.length || 0)) {
            sanitizedCorrectAnswer = index.toString();
          }
        } else if (typeof sanitizedCorrectAnswer === 'number') {
          if (sanitizedCorrectAnswer >= 0 && sanitizedCorrectAnswer < (question.options?.length || 0)) {
            sanitizedCorrectAnswer = sanitizedCorrectAnswer.toString();
          }
        } else if (typeof sanitizedCorrectAnswer === 'string') {
          // Text answer - convert to 0-based index
          const optionIndex = (question.options || []).findIndex(
            opt => opt.trim().toLowerCase() === sanitizedCorrectAnswer.trim().toLowerCase()
          );
          if (optionIndex !== -1) {
            sanitizedCorrectAnswer = optionIndex.toString();
          }
        }
      } else {
        // For generated_questions table, use existing normalization
        sanitizedCorrectAnswer = normalizeCorrectAnswer(question.question_type, correct_answer, question.options);
      }
      
      console.log(`💾 Updating ${table} for question: ${question_id}, answer: ${sanitizedCorrectAnswer}`);
      
      const { error } = await serviceClient
        .from(table)
        .update({
          correct_answer: normalized,
          explanation: explanation || null,
          admin_reviewed: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', question_id);

      if (error) throw error;

      // Sync student-facing content (topic_learning_content & gamified_exercises)
      console.log('🔄 Syncing student-facing content for question:', question_id);
      
      // Update topic_learning_content rows
      const { data: learningContent, error: lcFetchError } = await serviceClient
        .from('topic_learning_content')
        .select('id, game_data')
        .eq('topic_id', question.topic_id)
        .eq('lesson_type', 'game')
        .eq('game_type', 'mcq');
      
      if (!lcFetchError && learningContent) {
        let lcUpdateCount = 0;
        for (const lc of learningContent) {
          const gameData = lc.game_data as any;
          if (gameData?.question === question.question_text) {
            await serviceClient
              .from('topic_learning_content')
              .update({
                game_data: {
                  ...gameData,
                  correct_answer: typeof normalized === 'number' ? normalized : (normalized.value ?? 0)
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', lc.id);
            lcUpdateCount++;
          }
        }
        console.log(`✅ Updated ${lcUpdateCount} topic_learning_content rows`);
      }

      // Update gamified_exercises rows
      const { data: exercises, error: exFetchError } = await serviceClient
        .from('gamified_exercises')
        .select('id, exercise_data')
        .eq('exercise_type', 'mcq');
      
      if (!exFetchError && exercises) {
        let exUpdateCount = 0;
        for (const ex of exercises) {
          const exerciseData = ex.exercise_data as any;
          if (exerciseData?.question === question.question_text) {
            await serviceClient
              .from('gamified_exercises')
              .update({
                correct_answer: normalized,
                exercise_data: {
                  ...exerciseData,
                  correct_answer: typeof normalized === 'number' ? normalized : (normalized.value ?? 0)
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', ex.id);
            exUpdateCount++;
          }
        }
        console.log(`✅ Updated ${exUpdateCount} gamified_exercises rows`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== finalize_and_link (IDEMPOTENT) ==========
    if (action === 'finalize_and_link') {
      const { question_ids, topic_id } = body;
      if (!question_ids || !Array.isArray(question_ids) || !topic_id) {
        throw new Error('Missing question_ids or topic_id');
      }

      console.log(`🔗 Finalizing ${question_ids.length} questions for topic ${topic_id}`);

      // Mark as approved
      await serviceClient
        .from('question_bank')
        .update({
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .in('id', question_ids);

      const { data: questions } = await serviceClient
        .from('question_bank')
        .select('*')
        .in('id', question_ids);

      let linkedCount = 0;
      let skippedCount = 0;

      for (const q of questions || []) {
        // IDEMPOTENCY CHECK: Look for existing mapping with (topic_id, question_id)
        const { data: existingMappings } = await serviceClient
          .from('topic_content_mapping')
          .select('id')
          .eq('topic_id', topic_id)
          .eq('question_id', q.id);

        if (existingMappings && existingMappings.length > 0) {
          console.log(`⏭️ Mapping already exists for question ${q.id}, skipping...`);
          skippedCount++;
          
          // Check if exercise exists for this mapping
          const mappingId = existingMappings[0].id;
          const { data: existingExercise } = await serviceClient
            .from('gamified_exercises')
            .select('id')
            .eq('topic_content_id', mappingId)
            .limit(1);

          if (!existingExercise || existingExercise.length === 0) {
            console.log(`⚠️ Mapping exists but exercise missing for ${q.id}, creating exercise...`);
            
            const exerciseData = q.question_type === 'mcq'
              ? { question: q.question_text, options: q.options, correct_answer: typeof q.correct_answer === 'number' ? q.correct_answer : (q.correct_answer?.value ?? 0), marks: q.marks }
              : { question: q.question_text, answer: typeof q.correct_answer === 'number' ? q.correct_answer : (q.correct_answer?.value ?? ''), marks: q.marks };

            await serviceClient
              .from('gamified_exercises')
              .insert({
                topic_content_id: mappingId,
                exercise_type: q.question_type,
                exercise_data: exerciseData,
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                xp_reward: (q.marks || 1) * 10,
                coin_reward: q.marks || 1,
                difficulty: q.difficulty || 'medium'
              });
          }
          
          continue; // Skip to next question
        }

        // No existing mapping, create new one
        const { count } = await serviceClient
          .from('topic_content_mapping')
          .select('*', { count: 'exact', head: true })
          .eq('topic_id', topic_id);

        const { data: mapping, error: mappingError } = await serviceClient
          .from('topic_content_mapping')
          .insert({
            topic_id,
            question_id: q.id,
            content_type: q.question_type === 'mcq' ? 'quiz' : 'game',
            order_num: (count ?? 0) + 1
          })
          .select('id')
          .single();

        if (mappingError || !mapping) {
          console.error(`❌ Failed to create mapping for question ${q.id}:`, mappingError);
          continue;
        }

        console.log(`✅ Created new mapping for question ${q.id}`);

        // Create the exercise
        const exerciseData = q.question_type === 'mcq'
          ? { question: q.question_text, options: q.options, correct_answer: typeof q.correct_answer === 'number' ? q.correct_answer : (q.correct_answer?.value ?? 0), marks: q.marks }
          : { question: q.question_text, answer: typeof q.correct_answer === 'number' ? q.correct_answer : (q.correct_answer?.value ?? ''), marks: q.marks };

        const { error: exerciseError } = await serviceClient
          .from('gamified_exercises')
          .insert({
            topic_content_id: mapping.id,
            exercise_type: q.question_type,
            exercise_data: exerciseData,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            xp_reward: (q.marks || 1) * 10,
            coin_reward: q.marks || 1,
            difficulty: q.difficulty || 'medium'
          });

        if (exerciseError) {
          console.error(`❌ Failed to create exercise for mapping ${mapping.id}:`, exerciseError);
          continue;
        }

        linkedCount++;
      }

      console.log(`✅ Finalization complete: ${linkedCount} new links, ${skippedCount} skipped (already existed)`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          linked_count: linkedCount,
          skipped_count: skippedCount,
          total_processed: questions?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== save_draft_questions ==========
    if (action === 'save_draft_questions') {
      const { questions, topic_id, subject, chapter_name, batch_id, roadmap_id, source_id } = body;
      
      if (!questions || !Array.isArray(questions) || !topic_id) {
        throw new Error('Missing questions array or topic_id');
      }

      console.log(`💾 Saving ${questions.length} draft questions for topic: ${topic_id}`);

      const savedQuestions = [];
      for (const q of questions) {
        let correctAnswer = q.correct_answer;
        
        // Normalize to 0-based index for MCQs
        if (q.question_type === 'mcq' && correctAnswer !== null && correctAnswer !== undefined) {
          if (typeof correctAnswer === 'string' && /^\d+$/.test(correctAnswer)) {
            const index = parseInt(correctAnswer);
            // Convert 1-based to 0-based if needed
            if (index > 0 && index <= (q.options?.length || 0)) {
              correctAnswer = (index - 1).toString();
            } else {
              correctAnswer = index.toString();
            }
          } else if (typeof correctAnswer === 'number') {
            // If AI returns 1-based, convert to 0-based
            if (correctAnswer > 0 && correctAnswer <= (q.options?.length || 0)) {
              correctAnswer = (correctAnswer - 1).toString();
            } else {
              correctAnswer = correctAnswer.toString();
            }
          } else if (typeof correctAnswer === 'string') {
            // Text answer - find index in options
            const optionIndex = (q.options || []).findIndex(
              opt => opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
            );
            if (optionIndex !== -1) {
              correctAnswer = optionIndex.toString();
            }
          }
        }
        
        const { data, error } = await serviceClient
          .from('question_bank')
          .insert({
            question_text: stripHtmlTags(q.question_text),
            question_type: q.question_type,
            options: stripHtmlFromOptions(q.options || null),
            marks: q.marks || 1,
            difficulty: q.difficulty || 'medium',
            topic_id: topic_id,
            subject: subject,
            chapter_name: chapter_name,
            batch_id: batch_id || null,
            roadmap_id: roadmap_id || null,
            source_id: source_id || null,
            correct_answer: correctAnswer,  // 0-based index or null for draft
            is_approved: false,     // Not yet approved
            admin_reviewed: false,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (!error) savedQuestions.push(data);
      }

      console.log(`✅ Saved ${savedQuestions.length} draft questions`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          saved_count: savedQuestions.length,
          question_ids: savedQuestions.map(q => q.id)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== delete_question ==========
    if (action === 'delete_question') {
      const { question_id } = body;
      
      if (!question_id) {
        throw new Error('Missing question_id');
      }

      console.log(`🗑️ Deleting question: ${question_id}`);

      // Delete from question_bank
      const { error } = await serviceClient
        .from('question_bank')
        .delete()
        .eq('id', question_id);
      
      if (error) throw error;

      // Also cleanup any linked content (will cascade via FK constraints)
      await serviceClient
        .from('topic_content_mapping')
        .delete()
        .eq('question_id', question_id);

      console.log(`✅ Question deleted: ${question_id}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== update_question ==========
    if (action === 'update_question') {
      const { question_id, updates } = body;
      
      if (!question_id || !updates) {
        throw new Error('Missing question_id or updates');
      }

      console.log(`✏️ Updating question: ${question_id}`);

      const allowedFields = [
        'question_text', 'options', 'marks', 'difficulty', 
        'subject', 'chapter_name', 'explanation', 'question_type'
      ];
      
      const sanitizedUpdates: any = {};
      for (const key of allowedFields) {
        if (key in updates) {
          if (key === 'question_text' && updates[key]) {
            sanitizedUpdates[key] = stripHtmlTags(updates[key]);
          } else if (key === 'options' && updates[key]) {
            sanitizedUpdates[key] = stripHtmlFromOptions(updates[key]);
          } else {
            sanitizedUpdates[key] = updates[key];
          }
        }
      }
      
      sanitizedUpdates['updated_at'] = new Date().toISOString();
      
      const { error } = await serviceClient
        .from('question_bank')
        .update(sanitizedUpdates)
        .eq('id', question_id);
      
      if (error) throw error;

      console.log(`✅ Question updated: ${question_id}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // ========== get_unanswered_questions ==========
    if (action === 'get_unanswered_questions') {
      console.log('📥 Fetching unanswered questions');
      
      const filters: any = {};
      if (body.exam_domain) filters.exam_domain = body.exam_domain;
      if (body.batch_id) filters.batch_id = body.batch_id;
      if (body.subject) filters.subject = body.subject;
      if (body.chapter_id) filters.chapter_id = body.chapter_id;
      if (body.topic_id) filters.topic_id = body.topic_id;

      const { data: questions, error } = await serviceClient
        .from('generated_questions')
        .select('*')
        .is('correct_answer', null)
        .match(filters)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Found ${questions?.length || 0} unanswered questions`);
      
      return new Response(
        JSON.stringify({ success: true, questions: questions || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== get_questions_by_filter ==========
    if (action === 'get_questions_by_filter') {
      const { exam_domain, batch_id, subject, chapter_id, topic_id, answer_status, search_term, offset = 0, limit = 20 } = body;
      
      console.log('🔍 Filtering questions:', { exam_domain, batch_id, subject, chapter_id, topic_id, answer_status, search_term });

      let query = serviceClient.from('question_bank').select('*, roadmap_topics!inner(topic_name, chapter:roadmap_chapters!inner(chapter_name))', { count: 'exact' });

      // Apply filters
      if (exam_domain) query = query.eq('exam_domain', exam_domain);
      if (batch_id) query = query.eq('batch_id', batch_id);
      if (subject) query = query.eq('subject', subject);
      if (chapter_id) query = query.eq('chapter_id', chapter_id);
      if (topic_id) query = query.eq('topic_id', topic_id);
      
      // Answer status filter
      if (answer_status === 'unanswered') {
        query = query.is('correct_answer', null);
      } else if (answer_status === 'answered') {
        query = query.not('correct_answer', 'is', null);
      } else if (answer_status === 'reviewed') {
        query = query.eq('admin_reviewed', true);
      }

      // Search term
      if (search_term) {
        query = query.ilike('question_text', `%${search_term}%`);
      }

      // Pagination
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data: questions, error, count } = await query;

      if (error) throw error;

      console.log(`✅ Found ${questions?.length || 0} questions (total: ${count})`);

      return new Response(
        JSON.stringify({ success: true, questions: questions || [], total_count: count || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== bulk_mark_reviewed ==========
    if (action === 'bulk_mark_reviewed') {
      const { question_ids } = body;
      
      if (!question_ids || !Array.isArray(question_ids)) {
        throw new Error('Missing question_ids array');
      }

      console.log(`✅ Marking ${question_ids.length} questions as reviewed`);

      const { error } = await serviceClient
        .from('question_bank')
        .update({
          admin_reviewed: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .in('id', question_ids);

      if (error) throw error;

      console.log(`✅ Successfully marked ${question_ids.length} questions as reviewed`);

      return new Response(
        JSON.stringify({ success: true, updated_count: question_ids.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== get_by_topic (for students - returns all linked exercises) ==========
    if (action === 'get_by_topic') {
      const { topic_id } = body;
      if (!topic_id) throw new Error('topic_id required');

      console.log(`📖 get_by_topic for topic: ${topic_id}`);

      // Join topic_content_mapping with gamified_exercises to get all linked questions in order
      const { data: exercises, error } = await serviceClient
        .from('topic_content_mapping')
        .select(`
          id,
          order_num,
          gamified_exercises (
            id,
            exercise_type,
            exercise_data,
            correct_answer,
            explanation,
            xp_reward,
            difficulty,
            created_at
          )
        `)
        .eq('topic_id', topic_id)
        .order('order_num', { ascending: true });

      if (error) {
        console.error('❌ Error fetching exercises:', error);
        throw error;
      }

      if (!exercises || exercises.length === 0) {
        console.log('⚠️ No exercises found for topic');
        return new Response(
          JSON.stringify({ success: true, questions: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Flatten all exercises and normalize; keep order by mapping.order_num then exercise.created_at
      let totalExercises = 0;
      const questions: any[] = [];
      for (const m of (exercises as any[])) {
        const list = (m.gamified_exercises || []) as any[];
        totalExercises += list.length;
        for (const ge of list) {
          let answer = ge.correct_answer;
          // Normalize MCQ answer to simple index number
          if (ge.exercise_type === 'mcq' && typeof answer === 'object' && answer !== null) {
            answer = ('value' in answer ? answer.value : ('index' in answer ? answer.index : 0));
          }
          questions.push({
            id: ge.id,
            exercise_type: ge.exercise_type,
            exercise_data: ge.exercise_data,
            correct_answer: answer,
            explanation: ge.explanation,
            xp_reward: ge.xp_reward,
            difficulty: ge.difficulty,
            _order_num: m.order_num,
            _created_at: ge.created_at
          });
        }
      }

      // Sort by mapping order, then by creation time for stability
      questions.sort((a, b) => {
        if (a._order_num !== b._order_num) return a._order_num - b._order_num;
        return new Date(a._created_at).getTime() - new Date(b._created_at).getTime();
      });

      // Remove helper fields
      const sanitized = questions.map(({ _order_num, _created_at, ...rest }) => rest);

      console.log(`✅ Mappings: ${exercises.length}, total exercises: ${totalExercises}, returning: ${sanitized.length}`);

      return new Response(
        JSON.stringify({ success: true, questions: sanitized }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
