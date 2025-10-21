// Shared math rendering utilities for test questions across admin and student components

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
export const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

/**
 * Converts fraction notation into stacked HTML fractions
 * Examples: (1-x)/3, (7y-14)/2p, 70/11 → stacked fractions
 */
export const applyFractions = (t: string): string => {
  const fracHTML = (num: string, den: string) => 
    `<span class="frac"><span class="num">${num}</span><span class="bar"></span><span class="den">${den}</span></span>`;
  
  const fracWithParens = (num: string, den: string) =>
    `<span class="frac-wrapper"><span class="frac-paren">(</span><span class="frac"><span class="num">${num}</span><span class="bar"></span><span class="den">${den}</span></span><span class="frac-paren">)</span></span>`;
  
  // Special handling: Fractions already wrapped in parentheses like (9/5)
  t = t.replace(/\(\s*(\d{1,4})\s*\/\s*(\d{1,4})\s*\)/g, (_, a, b) => fracWithParens(a, b));
  
  // Both sides with parentheses: (a-b)/(c+d)
  t = t.replace(/\(([^()]+?)\)\s*\/\s*\(([^()]+?)\)/g, (_, a, b) => fracHTML(a, b));
  
  // Parentheses over token: (a-b)/3p, (7y-14)/2p
  t = t.replace(/\(([^()]+?)\)\s*\/\s*([A-Za-z][A-Za-z0-9]*|[0-9]+[A-Za-z]*)/g, (_, a, b) => fracHTML(a, b));
  
  // Token over parentheses: x/(y+z)
  t = t.replace(/([A-Za-z][A-Za-z0-9]*|[0-9]+)\s*\/\s*\(([^()]+?)\)/g, (_, a, b) => fracHTML(a, b));
  
  // Simple numeric fractions (NOT already in parentheses): 70/11, 1/2
  t = t.replace(/\b(\d{1,4})\s*\/\s*(\d{1,4})\b/g, (_, a, b) => fracHTML(a, b));
  
  return t;
};

/**
 * Applies superscript and subscript formatting with support for braced syntax
 * 
 * Braced syntax (precise control):
 *   H_{2}O → H<sub>2</sub>O (only "2" subscripted)
 *   Fe^{2+} → Fe<sup>2+</sup> (only "2+" superscripted)
 * 
 * Simple syntax (single character):
 *   H_2 → H<sub>2</sub> (subscripts next character)
 *   x^2 → x<sup>2</sup>
 */
export const applySupSub = (t: string) => {
  // PRIORITY: Braced syntax first (exact control over subscript/superscript length)
  t = t.replace(/(\S)\s*\^\s*\{([^}]+)\}/g, '$1<sup>$2</sup>');
  t = t.replace(/(\S)\s*_\s*\{([^}]+)\}/g, '$1<sub>$2</sub>');
  
  // Simple syntax for backwards compatibility (single character/number)
  t = t.replace(/(\S)\s*\^\s*(-?[0-9A-Za-z+\-]+)(?![}])/g, '$1<sup>$2</sup>');
  t = t.replace(/(\S)\s*_\s*([0-9A-Za-z+\-]+)(?![}])/g, '$1<sub>$2</sub>');
  
  return t;
};

/**
 * Normalizes inverse trigonometric function notation
 * Converts various formats to consistent Unicode superscript notation
 * Examples: "cos inverse" → "cos⁻¹", "arcsin" → "sin⁻¹", "tan^{-1}" → "tan⁻¹"
 */
export const normalizeTrigInverse = (text: string): string => {
  const superMinusOne = '\u207B\u00B9'; // Unicode: ⁻¹
  
  // Pattern 1: "cos inverse", "sine inverse", "tangent inverse" → cos⁻¹
  text = text.replace(/\b(cos|sin|tan|sec|csc|cot|cosec)\s+inverse\b/gi, `$1${superMinusOne}`);
  
  // Pattern 2: "arccos", "arcsin", "arctan" → cos⁻¹
  text = text.replace(/\barc(cos|sin|tan|sec|csc|cot)\b/gi, `$1${superMinusOne}`);
  
  // Pattern 3: cos^{-1}, sin^{-1} → cos⁻¹ (convert LaTeX to Unicode)
  text = text.replace(/\b(cos|sin|tan|sec|csc|cot|cosec)\s*\^\s*\{-1\}/gi, `$1${superMinusOne}`);
  
  // Pattern 4: cos^-1 (without braces)
  text = text.replace(/\b(cos|sin|tan|sec|csc|cot|cosec)\s*\^\s*-1\b/gi, `$1${superMinusOne}`);
  
  // Pattern 5: cos^(-1) (with parentheses)
  text = text.replace(/\b(cos|sin|tan|sec|csc|cot|cosec)\s*\^\s*\(-1\)/gi, `$1${superMinusOne}`);
  
  return text;
};

