import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// PHASE 1: Aggressive Question Number Detection
const detectAllQuestionNumbers = (text: string): Set<string> => {
  const numbers = new Set<string>();
  
  // Pattern 1: [QUESTION_N] markers
  const markerMatches = text.matchAll(/\[QUESTION_(\d+)\]/gi);
  for (const match of markerMatches) numbers.add(match[1]);
  
  // Pattern 2: "Q" + number anywhere in line
  const qMatches = text.matchAll(/\bQ(?:uestion)?\s*(\d+)\b/gi);
  for (const match of qMatches) numbers.add(match[1]);
  
  // Pattern 3: Standalone numbers with punctuation (but not page numbers)
  const numMatches = text.matchAll(/(?<!page\s|chapter\s|section\s)(\d+)\s*[.:\)\-]\s*(?=[A-Z])/gi);
  for (const match of numMatches) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 200) numbers.add(match[1]);
  }
  
  // Pattern 4: Indented numbered lists
  const indentMatches = text.matchAll(/^\s+(\d+)[.:\)]/gm);
  for (const match of indentMatches) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 200) numbers.add(match[1]);
  }
  
  return numbers;
};

// PHASE 2: Smart Type Inference
const inferQuestionType = (text: string): string => {
  const lower = text.toLowerCase();
  
  // Priority order matters!
  if ((lower.includes('assertion') && lower.includes('reason')) || 
      (lower.includes('assertion (a)') || lower.includes('reason (r)'))) {
    return 'assertion_reason';
  }
  
  if (lower.includes('match') && (lower.includes('column') || lower.includes('following'))) {
    return 'match_column';
  }
  
  const blankCount = (text.match(/___+|_{3,}/g) || []).length;
  if (blankCount > 0 || lower.includes('fill') || lower.includes('blank')) {
    return 'fill_blank';
  }
  
  if ((lower.includes('true') && lower.includes('false')) || lower.match(/\(t\s*\/\s*f\)/i)) {
    return 'true_false';
  }
  
  const hasOptionsPattern = text.match(/\([a-d]\)|[a-d]\)/gi);
  if (hasOptionsPattern && hasOptionsPattern.length >= 3) {
    return 'mcq';
  }
  
  if (lower.includes('arrange') || lower.includes('sequence') || 
      lower.includes('order') || lower.includes('chronological')) {
    return 'sequence_order';
  }
  
  return 'short_answer';
};

// PHASE 2: Create Structured Templates
const createQuestionTemplate = (qNum: string, text: string, type: string): any => {
  const base = {
    question_number: qNum,
    question_text: text,
    question_type: type,
    marks: 1,
    difficulty: 'medium',
    requires_manual_review: true,
    template_generated: true,
    confidence: 'low',
    extraction_issues: ['Auto-generated template - requires verification and completion']
  };
  
  switch (type) {
    case 'mcq':
      return {
        ...base,
        options: ['[Option A - edit manually]', '[Option B - edit manually]', '[Option C - edit manually]', '[Option D - edit manually]'],
        correct_answer: { index: -1 }
      };
      
    case 'true_false':
      return {
        ...base,
        options: ['True', 'False'],
        correct_answer: { value: null }
      };
      
    case 'fill_blank':
      const blankCount = Math.max((text.match(/___+/g) || []).length, 1);
      return {
        ...base,
        blanks_count: blankCount,
        correct_answer: { blanks: Array(blankCount).fill(null).map(() => ({ correctAnswer: '', distractors: [] })) }
      };
      
    case 'match_column':
      return {
        ...base,
        left_column: ['[A - edit]', '[B - edit]', '[C - edit]', '[D - edit]'],
        right_column: ['[i - edit]', '[ii - edit]', '[iii - edit]', '[iv - edit]'],
        correct_answer: { pairs: [] }
      };
      
    case 'match_pairs':
      return {
        ...base,
        correct_answer: { pairs: [
          { left: '[Term 1]', right: '[Match 1]' },
          { left: '[Term 2]', right: '[Match 2]' },
          { left: '[Term 3]', right: '[Match 3]' }
        ]}
      };
      
    case 'sequence_order':
      return {
        ...base,
        correct_answer: { correctSequence: ['[Step 1]', '[Step 2]', '[Step 3]', '[Step 4]'] }
      };
      
    case 'card_memory':
      return {
        ...base,
        correct_answer: { pairs: ['[Term 1]', '[Def 1]', '[Term 2]', '[Def 2]', '[Term 3]', '[Def 3]'] }
      };
      
    case 'typing_race':
      return {
        ...base,
        correct_answer: { targetText: text.substring(0, 200), timeLimit: 30, minAccuracy: 90 }
      };
      
    case 'assertion_reason':
      return {
        ...base,
        assertion: '[Assertion (A): edit manually]',
        reason: '[Reason (R): edit manually]',
        options: [
          'Both Assertion and Reason are true, Reason is correct explanation',
          'Both true, Reason is NOT correct explanation',
          'Assertion true, Reason false',
          'Assertion false, Reason true'
        ],
        correct_answer: null
      };
      
    default: // short_answer
      return {
        ...base,
        marks: 2,
        correct_answer: null
      };
  }
};

