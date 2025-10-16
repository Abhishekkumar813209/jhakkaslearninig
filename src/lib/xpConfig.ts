export const XP_REWARDS = {
  theory: { easy: 30, medium: 40, hard: 50 },
  exercise: { easy: 30, medium: 40, hard: 50 },
  game: { easy: 30, medium: 40, hard: 50 }
} as const;

export const ATTEMPT_XP = {
  wrong_attempt: 2,     // Small XP for wrong attempt (participation)
  correct_first: 10,    // Full XP for first correct attempt
  correct_retry: 5      // Half XP for correct after wrong attempts
} as const;

export type Difficulty = 'easy' | 'medium' | 'hard';
export type ActivityType = 'theory' | 'exercise' | 'game';

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
