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
    const { file_content, subject, chapter, topic } = await req.json();

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

    const extractedData = JSON.parse(extractedContent);

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
      
      for (const q of data.questions || []) {
        // Check 1: Anti-hallucination - Multi-strategy validation
        let foundInDocument = false;
        
        // Strategy 1: Check for [QUESTION_num] marker (primary method)
        const markerPattern = new RegExp(`\\[QUESTION_${q.question_number}\\]`, 'g');
        if (markerPattern.test(originalText)) {
          foundInDocument = true;
        }
        
        // Strategy 2: Flexible number detection if marker not found
        if (!foundInDocument) {
          // A) Number with optional separator on same line: "1.", "Q1:", "Question 1 "
          const flexPattern1 = new RegExp(
            `(?:^|\\n)\\s*(?:Q(?:uestion)?\\s*)?${q.question_number}\\s*[.\\)\\-:|]?\\s+(?=\\S)`, 
            'mi'
          );
          if (flexPattern1.test(originalText)) {
            foundInDocument = true;
          }
        }
        
        // Strategy 3: Number alone on a line (DOCX common pattern)
        if (!foundInDocument) {
          const flexPattern2 = new RegExp(
            `(?:^|\\n)\\s*${q.question_number}\\s*(?:\\n|\\r|$)`, 
            'mi'
          );
          if (flexPattern2.test(originalText)) {
            foundInDocument = true;
          }
        }
        
        if (!foundInDocument) {
          console.warn(`❌ Q${q.question_number} not found in document - SKIPPING (hallucinated)`);
          hallucinated++;
          continue;
        }
        
        const qText = q.question_text.toLowerCase();
        let corrected = false;
        
        // Check 2: Auto-fix MCQ wrongly marked as assertion-reason
        if (q.question_type === 'mcq' && 
            (qText.includes('assertion') || qText.includes('reason')) &&
            qText.includes('assertion') && qText.includes('reason')) {
          console.log(`🔧 Q${q.question_number}: MCQ → assertion_reason`);
          q.question_type = 'assertion_reason';
          
          // Try to extract assertion and reason
          const assertionMatch = q.question_text.match(/Assertion.*?\(A\).*?:(.*?)(?=Reason)/is);
          const reasonMatch = q.question_text.match(/Reason.*?\(R\).*?:(.*?)(?=a\)|$)/is);
          
          if (assertionMatch) q.assertion = assertionMatch[1].trim();
          if (reasonMatch) q.reason = reasonMatch[1].trim();
          corrected = true;
          autocorrected++;
        }
        
        // Check 3: Auto-fix MCQ marked as match column
        if (q.question_type === 'mcq' && 
            (qText.includes('match') && (qText.includes('column') || qText.includes('following')))) {
          console.log(`🔧 Q${q.question_number}: MCQ → match_column`);
          q.question_type = 'match_column';
          corrected = true;
          autocorrected++;
        }
        
        // Check 4: Auto-fix MCQ marked as fill blank (detect 2+ underscores or long dashes)
        if (q.question_type === 'mcq' && 
            (q.question_text.match(/_{2,}/g) || q.question_text.match(/—{2,}/g) || 
             q.question_text.match(/-{5,}/g) || qText.includes('fill in the blank'))) {
          console.log(`🔧 Q${q.question_number}: MCQ → fill_blank`);
          q.question_type = 'fill_blank';
          // Better blank counting (multiple patterns)
          const underscores = (q.question_text.match(/_{2,}/g) || []).length;
          const emdashes = (q.question_text.match(/—{2,}/g) || []).length;
          const longdashes = (q.question_text.match(/-{5,}/g) || []).length;
          q.blanks_count = underscores + emdashes + longdashes;
          delete q.options; // Remove MCQ options
          corrected = true;
          autocorrected++;
        }
        
        // Check 5: Auto-fix MCQ without options to short_answer
        if (q.question_type === 'mcq' && 
            (!q.options || q.options.length === 0) &&
            (qText.includes('explain') || qText.includes('derive') || 
             qText.includes('calculate') || qText.includes('prove'))) {
          console.log(`🔧 Q${q.question_number}: MCQ → short_answer (no options)`);
          q.question_type = 'short_answer';
          corrected = true;
          autocorrected++;
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
        original_count: data.questions?.length || 0,
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

    // Apply validation
    const validatedQuestions = validateAndFixQuestions(extractedData, file_content);

    console.log('📊 Final Output:', {
      total_questions: validatedQuestions.length,
      by_type: validatedQuestions.reduce((acc: any, q: any) => {
        acc[q.question_type] = (acc[q.question_type] || 0) + 1;
        return acc;
      }, {})
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_questions: validatedQuestions.length,
        questions: validatedQuestions,
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