// PHASE 2: Enhanced Templateizer with Type Inference
const generateTemplates = (documentText: string, detectedNumbers: Set<string>): any[] => {
  const templates: any[] = [];
  const sortedNumbers = Array.from(detectedNumbers).sort((a, b) => parseInt(a) - parseInt(b));
  
  for (const qNum of sortedNumbers) {
    // Try multiple patterns to find question content
    const patterns = [
      new RegExp(`\\[QUESTION_${qNum}\\]([\\s\\S]*?)(?=\\[QUESTION_|$)`, 'i'),
      new RegExp(`Q(?:uestion)?\\s*${qNum}[.:\\)\\-]([\\s\\S]*?)(?=Q(?:uestion)?\\s*\\d+[.:\\)\\-]|$)`, 'i'),
      new RegExp(`(?:^|\\n)\\s*${qNum}[.:\\)]([\\s\\S]*?)(?=\\n\\s*\\d+[.:\\)]|$)`, 'm')
    ];
    
    let questionText = '';
    for (const pattern of patterns) {
      const match = documentText.match(pattern);
      if (match && match[1]) {
        questionText = match[1].trim();
        break;
      }
    }
    
    if (!questionText) {
      questionText = `[Question ${qNum} - Content not extracted, requires manual entry]`;
    }
    
    // Limit to first 500 chars for template
    questionText = questionText.substring(0, 500);
    
    // Smart type detection
    const type = inferQuestionType(questionText);
    const template = createQuestionTemplate(qNum, questionText, type);
    
    templates.push(template);
  }
  
  return templates;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_content, subject, chapter, topic, skip_validation = false } = await req.json();

    if (!file_content) {
      throw new Error('File content is required');
    }

    console.log('📄 Extracting questions from document, content length:', file_content.length);
    console.log('📄 First 300 chars:', file_content.substring(0, 300));

    const systemPrompt = `You are an expert question extraction system for Indian educational content (CBSE, JEE, NEET).

🚨 CRITICAL ANTI-HALLUCINATION RULES:
1. ONLY extract questions that EXIST in the document
2. DO NOT create, rephrase, or invent questions
3. Copy EXACT text from document - word for word
4. If you can't find a question number in the text, SKIP IT
5. Each question MUST have a visible number marker (1., Q1, Question 1, etc.)
6. PRESERVE all line breaks using \\n characters in question_text, assertion, reason, and options

**SPECIAL HANDLING FOR FIGURES:**
- If you encounter [FIGURE id=img_X] with NO [IMAGE_OCR] data below it, the OCR failed
- Mark such questions with: "requires_manual_review": true
- Add to question metadata: "flagged_images": ["img_X"]
- Set confidence to "low" for questions with un-OCR'd figures
- DO NOT hallucinate math content - preserve the [FIGURE] token for manual input

🔥 CRITICAL MCQ EXTRACTION RULES:
1. For MCQ questions, extract ONLY the question stem (text BEFORE the options start)
2. DO NOT include option labels (a), b), c), d)) in the question_text field
3. Extract each option WITHOUT its letter prefix - clean text only
4. Remove "a)", "b)", etc. from both question_text AND options array
5. Question text should end before options begin

📷 IMAGE & OCR HANDLING:
- Input may contain [FIGURE id=...] tokens indicating embedded images
- Input may contain [IMAGE_OCR id=...]: text extracted from images via OCR
- For Match-the-Column questions: If OCR text shows column data, use it
- Preserve [FIGURE] tokens in question_text if diagram is referenced
- Preserve mathematical notation like m^{3}, r^{2}, ∝, ×, etc.

🧪 PRESERVE ALL NOTATION:
- Chemical formulas: H_{2}O, Ca^{2+}, SO_{4}^{2-}
- Math: x^{2}, v_{0}, ∝, √, ≈, ≤, ≥, ±
- Units: m/s^{2}, kg/m^{3}

📋 QUESTION TYPES (in priority order):
1. assertion_reason - Has both "Assertion (A):" AND "Reason (R):"
2. match_column - Has "Match column" or two lists to match
3. fill_blank - Contains "___" or "fill in the blank"
4. true_false - Options are only True/False
5. short_answer - NO options, asks to Explain/Derive/Calculate
6. mcq - Has options a), b), c), d)

📝 OUTPUT FORMAT (Strict JSON):
{
  "questions": [
    {
      "question_number": "1",
      "question_type": "mcq",
      "question_text": "EXACT text from document",
      "options": ["option text only", "option text only", "option text only", "option text only"],
      "marks": 1,
      "difficulty": "easy",
      "confidence": "high"
    }
  ],
  "total_found": 64
}

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations.`;

    // STEP 1: Detect ALL question numbers in document (aggressive scan)
    const allQuestionNumbers = detectAllQuestionNumbers(file_content);
    console.log(`🔍 Detected ${allQuestionNumbers.size} question numbers in document:`, Array.from(allQuestionNumbers).sort((a, b) => parseInt(a) - parseInt(b)).slice(0, 20));

    const userPrompt = `Extract ALL questions from this ${subject || 'educational'} document${chapter ? ` (Chapter: ${chapter})` : ''}${topic ? ` (Topic: ${topic})` : ''}:

${file_content}

🚨 CRITICAL REMINDERS:
- DO NOT create fake questions
- ONLY extract questions that exist in the document
- Copy EXACT text (no paraphrasing)
- Check type priority: Assertion-Reason FIRST, then Match, then Fill Blank, then MCQ
- Return valid JSON only (no markdown)`;

    // Smart model selection - LOWERED thresholds
    const documentSize = file_content.length;
    const estimatedQuestions = allQuestionNumbers.size || (file_content.match(/\[QUESTION_\d+\]/g) || []).length;
    const useProModel = documentSize > 15000 || estimatedQuestions > 25;

    const model = useProModel ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const maxTokens = useProModel ? 32000 : 16000; // Increased Flash tokens

    console.log(`📊 Document stats: ${documentSize} chars, ~${estimatedQuestions} questions`);
    console.log(`🤖 Using model: ${model} (max tokens: ${maxTokens})`);

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: userPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: maxTokens,
        }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded. Please try again in a moment.',
          should_retry_chunked: true
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'AI usage limit reached. Please add credits to your Lovable workspace.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await aiResponse.text();
      console.error('Gemini API error:', aiResponse.status, errorText);
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Log AI response details for debugging
    const candidate = aiData.candidates?.[0];
    const finishReason = candidate?.finishReason || 'UNKNOWN';
    const safetyRatings = candidate?.safetyRatings || [];
    
    console.log('🔍 AI Response Details:', {
      finishReason,
      hasSafetyRatings: safetyRatings.length > 0,
      candidatePresent: !!candidate
    });

    let questionsArr: any[] = [];
    let extractedFromAI = false;

    // Try to extract questions from AI response
    if (candidate?.content?.parts?.[0]?.text) {
      let extractedContent = candidate.content.parts[0].text.trim();
      
      // Remove markdown code blocks if present
      if (extractedContent.startsWith('```json')) {
        extractedContent = extractedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (extractedContent.startsWith('```')) {
        extractedContent = extractedContent.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      // Try parsing JSON
      try {
        const extractedData = JSON.parse(extractedContent);
        questionsArr = Array.isArray(extractedData?.questions) ? extractedData.questions : [];
        extractedFromAI = questionsArr.length > 0;
        
        console.log(`✅ AI extracted ${questionsArr.length} questions`);
      } catch (parseError) {
        console.warn('⚠️ JSON parse failed, attempting partial recovery...');
        
        // Partial JSON recovery: try to close arrays/objects
        try {
          let repairedJson = extractedContent;
          if (!repairedJson.endsWith('}')) {
            // Try adding closing brackets
            const openBraces = (repairedJson.match(/{/g) || []).length;
            const closeBraces = (repairedJson.match(/}/g) || []).length;
            const openBrackets = (repairedJson.match(/\[/g) || []).length;
            const closeBrackets = (repairedJson.match(/\]/g) || []).length;
            
            for (let i = 0; i < openBrackets - closeBrackets; i++) repairedJson += ']';
            for (let i = 0; i < openBraces - closeBraces; i++) repairedJson += '}';
          }
          
          const repairedData = JSON.parse(repairedJson);
          questionsArr = Array.isArray(repairedData?.questions) ? repairedData.questions : [];
          extractedFromAI = questionsArr.length > 0;
          console.log(`✅ Recovered ${questionsArr.length} questions from partial JSON`);
        } catch {
          console.warn('❌ Could not recover partial JSON');
        }
      }
    }

    // PHASE 3: GUARANTEED TEMPLATE GENERATION - Always run with ALL detected numbers
    console.log('🔧 Running enhanced templateizer for all detected question numbers...');
    const templates = generateTemplates(file_content, allQuestionNumbers);
    console.log(`📋 Templateizer generated ${templates.length} templates for all ${allQuestionNumbers.size} detected questions`);

    // Merge: AI-extracted questions take priority, templates fill gaps
    const mergedQuestions = [...questionsArr];
    const aiQuestionNumbers = new Set(questionsArr.map(q => q.question_number?.toString()));
    
    let templatesAdded = 0;
    for (const template of templates) {
      if (!aiQuestionNumbers.has(template.question_number)) {
        mergedQuestions.push(template);
        templatesAdded++;
      }
    }

    console.log(`✅ Final question set: ${questionsArr.length} AI-extracted + ${templatesAdded} templates = ${mergedQuestions.length} total`);

    // Fix nested options structure
    mergedQuestions.forEach((q: any, idx: number) => {
      if (q.options && Array.isArray(q.options)) {
        q.options = q.options.map((opt: any) => {
          if (typeof opt === 'string') return opt;
          if (typeof opt === 'object' && opt !== null) {
            return opt.text || opt.value || opt.label || JSON.stringify(opt);
          }
          return String(opt);
        });
      }
      
      // Ensure question_text exists
      if (!q.question_text || q.question_text.trim() === '') {
        console.warn(`⚠️ Skipping question ${idx+1} without question_text`);
        return null;
      }
    });

    const validQuestions = mergedQuestions.filter(q => q && q.question_text);

    console.log('📊 Final Output:', {
      total_questions: validQuestions.length,
      ai_extracted: questionsArr.length,
      template_generated: templatesAdded,
      by_type: validQuestions.reduce((acc: any, q: any) => {
        acc[q.question_type] = (acc[q.question_type] || 0) + 1;
        return acc;
      }, {})
    });

    // PHASE 4: ALWAYS return success with questions array and detailed metadata
    return new Response(JSON.stringify({
      success: true,
      total_questions: validQuestions.length,
      extraction_summary: {
        detected_question_numbers: allQuestionNumbers.size,
        ai_extracted: questionsArr.length,
        template_generated: templatesAdded,
        fully_extracted_count: questionsArr.filter(q => !q.template_generated).length,
        requires_manual_review_count: validQuestions.filter(q => q.requires_manual_review).length
      },
      questions: validQuestions,
      statistics: {
        by_type: validQuestions.reduce((acc: any, q: any) => {
          acc[q.question_type] = (acc[q.question_type] || 0) + 1;
          return acc;
        }, {}),
        by_confidence: {
          high: validQuestions.filter(q => q.confidence === 'high').length,
          medium: validQuestions.filter(q => q.confidence === 'medium').length,
          low: validQuestions.filter(q => q.confidence === 'low' || q.template_generated).length
        }
      },
      metadata: {
        extraction_method: extractedFromAI ? 'ai' : 'template',
        model_used: model,
        finish_reason: finishReason,
        had_safety_issues: safetyRatings.length > 0,
        file_name: 'document',
        extraction_time: new Date().toISOString(),
        subject,
        chapter,
        topic
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in ai-extract-all-questions:', error);
    
    // Even on error, try to generate templates as last resort
    try {
      const { file_content } = await req.json();
      if (file_content) {
        const emergencyTemplates = generateTemplates(file_content);
        if (emergencyTemplates.length > 0) {
          console.log(`🚨 Emergency: Returning ${emergencyTemplates.length} templates after error`);
          return new Response(JSON.stringify({
            success: true,
            total_questions: emergencyTemplates.length,
            questions: emergencyTemplates,
            metadata: {
              extraction_method: 'emergency_template',
              error_message: error.message
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    } catch {}

    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      should_retry_chunked: true
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
