export const XP_REWARDS = {
  theory: { easy: 30, medium: 40, hard: 50 },
  exercise: { easy: 30, medium: 40, hard: 50 },
  game: { easy: 30, medium: 40, hard: 50 }
} as const;

export const XP_MULTIPLIERS = {
  first_correct: 1.0,      // 100% of game's xp_reward
  second_correct: 0.3,     // 30% of game's xp_reward  
  wrong_attempt: 0,        // 0 XP for wrong answers
  max_attempts: 2          // Only 2 attempts allowed per question
} as const;

export type Difficulty = 'easy' | 'medium' | 'hard';
export type ActivityType = 'theory' | 'exercise' | 'game';

// SubQuestionResult for partial credit in multi-part questions
export interface SubQuestionResult {
  totalSubQuestions: number;
  correctCount: number;
  percentage: number; // correctCount / totalSubQuestions
}

export function calculateXP(
  activityType: ActivityType,
  difficulty: Difficulty
): number {
  return XP_REWARDS[activityType][difficulty];
}

export function getDifficultyColor(difficulty: Difficulty): string {
  return {
    easy: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-blue-600 bg-blue-50 border-blue-200',
    hard: 'text-red-600 bg-red-50 border-red-200'
  }[difficulty];
}

export function getDifficultyBadgeVariant(difficulty: Difficulty): "secondary" | "default" | "destructive" {
  return {
    easy: 'secondary' as const,
    medium: 'default' as const,
    hard: 'destructive' as const
  }[difficulty];
}
