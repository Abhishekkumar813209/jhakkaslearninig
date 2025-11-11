/**
 * Central Game Type Configuration
 * Single source of truth for mapping UI game types to database-specific names
 * 
 * IMPORTANT: topic_learning_content and topic_content_mapping use DIFFERENT naming conventions!
 */

// UI Type → topic_learning_content.game_type (database column)
export const GAME_TYPE_FOR_CONTENT: Record<string, string> = {
  'match_column': 'match_column',       // singular!
  'match_columns': 'match_column',      // backward compatibility
  'drag_drop': 'drag_drop',
  'drag_drop_sort': 'drag_drop',
  'sequence_order': 'sequence_order',
  'drag_drop_sequence': 'sequence_order',
  'word_puzzle': 'word_puzzle',
  'crossword': 'word_puzzle',
  'fill_blanks': 'fill_blanks',
  'fill_blank': 'fill_blanks',
  'match_pair': 'match_pair',           // singular!
  'match_pairs': 'match_pair',          // backward compatibility
  'typing_race': 'typing_race',
  'mcq': 'mcq',
  'true_false': 'true_false',
  'assertion_reason': 'assertion_reason'
};

// UI Type → topic_content_mapping.content_type (exercise_type enum)
export const GAME_TYPE_FOR_MAPPING: Record<string, string> = {
  'match_columns': 'match_column',      // singular!
  'match_column': 'match_column',
  'drag_drop': 'drag_drop_sort',
  'drag_drop_sort': 'drag_drop_sort',
  'sequence_order': 'drag_drop_sequence',
  'drag_drop_sequence': 'drag_drop_sequence',
  'word_puzzle': 'crossword',
  'crossword': 'crossword',
  'fill_blanks': 'fill_blanks',
  'fill_blank': 'fill_blanks',
  'match_pair': 'match_pairs',          // DB uses match_pairs enum
  'match_pairs': 'match_pairs',         // backward compatibility
  'typing_race': 'typing_race',
  'mcq': 'mcq',
  'true_false': 'true_false',
  'assertion_reason': 'assertion_reason'
};

/**
 * Normalize game type for insertion into topic_learning_content
 */
export function normalizeGameTypeForContent(gameType: string | undefined | null): string | null {
  if (!gameType) {
    console.log('🔍 normalizeGameTypeForContent: Input is null/undefined');
    return null;
  }
  
  const input = gameType.toLowerCase().trim();
  const normalized = GAME_TYPE_FOR_CONTENT[input];
  
  console.log(`🔍 normalizeGameTypeForContent: "${gameType}" -> "${input}" -> "${normalized || 'INVALID'}"`);
  
  if (!normalized) {
    console.error('❌ Invalid game_type for topic_learning_content:', gameType);
    console.error('❌ Valid types are:', Object.keys(GAME_TYPE_FOR_CONTENT));
    return null;
  }
  return normalized;
}

/**
 * Normalize game type for insertion into topic_content_mapping
 */
export function normalizeGameTypeForMapping(gameType: string | undefined | null): string | null {
  if (!gameType) return null;
  const normalized = GAME_TYPE_FOR_MAPPING[gameType.toLowerCase().trim()];
  if (!normalized) {
    console.error('❌ Invalid content_type for topic_content_mapping:', gameType);
    return null;
  }
  return normalized;
}

/**
 * Validate game type before insert to topic_learning_content
 */
export function validateGameTypeForContent(gameType: string): boolean {
  const normalized = normalizeGameTypeForContent(gameType);
  if (!normalized) {
    const validTypes = Object.keys(GAME_TYPE_FOR_CONTENT).filter(k => !k.includes('_')).join(', ');
    throw new Error(
      `Invalid game_type: "${gameType}". Valid types: ${validTypes}`
    );
  }
  return true;
}

/**
 * Validate content type before insert to topic_content_mapping
 */
export function validateGameTypeForMapping(gameType: string): boolean {
  const normalized = normalizeGameTypeForMapping(gameType);
  if (!normalized) {
    const validTypes = Object.keys(GAME_TYPE_FOR_MAPPING).filter(k => !k.includes('_')).join(', ');
    throw new Error(
      `Invalid content_type: "${gameType}". Valid types: ${validTypes}`
    );
  }
  return true;
}

/**
 * Get human-readable error message for invalid game type
 */
export function getGameTypeErrorMessage(gameType: string, forMapping: boolean = false): string {
  const config = forMapping ? GAME_TYPE_FOR_MAPPING : GAME_TYPE_FOR_CONTENT;
  const validTypes = [...new Set(Object.values(config))].join(', ');
  return `Cannot ${forMapping ? 'publish' : 'create'} lesson: game_type "${gameType}" is not allowed. Valid types: ${validTypes}`;
}
