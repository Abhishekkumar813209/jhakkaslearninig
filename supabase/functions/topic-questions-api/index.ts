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
  
  if (questionType === 'fill_blank') {
    // 🔧 CRITICAL FIX: Preserve JSONB structure for drag-drop blanks
    // Check if it's the new format with blanks/sub_questions array
    if (typeof correctAnswer === 'object' && correctAnswer !== null) {
      if (correctAnswer.blanks || correctAnswer.sub_questions) {
        console.log('✅ Preserving fill_blank JSONB structure:', JSON.stringify(correctAnswer).substring(0, 100));
        return correctAnswer; // Store as-is (JSONB)
      }
    }
    // Legacy simple text format
    return { type: 'text', value: String(correctAnswer) };
  }
  
  if (questionType === 'subjective') {
    return { type: 'text', value: String(correctAnswer) };
  }
  
  if (questionType === 'match_column') {
    // Preserve match_column pairs structure
    if (typeof correctAnswer === 'object' && correctAnswer !== null && correctAnswer.pairs) {
      console.log('✅ Preserving match_column JSONB structure:', JSON.stringify(correctAnswer).substring(0, 100));
      return correctAnswer;
    }
  }
  
  return correctAnswer;
}

// Convert question data to JSONB format for storage
function convertQuestionToJSONB(question: any): { question_data: any; answer_data: any } {
  // 🚀 STEP 2A: Pass-through if already in new JSONB format
  if (question.question_data && typeof question.question_data === 'object' && 
      question.answer_data && typeof question.answer_data === 'object') {
    console.log('✅ Pass-through: Already in JSONB format');
    return { 
      question_data: question.question_data, 
      answer_data: question.answer_data 
    };
  }

  const qType = question.question_type;
  
  const question_data: any = {
    text: question.question_text || question.text || '',
    marks: question.marks || 1
  };
  
  const answer_data: any = {
    explanation: question.explanation || ''
  };

  switch (qType) {
    case 'mcq':
    case 'MCQ':
      question_data.options = stripHtmlFromOptions(question.options || []);
      
      // Handle multiple formats: number, string, letter, object
      let correctIndex = 0;
      const ca = question.correct_answer;
      
      if (typeof ca === 'number') {
        correctIndex = ca;
      } else if (typeof ca === 'object' && ca !== null) {
        correctIndex = ca.index ?? ca.value ?? 0;
      } else if (typeof ca === 'string') {
        const normalized = ca.trim().toUpperCase();
        if (normalized.length === 1 && normalized >= 'A' && normalized <= 'Z') {
          correctIndex = normalized.charCodeAt(0) - 65;
        } else {
          const parsed = parseInt(ca);
          correctIndex = isNaN(parsed) ? 0 : parsed;
        }
      }
      
      answer_data.correctIndex = correctIndex;
      break;

    case 'assertion_reason':
    case 'Assertion_Reason':
      question_data.assertion = question.assertion || '';
      question_data.reason = question.reason || '';
      question_data.options = question.options || [];
      answer_data.correctIndex = typeof question.correct_answer === 'number'
        ? question.correct_answer
        : (question.correct_answer?.index ?? 0);
      break;

    case 'fill_blank':
    case 'Fill_Blank':
      if (question.sub_questions && Array.isArray(question.sub_questions)) {
        question_data.sub_questions = question.sub_questions.map((sq: any) => ({
          text: sq.text || '',
        }));
        question_data.numbering_style = question.numberingStyle || '1,2,3';
        answer_data.blanks = question.sub_questions.map((sq: any) => ({
          correctAnswer: sq.correctAnswer || '',
          distractors: sq.distractors || []
        }));
      } else {
        const ca = question.correct_answer;
        if (ca?.blanks && Array.isArray(ca.blanks)) {
          answer_data.blanks = ca.blanks;
        } else {
          answer_data.blanks = [{
            correctAnswer: typeof ca === 'string' ? ca : (ca?.text || ca?.value || ''),
            distractors: ca?.distractors || []
          }];
        }
      }
      break;

    case 'true_false':
    case 'True_False':
      if (question.statements && Array.isArray(question.statements)) {
        question_data.statements = question.statements.map((s: any) => s.text || '');
        question_data.numbering_style = question.numberingStyle || 'i,ii,iii';
        answer_data.values = question.statements.map((s: any) => s.answer ?? true);
      } else {
        answer_data.value = typeof question.correct_answer === 'boolean'
          ? question.correct_answer
          : (question.correct_answer?.value ?? (String(question.correct_answer).toLowerCase() === 'true'));
      }
      break;

    case 'match_column':
    case 'Match_Column':
      question_data.leftColumn = question.left_column || question.leftColumn || [];
      question_data.rightColumn = question.right_column || question.rightColumn || [];
      
      const ca_match = question.correct_answer;
      if (ca_match?.pairs && Array.isArray(ca_match.pairs)) {
        answer_data.pairs = ca_match.pairs;
      } else if (typeof ca_match === 'string') {
        try {
          const parsed = JSON.parse(ca_match);
          answer_data.pairs = Array.isArray(parsed) ? parsed : [];
        } catch {
          answer_data.pairs = [];
        }
      } else if (typeof ca_match === 'object' && !Array.isArray(ca_match) && ca_match !== null) {
        answer_data.pairs = Object.entries(ca_match).map(([left, right]) => ({
          left: parseInt(left),
          right: typeof right === 'number' ? right : parseInt(right as string)
        }));
      } else {
        answer_data.pairs = [];
      }
      break;

    case 'match_pairs':
    case 'Match_Pairs':
      // 🆕 STEP 2B: Handle match_pairs distinctly
      const ca_pairs = question.correct_answer;
      if (ca_pairs?.pairs && Array.isArray(ca_pairs.pairs)) {
        answer_data.pairs = ca_pairs.pairs;
      } else if (typeof ca_pairs === 'string') {
        try {
          const parsed = JSON.parse(ca_pairs);
          answer_data.pairs = Array.isArray(parsed) ? parsed : [];
        } catch {
          answer_data.pairs = [];
        }
      } else if (Array.isArray(ca_pairs)) {
        answer_data.pairs = ca_pairs;
      } else {
        answer_data.pairs = [];
      }
      break;

    case 'short_answer':
    case 'subjective':
      answer_data.expectedAnswer = typeof question.correct_answer === 'string'
        ? question.correct_answer
        : (question.correct_answer?.text || '');
      break;

    default:
      answer_data.value = question.correct_answer;
  }

  return { question_data, answer_data };
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
    const adminActions = ['get_topic_questions', 'update_question_answer', 'finalize_and_link', 'save_draft_questions', 'delete_question', 'update_question', 'update_full_question', 'get_unanswered_questions', 'get_questions_by_filter', 'bulk_mark_reviewed', 'insert_sample_questions'];
    if (adminActions.includes(action) && !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin role required for this operation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== insert_sample_questions: Add 8 sample questions for testing (JSONB-ONLY) ==========
    if (action === 'insert_sample_questions') {
      const { topic_id, subject, chapter_id, batch_id } = body;
      if (!topic_id) {
        throw new Error('Missing topic_id');
      }

      console.log(`🎯 Inserting 8 sample questions (JSONB-only) for topic: ${topic_id}`);

      const sampleQuestions = [
        // 1. MCQ
        {
          question_type: 'mcq',
          question_data: {
            text: 'What is the powerhouse of the cell?',
            options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Chloroplast']
          },
          answer_data: {
            correctIndex: 2,
            explanation: 'Mitochondria is known as the powerhouse of the cell because it produces ATP.'
          },
          difficulty: 'easy',
          marks: 1
        },
        // 2. True/False
        {
          question_type: 'true_false',
          question_data: {
            text: 'Water boils at 100°C at sea level.'
          },
          answer_data: {
            value: true,
            explanation: 'Water boils at 100°C (212°F) at sea level atmospheric pressure.'
          },
          difficulty: 'easy',
          marks: 1
        },
        // 3. Fill in the Blank
        {
          question_type: 'fill_blank',
          question_data: {
            text: 'The process by which plants make their own food is called ___.'
          },
          answer_data: {
            blanks: [{
              correctAnswer: 'photosynthesis',
              distractors: []
            }],
            explanation: 'Photosynthesis is the process where plants use sunlight to synthesize food.'
          },
          difficulty: 'easy',
          marks: 1
        },
        // 4. Match Column
        {
          question_type: 'match_column',
          question_data: {
            text: 'Match the following scientists with their discoveries:',
            leftColumn: ['Isaac Newton', 'Albert Einstein', 'Marie Curie', 'Charles Darwin'],
            rightColumn: ['Theory of Evolution', 'Laws of Motion', 'Theory of Relativity', 'Radioactivity']
          },
          answer_data: {
            pairs: [
              { left: 0, right: 1 },
              { left: 1, right: 2 },
              { left: 2, right: 3 },
              { left: 3, right: 0 }
            ],
            explanation: 'Newton - Laws of Motion, Einstein - Relativity, Curie - Radioactivity, Darwin - Evolution'
          },
          difficulty: 'medium',
          marks: 2
        },
        // 5. Assertion-Reason
        {
          question_type: 'assertion_reason',
          question_data: {
            text: 'Read the assertion and reason carefully:',
            assertion: 'Plants release oxygen during photosynthesis.',
            reason: 'Oxygen is a by-product when plants convert carbon dioxide and water into glucose.',
            options: [
              'Both A and R are true and R is the correct explanation of A',
              'Both A and R are true but R is not the correct explanation of A',
              'A is true but R is false',
              'A is false but R is true'
            ]
          },
          answer_data: {
            correctIndex: 0,
            explanation: 'Both statements are true and the reason correctly explains the assertion.'
          },
          difficulty: 'medium',
          marks: 2
        },
        // 6. Short Answer
        {
          question_type: 'short_answer',
          question_data: {
            text: 'Explain the water cycle in 2-3 sentences.'
          },
          answer_data: {
            expectedAnswer: 'The water cycle describes how water evaporates from Earth surface, rises into the atmosphere, cools and condenses into clouds, and falls back as precipitation.',
            explanation: 'The water cycle involves evaporation, condensation, and precipitation.'
          },
          difficulty: 'medium',
          marks: 3
        },
        // 7. MCQ (Science-specific)
        {
          question_type: 'mcq',
          question_data: {
            text: 'Which gas is most abundant in Earth\'s atmosphere?',
            options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen']
          },
          answer_data: {
            correctIndex: 1,
            explanation: 'Nitrogen makes up about 78% of Earth\'s atmosphere.'
          },
          difficulty: 'easy',
          marks: 1
        },
        // 8. True/False (Science-specific)
        {
          question_type: 'true_false',
          question_data: {
            text: 'The speed of light is faster than the speed of sound.'
          },
          answer_data: {
            value: true,
            explanation: 'Light travels at approximately 300,000 km/s while sound travels at about 343 m/s in air.'
          },
          difficulty: 'easy',
          marks: 1
        }
      ];

      const insertPromises = sampleQuestions.map((q) => {
        console.log('✨ Inserting JSONB sample question:', { type: q.question_type, keys: Object.keys(q.question_data) });
        return serviceClient.from('question_bank').insert({
          topic_id,
          subject: subject || 'Science',
          chapter_id: chapter_id || null,
          batch_id: batch_id || null,
          created_by: user.id,
          is_approved: false,
          admin_reviewed: false,
          question_type: q.question_type,
          question_data: q.question_data,
          answer_data: q.answer_data,
          marks: q.marks,
          difficulty: q.difficulty
        });
      });

      const results = await Promise.all(insertPromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        console.error('❌ Some insertions failed:', errors);
        throw new Error(`Failed to insert ${errors.length} questions`);
      }

      console.log(`✅ Successfully inserted ${sampleQuestions.length} JSONB sample questions`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Inserted ${sampleQuestions.length} sample questions`,
          count: sampleQuestions.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        .select('id, question_type, question_data, answer_data, explanation, difficulty, marks, subject, chapter_id, created_at')
        .eq('topic_id', topic_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log(`✅ Found ${questions?.length || 0} questions in question_bank`);

      // Return JSONB data as-is for frontend to parse
      const normalized = (questions || []).map(q => ({
        id: q.id,
        question_type: q.question_type || 'mcq',
        question_data: q.question_data || {},
        answer_data: q.answer_data || {},
        explanation: q.explanation || '',
        marks: q.marks || 1,
        difficulty: q.difficulty || 'medium',
        subject: q.subject,
        chapter_id: q.chapter_id,
        created_at: q.created_at
      }));

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
      
      // 🔧 STRING PARSE: Parse JSON strings for match_column and other complex types
      if (typeof sanitizedCorrectAnswer === 'string' && (sanitizedCorrectAnswer.startsWith('{') || sanitizedCorrectAnswer.startsWith('['))) {
        try {
          console.log('🔄 Parsing JSON string answer:', sanitizedCorrectAnswer.substring(0, 100));
          sanitizedCorrectAnswer = JSON.parse(sanitizedCorrectAnswer);
          console.log('✅ Parsed to object:', sanitizedCorrectAnswer);
        } catch (err) {
          console.warn('⚠️ JSON parse failed:', err);
        }
      }
      
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
        sanitizedCorrectAnswer = normalizeCorrectAnswer(question.question_type, sanitizedCorrectAnswer, question.options);
      }
      
      console.log(`💾 Updating ${table} for question: ${question_id}, answer: ${sanitizedCorrectAnswer}`);
      
      const { error } = await serviceClient
        .from(table)
        .update({
          correct_answer: sanitizedCorrectAnswer,
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
      console.log('📊 Final sanitizedCorrectAnswer being written:', sanitizedCorrectAnswer, 'type:', typeof sanitizedCorrectAnswer);
      
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
            const correctAnswerValue = typeof sanitizedCorrectAnswer === 'string' 
              ? parseInt(sanitizedCorrectAnswer, 10) 
              : sanitizedCorrectAnswer;
            console.log('📝 Updating topic_learning_content with correct_answer:', correctAnswerValue);
            await serviceClient
              .from('topic_learning_content')
              .update({
                game_data: {
                  ...gameData,
                  correct_answer: correctAnswerValue,
                  correctAnswerIndex: correctAnswerValue
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
            const correctAnswerValue = typeof sanitizedCorrectAnswer === 'string' 
              ? parseInt(sanitizedCorrectAnswer, 10) 
              : sanitizedCorrectAnswer;
            console.log('🎮 Updating gamified_exercises with correct_answer:', correctAnswerValue);
            await serviceClient
              .from('gamified_exercises')
              .update({
                correct_answer: { correctAnswerIndex: correctAnswerValue },
                exercise_data: {
                  ...exerciseData,
                  correct_answer: correctAnswerValue,
                  correctAnswerIndex: correctAnswerValue
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

      const { data: questions } = await serviceClient
        .from('question_bank')
        .select('*')
        .in('id', question_ids);

      // 🛡️ VALIDATION: Check all MCQ questions have valid answers
      const invalidQuestions = (questions || []).filter(q => {
        if (q.question_type === 'mcq' || q.question_type === 'assertion_reason') {
          const ans = q.correct_answer;
          if (ans === null || ans === undefined) return true;
          
          // Accept numbers, numeric strings, or objects with index/value
          if (typeof ans === 'number' && ans >= 0) return false;
          if (typeof ans === 'string' && /^\d+$/.test(ans) && parseInt(ans) >= 0) return false;
          if (typeof ans === 'object' && (
            (typeof ans.index === 'number' && ans.index >= 0) ||
            (typeof ans.value === 'number' && ans.value >= 0)
          )) return false;
          
          return true; // Invalid format
        }
        return false; // Non-MCQ questions pass
      });

      if (invalidQuestions.length > 0) {
        const invalidIds = invalidQuestions.map(q => q.id).join(', ');
        console.error(`❌ ${invalidQuestions.length} questions have invalid/null answers:`, invalidQuestions.map(q => ({
          id: q.id,
          type: q.question_type,
          answer: q.correct_answer
        })));
        throw new Error(`Cannot approve: ${invalidQuestions.length} question(s) don't have valid answers. Please use "Save Changes" to set answers first. Question IDs: ${invalidIds}`);
      }

      // Mark as approved
      await serviceClient
        .from('question_bank')
        .update({
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .in('id', question_ids);

      let linkedCount = 0;
      let skippedCount = 0;
      let repairedCount = 0;

      for (const q of questions || []) {
        // IDEMPOTENCY CHECK: Look for existing mapping with (topic_id, question_id)
        const { data: existingMappings } = await serviceClient
          .from('topic_content_mapping')
          .select('id')
          .eq('topic_id', topic_id)
          .eq('question_id', q.id);

        if (existingMappings && existingMappings.length > 0) {
          console.log(`⏭️ Mapping already exists for question ${q.id}`);
          skippedCount++;
          
          // Check if exercise exists for this mapping
          const mappingId = existingMappings[0].id;
          const { data: existingExercises } = await serviceClient
            .from('gamified_exercises')
            .select('id, correct_answer, exercise_data')
            .eq('topic_content_id', mappingId);

          if (!existingExercises || existingExercises.length === 0) {
            console.log(`⚠️ Mapping exists but exercise missing for ${q.id}, creating...`);
            
            // Normalize MCQ index
            let mcqIndex = 0;
            if (q.question_type === 'mcq') {
              const ans = q.correct_answer;
              if (typeof ans === 'number') {
                mcqIndex = ans;
              } else if (typeof ans === 'string' && /^\d+$/.test(ans)) {
                mcqIndex = parseInt(ans, 10);
              } else if (ans?.value !== undefined && typeof ans.value === 'number') {
                mcqIndex = ans.value;
              } else if (ans?.index !== undefined && typeof ans.index === 'number') {
                mcqIndex = ans.index;
              }
              console.log(`🎯 Creating exercise for Q${q.id}: mcqIndex = ${mcqIndex}`);
            }
            
            const exerciseData = q.question_type === 'mcq'
              ? { 
                  question: q.question_text, 
                  options: q.options, 
                  correct_answer: mcqIndex,
                  correctAnswerIndex: mcqIndex,
                  marks: q.marks 
                }
              : { 
                  question: q.question_text, 
                  answer: q.correct_answer || '', 
                  marks: q.marks 
                };

            await serviceClient
              .from('gamified_exercises')
              .insert({
                topic_content_id: mappingId,
                exercise_type: q.question_type,
                exercise_data: exerciseData,
                correct_answer: q.question_type === 'mcq' 
                  ? { correctAnswerIndex: mcqIndex }
                  : q.correct_answer,
                explanation: q.explanation,
                xp_reward: (q.marks || 1) * 10,
                coin_reward: q.marks || 1,
                difficulty: q.difficulty || 'medium'
              });
          } else {
            // 🔧 REPAIR: Check if existing exercise has null/invalid answer
            const exercise = existingExercises[0];
            const needsRepair = (
              q.question_type === 'mcq' &&
              (
                exercise.correct_answer === null ||
                !exercise.correct_answer?.correctAnswerIndex ||
                !exercise.exercise_data?.correct_answer ||
                exercise.exercise_data?.correctAnswerIndex === undefined
              )
            );

            if (needsRepair) {
              console.log(`🔧 Repairing null answer for exercise ${exercise.id}`);
              
              // Normalize MCQ index
              let mcqIndex = 0;
              const ans = q.correct_answer;
              if (typeof ans === 'number') {
                mcqIndex = ans;
              } else if (typeof ans === 'string' && /^\d+$/.test(ans)) {
                mcqIndex = parseInt(ans, 10);
              } else if (ans?.value !== undefined && typeof ans.value === 'number') {
                mcqIndex = ans.value;
              } else if (ans?.index !== undefined && typeof ans.index === 'number') {
                mcqIndex = ans.index;
              }
              
              console.log(`🎯 Repair: Q${q.id} → mcqIndex = ${mcqIndex}`);
              
              const repairedExerciseData = {
                ...exercise.exercise_data,
                correct_answer: mcqIndex,
                correctAnswerIndex: mcqIndex
              };

              await serviceClient
                .from('gamified_exercises')
                .update({
                  correct_answer: { correctAnswerIndex: mcqIndex },
                  exercise_data: repairedExerciseData,
                  updated_at: new Date().toISOString()
                })
                .eq('id', exercise.id);
              
              repairedCount++;
            }
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

        // Normalize MCQ index robustly
        let mcqIndex = 0;
        if (q.question_type === 'mcq') {
          const ans = q.correct_answer;
          if (typeof ans === 'number') {
            mcqIndex = ans;
          } else if (typeof ans === 'string' && /^\d+$/.test(ans)) {
            mcqIndex = parseInt(ans, 10);
          } else if (ans?.value !== undefined && typeof ans.value === 'number') {
            mcqIndex = ans.value;
          } else if (ans?.index !== undefined && typeof ans.index === 'number') {
            mcqIndex = ans.index;
          }
          console.log(`🎯 New exercise for Q${q.id}: mcqIndex = ${mcqIndex}`);
        }

        // Create the exercise with properly formatted answer
        const exerciseData = q.question_type === 'mcq'
          ? { 
              question: q.question_text, 
              options: q.options, 
              correct_answer: mcqIndex,
              correctAnswerIndex: mcqIndex,
              marks: q.marks 
            }
          : { 
              question: q.question_text, 
              answer: q.correct_answer || '', 
              marks: q.marks 
            };

        const gamifiedExercise = {
          topic_content_id: mapping.id,
          exercise_type: q.question_type,
          exercise_data: exerciseData,
          correct_answer: q.question_type === 'mcq' 
            ? { correctAnswerIndex: mcqIndex }
            : q.correct_answer,
          explanation: q.explanation,
          xp_reward: (q.marks || 1) * 10,
          coin_reward: q.marks || 1,
          difficulty: q.difficulty || 'medium'
        };

        console.log(`📦 Creating gamified_exercise:`, {
          question_id: q.id,
          correct_answer: gamifiedExercise.correct_answer,
          exercise_data_answer: exerciseData.correct_answer
        });

        const { error: exerciseError } = await serviceClient
          .from('gamified_exercises')
          .insert(gamifiedExercise);

        if (exerciseError) {
          console.error(`❌ Failed to create exercise for mapping ${mapping.id}:`, exerciseError);
          continue;
        }

        linkedCount++;
      }

      console.log(`✅ Finalization complete: ${linkedCount} new links, ${skippedCount} skipped, ${repairedCount} repaired`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          linked_count: linkedCount,
          skipped_count: skippedCount,
          repaired_count: repairedCount,
          total_processed: questions?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== save_draft_questions (DUAL WRITE: JSONB + Legacy) ==========
    if (action === 'save_draft_questions') {
      const { questions, topic_id, subject, batch_id, source_id, exam_domain, exam_name } = body;
      
      if (!questions || !Array.isArray(questions) || !topic_id) {
        throw new Error('Missing questions array or topic_id');
      }

      console.log(`💾 Saving ${questions.length} draft questions (DUAL WRITE) for topic: ${topic_id}`);

      const savedQuestions = [];
      for (const q of questions) {
        // Convert to JSONB format using the helper
        let { question_data, answer_data } = convertQuestionToJSONB(q);
        
        // 🛡️ STEP 3: Safety check - patch JSONB if incomplete
        const qType = q.question_type?.toLowerCase();
        
        // Check if question_data is too minimal (only text/marks)
        const hasTypeSpecificData = 
          (qType === 'mcq' && question_data.options) ||
          (qType === 'fill_blank' && (answer_data.blanks || question_data.sub_questions)) ||
          (qType === 'true_false' && (answer_data.value !== undefined || answer_data.values)) ||
          (qType === 'match_column' && question_data.leftColumn && question_data.rightColumn) ||
          (qType === 'match_pairs' && answer_data.pairs) ||
          (qType === 'assertion_reason' && question_data.assertion);
        
        if (!hasTypeSpecificData) {
          console.warn('⚠️ JSONB incomplete, patching from legacy fields:', qType);
          
          // Patch from legacy fields
          if (qType === 'mcq' && q.options) {
            question_data.options = stripHtmlFromOptions(q.options);
            if (q.correct_answer !== undefined) {
              answer_data.correctIndex = typeof q.correct_answer === 'number' ? q.correct_answer : 0;
            }
          }
          
          if ((qType === 'match_column' || qType === 'match_pairs') && q.left_column && q.right_column) {
            question_data.leftColumn = q.left_column;
            question_data.rightColumn = q.right_column;
            if (q.correct_answer) {
              try {
                const parsed = typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer;
                answer_data.pairs = Array.isArray(parsed) ? parsed : [];
              } catch {
                answer_data.pairs = [];
              }
            }
          }
          
          if (qType === 'assertion_reason' && q.assertion && q.reason) {
            question_data.assertion = q.assertion;
            question_data.reason = q.reason;
            question_data.options = q.options || [];
            answer_data.correctIndex = typeof q.correct_answer === 'number' ? q.correct_answer : 0;
          }
          
          if (qType === 'fill_blank' && q.correct_answer) {
            if (!answer_data.blanks) {
              answer_data.blanks = [{
                correctAnswer: typeof q.correct_answer === 'string' ? q.correct_answer : '',
                distractors: []
              }];
            }
          }
          
          if (qType === 'true_false' && q.correct_answer !== undefined) {
            if (answer_data.value === undefined && !answer_data.values) {
              answer_data.value = String(q.correct_answer).toLowerCase() === 'true';
            }
          }
        }
        
        // Prepare legacy fields for dual-write compatibility
        const legacyFields: any = {
          question_text: q.question_text || question_data.text || question_data.question || '',
        };

        // Populate legacy columns based on question type
        if (q.question_type === 'mcq' || q.question_type === 'MCQ') {
          legacyFields.options = q.options || question_data.options || null;
          legacyFields.correct_answer = q.correct_answer || (answer_data.correctIndex !== undefined ? answer_data.correctIndex.toString() : null);
        } else if (q.question_type === 'match_column' || q.question_type === 'Match_Column') {
          legacyFields.left_column = q.left_column || question_data.leftColumn || null;
          legacyFields.right_column = q.right_column || question_data.rightColumn || null;
          legacyFields.correct_answer = q.correct_answer || (answer_data.pairs ? JSON.stringify(answer_data.pairs) : null);
        } else if (q.question_type === 'match_pairs' || q.question_type === 'Match_Pairs') {
          legacyFields.correct_answer = q.correct_answer || (answer_data.pairs ? JSON.stringify(answer_data.pairs) : null);
        } else if (q.question_type === 'true_false' || q.question_type === 'True_False') {
          legacyFields.correct_answer = q.correct_answer || (answer_data.value !== undefined ? answer_data.value.toString() : null);
        } else if (q.question_type === 'fill_blank' || q.question_type === 'Fill_Blank') {
          legacyFields.correct_answer = q.correct_answer || (answer_data.blanks ? JSON.stringify(answer_data.blanks) : null);
        } else if (q.question_type === 'assertion_reason' || q.question_type === 'Assertion_Reason') {
          legacyFields.assertion = q.assertion || question_data.assertion || null;
          legacyFields.reason = q.reason || question_data.reason || null;
          legacyFields.correct_answer = q.correct_answer || answer_data.value || null;
        }
        
        console.log('✨ Dual-write conversion:', { 
          type: q.question_type, 
          question_data_keys: Object.keys(question_data),
          question_data_sample: JSON.stringify(question_data).substring(0, 150),
          answer_data_keys: Object.keys(answer_data),
          answer_data_sample: JSON.stringify(answer_data).substring(0, 150),
          legacy_fields_keys: Object.keys(legacyFields)
        });
        
        // 🛡️ STEP 8: Optional JSONB validation guard
        const qd_keys = Object.keys(question_data);
        const ad_keys = Object.keys(answer_data);
        const hasMinimalData = qd_keys.includes('text') && question_data.text?.trim();
        
        if (!hasMinimalData) {
          console.error('⛔ JSONB validation failed - no question text:', { 
            type: q.question_type, 
            question_data_keys: qd_keys,
            answer_data_keys: ad_keys 
          });
          continue; // Skip this malformed question
        }
        
        const { data, error } = await serviceClient
          .from('question_bank')
          .insert({
            // JSONB columns (NEW)
            question_type: q.question_type,
            question_data: question_data,
            answer_data: answer_data,
            
            // Legacy columns (for compatibility during transition)
            ...legacyFields,
            
            // Metadata columns
            explanation: q.explanation || null,
            marks: q.marks || 1,
            difficulty: q.difficulty || 'medium',
            topic_id: topic_id,
            subject: subject,
            batch_id: batch_id || null,
            source_id: source_id || null,
            exam_domain: exam_domain || null,
            exam_name: exam_name || null,
            is_approved: false,
            admin_reviewed: false,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (!error) {
          savedQuestions.push(data);
          console.log(`✅ Saved question ${data.id} with BOTH JSONB + legacy data`);
        } else {
          console.error(`❌ Failed to save question:`, error);
        }
      }

      console.log(`✅ Saved ${savedQuestions.length}/${questions.length} draft questions (DUAL WRITE)`);

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
        'subject', 'explanation', 'question_type'
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

    // ========== update_full_question: Update all editable fields of a question ==========
    if (action === 'update_full_question') {
      const { 
        question_id, 
        question_text, 
        question_type, 
        options, 
        left_column, 
        right_column, 
        assertion, 
        reason, 
        blanks_count, 
        marks, 
        difficulty, 
        correct_answer, 
        explanation 
      } = body;

      if (!question_id) {
        throw new Error('Missing question_id');
      }

      console.log(`📝 Full update for question: ${question_id}`);

      // Get existing question to determine type if not provided
      const { data: existingQuestion, error: fetchError } = await serviceClient
        .from('question_bank')
        .select('*')
        .eq('id', question_id)
        .single();

      if (fetchError || !existingQuestion) {
        throw new Error('Question not found');
      }

      const qType = question_type || existingQuestion.question_type;

      // Build question object for JSONB conversion
      const questionForConversion: any = {
        question_text,
        question_type: qType,
        options,
        left_column,
        right_column,
        assertion,
        reason,
        blanks_count,
        marks,
        difficulty,
        correct_answer,
        explanation,
        // Preserve sub-questions and statements if present
        sub_questions: (body as any).sub_questions,
        statements: (body as any).statements,
        numberingStyle: (body as any).numberingStyle
      };

      // Convert to JSONB format
      const { question_data, answer_data } = convertQuestionToJSONB(questionForConversion);

      // Build update object with JSONB-only write
      const updateData: any = {
        question_type: qType,
        question_data,
        answer_data,
        updated_at: new Date().toISOString()
      };

      if (marks !== undefined) {
        updateData.marks = marks;
      }

      if (difficulty !== undefined) {
        updateData.difficulty = difficulty;
      }

      // Perform update
      const { error: updateError } = await serviceClient
        .from('question_bank')
        .update(updateData)
        .eq('id', question_id);

      if (updateError) {
        console.error('❌ Update failed:', updateError);
        throw updateError;
      }

      console.log(`✅ Full question update successful: ${question_id}`);

      // Sync to gamified_exercises if already linked
      const { data: mappings } = await serviceClient
        .from('topic_content_mapping')
        .select('id')
        .eq('question_id', question_id);

      if (mappings && mappings.length > 0) {
        console.log(`🔄 Syncing ${mappings.length} linked exercise(s)`);
        
        for (const mapping of mappings) {
          const { data: exercise } = await serviceClient
            .from('gamified_exercises')
            .select('*')
            .eq('topic_content_id', mapping.id)
            .single();

          if (exercise) {
            const exerciseUpdate: any = {
              updated_at: new Date().toISOString()
            };

            // Update exercise_data with new question content
            const newExerciseData = { ...exercise.exercise_data };
            if (question_text !== undefined) {
              newExerciseData.question = stripHtmlTags(question_text);
            }
            if (options !== undefined && qType === 'mcq') {
              newExerciseData.options = stripHtmlFromOptions(options);
            }
            if (marks !== undefined) {
              newExerciseData.marks = marks;
            }
            if (difficulty !== undefined) {
              newExerciseData.difficulty = difficulty;
            }
            if (correct_answer !== undefined && correct_answer !== null) {
              const finalOptions = options !== undefined ? options : existingQuestion.options;
              const normalizedAnswer = normalizeCorrectAnswer(qType, correct_answer, finalOptions);
              if (qType === 'mcq') {
                const answerNumber = typeof normalizedAnswer === 'number' ? normalizedAnswer : 0;
                newExerciseData.correct_answer = answerNumber;
                newExerciseData.correctAnswerIndex = answerNumber;
                exerciseUpdate.correct_answer = { correctAnswerIndex: answerNumber };
                console.log(`🔄 Syncing MCQ answer: Q${question_id} → answerNumber = ${answerNumber}`);
              } else {
                exerciseUpdate.correct_answer = normalizedAnswer;
              }
            }

            exerciseUpdate.exercise_data = newExerciseData;
            if (explanation !== undefined) {
              exerciseUpdate.explanation = explanation;
            }
            if (difficulty !== undefined) {
              exerciseUpdate.difficulty = difficulty;
            }

            await serviceClient
              .from('gamified_exercises')
              .update(exerciseUpdate)
              .eq('id', exercise.id);
          }
        }

        console.log(`✅ Synced to gamified_exercises`);
      }

      return new Response(
        JSON.stringify({ success: true, question_id }),
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

      // Pagination - stable sort by creation time (newest first)
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
