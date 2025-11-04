import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CHUNK_SIZE = 20; // Process 20 pages at a time

// PHASE 1: Aggressive Question Number Detection (same as main function)
const detectAllQuestionNumbers = (text: string): Set<string> => {
  const numbers = new Set<string>();
  
  const markerMatches = text.matchAll(/\[QUESTION_(\d+)\]/gi);
  for (const match of markerMatches) numbers.add(match[1]);
  
  const qMatches = text.matchAll(/\bQ(?:uestion)?\s*(\d+)\b/gi);
  for (const match of qMatches) numbers.add(match[1]);
  
  const numMatches = text.matchAll(/(?<!page\s|chapter\s|section\s)(\d+)\s*[.:\)\-]\s*(?=[A-Z])/gi);
  for (const match of numMatches) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 200) numbers.add(match[1]);
  }
  
  const indentMatches = text.matchAll(/^\s+(\d+)[.:\)]/gm);
  for (const match of indentMatches) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 200) numbers.add(match[1]);
  }
  
  return numbers;
};

const inferQuestionType = (text: string): string => {
  const lower = text.toLowerCase();
  
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
    extraction_issues: ['Auto-generated template - requires verification']
  };
  
  switch (type) {
    case 'mcq':
      return { ...base, options: ['[A]', '[B]', '[C]', '[D]'], correct_answer: { index: -1 } };
    case 'true_false':
      return { ...base, options: ['True', 'False'], correct_answer: { value: null } };
    case 'fill_blank':
      const blankCount = Math.max((text.match(/___+/g) || []).length, 1);
      return { ...base, blanks_count: blankCount, correct_answer: { blanks: [] } };
    case 'match_column':
      return { ...base, left_column: ['[A]', '[B]', '[C]'], right_column: ['[i]', '[ii]', '[iii]'], correct_answer: { pairs: [] } };
    case 'sequence_order':
      return { ...base, correct_answer: { correctSequence: ['[Step 1]', '[Step 2]', '[Step 3]'] } };
    default:
      return { ...base, marks: 2, correct_answer: null };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      file_content, 
      total_pages,
      subject, 
      chapter, 
      topic,
      source_id
    } = await req.json();

    if (!file_content) {
      throw new Error('File content is required');
    }

    console.log(`📄 Extracting questions from ${total_pages || 'unknown'} pages`);

    // Check if this is a large PDF (>100 pages) - queue for background processing
    if (total_pages && total_pages > 100) {
      console.log('🔄 Large PDF detected - queuing for background processing');
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Create background job record
      await supabase.from('content_approval_queue').insert({
        content_type: 'pdf_questions',
        content_id: source_id || crypto.randomUUID(),
        status: 'processing',
        source_id: source_id,
        admin_feedback: `Large PDF (${total_pages} pages) - processing in background`
      });

      return new Response(JSON.stringify({
        success: true,
        status: 'processing',
        message: `Large PDF detected (${total_pages} pages). Processing in background.`,
        estimated_time_minutes: Math.ceil(total_pages / 50) * 2
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Split content into chunks (assuming page breaks are marked somehow)
    const pages = file_content.split(/\[PAGE_BREAK\]/);
    const chunks: string[][] = [];
    
    for (let i = 0; i < pages.length; i += CHUNK_SIZE) {
      chunks.push(pages.slice(i, i + CHUNK_SIZE));
    }

    console.log(`📊 Processing ${chunks.length} chunks of ~${CHUNK_SIZE} pages each`);

    // Get existing questions for this topic to avoid duplicates
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: existingQuestions } = await supabaseClient
      .from('gamified_exercises')
      .select('exercise_data')
      .eq('topic_content_id', source_id);
    
    const existingQuestionTexts = new Set(
      existingQuestions?.map(q => q.exercise_data?.question?.trim().toLowerCase()) || []
    );

    let skippedDuplicates = 0;

    // Enhanced system prompt
    const systemPrompt = `You are an expert question extraction system optimized for comprehensive extraction.

🚨 ENHANCED EXTRACTION RULES:
1. Extract EVERY question you find - don't skip complex layouts
2. Handle image-based questions using [FIGURE] markers and OCR text
3. For partially visible questions, extract what you can and mark confidence as 'low'
4. Extract questions from tables, boxes, diagrams, and special layouts
5. Preserve all mathematical notation (superscripts, subscripts, symbols)
6. PRESERVE all line breaks using \\n characters in question_text, assertion, reason, and options
7. Mark questions with low confidence if:
   - Text is partially cut off
   - Image content is unclear
   - Question appears incomplete

📷 IMAGE & COMPLEX LAYOUT HANDLING:
- [FIGURE id=...] tokens indicate embedded images - include in question text
- [IMAGE_OCR id=...]: text extracted from images via OCR - use this data
- For diagrams: Keep [FIGURE] token and describe what's needed
- For Match-the-Column: Extract from tables or OCR data
- For image-based MCQs: Use OCR text for options if available

📝 OUTPUT FORMAT:
{
  "questions": [
    {
      "question_number": "1",
      "question_type": "mcq",
      "question_text": "Exact text with [FIGURE id=...] if diagram needed",
      "options": ["option 1 text only", "option 2 text only", "option 3 text only", "option 4 text only"],
      "correct_answer": "option 3 text only",
      "marks": 1,
      "difficulty": "medium",
      "confidence": "high",
      "has_image": true,
      "image_description": "Diagram showing force vectors",
      "ocr_text": "Text extracted from image if available"
    }
  ],
  "total_found": 10,
  "chunk_info": {
    "pages_processed": "1-20",
    "notes": "All questions extracted successfully"
  }
}

🚨 CRITICAL OPTIONS RULE:
- "options" field must be a FLAT ARRAY of strings ONLY
- Each option should be PLAIN TEXT without any nested structure
- Remove option labels like "a)", "b)" - extract only the text
- Example: ["gravitational force", "electromagnetic force", "nuclear force", "weak force"]
- NEVER use nested objects like [{"text": "option", "label": "a"}]

QUESTION TYPES (in priority order):
1. assertion_reason - Has both "Assertion (A):" AND "Reason (R):"
2. match_column - Has "Match column" or two lists to match
3. fill_blank - Contains "___" or "fill in the blank"
4. true_false - Options are only True/False
5. short_answer - NO options, asks to Explain/Derive/Calculate
6. mcq - Has options a), b), c), d)

CONFIDENCE MARKERS:
- high: Question is complete, clear, and well-formatted
- medium: Question is mostly clear but has minor issues
- low: Question is partially visible, unclear, or has formatting issues

Return ONLY valid JSON. No markdown, no code blocks.`;

    // Process chunks in parallel (with rate limiting)
    const allQuestions: any[] = [];
    let totalProcessed = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkPages = chunks[i];
      const chunkContent = chunkPages.join('\n\n[PAGE_BREAK]\n\n');
      const startPage = i * CHUNK_SIZE + 1;
      const endPage = Math.min((i + 1) * CHUNK_SIZE, pages.length);

      console.log(`🔄 Processing chunk ${i + 1}/${chunks.length} (pages ${startPage}-${endPage})`);

      const userPrompt = `Extract ALL questions from pages ${startPage} to ${endPage} of this ${subject || 'educational'} document:

${chunkContent}

🚨 CRITICAL:
- Extract EVERY question, even if partially visible
- Mark confidence as 'low' for unclear questions
- Include [FIGURE] markers for images
- Use OCR text when available
- Return valid JSON only`;

      try {
        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
              maxOutputTokens: 16000,
            }
          }),
        });

        if (!aiResponse.ok) {
          console.error(`Chunk ${i + 1} failed:`, aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        let extractedContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        
        // Clean markdown
        if (extractedContent.startsWith('```json')) {
          extractedContent = extractedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (extractedContent.startsWith('```')) {
          extractedContent = extractedContent.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        const extractedData = JSON.parse(extractedContent);
        const chunkQuestions = Array.isArray(extractedData?.questions) ? extractedData.questions : [];
        
        console.log(`✅ Chunk ${i + 1}: Extracted ${chunkQuestions.length} questions`);
        
        // Fix nested options structure and filter duplicates
        const fixedQuestions = chunkQuestions
          .map((q: any) => {
            if (q.options && Array.isArray(q.options)) {
              q.options = q.options.map((opt: any) => {
                // If option is already a string, keep it
                if (typeof opt === 'string') return opt;
                // If option is an object, extract the text value
                if (typeof opt === 'object' && opt !== null) {
                  return opt.text || opt.value || opt.label || JSON.stringify(opt);
                }
                return String(opt);
              });
            }
            return q;
          })
          .filter((q: any) => {
            const questionText = q.question_text?.trim().toLowerCase();
            if (!questionText || existingQuestionTexts.has(questionText)) {
              skippedDuplicates++;
              return false;
            }
            existingQuestionTexts.add(questionText); // Track for this batch too
            return true;
          });
        
        allQuestions.push(...fixedQuestions);
        totalProcessed += fixedQuestions.length;

        // Rate limit: small delay between chunks
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error);
      }
    }

    console.log(`📊 Total questions extracted from chunks: ${allQuestions.length}`);
    console.log(`🚫 Skipped ${skippedDuplicates} duplicate questions`);

    // PHASE 3: Enhanced Templateizer - detect ALL question numbers and fill gaps
    console.log('🔧 Running enhanced templateizer with aggressive detection...');
    const allDetectedNumbers = detectAllQuestionNumbers(file_content);
    console.log(`🔍 Detected ${allDetectedNumbers.size} total question numbers in document`);
    
    const questionNumbers = new Set(allQuestions.map(q => q.question_number?.toString()));
    const missingNumbers = Array.from(allDetectedNumbers).filter(n => !questionNumbers.has(n));
    
    let templatesAdded = 0;
    if (missingNumbers.length > 0) {
      console.log(`📋 Generating templates for ${missingNumbers.length} detected but un-extracted questions`);
      
      for (const num of missingNumbers) {
        // Try to find content for this question number
        const patterns = [
          new RegExp(`\\[QUESTION_${num}\\]([\\s\\S]*?)(?=\\[QUESTION_|$)`, 'i'),
          new RegExp(`Q(?:uestion)?\\s*${num}[.:\\)\\-]([\\s\\S]*?)(?=Q(?:uestion)?\\s*\\d+[.:\\)\\-]|$)`, 'i'),
          new RegExp(`(?:^|\\n)\\s*${num}[.:\\)]([\\s\\S]*?)(?=\\n\\s*\\d+[.:\\)]|$)`, 'm')
        ];
        
        let questionText = '';
        for (const pattern of patterns) {
          const match = file_content.match(pattern);
          if (match && match[1]) {
            questionText = match[1].trim().substring(0, 500);
            break;
          }
        }
        
        if (!questionText) {
          questionText = `[Question ${num} - requires manual entry]`;
        }
        
        const type = inferQuestionType(questionText);
        const template = createQuestionTemplate(num, questionText, type);
        allQuestions.push(template);
        templatesAdded++;
      }
    }
    
    console.log(`✅ Final: ${allQuestions.length - templatesAdded} extracted + ${templatesAdded} templates = ${allQuestions.length} total`);

    // Separate high/medium confidence vs low confidence questions
    const highConfidence = allQuestions.filter(q =>
      !q.confidence || q.confidence === 'high' || q.confidence === 'medium'
    );
    const lowConfidence = allQuestions.filter(q => 
      q.confidence === 'low' || q.template_generated === true
    );

    console.log(`✅ High/Medium confidence: ${highConfidence.length}`);
    console.log(`⚠️ Low confidence (needs review): ${lowConfidence.length}`);

    // If we have low confidence questions and a source_id, add them to review queue
    if (lowConfidence.length > 0 && source_id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      for (const question of lowConfidence) {
        await supabase.from('content_approval_queue').insert({
          content_type: 'question',
          content_id: crypto.randomUUID(),
          status: 'pending_review',
          source_id: source_id,
          admin_feedback: `Low confidence question - requires verification: ${question.question_text?.substring(0, 100)}...`
        });
      }
      
      console.log(`📝 Added ${lowConfidence.length} low-confidence questions to review queue`);
    }

    return new Response(JSON.stringify({
      success: true,
      total_questions: allQuestions.length,
      extraction_summary: {
        detected_question_numbers: allDetectedNumbers.size,
        ai_extracted: allQuestions.length - templatesAdded,
        template_generated: templatesAdded,
        fully_extracted_count: highConfidence.length,
        requires_manual_review_count: lowConfidence.length
      },
      high_confidence_count: highConfidence.length,
      low_confidence_count: lowConfidence.length,
      skipped_duplicates: skippedDuplicates,
      questions: allQuestions,
      statistics: {
        by_type: allQuestions.reduce((acc: any, q: any) => {
          acc[q.question_type] = (acc[q.question_type] || 0) + 1;
          return acc;
        }, {}),
        by_confidence: {
          high: allQuestions.filter(q => q.confidence === 'high').length,
          medium: allQuestions.filter(q => q.confidence === 'medium').length,
          low: lowConfidence.length
        }
      },
      metadata: {
        file_name: 'document',
        extraction_time: new Date().toISOString(),
        chunks_processed: chunks.length,
        total_pages: pages.length,
        subject,
        chapter,
        topic
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in ai-extract-all-questions-chunked:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});