/**
 * Renders mathematical expressions and chemical formulas from text input
 * Supports:
 * - Inverse trig functions: cos inverse, arcsin, tan^{-1} → cos⁻¹, sin⁻¹, tan⁻¹
 * - Chemical formulas: H_{2}O, H_2SO_4, Fe^{2+}
 * - Chemical arrows: -> (→), <-> (⇌), \longrightarrow (⟶)
 * - Inline LaTeX: $x^2 + y^2 = z^2$
 * - Superscripts/subscripts: x^2, x_i, x_{max}
 * 
 * @param input - Raw text with math/chemistry notation
 * @returns HTML string with formatted mathematical expressions
 */
export const renderMath = (input: string): string => {
  if (!input) return '';
  
  // Step 1: Protect MCQ option labels like (A), (B), (C), (D) from transformations
  const protectedTokens: Record<string, string> = {};
  let tokenIndex = 0;
  
  // Protect (A)-(D) MCQ tokens (case-insensitive)
  let protectedInput = input.replace(/\([A-Da-d]\)/g, (match) => {
    const placeholder = `__PROTECTED_TOKEN_${tokenIndex++}__`;
    protectedTokens[placeholder] = match;
    return placeholder;
  });
  
  // Protect ALL single-digit/letter parentheses like (8), (1), (x), (B), etc.
  protectedInput = protectedInput.replace(/\(([A-Za-z0-9])\)/g, (match) => {
    const placeholder = `__PROTECTED_TOKEN_${tokenIndex++}__`;
    protectedTokens[placeholder] = match;
    return placeholder;
  });
  
  // Step 2: Normalize trigonometric inverse functions (cos inverse → cos⁻¹)
  let cleaned = normalizeTrigInverse(protectedInput);
  
  // Step 3: Clean and normalize input
  cleaned = cleaned
    // Remove stray dollar signs from OCR but keep $_ and $^
    .replace(/\$(?![_{^])/g, '')
    // Normalize OCR glitches: "$_-16" → "^{-16}"
    .replace(/(\d+)\s*\$\s*_\s*(-?\d+)/g, '$1^{$2}');
  
  // Step 4: Chemical reaction arrows
  // Convert LaTeX and simple arrow syntax to proper Unicode arrows
  cleaned = cleaned
    .replace(/\\rightarrow/g, '→')
    .replace(/\\to/g, '→')
    .replace(/\\longrightarrow/g, '⟶')
    .replace(/\\leftrightarrow/g, '↔')
    .replace(/\\rightleftharpoons/g, '⇌')
    .replace(/->/g, '→')        // Simple -> to proper arrow
    .replace(/<->/g, '⇌');      // Simple <-> to equilibrium arrow
  
  // Step 5: Escape HTML for safety
  let safe = escapeHtml(cleaned);
  
  // Step 6: Handle inline LaTeX segments $...$
  safe = safe.replace(/\$([^$]+)\$/g, (_m, content) => {
    return `<span class="math-inline">${applySupSub(content)}</span>`;
  });
  
  // Step 7: Apply fraction rendering BEFORE superscripts/subscripts
  safe = applyFractions(safe);
  
  // Step 8: Process remaining plain-text math patterns (superscripts/subscripts)
  safe = applySupSub(safe);
  
  // Step 9: Restore ALL protected tokens
  Object.keys(protectedTokens).forEach(placeholder => {
    safe = safe.replace(placeholder, protectedTokens[placeholder]);
  });
  
  return safe;
};

/**
 * Utility to strip leading option labels like "A.", "(A)", "a)" from text
 */
export const stripLeadingOptionLabel = (text: string): string => {
  if (!text) return text;
  return text.replace(/^\s*(?:\(([A-Da-d])\)|([A-Da-d])[.)])\s*/, '');
};
