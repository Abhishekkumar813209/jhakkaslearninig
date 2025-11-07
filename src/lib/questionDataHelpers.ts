/**
 * Helper functions for parsing question_data and answer_data JSONB columns
 * from the question_bank table.
 */

export interface ParsedMCQData {
  text: string;
  options: string[];
  imageUrl?: string;
  correctIndex: number;
  explanation?: string;
}

export interface ParsedFillBlankData {
  text: string;
  blanks: Array<{
    correctAnswer: string;
    distractors: string[];
  }>;
  explanation?: string;
}

export interface ParsedMatchPairsData {
  question: string;
  leftColumn: string[];
  rightColumn: string[];
  correctPairs: Array<{ left: number; right: number }>;
  explanation?: string;
}

export interface ParsedTrueFalseData {
  statement: string;
  correctValue: boolean;
  explanation?: string;
}

export interface ParsedAssertionReasonData {
  assertion: string;
  reason: string;
  correctAnswer: 'both_true_related' | 'both_true_unrelated' | 'assertion_true' | 'reason_true' | 'both_false';
  explanation?: string;
}

export interface ParsedSubQuestionData {
  mainQuestion: string;
  subQuestions: Array<{
    text: string;
    options: string[];
    correctIndex: number;
  }>;
  explanation?: string;
}

/**
 * Parse MCQ question data from JSONB columns
 */
export const parseMCQData = (question: any): ParsedMCQData => {
  const questionData = question.question_data || {};
  const answerData = question.answer_data || {};

  return {
    text: questionData.text || question.question_text || '',
    options: questionData.options || question.options || [],
    imageUrl: questionData.imageUrl || questionData.image_url,
    correctIndex: answerData.correctIndex ?? answerData.index ?? (
      typeof question.correct_answer === 'object' 
        ? question.correct_answer?.index 
        : parseInt(question.correct_answer)
    ) ?? 0,
    explanation: answerData.explanation || question.explanation
  };
};

/**
 * Parse Fill in the Blanks question data from JSONB columns
 */
export const parseFillBlankData = (question: any): ParsedFillBlankData => {
  const questionData = question.question_data || {};
  const answerData = question.answer_data || {};

  return {
    text: questionData.text || question.question_text || '',
    blanks: answerData.blanks || question.correct_answer?.blanks || [],
    explanation: answerData.explanation || question.explanation
  };
};

/**
 * Parse Match Pairs question data from JSONB columns
 */
export const parseMatchPairsData = (question: any): ParsedMatchPairsData => {
  const questionData = question.question_data || {};
  const answerData = question.answer_data || {};

  return {
    question: questionData.question || questionData.text || question.question_text || '',
    leftColumn: questionData.leftColumn || question.left_column || [],
    rightColumn: questionData.rightColumn || question.right_column || [],
    correctPairs: answerData.pairs || question.correct_answer?.pairs || [],
    explanation: answerData.explanation || question.explanation
  };
};

/**
 * Parse True/False question data from JSONB columns
 */
export const parseTrueFalseData = (question: any): ParsedTrueFalseData => {
  const questionData = question.question_data || {};
  const answerData = question.answer_data || {};

  return {
    statement: questionData.statement || questionData.text || question.question_text || '',
    correctValue: answerData.value ?? question.correct_answer?.value ?? false,
    explanation: answerData.explanation || question.explanation
  };
};

/**
 * Parse Assertion-Reason question data from JSONB columns
 */
export const parseAssertionReasonData = (question: any): ParsedAssertionReasonData => {
  const questionData = question.question_data || {};
  const answerData = question.answer_data || {};

  return {
    assertion: questionData.assertion || question.assertion || '',
    reason: questionData.reason || question.reason || '',
    correctAnswer: answerData.correctAnswer || question.correct_answer?.correctAnswer || 'both_false',
    explanation: answerData.explanation || question.explanation
  };
};

/**
 * Parse Sub-Question data from JSONB columns
 */
export const parseSubQuestionData = (question: any): ParsedSubQuestionData => {
  const questionData = question.question_data || {};
  const answerData = question.answer_data || {};

  return {
    mainQuestion: questionData.mainQuestion || question.question_text || '',
    subQuestions: (questionData.subQuestions || question.sub_questions || []).map((sq: any, index: number) => ({
      text: sq.text || sq.question || '',
      options: sq.options || [],
      correctIndex: answerData.subQuestionAnswers?.[index] ?? sq.correctIndex ?? 0
    })),
    explanation: answerData.explanation || question.explanation
  };
};

/**
 * Generic parser that routes to the correct parser based on question_type
 */
export const parseQuestionData = (question: any): any => {
  const questionType = question.question_type || question.exercise_type;

  switch (questionType) {
    case 'mcq':
      return parseMCQData(question);
    case 'fill_blank':
    case 'fill_blanks':
      return parseFillBlankData(question);
    case 'match_pairs':
    case 'match_column':
      return parseMatchPairsData(question);
    case 'true_false':
      return parseTrueFalseData(question);
    case 'assertion_reason':
      return parseAssertionReasonData(question);
    case 'sub_question':
      return parseSubQuestionData(question);
    default:
      console.warn(`Unknown question type: ${questionType}`);
      return {
        text: question.question_data?.text || question.question_text || '',
        rawData: question.question_data,
        rawAnswer: question.answer_data
      };
  }
};

/**
 * Convert old format question to new JSONB format (for migration/dual-write)
 */
export const convertToJSONBFormat = (question: any) => {
  const questionType = question.question_type || question.exercise_type;
  
  let question_data: any = {};
  let answer_data: any = {};

  switch (questionType) {
    case 'mcq':
      question_data = {
        text: question.question_text,
        options: question.options,
        imageUrl: question.image_url
      };
      answer_data = {
        correctIndex: typeof question.correct_answer === 'object' 
          ? question.correct_answer.index 
          : parseInt(question.correct_answer),
        explanation: question.explanation
      };
      break;

    case 'fill_blank':
    case 'fill_blanks':
      question_data = {
        text: question.question_text
      };
      answer_data = {
        blanks: question.correct_answer?.blanks || [],
        explanation: question.explanation
      };
      break;

    case 'match_pairs':
    case 'match_column':
      question_data = {
        question: question.question_text,
        leftColumn: question.left_column,
        rightColumn: question.right_column
      };
      answer_data = {
        pairs: question.correct_answer?.pairs || [],
        explanation: question.explanation
      };
      break;

    case 'true_false':
      question_data = {
        statement: question.question_text
      };
      answer_data = {
        value: question.correct_answer?.value,
        explanation: question.explanation
      };
      break;

    case 'assertion_reason':
      question_data = {
        assertion: question.assertion,
        reason: question.reason
      };
      answer_data = {
        correctAnswer: question.correct_answer?.correctAnswer,
        explanation: question.explanation
      };
      break;

    case 'sub_question':
      question_data = {
        mainQuestion: question.question_text,
        subQuestions: question.sub_questions
      };
      answer_data = {
        subQuestionAnswers: question.correct_answer?.subQuestionAnswers || [],
        explanation: question.explanation
      };
      break;

    default:
      question_data = { text: question.question_text };
      answer_data = { explanation: question.explanation };
  }

  return { question_data, answer_data };
};
