/**
 * Answer normalization utilities for question bank system
 * Handles legacy and modern answer formats consistently
 */

interface MatchColumnPair {
  left: number;
  right: number;
}

interface MatchColumnAnswer {
  pairs: MatchColumnPair[];
}

/**
 * Normalize Match Column answers from various legacy formats to standard {pairs: [...]}
 * 
 * Supports:
 * 1. Modern format: {pairs: [{left: 0, right: 1}, ...]}
 * 2. Legacy array: [{left: 0, right: 1}, ...]
 * 3. Legacy letter-to-number map: {"A": "2", "B": "1", ...}
 * 4. Legacy numeric map: {"0": 1, "1": 2, ...}
 */
export const normalizeMatchColumnAnswer = (answer: any): MatchColumnAnswer | null => {
  if (!answer) {
    console.log('🔴 Match Column - No answer provided');
    return null;
  }

  // Already in modern format
  if (answer.pairs && Array.isArray(answer.pairs)) {
    console.log('✅ Match Column - Already normalized:', answer);
    return answer;
  }

  // Legacy array format: [{left: 0, right: 1}, ...]
  if (Array.isArray(answer)) {
    console.log('🔄 Match Column - Converting array to pairs:', answer);
    return { pairs: answer };
  }

  // Legacy object map: {"A":"2"} or {"0":1}
  if (typeof answer === 'object') {
    console.log('🔍 Match Column - Processing object map:', answer);
    
    const keys = Object.keys(answer);
    if (keys.length === 0) {
      console.log('🔴 Match Column - Empty object');
      return null;
    }

    const pairs: MatchColumnPair[] = [];
    
    for (const key of keys) {
      let leftIndex: number;
      let rightIndex: number;
      
      // Handle letter keys (A, B, C, ...) -> 0-based index
      if (/^[A-Z]$/i.test(key)) {
        leftIndex = key.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, ...
        console.log(`  Letter key "${key}" -> left: ${leftIndex}`);
      } 
      // Handle numeric string keys ("0", "1", ...)
      else if (/^\d+$/.test(key)) {
        leftIndex = parseInt(key, 10);
        console.log(`  Numeric key "${key}" -> left: ${leftIndex}`);
      } 
      else {
        console.warn(`  ⚠️ Skipping invalid key: "${key}"`);
        continue;
      }
      
      // Parse right value
      const val = answer[key];
      if (typeof val === 'number') {
        rightIndex = val;
      } else if (typeof val === 'string' && /^\d+$/.test(val)) {
        rightIndex = parseInt(val, 10);
      } else {
        console.warn(`  ⚠️ Skipping invalid value for key "${key}": ${val}`);
        continue;
      }
      
      // Detect if values are 1-based (common in legacy data)
      // If we see values like 1,2,3... we assume 1-based and convert to 0-based
      // If we see 0 in values, assume already 0-based
      const allValues = Object.values(answer)
        .filter((v): v is number | string => typeof v === 'number' || typeof v === 'string')
        .filter(v => typeof v === 'number' || /^\d+$/.test(v as string))
        .map(v => typeof v === 'number' ? v : parseInt(v as string, 10));
      
      const hasZero = allValues.some(v => v === 0);
      const minValue = Math.min(...allValues);
      
      // If minimum is 1 and no zeros, it's 1-based indexing
      if (!hasZero && minValue === 1) {
        rightIndex = rightIndex - 1;
        console.log(`  1-based detected, adjusted right: ${rightIndex + 1} -> ${rightIndex}`);
      } else {
        console.log(`  0-based or already normalized, right: ${rightIndex}`);
      }
      
      pairs.push({ left: leftIndex, right: rightIndex });
    }
    
    if (pairs.length > 0) {
      console.log('✅ Match Column - Normalized to pairs:', pairs);
      return { pairs };
    }
  }

  console.log('🔴 Match Column - Unsupported format:', answer);
  return null;
};

/**
 * Format match column pairs for display (A→ii, B→i, ...)
 */
export const formatMatchColumnDisplay = (
  answer: any, 
  leftColumn?: string[], 
  rightColumn?: string[]
): string => {
  const normalized = normalizeMatchColumnAnswer(answer);
  if (!normalized || !normalized.pairs || normalized.pairs.length === 0) {
    return '';
  }

  return normalized.pairs.map((pair, idx) => {
    const leftLabel = leftColumn?.[pair.left] || 
                     String.fromCharCode(65 + pair.left); // A, B, C...
    const rightLabel = rightColumn?.[pair.right] || 
                      ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'][pair.right] || 
                      (pair.right + 1).toString();
    
    return `${leftLabel}→${rightLabel}`;
  }).join(', ');
};

/**
 * Parse columns from question text if not provided in database
 * Fallback for legacy questions
 */
export const parseColumnsFromText = (
  questionText: string
): { leftColumn: string[], rightColumn: string[] } | null => {
  if (!questionText) return null;

  // Look for "Column I" or "Column A" patterns
  const col1Match = questionText.match(/Column\s*[I1A][:：]?\s*(.*?)(?=Column\s*[I2B]|$)/is);
  const col2Match = questionText.match(/Column\s*[I2B][:：]?\s*(.*?)$/is);

  if (!col1Match || !col2Match) return null;

  const parseItems = (text: string): string[] => {
    // Split by common patterns: A), (A), A., 1), (1), 1.
    const items = text.match(/(?:\([A-Z0-9]\)|\([a-z0-9]\)|[A-Z0-9]\)|\d+\.|[A-Z]\.)\s*(.+?)(?=(?:\([A-Z0-9]\)|\([a-z0-9]\)|[A-Z0-9]\)|\d+\.|[A-Z]\.)|\s*$)/gi);
    return items ? items.map(item => item.trim()).filter(Boolean) : [];
  };

  const leftColumn = parseItems(col1Match[1]);
  const rightColumn = parseItems(col2Match[1]);

  if (leftColumn.length > 0 && rightColumn.length > 0) {
    console.log('📝 Parsed columns from text:', { leftColumn, rightColumn });
    return { leftColumn, rightColumn };
  }

  return null;
};
