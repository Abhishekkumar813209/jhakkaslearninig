import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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
- Example:
  {
    "question_text": "Solve for x: [FIGURE id=img_3]",
    "confidence": "low",
    "requires_manual_review": true,
    "flagged_images": ["img_3"]
  }

🔥 CRITICAL MCQ EXTRACTION RULES:
1. For MCQ questions, extract ONLY the question stem (text BEFORE the options start)
2. DO NOT include option labels (a), b), c), d)) in the question_text field
3. Extract each option WITHOUT its letter prefix - clean text only
4. Remove "a)", "b)", etc. from both question_text AND options array
5. Question text should end before options begin

EXAMPLE:
Input: "There is no atmosphere on moon as
a) it gets light from sun.
b) it is closer to the earth.
c) it revolves round the earth.
d) the gases have less requirement..."

CORRECT Output:
{
  "question_text": "There is no atmosphere on moon as",
  "options": [
    "it gets light from sun.",
    "it is closer to the earth.",
    "it revolves round the earth.",
    "the gases have less requirement of velocity or energy to escape from its surface."
  ]
}

WRONG Output (DO NOT DO THIS):
{
  "question_text": "There is no atmosphere on moon as\na) it gets light from sun.\nb) it is closer to the earth.",
  "options": ["a) it gets light from sun.", "b) it is closer to the earth."]
}

📷 IMAGE & OCR HANDLING:
- Input may contain [FIGURE id=...] tokens indicating embedded images
- Input may contain [IMAGE_OCR id=...]: text extracted from images via OCR
- For Match-the-Column questions: If OCR text shows column data, use it to populate left_column[] and right_column[]
- If [IMAGE_OCR] appears for a match-the-column question, NEVER leave left_column/right_column empty. Use OCR to reconstruct best-effort lists; if still unclear, keep [FIGURE] and OCR text in question_text but provide any items you can parse.
- For Fill-in-the-Blanks: Preserve [FIGURE] tokens in question_text if diagram is referenced
- For MCQ options: Options may contain superscripts ^{...} or subscripts _{...} - DO NOT drop these
- Preserve mathematical notation like m^{3}, r^{2}, ∝, ×, etc.

🔥 OPTIONS EXTRACTION RULES (CRITICAL - TEXT AFTER = SIGN):
1. For MCQ/Assertion-Reason options with equations, extract FULL text after option label
2. **NEVER stop at = sign** - Continue until end of option
3. Examples:
   Input: "a). a=2, b=3, c=5"
   Output: "a=2, b=3, c=5" (NOT just "a")
   
   Input: "a) x = 10 m/s"
   Output: "x = 10 m/s" (NOT just "x")

   Input: "a) H₂ + O₂ = H₂O"
   Output: "H₂ + O₂ = H₂O" (preserve full equation)

4. For chemistry equations in options: preserve full reaction with all compounds

🧪 CHEMISTRY NOTATION PRESERVATION:
1. Chemical formulas MUST preserve subscripts: H_{2}O, NOT H2O
2. Preserve superscripts for ions: Ca^{2+}, SO_{4}^{2-}
3. Chemical equations: keep → or = arrows
4. States of matter: (s), (l), (g), (aq)
5. Greek letters: α-particle, β-decay, γ-radiation
6. IUPAC names: preserve hyphens and brackets

Examples:
- "2H_{2} + O_{2} → 2H_{2}O"
- "CH_{3}COOH + NaOH → CH_{3}COONa + H_{2}O"
- "Fe^{2+} + 2OH^{-} → Fe(OH)_{2}"

🔢 MATHEMATICS & PHYSICS NOTATION:
1. Preserve superscripts for exponents: x^{2}, v^{2}, m^{3}
2. Preserve subscripts: v_{0}, a_{1}, T_{2}
3. Units with exponents: m/s^{2}, kg/m^{3}, N/m^{2}
4. Mathematical symbols: ∝, ∞, √, ≈, ≠, ≤, ≥, ±, ×, ÷
5. Greek letters: α, β, γ, δ, θ, π, ω, Δ, Σ
6. Equations: preserve full equation with spaces around operators

