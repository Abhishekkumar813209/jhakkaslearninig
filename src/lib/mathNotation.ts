/**
 * Mathematical Notation Helper Functions
 * Handles math formulas, equations, and notation preservation
 */

/**
 * Normalize mathematical notation to preserve superscripts/subscripts
 * Examples: x2 → x^{2}, a1 → a_{1}, 10^3 → 10^{3}
 */
export function normalizeMathNotation(text: string): string {
  if (!text) return text;
  
  let normalized = text;
  
  // Pattern: Variable followed by digit(s) for exponents
  // x2 → x^{2}, y3 → y^{3}
  // But avoid replacing in numbers like \"12\" or \"x12y\"
  normalized = normalized.replace(/([a-zA-Z])(\d+)(?!\d*[a-zA-Z])/g, (match, variable, number) => {
    // If it looks like an exponent (single digit after variable)
    if (number.length <= 2) {
      return `${variable}^{${number}}`;
    }
    // Otherwise might be subscript
    return `${variable}_{${number}}`;
  });
  
  // Pattern: Subscripts (already marked)
  // Preserve a_1, x_i, etc.
  normalized = normalized.replace(/([a-zA-Z])_(\d+|[a-zA-Z])/g, '$1_{$2}');
  
  // Pattern: Exponents (already marked)
  // Preserve x^2, 10^{-3}, etc.
  normalized = normalized.replace(/\^(\d+|{[^}]+})/g, '^$1');
  
  return normalized;
}

/**
 * Normalize physics units with proper formatting
 * Examples: m/s2 → m/s^{2}, kg m/s → kg·m/s
 */
export function normalizeUnits(text: string): string {
  if (!text) return text;
  
  let normalized = text;
  
  // Pattern: Unit with exponent
  // m/s2 → m/s^{2}, kg/m3 → kg/m^{3}
  normalized = normalized.replace(/\/([a-zA-Z]+)(\d)/g, '/$1^{$2}');
  
  // Pattern: Scientific notation
  // 10^-3 → 10^{-3}, 10^3 → 10^{3}
  normalized = normalized.replace(/(\d+)\^(-?\d+)/g, '$1^{$2}');
  
  // Replace multiplication dot
  normalized = normalized.replace(/\s*\*\s*/g, '·');
  
  // Common unit patterns
  normalized = normalized.replace(/m\/s2/g, 'm/s^{2}');
  normalized = normalized.replace(/kg\/m3/g, 'kg/m^{3}');
  normalized = normalized.replace(/N\/m2/g, 'N/m^{2}');
  
  return normalized;
}

/**
 * Preserve mathematical symbols and Greek letters
 */
export function preserveMathSymbols(text: string): string {
  if (!text) return text;
  
  // Preserve Unicode mathematical symbols
  const mathSymbols = [
    '∝', '∞', '∫', '∑', '∏', '√', '∛', '∜',
    '≈', '≠', '≤', '≥', '±', '∓', '×', '÷',
    '∂', '∇', '∆', '∈', '∉', '⊂', '⊃', '∩', '∪',
    '∧', '∨', '¬', '⇒', '⇔', '∀', '∃'
  ];
  
  // Preserve Greek letters
  const greekLetters = [
    'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ',
    'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
    'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ',
    'Ν', 'Ξ', 'Ο', 'Π', 'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω'
  ];
  
  // Preserve Unicode superscripts
  const superscriptMap: Record<string, string> = {
    '⁰': '^{0}', '¹': '^{1}', '²': '^{2}', '³': '^{3}', '⁴': '^{4}',
    '⁵': '^{5}', '⁶': '^{6}', '⁷': '^{7}', '⁸': '^{8}', '⁹': '^{9}',
    '⁺': '^{+}', '⁻': '^{-}'
  };
  
  let result = text;
  
  // Convert Unicode superscripts to markup
  Object.entries(superscriptMap).forEach(([unicode, markup]) => {
    result = result.replace(new RegExp(unicode, 'g'), markup);
  });
  
  return result;
}

/**
 * Format mathematical equations
 */
export function formatMathEquation(text: string): string {
  if (!text) return text;
  
  let formatted = text;
  
  // Normalize the equation
  formatted = normalizeMathNotation(formatted);
  formatted = preserveMathSymbols(formatted);
  
  // Add spaces around operators for readability
  formatted = formatted.replace(/([^<>=!])([=<>])([^<>=])/g, '$1 $2 $3');
  formatted = formatted.replace(/([^+\-])([+\-])([^+\-])/g, '$1 $2 $3');
  
  return formatted.trim();
}

/**
 * Detect if text contains mathematical notation
 */
export function containsMath(text: string): boolean {
  if (!text) return false;
  
  // Check for variables with exponents/subscripts
  const hasExponents = /[a-zA-Z]\^?\d/.test(text);
  
  // Check for mathematical symbols
  const hasMathSymbols = /[∝∞∫∑∏√≈≠≤≥±×÷∂∇∆]/.test(text);
  
  // Check for Greek letters
  const hasGreek = /[α-ωΑ-Ω]/.test(text);
  
  // Check for equations
  const hasEquation = /=/.test(text) && /[a-zA-Z]/.test(text);
  
  // Check for fractions
  const hasFraction = /\d+\/\d+/.test(text) || /\\frac/.test(text);
  
  return hasExponents || hasMathSymbols || hasGreek || hasEquation || hasFraction;
}

/**
 * Format fractions
 */
export function formatFraction(text: string): string {
  if (!text) return text;
  
  // Simple fractions: 1/2 → keep as-is or convert to LaTeX if needed
  // For now, just preserve them
  return text.replace(/(\d+)\/(\d+)/g, '$1/$2');
}

/**
 * Detect diagram-based questions
 */
export function isDiagramBasedQuestion(questionText: string): boolean {
  if (!questionText) return false;
  
  const diagramKeywords = [
    'in the figure',
    'from the diagram',
    'as shown',
    'in the graph',
    'from the circuit',
    'in the image',
    'shown in figure',
    'refer to figure',
    'according to diagram',
    'based on the figure'
  ];
  
  const lowerText = questionText.toLowerCase();
  return diagramKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Extract numeric value with unit
 */
export function extractValueWithUnit(text: string): { value: string; unit: string } | null {
  // Pattern: number (including decimals, scientific notation) followed by unit
  const match = text.match(/(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*([a-zA-Z/^²³⁴]+)/);
  
  if (match) {
    return {
      value: match[1],
      unit: normalizeUnits(match[2])
    };
  }
  
  return null;
}
