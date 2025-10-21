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
  
  // Equality chains with algebraic fractions: (x-1)/2=(1-y)/3=(2z-1)/12
  // Process parentheses over numbers in equality chains
  t = t.replace(/\(([^()]+?)\)\s*\/\s*(\d+)(?=\s*[=,;.]|\s|$)/g, (_, num, den) => fracHTML(num, den));
  
  // Parentheses over token: (a-b)/3p, (7y-14)/2p
  t = t.replace(/\(([^()]+?)\)\s*\/\s*([A-Za-z][A-Za-z0-9]*|[0-9]+[A-Za-z]*)/g, (_, a, b) => fracHTML(a, b));
  
  // Token over parentheses: x/(y+z)
  t = t.replace(/([A-Za-z][A-Za-z0-9]*|[0-9]+)\s*\/\s*\(([^()]+?)\)/g, (_, a, b) => fracHTML(a, b));
  
  // Simple numeric fractions with optional signs (supports ±, -, and negative numbers: ±1/2, -3/7, 2/7)
  t = t.replace(/(^|[\s,;.=()])(±|−|-)?(\d{1,4})\s*\/\s*(\d{1,4})(?=[\s,;.=()]|$)/g, (match, prefix, sign, a, b) => 
    prefix + (sign || '') + fracHTML(a, b)
  );
  
  // Fractions with square roots with optional signs: ±1/√14, -2/√14
  t = t.replace(/(^|[\s,;.=()])(±|−|-)?(\d{1,4})\s*\/\s*(<span class="sqrt">.*?<\/span>|√\d+)(?=[\s,;.=()]|$)/g, (match, prefix, sign, num, den) =>
    prefix + (sign || '') + fracHTML(num, den)
  );
  
  // Fractions with variables and square roots with optional signs: ±x/√2, -a/√3
  t = t.replace(/(^|[\s,;.=()])(±|−|-)?([A-Za-z]\w*)\s*\/\s*(<span class="sqrt">.*?<\/span>|√\d+)(?=[\s,;.=()]|$)/g, (match, prefix, sign, num, den) =>
    prefix + (sign || '') + fracHTML(num, den)
  );
  
  // Fractions with variables (including subscripts) with optional signs: ±a_1/a_2, -b_1/b_2, x/y
  t = t.replace(/(^|[\s,;.=()])(±|−|-)?([A-Za-z]\w*)\s*\/\s*([A-Za-z]\w*)(?=[\s,;.=()]|$)/g, (match, prefix, sign, num, den) =>
    prefix + (sign || '') + fracHTML(num, den)
  );
  
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
 * Converts vector notation to proper display with arrow above
 * Handles: →r, →i, →j, \vec{OP}, OP^→, (OP)^→, vector{AB}, r⃗ (Unicode combining)
 */
export const applyVectorNotation = (t: string): string => {
  // Pattern 0: Unicode combining arrow (U+20D7) r⃗ → vector span
  t = t.replace(/([A-Za-z])\s*[\u20D7]/g, '<span class="vector">$1</span>');
  
  // Pattern 1: Arrow-prefix notation →r, →i, →j, →k (PRIORITY - most common in typed equations)
  t = t.replace(/→\s*([A-Za-z])/g, '<span class="vector">$1</span>');
  
  // Pattern 2: LaTeX style \vec{OP} (MOST COMMON from Word paste)
  t = t.replace(/\\vec\{([A-Za-z]{1,3})\}/g, '<span class="vector">$1</span>');
  
  // Pattern 3: (OP)^→ or OP^→ (arrow as superscript)
  t = t.replace(/\(([A-Z]{1,3})\)\s*\^\s*→/g, '<span class="vector">$1</span>');
  t = t.replace(/([A-Z]{1,3})\s*\^\s*→/g, '<span class="vector">$1</span>');
  
  // Pattern 4: Text style vector{AB}
  t = t.replace(/vector\{([A-Za-z]{1,3})\}/g, '<span class="vector">$1</span>');
  
  return t;
};

/**
 * Applies hat notation for unit vectors
 * Handles: \hat{i}, \hat{j}, \hat{k}, î (Unicode combining)
 */
export const applyHatNotation = (t: string): string => {
  // Pattern 1: Unicode combining circumflex (U+0302) î → \hat{i}
  t = t.replace(/([A-Za-z])\s*[\u0302]/g, '<span class="hat">$1</span>');
  
  // Pattern 2: LaTeX \hat{i}, \hat{j}, \hat{k}
  t = t.replace(/\\hat\{([A-Za-z])\}/g, '<span class="hat">$1</span>');
  
  return t;
};

