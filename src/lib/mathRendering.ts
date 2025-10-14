// Shared math rendering utilities for test questions across admin and student components

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
export const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

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
 * Renders mathematical expressions and chemical formulas from text input
 * Supports:
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
  
  // Step 2: Clean and normalize input
  let cleaned = protectedInput
    // Remove stray dollar signs from OCR but keep $_ and $^
    .replace(/\$(?![_{^])/g, '')
    // Normalize OCR glitches: "$_-16" → "^{-16}"
    .replace(/(\d+)\s*\$\s*_\s*(-?\d+)/g, '$1^{$2}');
  
  // Step 3: Chemical reaction arrows
  // Convert LaTeX and simple arrow syntax to proper Unicode arrows
  cleaned = cleaned
    .replace(/\\rightarrow/g, '→')
    .replace(/\\to/g, '→')
    .replace(/\\longrightarrow/g, '⟶')
    .replace(/\\leftrightarrow/g, '↔')
    .replace(/\\rightleftharpoons/g, '⇌')
    .replace(/->/g, '→')        // Simple -> to proper arrow
    .replace(/<->/g, '⇌');      // Simple <-> to equilibrium arrow
  
  // Step 4: Escape HTML for safety
  let safe = escapeHtml(cleaned);
  
  // Step 5: Handle inline LaTeX segments $...$
  safe = safe.replace(/\$([^$]+)\$/g, (_m, content) => {
    return `<span class="math-inline">${applySupSub(content)}</span>`;
  });
  
  // Step 6: Process remaining plain-text math patterns
  safe = applySupSub(safe);
  
  // Step 7: Restore ALL protected tokens
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
