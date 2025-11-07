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
  sub_questions?: Array<{ text: string; correctAnswer: string; distractors?: string[] }>;
  numbering_style?: string;
  explanation?: string;
}

export interface ParsedMatchPairsData {
  question: string;
  leftColumn: string[];
  rightColumn: string[];
  correctPairs: Array<{ left: number; right: number }>;
  explanation?: string;
}

export interface ParsedMatchColumnData {
  question: string;
  leftColumn: string[];
  rightColumn: string[];
  correctPairs: Array<{ left: number; right: number }>;
  explanation?: string;
}

export interface ParsedTrueFalseData {
  statement: string;
  correctValue: boolean;
  statements?: Array<{ text: string; answer: boolean }>;
  numbering_style?: string;
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

  // Multi-part sub-questions format
  if (questionData.sub_questions && Array.isArray(questionData.sub_questions)) {
    return {
      text: '', // No header text for multi-part
      blanks: answerData.blanks || [],
      sub_questions: questionData.sub_questions.map((sq: any, idx: number) => ({
        text: sq.text || sq,
        correctAnswer: answerData.blanks?.[idx]?.correctAnswer || '',
        distractors: answerData.blanks?.[idx]?.distractors || []
      })),
      numbering_style: questionData.numbering_style || '1,2,3',
      explanation: answerData.explanation || question.explanation
    };
  }

  // Single Fill Blank (legacy)
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

  // Multi-part statements format
  if (questionData.statements && Array.isArray(questionData.statements)) {
    return {
      statement: '', // No header text for multi-part
      correctValue: true, // Not used in multi-part
      statements: questionData.statements.map((text: string, idx: number) => ({
        text,
        answer: answerData.answers?.[idx] ?? true
      })),
      numbering_style: questionData.numbering_style || 'i,ii,iii',
      explanation: answerData.explanation || question.explanation
    };
  }

  // Single True/False (legacy)
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
  
  let question_data: any = {
    text: question.question_text || '',
    marks: question.marks || 1
  };
  let answer_data: any = {
    explanation: question.explanation || ''
  };

  switch (questionType) {
    case 'mcq':
      question_data.options = question.options || [];
      answer_data.correctIndex = typeof question.correct_answer === 'number' 
        ? question.correct_answer 
        : (question.correct_answer?.index ?? 0);
      break;

    case 'assertion_reason':
      question_data.assertion = question.assertion || '';
      question_data.reason = question.reason || '';
      question_data.options = question.options || [];
      answer_data.correctIndex = typeof question.correct_answer === 'number'
        ? question.correct_answer
        : (question.correct_answer?.index ?? 0);
      break;

    case 'fill_blank':
    case 'fill_blanks':
      // Support both single blank and multi-part sub-questions
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
        // Single blank in question text
        const ca = question.correct_answer;
        if (ca?.blanks && Array.isArray(ca.blanks)) {
          answer_data.blanks = ca.blanks;
        } else {
          answer_data.blanks = [{
            correctAnswer: typeof ca === 'string' ? ca : (ca?.text || ''),
            distractors: ca?.distractors || []
          }];
        }
      }
      break;

    case 'true_false':
      // Support both single statement and multi-part statements
      if (question.statements && Array.isArray(question.statements)) {
        question_data.statements = question.statements.map((s: any) => s.text || '');
        question_data.numbering_style = question.numberingStyle || 'i,ii,iii';
        answer_data.values = question.statements.map((s: any) => s.answer ?? true);
      } else {
        answer_data.value = typeof question.correct_answer === 'boolean'
          ? question.correct_answer
          : (question.correct_answer?.value ?? true);
      }
      break;

    case 'match_column':
    case 'match_pairs':
      question_data.leftColumn = question.left_column || [];
      question_data.rightColumn = question.right_column || [];
      
      // Convert correct_answer to pairs array
      const ca = question.correct_answer;
      if (ca?.pairs && Array.isArray(ca.pairs)) {
        answer_data.pairs = ca.pairs;
      } else if (typeof ca === 'object' && !Array.isArray(ca) && ca !== null) {
        // Convert object format { "0": 1, "1": 2 } to pairs
        answer_data.pairs = Object.entries(ca).map(([left, right]) => ({
          left: parseInt(left),
          right: typeof right === 'number' ? right : parseInt(right as string)
        }));
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

    case 'sub_question':
      question_data.subQuestions = question.sub_questions || [];
      answer_data.subQuestionAnswers = question.correct_answer?.subQuestionAnswers || [];
      break;

    default:
      // For unknown types, store what we can
      answer_data.value = question.correct_answer;
  }

  return { question_data, answer_data };
};
