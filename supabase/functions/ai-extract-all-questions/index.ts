import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Templateizer: Generate structured templates for detected questions
const generateTemplates = (documentText: string): any[] => {
  const templates: any[] = [];
  const lines = documentText.split('\n');
  
  // Detect question segments with flexible patterns
  const questionPatterns = [
    /\[QUESTION_(\d+)\]/gi,
    /^Q(?:uestion)?\s*(\d+)[.:\)\-]/gmi,
    /^(\d+)\s*[.:\)]/gm
  ];
  
  let currentQuestion = null;
  let currentText = '';
  let questionNumber = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if this is a new question marker
    let isQuestionStart = false;
    for (const pattern of questionPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        // Save previous question if exists
        if (currentQuestion) {
          templates.push(currentQuestion);
        }
        
        questionNumber++;
        isQuestionStart = true;
        currentQuestion = {
          question_number: questionNumber.toString(),
          question_text: trimmed,
          marks: 1,
          difficulty: 'medium',
          requires_manual_review: true,
          template_generated: true,
          confidence: 'low',
          extraction_issues: ['Auto-generated template - requires manual editing']
        };
        currentText = trimmed;
        break;
      }
    }
    
    if (!isQuestionStart && currentQuestion) {
      currentText += ' ' + trimmed;
      currentQuestion.question_text = currentText.trim();
    }
  }
  
  // Save last question
  if (currentQuestion) {
    templates.push(currentQuestion);
  }
  
  // Guess question types and add appropriate templates
  return templates.map(q => {
    const text = q.question_text.toLowerCase();
    
    // match_column
    if (text.includes('match') && (text.includes('column') || text.includes('following'))) {
      return {
        ...q,
        question_type: 'match_column',
        left_column: ['[Item A - edit]', '[Item B - edit]', '[Item C - edit]', '[Item D - edit]'],
        right_column: ['[Match 1 - edit]', '[Match 2 - edit]', '[Match 3 - edit]', '[Match 4 - edit]'],
        correct_answer: { pairs: [] }
      };
    }
    
    // fill_blank
    const blankCount = (q.question_text.match(/___+/g) || []).length;
    if (blankCount > 0 || text.includes('fill') || text.includes('blank')) {
      return {
        ...q,
        question_type: 'fill_blank',
        blanks_count: Math.max(blankCount, 1),
        correct_answer: { blanks: [] }
      };
    }
    
    // true_false
    if (text.includes('true') && text.includes('false') || text.includes('t/f')) {
      return {
        ...q,
        question_type: 'true_false',
        correct_answer: { value: null }
      };
    }
    
    // assertion_reason
    if (text.includes('assertion') && text.includes('reason')) {
      return {
        ...q,
        question_type: 'assertion_reason',
        assertion: '[Assertion (A): Edit this]',
        reason: '[Reason (R): Edit this]',
        options: [
          'Both Assertion and Reason are true, Reason is correct explanation',
          'Both true, Reason is NOT correct explanation',
          'Assertion true, Reason false',
          'Assertion false, Reason true'
        ],
        correct_answer: null
      };
    }
    
    // Check for MCQ options pattern
    const hasOptions = text.match(/[a-d]\)/gi);
    if (hasOptions && hasOptions.length >= 2) {
      return {
        ...q,
        question_type: 'mcq',
        options: ['[Option A - edit]', '[Option B - edit]', '[Option C - edit]', '[Option D - edit]'],
        correct_answer: { index: -1 }
      };
    }
    
    // Default to short_answer for questions without clear patterns
    return {
      ...q,
      question_type: 'short_answer',
      marks: 2,
      correct_answer: null
    };
  });
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
    const estimatedQuestions = (file_content.match(/\[QUESTION_\d+\]/g) || []).length;
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

    // TEMPLATEIZER FALLBACK: Always run, merge with AI results
    console.log('🔧 Running templateizer for safety net...');
    const templates = generateTemplates(file_content);
    console.log(`📋 Templateizer generated ${templates.length} templates`);

    // Merge: use AI extracted questions + fill gaps with templates
    const mergedQuestions = [...questionsArr];
    const aiQuestionNumbers = new Set(questionsArr.map(q => q.question_number?.toString()));
    
    for (const template of templates) {
      if (!aiQuestionNumbers.has(template.question_number)) {
        mergedQuestions.push(template);
      }
    }

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
      template_generated: templates.length,
      by_type: validQuestions.reduce((acc: any, q: any) => {
        acc[q.question_type] = (acc[q.question_type] || 0) + 1;
        return acc;
      }, {})
    });

    // ALWAYS return success with questions array
    return new Response(JSON.stringify({
      success: true,
      total_questions: validQuestions.length,
      ai_extracted_count: questionsArr.length,
      template_generated_count: templates.length - questionsArr.length,
      questions: validQuestions,
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