Examples:
- "v^{2} = u^{2} + 2as"
- "F = ma"
- "E = mc^{2}"
- "Density = 600 kg/m^{3}"

📋 STRICT PRIORITY ORDER FOR TYPE DETECTION (Check in this order):

Priority 1: ASSERTION-REASON (Check FIRST before MCQ)
✓ Pattern: Contains both "Assertion (A):" AND "Reason (R):"
✓ Usually has 4 options after assertion and reason
Example:
"""
15. Assertion (A): The value of acceleration due to gravity is independent of mass of the object.
Reason (R): The acceleration due to gravity depends on the mass of the Earth.
a) Both Assertion and Reason are true, Reason is correct explanation
b) Both true, Reason is NOT correct explanation
c) Assertion true, Reason false
d) Assertion false, Reason true
"""
→ question_type: "assertion_reason"
→ Extract: assertion, reason, AND options array

Priority 2: MATCH THE COLUMN
✓ Pattern: Contains "Match column" OR "Match the following"
✓ Has two lists/tables to match
Example:
"""
3. Match column I with column II:
Column I          Column II
A. Mass          i. kg m/s²
B. Force         ii. kg
"""
→ question_type: "match_column"
→ Extract: left_column[], right_column[]

Priority 3: FILL IN THE BLANKS
✓ Pattern: Contains "___" OR "fill in the blank"
Example:
"""
22. The gravitational constant G has a value of _____ in SI units.
"""
→ question_type: "fill_blank"
→ Count blanks: blanks_count

Priority 4: TRUE/FALSE
✓ Pattern: Options are only "True/False" or "T/F" or "Correct/Incorrect"
Example:
"""
64. State whether true or false:
a) g is same everywhere on Earth (T/F)
b) G is a universal constant (T/F)
"""
→ question_type: "true_false"

Priority 5: SHORT ANSWER / NUMERICAL
✓ Pattern: NO options provided, asks to "Explain", "Derive", "Calculate", "Prove"
✓ Usually worth 2+ marks
Example:
"""
26. Explain Newton's law of universal gravitation.
"""
→ question_type: "short_answer"

Priority 6: MCQ (ONLY if none of the above match)
✓ Pattern: Has options a), b), c), d) AND is NOT Assertion-Reason
✓ Must have clear options
Example:
"""
1. There is no atmosphere on moon as:
a) it gets light from sun
b) it is closer to the earth
c) it revolves round the earth
d) gases escape easily
"""
→ question_type: "mcq"

⚠️ CRITICAL VALIDATION STEP:
For each question, ask yourself:
- Does this question number exist in the document? YES/NO
- If NO → DELETE from output (it's hallucinated)
- Is the text EXACTLY from document? YES/NO
- If NO → Copy exact text again

📝 OUTPUT FORMAT (Strict JSON):
{
  "questions": [
    {
      "question_number": "1",
      "question_type": "mcq",
      "question_text": "EXACT text from document",
      "options": ["a) ...", "b) ...", "c) ...", "d) ..."],
      "marks": 1,
      "difficulty": "easy"
    },
    {
      "question_number": "15",
      "question_type": "assertion_reason",
      "question_text": "Full question text",
      "assertion": "Assertion (A): Exact text",
      "reason": "Reason (R): Exact text",
      "options": ["a) Both true, R explains A", "b) Both true, R doesn't explain A", "c) A true, R false", "d) A false, R true"],
      "marks": 1,
      "difficulty": "medium"
    },
    {
      "question_number": "22",
      "question_type": "fill_blank",
      "question_text": "Text with _____ blanks",
      "blanks_count": 1,
      "marks": 1,
      "difficulty": "easy"
    },
    {
      "question_number": "54",
      "question_type": "short_answer",
      "question_text": "Question with [FIGURE id=img_5] diagram. Density is 600 Kg/m^{3}",
      "marks": 3,
      "difficulty": "hard"
    }
  ],
  "total_found": 64
}

IMPORTANT: Preserve numbering within question text (like 1., 2., a), b), i), ii)), preserve sup/sub notation, and keep [FIGURE] tokens intact.

