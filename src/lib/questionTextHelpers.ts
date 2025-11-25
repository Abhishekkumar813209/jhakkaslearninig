/**
 * Helper utilities for extracting question text and answers from JSONB
 * with fallback to legacy columns for backward compatibility
 */

// Helper to strip HTML tags
const stripHtml = (html: string): string => {
  return html?.replace(/<[^>]*>/g, '').trim() || '';
};

/**
 * Extract question text from JSONB question_data with fallback to legacy column
 * Priority: question_data.text > type-specific fields > question_text (legacy)
 */
export const extractQuestionText = (question: any): string => {
  // Priority 1: JSONB question_data.text
  if (question.question_data?.text) {
    return stripHtml(question.question_data.text);
  }
  
  // Priority 2: For True/False, check statements
  if (question.question_type === 'true_false' && question.question_data?.statements) {
    const firstStatement = question.question_data.statements[0];
    return typeof firstStatement === 'string' ? firstStatement : firstStatement?.text || '';
  }
  
  // Priority 3: For Fill Blanks, check sub_questions
  if (question.question_type === 'fill_blank' && question.question_data?.sub_questions) {
    const firstQ = question.question_data.sub_questions[0];
    return firstQ?.question || firstQ?.text || '';
  }
  
  // Priority 4: Match types
  if (question.question_type === 'match_pair' || question.question_type === 'match_column') {
    return `Match ${question.question_type === 'match_pair' ? 'Pairs' : 'Columns'} Question`;
  }
  
  // Fallback: Legacy column (for old data)
  if (question.question_text) {
    return stripHtml(question.question_text);
  }
  
  return 'Question text unavailable';
};

/**
 * Extract correct answer from JSONB answer_data with fallback to legacy column
 * Priority: answer_data (structured) > correct_answer (parsed JSON)
 */
export const extractCorrectAnswer = (question: any): any => {
  // Priority 1: JSONB answer_data
  if (question.answer_data) {
    return question.answer_data;
  }
  
  // Fallback: Parse legacy correct_answer column
  if (question.correct_answer) {
    try {
      return JSON.parse(question.correct_answer);
    } catch {
      return { value: question.correct_answer };
    }
  }
  
  return null;
};

/**
 * Extract explanation from JSONB answer_data with fallback to legacy column
 */
export const extractExplanation = (question: any): string => {
  // Priority 1: JSONB answer_data.explanation
  if (question.answer_data?.explanation) {
    return stripHtml(question.answer_data.explanation);
  }
  
  // Fallback: Legacy column
  if (question.explanation) {
    return stripHtml(question.explanation);
  }
  
  return '';
};
