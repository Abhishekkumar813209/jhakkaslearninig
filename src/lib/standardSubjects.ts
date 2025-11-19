/**
 * Standard subject configuration for Indian education system
 * Provides centralized subject definitions for different class levels
 */

export const STANDARD_SUBJECTS = {
  // Classes 9-10: Core subjects
  classes_9_10: ['Science', 'Mathematics', 'Social Science'],
  
  // Classes 11-12: PCMB (Physics, Chemistry, Mathematics, Biology)
  classes_11_12: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
};

/**
 * Get standard subjects for a given class level
 * @param classLevel - The class level (as string or number)
 * @returns Array of standard subjects for that class level
 */
export function getStandardSubjectsForClass(classLevel: string | number): string[] {
  const classNum = typeof classLevel === 'string' ? parseInt(classLevel) : classLevel;
  
  if (isNaN(classNum)) return [];
  
  if (classNum <= 10) {
    return STANDARD_SUBJECTS.classes_9_10;
  } else if (classNum >= 11 && classNum <= 12) {
    return STANDARD_SUBJECTS.classes_11_12;
  }
  
  return [];
}

/**
 * Check if a class level requires subject standardization
 * @param classLevel - The class level to check
 * @returns true if class requires standard subjects
 */
export function shouldUseStandardSubjects(classLevel: string | number): boolean {
  const classNum = typeof classLevel === 'string' ? parseInt(classLevel) : classLevel;
  return !isNaN(classNum) && classNum >= 9 && classNum <= 12;
}