🎯 MARKS ASSIGNMENT:
- MCQ/True-False: 1 mark
- Assertion-Reason: 1 mark
- Fill Blanks: 1 mark per blank
- Match Column: 2-3 marks
- Short Answer: 2-5 marks (based on "Explain"=2, "Derive"=3, "Prove"=5)

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations.`;

    const userPrompt = `Extract ALL questions from this ${subject || 'educational'} document${chapter ? ` (Chapter: ${chapter})` : ''}${topic ? ` (Topic: ${topic})` : ''}:

${file_content}

🚨 CRITICAL REMINDERS:
- DO NOT create fake questions
- ONLY extract questions that exist in the document
- Copy EXACT text (no paraphrasing)
- Check type priority: Assertion-Reason FIRST, then Match, then Fill Blank, then MCQ
- Return valid JSON only (no markdown)`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Reduced for deterministic output
        max_tokens: 12000 // Increased for longer documents
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded. Please try again in a moment.' 
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
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    if (!aiData.choices?.[0]?.message?.content) {
      console.error('Unexpected AI response structure:', aiData);
      throw new Error('Failed to extract questions from document');
    }

    let extractedContent = aiData.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (extractedContent.startsWith('```json')) {
      extractedContent = extractedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (extractedContent.startsWith('```')) {
      extractedContent = extractedContent.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    let extractedData: any;
    try {
      extractedData = JSON.parse(extractedContent);
    } catch (parseError) {
      console.error('❌ JSON parse failed. Content head:', extractedContent.slice(0, 500));
      throw new Error('AI returned invalid JSON. Please retry or check document format.');
    }

    const questionsArr = Array.isArray(extractedData?.questions) ? extractedData.questions : [];

    console.log('🤖 AI Raw Response:', {
      total_questions: extractedData.total_found || extractedData.questions?.length || 0,
      types_distribution: extractedData.questions?.reduce((acc: any, q: any) => {
        acc[q.question_type] = (acc[q.question_type] || 0) + 1;
        return acc;
      }, {})
    });

    // Phase 3: Post-processing validation and auto-correction
    const validateAndFixQuestions = (data: any, originalText: string) => {
      const validated = [];
      let hallucinated = 0;
      let autocorrected = 0;
      
      for (const qRaw of (Array.isArray(data?.questions) ? data.questions : [])) {
        const q = { ...qRaw };
        
        // Basic validation - skip questions without text
        const qTextStr = typeof q.question_text === 'string' ? q.question_text.trim() : '';
        if (!qTextStr) {
          console.warn('⚠️ Skipping question without question_text');
          continue;
        }
        
        const qText = qTextStr.toLowerCase();
        const qNum = (q.question_number ?? '').toString().trim();
        
        // Fix nested options structure
        let options = Array.isArray(q.options) ? q.options : [];
        if (options.length > 0) {
          options = options.map((opt: any) => {
            if (typeof opt === 'string') return opt;
            if (typeof opt === 'object' && opt !== null) {
              return opt.text || opt.value || opt.label || JSON.stringify(opt);
            }
            return String(opt);
          });
          q.options = options;
        }
        
        // Check 1: Anti-hallucination - Multi-strategy validation
        let foundInDocument = false;
        
        // Strategy 1: Check for [QUESTION_num] marker (primary method)
        if (qNum) {
          const markerPattern = new RegExp(`\\[QUESTION_${qNum}\\]`, 'g');
          if (markerPattern.test(originalText)) {
            foundInDocument = true;
          }
          
          // Strategy 2: Flexible number detection if marker not found
          if (!foundInDocument) {
            const flexPattern1 = new RegExp(
              `(?:^|\\n)\\s*(?:Q(?:uestion)?\\s*)?${qNum}\\s*[.\\)\\-:|]?\\s+(?=\\S)`, 
              'mi'
            );
            if (flexPattern1.test(originalText)) {
              foundInDocument = true;
            }
          }
          
          // Strategy 3: Number alone on a line (DOCX common pattern)
          if (!foundInDocument) {
            const flexPattern2 = new RegExp(
              `(?:^|\\n)\\s*${qNum}\\s*(?:\\n|\\r|$)`, 
              'mi'
            );
            if (flexPattern2.test(originalText)) {
              foundInDocument = true;
            }
          }
        }
        
        // Fallback: Fuzzy match using text head if no number or patterns failed
        if (!foundInDocument) {
          const head = qTextStr.slice(0, 80).toLowerCase();
          if (head.length >= 10 && originalText.toLowerCase().includes(head)) {
            foundInDocument = true;
          }
        }
        
        if (!foundInDocument) {
          console.warn(`❌ Question not found in document - SKIPPING`);
          hallucinated++;
          continue;
        }
        let corrected = false;
        
        // Check 2: Auto-fix MCQ wrongly marked as assertion-reason
        if (q.question_type === 'mcq') {
          const isAssertion = qText.includes('assertion');
          const isReason = qText.includes('reason');
          
          if (isAssertion && isReason) {
            console.log(`🔧 MCQ → assertion_reason`);
            q.question_type = 'assertion_reason';
            
            // Try to extract assertion and reason
            const assertionMatch = qTextStr.match(/Assertion.*?\(A\).*?:(.*?)(?=Reason)/is);
            const reasonMatch = qTextStr.match(/Reason.*?\(R\).*?:(.*?)(?=a\)|$)/is);
            
            if (assertionMatch) q.assertion = assertionMatch[1].trim();
            if (reasonMatch) q.reason = reasonMatch[1].trim();
            corrected = true;
            autocorrected++;
          } else if (qText.includes('match') && (qText.includes('column') || qText.includes('following'))) {
            console.log(`🔧 MCQ → match_column`);
            q.question_type = 'match_column';
            corrected = true;
            autocorrected++;
          } else if (qTextStr.match(/_{2,}/g) || qTextStr.match(/—{2,}/g) || qTextStr.match(/-{5,}/g) || qText.includes('fill in the blank')) {
            console.log(`🔧 MCQ → fill_blank`);
            q.question_type = 'fill_blank';
            q.blanks_count = (qTextStr.match(/_{2,}/g) || []).length + (qTextStr.match(/—{2,}/g) || []).length + (qTextStr.match(/-{5,}/g) || []).length;
            delete q.options;
            corrected = true;
            autocorrected++;
          } else if ((!options || options.length === 0) && (qText.includes('explain') || qText.includes('derive') || qText.includes('calculate') || qText.includes('prove'))) {
            console.log(`🔧 MCQ → short_answer (no options)`);
            q.question_type = 'short_answer';
            corrected = true;
            autocorrected++;
          }
        }
        
        if (corrected) {
          q.auto_corrected = true;
        }
        
        validated.push(q);
      }
      
      // Log marker statistics from originalText
      const markerStats = {
        question_markers: (originalText.match(/\[QUESTION_/g) || []).length,
        assertion_markers: (originalText.match(/\[ASSERTION_REASON\]/g) || []).length,
        match_markers: (originalText.match(/\[MATCH_COLUMN\]/g) || []).length,
        fill_blank_markers: (originalText.match(/\[FILL_BLANK\]/g) || []).length
      };

      console.log(`✅ Validation Complete:`, {
        original_count: questionsArr.length,
        validated_count: validated.length,
        hallucinated_removed: hallucinated,
        auto_corrected: autocorrected,
        marker_stats: markerStats
      });

      // Warning if over-filtered
      if (markerStats.question_markers >= 30 && validated.length < 10) {
        console.warn(`⚠️ WARNING: High markers (${markerStats.question_markers}) but low validated (${validated.length}). Possible over-filtering.`);
      }
      
      return validated;
    };

    // Apply validation (or skip if legacy mode requested)
    const outputQuestions = skip_validation ? questionsArr : validateAndFixQuestions(extractedData, file_content);

    console.log('📊 Final Output:', {
      total_questions: outputQuestions.length,
      by_type: outputQuestions.reduce((acc: any, q: any) => {
        acc[q.question_type] = (acc[q.question_type] || 0) + 1;
        return acc;
      }, {})
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_questions: outputQuestions.length,
        questions: outputQuestions,
        metadata: {
          file_name: 'document',
          extraction_time: new Date().toISOString(),
          subject,
          chapter,
          topic
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-extract-all-questions:', error);
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
