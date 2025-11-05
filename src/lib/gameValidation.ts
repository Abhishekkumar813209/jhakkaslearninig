import { z } from "zod";

// MCQ Schema
export const mcqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  options: z.array(z.string()).min(2, "At least 2 options required"),
  correct_answer: z.number().int().nonnegative(),
  explanation: z.string().optional(),
  marks: z.number().positive().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional()
});

// True/False Schema
export const trueFalseSchema = z.object({
  question: z.string().min(1, "Question is required"),
  correctAnswer: z.boolean(),
  explanation: z.string().optional(),
  marks: z.number().positive().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional()
});

// Match Pairs Schema
export const matchPairsSchema = z.object({
  question: z.string().min(1, "Question is required"),
  leftColumn: z.array(z.string()).min(2),
  rightColumn: z.array(z.string()).min(2),
  explanation: z.string().optional(),
  marks: z.number().positive().optional()
});

// Fill Blank Schema
export const fillBlankSchema = z.object({
  question: z.string().min(1, "Question is required"),
  blanks: z.array(z.object({
    correctAnswer: z.string(),
    distractors: z.array(z.string()).optional()
  })),
  explanation: z.string().optional(),
  marks: z.number().positive().optional()
});

// Assertion Reason Schema
export const assertionReasonSchema = z.object({
  assertion: z.string().min(1, "Assertion is required"),
  reason: z.string().min(1, "Reason is required"),
  options: z.array(z.string()).length(4, "Must have exactly 4 options"),
  correct_answer: z.number().int().min(0).max(3),
  explanation: z.string().optional(),
  marks: z.number().positive().optional()
});

export type MCQData = z.infer<typeof mcqSchema>;
export type TrueFalseData = z.infer<typeof trueFalseSchema>;
export type MatchPairsData = z.infer<typeof matchPairsSchema>;
export type FillBlankData = z.infer<typeof fillBlankSchema>;
export type AssertionReasonData = z.infer<typeof assertionReasonSchema>;

// Validation helper
export const validateGameData = (type: string, data: any) => {
  try {
    switch (type) {
      case 'mcq':
        return { success: true, data: mcqSchema.parse(data) };
      case 'true_false':
        return { success: true, data: trueFalseSchema.parse(data) };
      case 'match_pairs':
        return { success: true, data: matchPairsSchema.parse(data) };
      case 'fill_blank':
      case 'interactive_blanks':
        return { success: true, data: fillBlankSchema.parse(data) };
      case 'assertion_reason':
        return { success: true, data: assertionReasonSchema.parse(data) };
      default:
        return { success: false, error: `Unknown game type: ${type}` };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[Validation Error] ${type}:`, error.errors);
      return { success: false, error: error.errors };
    }
    return { success: false, error: String(error) };
  }
};

// Robust boolean parser for True/False
export const parseBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    const trueValues = ['true', '1', 't', 'yes', 'y'];
    const falseValues = ['false', '0', 'f', 'no', 'n'];
    
    if (trueValues.includes(normalized)) return true;
    if (falseValues.includes(normalized)) return false;
  }
  
  console.warn('[parseBoolean] Unexpected value:', value, 'defaulting to false');
  return false;
};
