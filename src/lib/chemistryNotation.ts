/**
 * Chemistry Notation Helper Functions
 * Handles chemical formulas, reactions, and notation preservation
 */

/**
 * Normalize chemical formulas to preserve subscripts
 * Examples: H2O → H_{2}O, CO2 → CO_{2}, Ca(OH)2 → Ca(OH)_{2}
 */
export function normalizeChemicalFormula(text: string): string {
  if (!text) return text;
  
  let normalized = text;
  
  // Pattern: Letter followed by digit(s) -> add subscript markers
  // H2 → H_{2}, SO4 → SO_{4}
  normalized = normalized.replace(/([A-Z][a-z]?)(\d+)/g, '$1_{$2}');
  
  // Pattern: Closing parenthesis followed by digit(s)
  // (OH)2 → (OH)_{2}
  normalized = normalized.replace(/(\))(\d+)/g, '$1_{$2}');
  
  // Pattern: Closing bracket followed by digit(s)
  // [Fe(CN)6]4 → [Fe(CN)_{6}]_{4}
  normalized = normalized.replace(/(\])(\d+)/g, '$1_{$2}');
  
  // Preserve already formatted subscripts
  normalized = normalized.replace(/_{(\d+)}/g, '_{$1}');
  
  return normalized;
}

/**
 * Normalize chemical ions with superscripts
 * Examples: Ca2+ → Ca^{2+}, SO4^2- → SO_{4}^{2-}
 */
export function normalizeChemicalIon(text: string): string {
  if (!text) return text;
  
  let normalized = text;
  
  // Pattern: Element/group followed by charge
  // Ca2+ → Ca^{2+}, Fe3+ → Fe^{3+}
  normalized = normalized.replace(/([A-Z][a-z]?\d*)(\d*[+-])/g, (match, element, charge) => {
    const normalizedElement = normalizeChemicalFormula(element);
    return `${normalizedElement}^{${charge}}`;
  });
  
  return normalized;
}

/**
 * Format chemical reactions to preserve arrows and states
 * Examples: H2 + O2 -> H2O → H_{2} + O_{2} → H_{2}O
 */
export function formatChemicalReaction(text: string): string {
  if (!text) return text;
  
  let formatted = text;
  
  // Normalize arrows
  formatted = formatted.replace(/->/g, '→');
  formatted = formatted.replace(/-->/g, '→');
  formatted = formatted.replace(/<=>/g, '⇌');
  formatted = formatted.replace(/<->/g, '⇌');
  
  // Split by reaction arrow and normalize each component
  const parts = formatted.split(/([→⇌=])/);
  formatted = parts.map((part, index) => {
    // Keep arrows as-is
    if (part === '→' || part === '⇌' || part === '=') {
      return ` ${part} `;
    }
    
    // Normalize chemical formulas in reactants and products
    return part.split('+').map(compound => {
      const trimmed = compound.trim();
      
      // Extract coefficient if present (e.g., "2H2O")
      const coeffMatch = trimmed.match(/^(\d+)\s*(.+)$/);
      if (coeffMatch) {
        const coeff = coeffMatch[1];
        const formula = normalizeChemicalFormula(coeffMatch[2]);
        return `${coeff}${formula}`;
      }
      
      return normalizeChemicalFormula(trimmed);
    }).join(' + ');
  }).join('');
  
  return formatted.trim();
}

/**
 * Detect if text contains chemical formulas or reactions
 */
export function containsChemistry(text: string): boolean {
  if (!text) return false;
  
  // Check for chemical formula patterns
  const hasFormula = /[A-Z][a-z]?\d+/.test(text);
  
  // Check for ions
  const hasIon = /[A-Z][a-z]?\d*[+-]/.test(text);
  
  // Check for reaction arrows
  const hasReaction = /->/i.test(text) || /→/.test(text) || /⇌/.test(text);
  
  // Check for states of matter
  const hasStates = /\(s\)|\(l\)|\(g\)|\(aq\)/i.test(text);
  
  // Check for common chemistry terms
  const hasChemTerms = /(mole|molarity|acid|base|pH|oxidation|reduction|catalyst)/i.test(text);
  
  return hasFormula || hasIon || hasReaction || hasStates || hasChemTerms;
}

/**
 * Validate chemical equation (basic check)
 */
export function validateChemicalEquation(equation: string): { valid: boolean; message?: string } {
  if (!equation || !equation.includes('→') && !equation.includes('=')) {
    return { valid: false, message: 'No reaction arrow found' };
  }
  
  // Check for balanced parentheses
  let parenCount = 0;
  let bracketCount = 0;
  
  for (const char of equation) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;
    
    if (parenCount < 0 || bracketCount < 0) {
      return { valid: false, message: 'Unbalanced parentheses or brackets' };
    }
  }
  
  if (parenCount !== 0) {
    return { valid: false, message: 'Unclosed parentheses' };
  }
  
  if (bracketCount !== 0) {
    return { valid: false, message: 'Unclosed brackets' };
  }
  
  return { valid: true };
}

/**
 * Preserve Unicode chemical symbols
 */
export function preserveChemicalSymbols(text: string): string {
  if (!text) return text;
  
  // Preserve subscript Unicode characters (₀₁₂₃₄₅₆₇₈₉)
  // Convert to markup format for consistency
  const subscriptMap: Record<string, string> = {
    '₀': '_{0}', '₁': '_{1}', '₂': '_{2}', '₃': '_{3}', '₄': '_{4}',
    '₅': '_{5}', '₆': '_{6}', '₇': '_{7}', '₈': '_{8}', '₉': '_{9}'
  };
  
  // Preserve superscript Unicode characters (⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻)
  const superscriptMap: Record<string, string> = {
    '⁰': '^{0}', '¹': '^{1}', '²': '^{2}', '³': '^{3}', '⁴': '^{4}',
    '⁵': '^{5}', '⁶': '^{6}', '⁷': '^{7}', '⁸': '^{8}', '⁹': '^{9}',
    '⁺': '^{+}', '⁻': '^{-}'
  };
  
  let result = text;
  
  // Replace Unicode subscripts
  Object.entries(subscriptMap).forEach(([unicode, markup]) => {
    result = result.replace(new RegExp(unicode, 'g'), markup);
  });
  
  // Replace Unicode superscripts
  Object.entries(superscriptMap).forEach(([unicode, markup]) => {
    result = result.replace(new RegExp(unicode, 'g'), markup);
  });
  
  return result;
}
