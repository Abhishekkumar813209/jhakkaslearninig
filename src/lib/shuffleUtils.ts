/**
 * Fisher-Yates shuffle algorithm - reliable and unbiased
 * Creates a new shuffled array without mutating the original
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffle array with preserved indices for later lookup
 * Useful for match games where we need to track original positions
 */
export function shuffleWithIndices<T>(array: T[]): Array<{ item: T; originalIndex: number }> {
  const withIndices = array.map((item, index) => ({
    item,
    originalIndex: index,
  }));
  return shuffleArray(withIndices);
}
