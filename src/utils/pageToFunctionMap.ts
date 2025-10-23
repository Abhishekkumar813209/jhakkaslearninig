export interface PageInfo {
  path: string;
  name: string;
  category: 'Public' | 'Student' | 'Parent' | 'Admin' | 'Utility';
  description: string;
  functionIds: string[];
}

export const allPages: PageInfo[] = [
  // Public Pages
  {
    path: '/',
    name: 'Home',
    category: 'Public',
    description: 'Landing page',
    functionIds: []
  },
  {
    path: '/about',
    name: 'About',
    category: 'Public',
    description: 'About page',
    functionIds: []
  },
  {
    path: '/login',
    name: 'Login',
    category: 'Public',
    description: 'User login page',
    functionIds: ['auth-login', 'auth-google']
  },
  {
    path: '/register',
    name: 'Register',
    category: 'Public',
    description: 'Student registration',
    functionIds: ['auth-register', 'validate-referral-code']
  },
  {
    path: '/register/parent',
    name: 'Register Parent',
    category: 'Public',
    description: 'Parent registration',
    functionIds: ['auth-register']
  },

  // Student Pages
  {
    path: '/student/dashboard',
    name: 'Student Dashboard',
    category: 'Student',
    description: 'Main student dashboard with overview stats',
    functionIds: ['dashboard-overview', 'dashboard-achievements', 'weekly-league', 'generate-referral-code']
  },
  {
    path: '/student',
    name: 'Student Roadmap Hub',
    category: 'Student',
    description: 'Student roadmap listing',
    functionIds: ['student-roadmap-api']
  },
  {
    path: '/student/roadmap/:roadmapId',
    name: 'Batch Roadmap View',
    category: 'Student',
    description: 'View specific batch roadmap',
    functionIds: ['student-roadmap-api', 'batch-api']
  },
  {
    path: '/student/roadmap/:roadmapId/topic/:topicId',
    name: 'Topic Detail Page',
    category: 'Student',
    description: 'Study topic with exercises',
    functionIds: ['topic-questions-api']
  },
  {
    path: '/student/roadmap/:roadmapId/topic/:topicId/game/:gameId',
    name: 'Game Player',
    category: 'Student',
    description: 'Play gamified exercises',
    functionIds: ['jhakkas-points-system', 'xp-coin-reward-system']
  },
  {
    path: '/student/guided-paths',
    name: 'Guided YouTube Paths',
    category: 'Student',
    description: 'YouTube learning paths',
    functionIds: ['guided-paths-api', 'learning-paths-api']
  },
  {
    path: '/student/racing',
    name: 'Live Racing Leaderboard',
    category: 'Student',
    description: 'Real-time racing leaderboard',
    functionIds: ['live-racing', 'student-leaderboard']
  },
  {
    path: '/tests',
    name: 'Tests List',
    category: 'Student',
    description: 'Available tests',
    functionIds: ['tests-api']
  },
  {
    path: '/test/:testId',
    name: 'Take Test',
    category: 'Student',
    description: 'Test interface',
    functionIds: ['test-attempt-api', 'tests-api']
  },
  {
    path: '/test/:testId/results',
    name: 'Test Results',
    category: 'Student',
    description: 'View test results with analytics',
    functionIds: ['post-test-analytics', 'test-analytics']
  },
  {
    path: '/test/review/:attemptId',
    name: 'Question Review',
    category: 'Student',
    description: 'Review test questions',
    functionIds: ['test-attempt-api', 'ai-question-explainer']
  },
  {
    path: '/analytics/test/:attemptId',
    name: 'Historical Test Analytics',
    category: 'Student',
    description: 'Historical test analytics',
    functionIds: ['test-analytics']
  },
  {
    path: '/analytics',
    name: 'Student Analytics',
    category: 'Student',
    description: 'Comprehensive student analytics',
    functionIds: ['student-analytics', 'student-chapter-analytics']
  },
  {
    path: '/leaderboard',
    name: 'Global Leaderboard',
    category: 'Student',
    description: 'Global leaderboard rankings',
    functionIds: ['student-leaderboard', 'weekly-league']
  },
  {
    path: '/profile',
    name: 'User Profile',
    category: 'Student',
    description: 'User profile management',
    functionIds: ['profile-management']
  },
  {
    path: '/courses',
    name: 'Courses',
    category: 'Student',
    description: 'Available courses',
    functionIds: ['courses-api', 'videos-api', 'enrollment-api']
  },

  // Parent Pages
  {
    path: '/parent',
    name: 'Parent Dashboard',
    category: 'Parent',
    description: 'Parent monitoring dashboard',
    functionIds: ['parent-portal', 'live-racing', 'student-analytics', 'student-chapter-analytics']
  },

  // Admin Pages
  {
    path: '/admin',
    name: 'Admin Dashboard',
    category: 'Admin',
    description: 'Main admin control panel',
    functionIds: [
      'admin-analytics',
      'student-management',
      'batch-management',
      'tests-api',
      'fee-management',
      'admin-approve-withdrawal',
      'users-api',
      'content-approval-api',
      'predictive-analytics'
    ]
  },
  {
    path: '/admin/courses',
    name: 'Course Management',
    category: 'Admin',
    description: 'Manage courses and videos',
    functionIds: ['courses-api', 'videos-api', 'youtube-integration']
  },
  {
    path: '/admin/test-builder/:testId',
    name: 'Test Builder',
    category: 'Admin',
    description: 'Create and edit tests',
    functionIds: ['tests-api', 'ai-question-generator', 'ai-question-generator-v2', 'test-settings', 'generate-printable-test']
  },
  {
    path: '/fees',
    name: 'Fee Management',
    category: 'Admin',
    description: 'Manage student fees and subscriptions',
    functionIds: ['fee-management', 'battery-update', 'fee-reminders']
  },
  {
    path: '/database-explorer',
    name: 'Database Explorer',
    category: 'Admin',
    description: 'Direct database access (Supabase queries)',
    functionIds: []
  },

  // Utility Pages
  {
    path: '/ui-guide',
    name: 'UI Component Guide',
    category: 'Utility',
    description: 'Component library showcase',
    functionIds: []
  },
];

export function getPagesByCategory(category: string): PageInfo[] {
  return allPages.filter(p => p.category === category);
}

export function getPageByPath(path: string): PageInfo | undefined {
  return allPages.find(p => {
    const pattern = p.path.replace(/:[^/]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(path);
  });
}

export const pageCategories = ['Public', 'Student', 'Parent', 'Admin', 'Utility'] as const;
