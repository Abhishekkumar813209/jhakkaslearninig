/**
 * Utility functions to auto-detect and parse multi-part questions
 * from plain text into structured sub-questions
 */

interface ParsedStatement {
  text: string;
  answer: boolean;
}

interface ParsedSubQuestion {
  text: string;
  correctAnswer: string;
  distractors: string[];
}

/**
 * Detects if text contains multiple numbered/bulleted items
 */
export function detectMultiPartPattern(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return false;
  
  // Patterns: 1. 2. | (i) (ii) | a) b) | A) B) | I) II) | i) ii) | • | – | -
  const patterns = [
    /^\s*\d+[\.)]/,           // 1. or 1)
    /^\s*\([ivxIVX0-9]+\)/,   // (i) (ii) (1) (2)
    /^\s*[a-zA-Z][\.)]/,      // a) b) or A) B)
    /^\s*[ivxIVX]+[\.)]/,     // i) ii) or I) II)
    /^\s*[•–-]\s/,            // bullets
  ];
  
  let matchCount = 0;
  for (const line of lines) {
    if (patterns.some(p => p.test(line))) {
      matchCount++;
    }
  }
  
  return matchCount >= 2;
}

/**
 * Parse True/False statements from multiline text
 */
export function parseTrueFalseStatements(text: string): ParsedStatement[] {
  if (!text || !detectMultiPartPattern(text)) return [];
  
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  const statements: ParsedStatement[] = [];
  
  for (let line of lines) {
    // Remove numbering/bullets
    const cleaned = line
      .replace(/^\s*\d+[\.)]\s*/, '')
      .replace(/^\s*\([ivxIVX0-9]+\)\s*/, '')
      .replace(/^\s*[a-zA-Z][\.)]\s*/, '')
      .replace(/^\s*[ivxIVX]+[\.)]\s*/, '')
      .replace(/^\s*[•–-]\s*/, '')
      .trim();
    
    if (cleaned.length > 0) {
      statements.push({ text: cleaned, answer: true }); // Default to true
    }
  }
  
  return statements;
}

/**
 * Parse Fill-in-the-Blanks sub-questions from multiline text
 * Each line with ____ becomes a sub-question
 */
export function parseFillBlankSubQuestions(text: string): ParsedSubQuestion[] {
  if (!text) return [];
  
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l.includes('__'));
  
  if (lines.length < 2) return [];
  
  const subQuestions: ParsedSubQuestion[] = [];
  
  for (let line of lines) {
    // Remove numbering/bullets
    const cleaned = line
      .replace(/^\s*\d+[\.)]\s*/, '')
      .replace(/^\s*\([ivxIVX0-9]+\)\s*/, '')
      .replace(/^\s*[a-zA-Z][\.)]\s*/, '')
      .replace(/^\s*[ivxIVX]+[\.)]\s*/, '')
      .replace(/^\s*[•–-]\s*/, '')
      .trim();
    
    if (cleaned.includes('__')) {
      subQuestions.push({
        text: cleaned,
        correctAnswer: '',
        distractors: ['', '', '']
      });
    }
  }
  
  return subQuestions;
}

/**
 * Count blanks in text (for backward compatibility)
 */
export function countBlanks(text: string): number {
  const matches = text.match(/_{2,}/g);
  return matches ? matches.length : 0;
}

/**
 * Auto-detect and structure True/False questions
 */
export function autoStructureTrueFalse(questionText: string): {
  question: string;
  statements?: ParsedStatement[];
} {
  if (!detectMultiPartPattern(questionText)) {
    return { question: questionText };
  }
  
  const statements = parseTrueFalseStatements(questionText);
  
  if (statements.length >= 2) {
    return {
      question: 'Determine whether the following statements are True or False:',
      statements
    };
  }
  
  return { question: questionText };
}

/**
 * Auto-detect and structure Fill-in-the-Blanks questions
 */
export function autoStructureFillBlanks(questionText: string): {
  question: string;
  sub_questions?: ParsedSubQuestion[];
  blanks?: { correctAnswer: string; distractors: string[] }[];
} {
  const subQuestions = parseFillBlankSubQuestions(questionText);
  
  if (subQuestions.length >= 2) {
    // Build blanks array for backward compatibility
    const blanks = subQuestions.map(sq => ({
      correctAnswer: sq.correctAnswer || '',
      distractors: sq.distractors || ['', '', '']
    }));
    
    return {
      question: 'Fill in the blanks:',
      sub_questions: subQuestions,
      blanks
    };
  }
  
  // Single-line or legacy format
  const blankCount = countBlanks(questionText);
  if (blankCount > 0) {
    return {
      question: questionText,
      blanks: Array.from({ length: blankCount }, () => ({
        correctAnswer: '',
        distractors: ['', '', '']
      }))
    };
  }
  
  return { question: questionText };
}