/**
 * Converts square root to proper radical with vinculum (overline)
 * Handles: \sqrt{expression}, √{expression}, √(expression), √14
 */
export const applySqrtWithVinculum = (t: string): string => {
  // Pattern 1: LaTeX \sqrt{expression} (MOST COMMON from Word)
  t = t.replace(/\\sqrt\{([^}]+)\}/g, '<span class="sqrt"><span class="sqrt-symbol">√</span><span class="sqrt-content">$1</span></span>');
  
  // Pattern 2: √{expression} with braces
  t = t.replace(/√\{([^}]+)\}/g, '<span class="sqrt"><span class="sqrt-symbol">√</span><span class="sqrt-content">$1</span></span>');
  
  // Pattern 3: √(expression) with parentheses
  t = t.replace(/√\(([^)]+)\)/g, '<span class="sqrt"><span class="sqrt-symbol">√</span><span class="sqrt-content">$1</span></span>');
  
  // Pattern 4: Simple √14 (only numbers, but skip if already processed)
  t = t.replace(/√(\d+)(?![^<]*<\/span>)/g, '<span class="sqrt"><span class="sqrt-symbol">√</span><span class="sqrt-content">$1</span></span>');
  
  return t;
};

/**
 * Extract content from braced LaTeX command, handling nested braces
 * Returns [content, closeIndex] or null if malformed
 */
function extractBraced(str: string, openIndex: number): [string, number] | null {
  let depth = 0;
  let start = -1;
  
  for (let i = openIndex; i < str.length; i++) {
    if (str[i] === '{') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return [str.substring(start, i), i];
      }
    }
  }
  return null; // Malformed braces
}

/**
 * Replace LaTeX \frac, \dfrac, \tfrac with HTML fractions
 * Handles nested braces correctly
 */
function replaceLatexFractions(str: string): string {
  const fracCommands = ['\\frac', '\\dfrac', '\\tfrac'];
  
  for (const cmd of fracCommands) {
    let result = '';
    let lastIndex = 0;
    let index = str.indexOf(cmd, lastIndex);
    
    while (index !== -1) {
      // Add text before \frac
      result += str.substring(lastIndex, index);
      
      // Extract numerator
      const numResult = extractBraced(str, index + cmd.length);
      if (!numResult) {
        // Malformed, keep original
        result += cmd;
        lastIndex = index + cmd.length;
        index = str.indexOf(cmd, lastIndex);
        continue;
      }
      
      const [numerator, numCloseIdx] = numResult;
      
      // Extract denominator
      const denResult = extractBraced(str, numCloseIdx + 1);
      if (!denResult) {
        // Malformed, keep original
        result += cmd + '{' + numerator + '}';
        lastIndex = numCloseIdx + 1;
        index = str.indexOf(cmd, lastIndex);
        continue;
      }
      
      const [denominator, denCloseIdx] = denResult;
      
      // Create HTML fraction
      result += `<span class="frac"><span class="num">${numerator}</span><span class="bar"></span><span class="den">${denominator}</span></span>`;
      
      lastIndex = denCloseIdx + 1;
      index = str.indexOf(cmd, lastIndex);
    }
    
    // Add remaining text
    result += str.substring(lastIndex);
    str = result;
  }
  
  return str;
}

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
  
  // Step 2: Apply vector notation BEFORE trig normalization
  let cleaned = applyVectorNotation(protectedInput);
  
  // Step 2.5: Apply hat notation for unit vectors
  cleaned = applyHatNotation(cleaned);
  
  // Step 3: Normalize trigonometric inverse functions (cos inverse → cos⁻¹)
  cleaned = normalizeTrigInverse(cleaned);
  
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
  
  // Step 6: Apply square root with vinculum AFTER HTML escape
  safe = applySqrtWithVinculum(safe);
  
  // Step 7: Handle inline LaTeX segments $...$
  // Process \frac first, then superscripts/subscripts
  safe = safe.replace(/\$([^$]+)\$/g, (_m, content) => {
    let processed = replaceLatexFractions(content);
    processed = applySupSub(processed);
    return `<span class="math-inline">${processed}</span>`;
  });
  
  // Also process \frac outside $...$ (fallback for direct LaTeX paste)
  safe = replaceLatexFractions(safe);
  
  // Step 8: Apply fraction rendering BEFORE superscripts/subscripts
  safe = applyFractions(safe);
  
  // Step 9: Process remaining plain-text math patterns (superscripts/subscripts)
  safe = applySupSub(safe);
  
  // Step 10: Restore ALL protected tokens
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
