export interface WellnessCheckpoint {
  description: string;
  criteria: string;
}

export interface WellnessTask {
  name: string;
  description: string;
  days: number;
  dailyActivities: string[];
  checkpoints: WellnessCheckpoint[];
}

export interface WellnessPhase {
  name: string;
  description: string;
  days: number;
  tasks: WellnessTask[];
}

export interface WellnessTemplate {
  id: string;
  title: string;
  slug: string;
  description: string;
  totalDays: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  phases: WellnessPhase[];
  gameTypes: string[];
  icon: string;
  color: string;
}

export const WELLNESS_TEMPLATES: Record<string, WellnessTemplate> = {
  nofap: {
    id: 'nofap-90',
    title: '90-Day NoFap Journey',
    slug: 'nofap',
    description: 'Complete PMO recovery program with 4 phases',
    totalDays: 90,
    difficulty: 'advanced',
    icon: '🎯',
    color: 'blue',
    phases: [
      {
        name: 'Phase 1: Foundation (Days 1-21)',
        description: 'Understanding triggers and building awareness',
        days: 21,
        tasks: [
          {
            name: 'Understanding Triggers',
            description: 'Identify and document personal triggers',
            days: 3,
            dailyActivities: ['Trigger journaling', 'Urge tracking', 'Mindfulness practice'],
            checkpoints: [
              { description: 'Identified 5+ triggers', criteria: 'List at least 5 personal triggers' },
              { description: 'Emergency plan created', criteria: 'Written action plan for urges' }
            ]
          },
          {
            name: 'Morning Routine Setup',
            description: 'Build a productive morning routine',
            days: 7,
            dailyActivities: ['Cold shower', 'Exercise 20min', 'Meditation 10min'],
            checkpoints: [
              { description: '7-day streak', criteria: 'Complete all activities for 7 days' },
              { description: 'Routine consistency', criteria: 'Wake up same time daily' }
            ]
          },
          {
            name: 'Evening Wind-Down',
            description: 'Create healthy evening habits',
            days: 7,
            dailyActivities: ['No screens 1hr before bed', 'Reading 20min', 'Gratitude journal'],
            checkpoints: [
              { description: 'Screen-free evenings', criteria: '7 consecutive nights' },
              { description: 'Sleep quality improved', criteria: 'Track sleep hours' }
            ]
          },
          {
            name: 'Accountability Partner',
            description: 'Find and connect with support',
            days: 4,
            dailyActivities: ['Daily check-in', 'Share struggles', 'Mutual encouragement'],
            checkpoints: [
              { description: 'Partner connected', criteria: 'Active accountability partner' },
              { description: '4-day communication', criteria: 'Daily messages exchanged' }
            ]
          }
        ]
      },
      {
        name: 'Phase 2: Building Discipline (Days 22-45)',
        description: 'Strengthen mental resilience and willpower',
        days: 24,
        tasks: [
          {
            name: 'Cold Showers Challenge',
            description: 'Increase cold exposure gradually',
            days: 7,
            dailyActivities: ['Progressive cold shower (30s to 5min)', 'Deep breathing exercises'],
            checkpoints: [
              { description: '5min cold shower', criteria: 'Complete 5-minute cold shower' }
            ]
          },
          {
            name: 'Exercise Routine',
            description: 'Build physical fitness habit',
            days: 10,
            dailyActivities: ['30min workout', 'Track progress', 'Healthy meals'],
            checkpoints: [
              { description: '10-day exercise streak', criteria: 'Daily 30min workouts' },
              { description: 'Fitness improvement', criteria: 'Increased strength/endurance' }
            ]
          },
          {
            name: 'Mindfulness Meditation',
            description: 'Develop mental clarity',
            days: 7,
            dailyActivities: ['20min meditation', 'Breathing exercises', 'Body scan'],
            checkpoints: [
              { description: 'Meditation habit', criteria: '7 consecutive days' }
            ]
          }
        ]
      },
      {
        name: 'Phase 3: Transformation (Days 46-70)',
        description: 'Experience positive changes and momentum',
        days: 25,
        tasks: [
          {
            name: 'Energy Redirection',
            description: 'Channel energy into productive activities',
            days: 10,
            dailyActivities: ['Creative project work', 'Skill learning', 'Social connections'],
            checkpoints: [
              { description: 'New skill progress', criteria: 'Measurable improvement' },
              { description: '10-day productivity', criteria: 'Daily creative output' }
            ]
          },
          {
            name: 'Social Confidence',
            description: 'Improve social interactions',
            days: 10,
            dailyActivities: ['Conversations with strangers', 'Eye contact practice', 'Active listening'],
            checkpoints: [
              { description: 'Social comfort', criteria: '5+ meaningful conversations' }
            ]
          },
          {
            name: 'Mental Clarity',
            description: 'Notice cognitive improvements',
            days: 5,
            dailyActivities: ['Focus exercises', 'Memory challenges', 'Problem solving'],
            checkpoints: [
              { description: 'Focus improvement', criteria: '60min deep work sessions' }
            ]
          }
        ]
      },
      {
        name: 'Phase 4: Mastery (Days 71-90)',
        description: 'Consolidate new identity and lifestyle',
        days: 20,
        tasks: [
          {
            name: 'Lifestyle Integration',
            description: 'Make recovery your new normal',
            days: 10,
            dailyActivities: ['All previous habits', 'Help others', 'Share journey'],
            checkpoints: [
              { description: 'Habit automation', criteria: 'Routines feel natural' },
              { description: 'Support others', criteria: 'Mentor at least one person' }
            ]
          },
          {
            name: '90-Day Reflection',
            description: 'Celebrate and plan ahead',
            days: 10,
            dailyActivities: ['Document transformation', 'Set new goals', 'Gratitude practice'],
            checkpoints: [
              { description: '90-day milestone', criteria: 'Complete 90-day journey' },
              { description: 'Future vision', criteria: 'Written 6-month plan' }
            ]
          }
        ]
      }
    ],
    gameTypes: ['mcq', 'reflection', 'challenge_tracker', 'urge_surfing']
  },

  early_rising: {
    id: 'early-riser-66',
    title: '66-Day Early Riser Challenge',
    slug: 'early_rising',
    description: 'Transform into a morning person with science-backed habits',
    totalDays: 66,
    difficulty: 'intermediate',
    icon: '🌅',
    color: 'orange',
    phases: [
      {
        name: 'Phase 1: Sleep Foundation (Days 1-14)',
        description: 'Fix sleep schedule and environment',
        days: 14,
        tasks: [
          {
            name: 'Sleep Hygiene Setup',
            description: 'Optimize bedroom for quality sleep',
            days: 7,
            dailyActivities: ['Blue light blocker after 8 PM', 'Cool room temperature', 'Complete darkness'],
            checkpoints: [
              { description: 'Environment optimized', criteria: 'All sleep factors addressed' },
              { description: '7-day tracking', criteria: 'Sleep quality log completed' }
            ]
          },
          {
            name: 'Consistent Sleep Time',
            description: 'Go to bed at same time daily',
            days: 7,
            dailyActivities: ['10 PM bedtime', 'No screens 1hr before', 'Reading ritual'],
            checkpoints: [
              { description: '7-day consistency', criteria: 'Same bedtime all 7 nights' }
            ]
          }
        ]
      },
      {
        name: 'Phase 2: Wake-up Protocol (Days 15-35)',
        description: 'Master the art of waking up early',
        days: 21,
        tasks: [
          {
            name: 'Alarm Strategy',
            description: 'Never hit snooze again',
            days: 7,
            dailyActivities: ['Alarm across room', 'Immediate light exposure', 'Water drinking'],
            checkpoints: [
              { description: 'Zero snoozes', criteria: '7 days without snooze button' }
            ]
          },
          {
            name: 'Morning Activation',
            description: 'Wake up your body and mind',
            days: 14,
            dailyActivities: ['5-minute movement', 'Cold water face wash', 'Sunlight exposure'],
            checkpoints: [
              { description: 'Alert within 10min', criteria: 'Fully awake without coffee' }
            ]
          }
        ]
      },
      {
        name: 'Phase 3: Morning Routine (Days 36-66)',
        description: 'Build your ideal morning',
        days: 31,
        tasks: [
          {
            name: 'Power Hour',
            description: 'Productive first hour',
            days: 15,
            dailyActivities: ['Exercise 30min', 'Healthy breakfast', 'Planning session'],
            checkpoints: [
              { description: '15-day power hour', criteria: 'Complete routine daily' }
            ]
          },
          {
            name: 'Habit Automation',
            description: 'Make it effortless',
            days: 16,
            dailyActivities: ['All previous habits', 'Track energy levels', 'Optimize timing'],
            checkpoints: [
              { description: '66-day milestone', criteria: 'Habit feels automatic' }
            ]
          }
        ]
      }
    ],
    gameTypes: ['sleep_tracker', 'morning_quiz', 'habit_stack']
  },

  smoking: {
    id: 'smoke-free-60',
    title: '60-Day Smoke-Free Life',
    slug: 'smoking',
    description: 'Evidence-based smoking cessation program',
    totalDays: 60,
    difficulty: 'advanced',
    icon: '🚭',
    color: 'green',
    phases: [
      {
        name: 'Phase 1: Preparation (Days 1-7)',
        description: 'Mental preparation and trigger mapping',
        days: 7,
        tasks: [
          {
            name: 'Quit Date Selection',
            description: 'Choose your quit date and prepare',
            days: 3,
            dailyActivities: ['Track smoking patterns', 'Inform support system', 'Remove triggers'],
            checkpoints: [
              { description: 'Quit date committed', criteria: 'Specific date chosen' },
              { description: 'Support activated', criteria: '3+ people informed' }
            ]
          },
          {
            name: 'Nicotine Replacement Plan',
            description: 'Choose cessation aids if needed',
            days: 4,
            dailyActivities: ['Research NRT options', 'Consult healthcare provider', 'Purchase supplies'],
            checkpoints: [
              { description: 'Strategy decided', criteria: 'Clear quit plan documented' }
            ]
          }
        ]
      },
      {
        name: 'Phase 2: Quit Week (Days 8-14)',
        description: 'The crucial first week smoke-free',
        days: 7,
        tasks: [
          {
            name: 'Quit Day',
            description: 'Your first day smoke-free',
            days: 1,
            dailyActivities: ['Discard all cigarettes', 'Avoid trigger situations', 'Use NRT as planned'],
            checkpoints: [
              { description: '24 hours smoke-free', criteria: 'Complete first day' }
            ]
          },
          {
            name: 'First Week Survival',
            description: 'Navigate withdrawal symptoms',
            days: 6,
            dailyActivities: ['Craving management', 'Distraction techniques', 'Support check-ins'],
            checkpoints: [
              { description: '7 days smoke-free', criteria: 'Complete first week' }
            ]
          }
        ]
      },
      {
        name: 'Phase 3: Recovery (Days 15-35)',
        description: 'Physical and mental recovery',
        days: 21,
        tasks: [
          {
            name: 'Breathing Improvement',
            description: 'Notice lung recovery',
            days: 10,
            dailyActivities: ['Deep breathing exercises', 'Light cardio', 'Track lung capacity'],
            checkpoints: [
              { description: 'Breathing easier', criteria: 'Measurable improvement' }
            ]
          },
          {
            name: 'Trigger Resistance',
            description: 'Build coping mechanisms',
            days: 11,
            dailyActivities: ['Face trigger situations', 'Alternative coping', 'Mindfulness'],
            checkpoints: [
              { description: 'Major triggers handled', criteria: 'Navigate 5+ trigger situations' }
            ]
          }
        ]
      },
      {
        name: 'Phase 4: New Normal (Days 36-60)',
        description: 'Solidify non-smoker identity',
        days: 25,
        tasks: [
          {
            name: 'Lifestyle Integration',
            description: 'Embrace smoke-free life',
            days: 15,
            dailyActivities: ['Enjoy improved taste/smell', 'Calculate money saved', 'Share success'],
            checkpoints: [
              { description: 'Identity shift', criteria: 'Think of self as non-smoker' }
            ]
          },
          {
            name: '60-Day Milestone',
            description: 'Celebrate and commit long-term',
            days: 10,
            dailyActivities: ['Document journey', 'Help others quit', 'Plan smoke-free future'],
            checkpoints: [
              { description: '60 days smoke-free', criteria: 'Complete 60-day journey' }
            ]
          }
        ]
      }
    ],
    gameTypes: ['craving_timer', 'health_tracker', 'money_saved', 'lung_recovery']
  },

  digital_detox: {
    id: 'digital-detox-45',
    title: '45-Day Digital Detox',
    slug: 'digital_detox',
    description: 'Reclaim your attention from social media and screens',
    totalDays: 45,
    difficulty: 'intermediate',
    icon: '📱',
    color: 'purple',
    phases: [
      {
        name: 'Phase 1: Awareness (Days 1-10)',
        description: 'Track current usage and identify patterns',
        days: 10,
        tasks: [
          {
            name: 'Screen Time Audit',
            description: 'Document all digital usage',
            days: 5,
            dailyActivities: ['Use screen time tracker', 'Log app usage hourly', 'Notice trigger times'],
            checkpoints: [
              { description: '5 days tracked', criteria: 'Complete usage log' },
              { description: 'Top time-wasters identified', criteria: 'List 5 biggest time drains' }
            ]
          },
          {
            name: 'Digital Declutter',
            description: 'Remove unnecessary apps and accounts',
            days: 5,
            dailyActivities: ['Delete time-waster apps', 'Unfollow toxic accounts', 'Organize notifications'],
            checkpoints: [
              { description: '10+ apps deleted', criteria: 'Remove non-essential apps' },
              { description: 'Notifications reduced', criteria: '50% fewer notifications' }
            ]
          }
        ]
      },
      {
        name: 'Phase 2: Boundaries (Days 11-25)',
        description: 'Implement digital boundaries',
        days: 15,
        tasks: [
          {
            name: 'Phone-Free Zones',
            description: 'Create physical boundaries',
            days: 7,
            dailyActivities: ['No phone in bedroom', 'Phone-free meals', 'Designated charging station'],
            checkpoints: [
              { description: '7-day boundaries', criteria: 'Consistent zone enforcement' }
            ]
          },
          {
            name: 'Time Blocks',
            description: 'Schedule specific usage times',
            days: 8,
            dailyActivities: ['Check social media 2x daily only', 'Email batching', 'Focus hours'],
            checkpoints: [
              { description: 'Reduced usage by 50%', criteria: 'Measured screen time drop' }
            ]
          }
        ]
      },
      {
        name: 'Phase 3: Replacement (Days 26-45)',
        description: 'Fill time with meaningful activities',
        days: 20,
        tasks: [
          {
            name: 'Analog Activities',
            description: 'Rediscover offline hobbies',
            days: 10,
            dailyActivities: ['Read physical books', 'Outdoor activities', 'Face-to-face socializing'],
            checkpoints: [
              { description: '3 new hobbies', criteria: 'Start at least 3 offline activities' }
            ]
          },
          {
            name: 'Digital Minimalism',
            description: 'Intentional tech use',
            days: 10,
            dailyActivities: ['Use tech for creation not consumption', 'Mindful scrolling', 'Quality content only'],
            checkpoints: [
              { description: '45-day milestone', criteria: 'Healthy digital habits established' }
            ]
          }
        ]
      }
    ],
    gameTypes: ['screen_timer', 'app_blocker', 'analog_activities', 'focus_mode']
  },

  gaming: {
    id: 'gaming-balance-30',
    title: '30-Day Gaming Balance Reset',
    slug: 'gaming',
    description: 'Healthy relationship with gaming - balance, not quitting',
    totalDays: 30,
    difficulty: 'beginner',
    icon: '🎮',
    color: 'indigo',
    phases: [
      {
        name: 'Phase 1: Assessment (Days 1-7)',
        description: 'Understand your gaming patterns',
        days: 7,
        tasks: [
          {
            name: 'Gaming Journal',
            description: 'Track when, why, and how long you play',
            days: 7,
            dailyActivities: ['Log all gaming sessions', 'Note emotional triggers', 'Track neglected tasks'],
            checkpoints: [
              { description: '7-day log complete', criteria: 'Comprehensive gaming diary' },
              { description: 'Patterns identified', criteria: 'Recognize 3+ trigger patterns' }
            ]
          }
        ]
      },
      {
        name: 'Phase 2: Time Limits (Days 8-18)',
        description: 'Set and enforce gaming boundaries',
        days: 11,
        tasks: [
          {
            name: 'Daily Gaming Budget',
            description: 'Set maximum gaming hours',
            days: 11,
            dailyActivities: ['2-hour daily limit', 'Use game timer', 'Plan alternative activities'],
            checkpoints: [
              { description: '11-day time limit', criteria: 'Stay within 2hr limit daily' },
              { description: 'Other hobbies started', criteria: 'Try 2+ non-gaming activities' }
            ]
          }
        ]
      },
      {
        name: 'Phase 3: Healthy Gaming (Days 19-30)',
        description: 'Maintain balanced gaming lifestyle',
        days: 12,
        tasks: [
          {
            name: 'Quality Over Quantity',
            description: 'Choose games mindfully',
            days: 6,
            dailyActivities: ['Play intentionally selected games', 'Complete real-life tasks first', 'Social gaming only'],
            checkpoints: [
              { description: 'Intentional gaming', criteria: 'Game by choice, not habit' }
            ]
          },
          {
            name: 'Real-Life Achievements',
            description: 'Balance virtual and real progress',
            days: 6,
            dailyActivities: ['Complete 3 real-life tasks daily', 'Exercise before gaming', 'Track both game and life achievements'],
            checkpoints: [
              { description: '30-day balance', criteria: 'Gaming enhances life, not replaces it' }
            ]
          }
        ]
      }
    ],
    gameTypes: ['gaming_timer', 'achievement_redirect', 'real_life_quests', 'balance_tracker']
  }
};

export function getTemplateById(id: string): WellnessTemplate | undefined {
  return Object.values(WELLNESS_TEMPLATES).find(t => t.id === id);
}

export function getTemplateBySlug(slug: string): WellnessTemplate | undefined {
  return WELLNESS_TEMPLATES[slug];
}

export function getAllTemplates(): WellnessTemplate[] {
  return Object.values(WELLNESS_TEMPLATES);
}

export function calculatePhaseProgress(phaseStartDay: number, phaseDays: number, currentDay: number): number {
  if (currentDay < phaseStartDay) return 0;
  if (currentDay >= phaseStartDay + phaseDays) return 100;
  return Math.round(((currentDay - phaseStartDay + 1) / phaseDays) * 100);
}

export function getCurrentPhase(template: WellnessTemplate, currentDay: number): WellnessPhase | undefined {
  let dayCount = 0;
  for (const phase of template.phases) {
    if (currentDay >= dayCount && currentDay < dayCount + phase.days) {
      return phase;
    }
    dayCount += phase.days;
  }
  return undefined;
}
