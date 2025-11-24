/**
 * Centralized helpers for extracting question text from JSONB columns
 * Used across admin and student components to ensure consistent JSONB-first reads
 */

/**
 * Extract displayable question text from question_data JSONB
 * Primary source: question_data (JSONB)
 * Fallback: question_text (legacy column) - only used if JSONB is empty
 */
export const extractQuestionText = (question: any): string => {
  const qData = question.question_data || {};
  const qType = question.question_type?.toLowerCase();
  
  // 1. Try question_data.text or question_data.question
  if (qData.text && typeof qData.text === 'string' && qData.text.trim()) {
    return stripHtmlTags(qData.text.trim());
  }
  
  if (qData.question && typeof qData.question === 'string' && qData.question.trim()) {
    return stripHtmlTags(qData.question.trim());
  }
  
  // 2. Type-specific extraction from question_data
  
  // True/False: extract from statements array
  if ((qType === 'true_false' || qType === 'tf') && qData.statements) {
    if (Array.isArray(qData.statements) && qData.statements.length > 0) {
      const firstStatement = qData.statements[0];
      if (typeof firstStatement === 'string') {
        return stripHtmlTags(firstStatement);
      }
      if (firstStatement?.text) {
        return stripHtmlTags(firstStatement.text);
      }
    }
  }
  
  // Fill-in-Blanks: extract from sub_questions
  if ((qType === 'fill_blank' || qType === 'fill_blanks') && qData.sub_questions) {
    if (Array.isArray(qData.sub_questions) && qData.sub_questions.length > 0) {
      const firstQ = qData.sub_questions[0];
      const text = firstQ?.question || firstQ?.text || '';
      if (text.trim()) {
        return stripHtmlTags(text);
      }
    }
  }
  
  // Match Pairs: show first pair
  if ((qType === 'match_pair' || qType === 'match_pairs') && qData.pairs) {
    if (Array.isArray(qData.pairs) && qData.pairs.length > 0) {
      const firstPair = qData.pairs[0];
      if (firstPair?.left && firstPair?.right) {
        return `Match: ${firstPair.left} → ${firstPair.right}`;
      }
    }
  }
  
  // Match Column: generic label
  if ((qType === 'match_column' || qType === 'match_columns')) {
    if (qData.leftColumn && qData.rightColumn) {
      return `Match Columns (${qData.leftColumn.length} items)`;
    }
  }
  
  // MCQ: show generic label with option count
  if ((qType === 'mcq' || qType === 'multiple_choice') && qData.options) {
    if (Array.isArray(qData.options) && qData.options.length > 0) {
      return `Multiple Choice (${qData.options.length} options)`;
    }
  }
  
  // Assertion-Reason: show assertion
  if ((qType === 'assertion_reason' || qType === 'assertion') && qData.assertion) {
    return stripHtmlTags(qData.assertion);
  }
  
  // 3. Fallback to legacy question_text column (if JSONB is empty)
  if (question.question_text && typeof question.question_text === 'string') {
    return stripHtmlTags(question.question_text.trim());
  }
  
  // 4. Last resort
  return 'Question text unavailable';
};

/**
 * Strip HTML tags for display in tables/lists
 */
const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').trim();
};

/**
 * Extract answer explanation from answer_data JSONB
 * Primary source: answer_data.explanation (JSONB)
 * Fallback: explanation (legacy column)
 */
export const extractExplanation = (question: any): string | null => {
  // Try answer_data.explanation first
  if (question.answer_data?.explanation) {
    return question.answer_data.explanation;
  }
  
  // Fallback to legacy explanation column
  if (question.explanation) {
    return question.explanation;
  }
  
  return null;
};

/**
 * Extract correct answer from answer_data JSONB
 * Returns type-specific answer format
 */
export const extractCorrectAnswer = (question: any): any => {
  const aData = question.answer_data || {};
  const qType = question.question_type?.toLowerCase();
  
  // MCQ: correctIndex
  if ((qType === 'mcq' || qType === 'multiple_choice') && aData.correctIndex !== undefined) {
    return aData.correctIndex;
  }
  
  // True/False: value or values array
  if (qType === 'true_false' || qType === 'tf') {
    if (aData.values !== undefined) {
      return aData.values; // Multi-part TF
    }
    if (aData.value !== undefined) {
      return aData.value; // Single TF
    }
  }
  
  // Fill Blanks: blanks array
  if ((qType === 'fill_blank' || qType === 'fill_blanks') && aData.blanks) {
    return aData.blanks;
  }
  
  // Match questions: pairs array
  if ((qType === 'match_pair' || qType === 'match_pairs' || qType === 'match_column') && aData.pairs) {
    return aData.pairs;
  }
  
  // Assertion-Reason: correctIndex
  if ((qType === 'assertion_reason' || qType === 'assertion') && aData.correctIndex !== undefined) {
    return aData.correctIndex;
  }
  
  // Fallback to legacy correct_answer column
  if (question.correct_answer !== undefined) {
    return question.correct_answer;
  }
  
  return null;
};
