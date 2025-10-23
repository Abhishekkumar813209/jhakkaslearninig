export interface EdgeFunctionMetadata {
  id: string;
  name: string;
  category: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requiresAuth: boolean;
  requestSchema: Record<string, any>;
  responseSchema?: any;
  databaseOperations: {
    tables: string[];
    operations: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[];
    relationships?: string[];
  };
  usedInPages: string[];
  exampleRequest?: any;
}

export const edgeFunctionRegistry: EdgeFunctionMetadata[] = [
  // Authentication (4)
  {
    id: 'auth-login',
    name: 'User Login',
    category: 'Authentication',
    description: 'Authenticate user with email/password',
    method: 'POST',
    requiresAuth: false,
    requestSchema: { email: 'string', password: 'string' },
    databaseOperations: {
      tables: ['profiles'],
      operations: ['SELECT'],
    },
    usedInPages: ['/login'],
    exampleRequest: { email: 'user@example.com', password: 'password123' }
  },
  {
    id: 'auth-register',
    name: 'User Registration',
    category: 'Authentication',
    description: 'Register new user account',
    method: 'POST',
    requiresAuth: false,
    requestSchema: { email: 'string', password: 'string', name: 'string' },
    databaseOperations: {
      tables: ['profiles'],
      operations: ['INSERT'],
    },
    usedInPages: ['/register', '/register/parent'],
  },
  {
    id: 'auth-google',
    name: 'Google OAuth',
    category: 'Authentication',
    description: 'Authenticate with Google',
    method: 'POST',
    requiresAuth: false,
    requestSchema: { token: 'string' },
    databaseOperations: {
      tables: ['profiles'],
      operations: ['SELECT', 'INSERT'],
    },
    usedInPages: ['/login'],
  },
  {
    id: 'auth-logout',
    name: 'User Logout',
    category: 'Authentication',
    description: 'Sign out user',
    method: 'POST',
    requiresAuth: true,
    requestSchema: {},
    databaseOperations: {
      tables: [],
      operations: [],
    },
    usedInPages: ['/student/dashboard', '/admin', '/parent'],
  },

  // Dashboard & Overview (3)
  {
    id: 'dashboard-overview',
    name: 'Dashboard Overview',
    category: 'Dashboard',
    description: 'Get student dashboard overview stats',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { userId: 'string' },
    databaseOperations: {
      tables: ['profiles', 'student_analytics', 'test_attempts'],
      operations: ['SELECT'],
      relationships: ['profiles.id → student_analytics.student_id', 'profiles.id → test_attempts.student_id']
    },
    usedInPages: ['/student/dashboard'],
    exampleRequest: { userId: 'user-id-here' }
  },
  {
    id: 'dashboard-achievements',
    name: 'Dashboard Achievements',
    category: 'Dashboard',
    description: 'Get student achievements and badges',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { userId: 'string' },
    databaseOperations: {
      tables: ['profiles', 'achievements'],
      operations: ['SELECT'],
    },
    usedInPages: ['/student/dashboard'],
  },
  {
    id: 'dashboard-schedule',
    name: 'Dashboard Schedule',
    category: 'Dashboard',
    description: 'Get upcoming classes schedule',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { userId: 'string' },
    databaseOperations: {
      tables: ['batch_roadmaps', 'roadmap_chapters'],
      operations: ['SELECT'],
    },
    usedInPages: ['/student/dashboard'],
  },

  // Student Management (8)
  {
    id: 'student-analytics',
    name: 'Student Analytics',
    category: 'Student Management',
    description: 'Get detailed student performance analytics',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { studentId: 'string' },
    databaseOperations: {
      tables: ['profiles', 'student_analytics', 'test_attempts', 'gamified_exercises'],
      operations: ['SELECT'],
      relationships: ['profiles.id → student_analytics.student_id']
    },
    usedInPages: ['/analytics', '/parent', '/admin'],
    exampleRequest: { studentId: 'student-id' }
  },
  {
    id: 'student-batch-assignment',
    name: 'Assign Student to Batch',
    category: 'Student Management',
    description: 'Assign or update student batch',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { studentId: 'string', batchId: 'string', roadmapId: 'string' },
    databaseOperations: {
      tables: ['profiles', 'student_roadmaps'],
      operations: ['UPDATE', 'INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'student-roadmap-api',
    name: 'Student Roadmap API',
    category: 'Student Management',
    description: 'Get student roadmap data',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { studentId: 'string', roadmapId: 'string' },
    databaseOperations: {
      tables: ['batch_roadmaps', 'roadmap_chapters', 'student_roadmaps'],
      operations: ['SELECT'],
    },
    usedInPages: ['/student', '/student/roadmap/:roadmapId'],
  },
  {
    id: 'student-comparison',
    name: 'Compare Students',
    category: 'Student Management',
    description: 'Compare performance of multiple students',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { studentIds: 'array' },
    databaseOperations: {
      tables: ['profiles', 'student_analytics'],
      operations: ['SELECT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'student-leaderboard',
    name: 'Student Leaderboard',
    category: 'Student Management',
    description: 'Get leaderboard rankings',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { batchId: 'string', limit: 'number' },
    databaseOperations: {
      tables: ['profiles', 'student_analytics'],
      operations: ['SELECT'],
    },
    usedInPages: ['/leaderboard', '/student/racing'],
  },
  {
    id: 'student-chapter-analytics',
    name: 'Chapter Analytics',
    category: 'Student Management',
    description: 'Get chapter-wise analytics',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { studentId: 'string', chapterId: 'string' },
    databaseOperations: {
      tables: ['test_attempts', 'question_attempts'],
      operations: ['SELECT'],
    },
    usedInPages: ['/analytics', '/parent'],
  },
  {
    id: 'student-management',
    name: 'Student Management',
    category: 'Student Management',
    description: 'CRUD operations for students',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', data: 'object' },
    databaseOperations: {
      tables: ['profiles'],
      operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'assign-student-to-batch',
    name: 'Assign to Batch (Alt)',
    category: 'Student Management',
    description: 'Alternative batch assignment endpoint',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { studentId: 'string', batchId: 'string' },
    databaseOperations: {
      tables: ['profiles'],
      operations: ['UPDATE'],
    },
    usedInPages: ['/admin'],
  },

  // Tests & Assessments (7)
  {
    id: 'tests-api',
    name: 'Tests API',
    category: 'Tests & Assessments',
    description: 'CRUD operations for tests',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', testId: 'string' },
    databaseOperations: {
      tables: ['tests', 'test_questions'],
      operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    },
    usedInPages: ['/tests', '/test/:testId', '/admin/test-builder/:testId'],
    exampleRequest: { action: 'get', testId: 'test-123' }
  },
  {
    id: 'test-attempt-api',
    name: 'Test Attempt API',
    category: 'Tests & Assessments',
    description: 'Manage test attempts',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', attemptId: 'string' },
    databaseOperations: {
      tables: ['test_attempts', 'question_attempts'],
      operations: ['SELECT', 'INSERT', 'UPDATE'],
    },
    usedInPages: ['/test/:testId', '/test/review/:attemptId'],
  },
  {
    id: 'test-analytics',
    name: 'Test Analytics',
    category: 'Tests & Assessments',
    description: 'Get test performance analytics',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { testId: 'string', studentId: 'string' },
    databaseOperations: {
      tables: ['test_attempts', 'question_attempts'],
      operations: ['SELECT'],
    },
    usedInPages: ['/test/:testId/results', '/analytics/test/:attemptId'],
  },
  {
    id: 'post-test-analytics',
    name: 'Post-Test Analytics',
    category: 'Tests & Assessments',
    description: 'Detailed post-test analytics',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { attemptId: 'string' },
    databaseOperations: {
      tables: ['test_attempts', 'question_attempts', 'test_questions'],
      operations: ['SELECT'],
      relationships: ['test_attempts.id → question_attempts.attempt_id']
    },
    usedInPages: ['/test/:testId/results'],
  },
  {
    id: 'test-settings',
    name: 'Test Settings',
    category: 'Tests & Assessments',
    description: 'Update test configuration',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { testId: 'string', settings: 'object' },
    databaseOperations: {
      tables: ['tests'],
      operations: ['UPDATE'],
    },
    usedInPages: ['/admin/test-builder/:testId'],
  },
  {
    id: 'generate-printable-test',
    name: 'Generate Printable Test',
    category: 'Tests & Assessments',
    description: 'Export test as printable format',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { testId: 'string' },
    databaseOperations: {
      tables: ['tests', 'test_questions'],
      operations: ['SELECT'],
    },
    usedInPages: ['/admin/test-builder/:testId'],
  },
  {
    id: 'export-test-pdf',
    name: 'Export Test PDF',
    category: 'Tests & Assessments',
    description: 'Export test as PDF',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { testId: 'string' },
    databaseOperations: {
      tables: ['tests', 'test_questions'],
      operations: ['SELECT'],
    },
    usedInPages: ['/admin'],
  },

  // Content Management (5)
  {
    id: 'courses-api',
    name: 'Courses API',
    category: 'Content Management',
    description: 'CRUD operations for courses',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', courseId: 'string' },
    databaseOperations: {
      tables: ['courses'],
      operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    },
    usedInPages: ['/courses', '/admin/courses'],
  },
  {
    id: 'videos-api',
    name: 'Videos API',
    category: 'Content Management',
    description: 'CRUD operations for videos',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', videoId: 'string' },
    databaseOperations: {
      tables: ['videos'],
      operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    },
    usedInPages: ['/courses', '/admin/courses'],
  },
  {
    id: 'youtube-integration',
    name: 'YouTube Integration',
    category: 'Content Management',
    description: 'Integrate YouTube content',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { url: 'string' },
    databaseOperations: {
      tables: ['youtube_videos'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'guided-paths-api',
    name: 'Guided Paths API',
    category: 'Content Management',
    description: 'Manage guided learning paths',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', pathId: 'string' },
    databaseOperations: {
      tables: ['guided_paths', 'path_content'],
      operations: ['SELECT', 'INSERT', 'UPDATE'],
    },
    usedInPages: ['/student/guided-paths', '/admin'],
  },
  {
    id: 'topic-questions-api',
    name: 'Topic Questions API',
    category: 'Content Management',
    description: 'Get questions for a topic',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { topicId: 'string' },
    databaseOperations: {
      tables: ['gamified_exercises', 'questions'],
      operations: ['SELECT'],
    },
    usedInPages: ['/student/roadmap/:roadmapId/topic/:topicId'],
  },

  // Batch & Roadmap (8)
  {
    id: 'batch-api',
    name: 'Batch API',
    category: 'Batch & Roadmap',
    description: 'CRUD operations for batches',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', batchId: 'string' },
    databaseOperations: {
      tables: ['batches'],
      operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    },
    usedInPages: ['/admin', '/student/roadmap/:roadmapId'],
  },
  {
    id: 'batch-management',
    name: 'Batch Management',
    category: 'Batch & Roadmap',
    description: 'Advanced batch management',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', data: 'object' },
    databaseOperations: {
      tables: ['batches', 'profiles'],
      operations: ['SELECT', 'UPDATE'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'auto-adjust-roadmap',
    name: 'Auto-Adjust Roadmap',
    category: 'Batch & Roadmap',
    description: 'Automatically adjust roadmap dates',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { roadmapId: 'string' },
    databaseOperations: {
      tables: ['batch_roadmaps', 'roadmap_chapters'],
      operations: ['UPDATE'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'shift-roadmap-dates',
    name: 'Shift Roadmap Dates',
    category: 'Batch & Roadmap',
    description: 'Shift all roadmap dates',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { roadmapId: 'string', days: 'number' },
    databaseOperations: {
      tables: ['roadmap_chapters'],
      operations: ['UPDATE'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'roadmap-reorder',
    name: 'Reorder Roadmap',
    category: 'Batch & Roadmap',
    description: 'Reorder roadmap items',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { roadmapId: 'string', order: 'array' },
    databaseOperations: {
      tables: ['roadmap_chapters'],
      operations: ['UPDATE'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'sync-batch-students',
    name: 'Sync Batch Students',
    category: 'Batch & Roadmap',
    description: 'Synchronize batch student data',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { batchId: 'string' },
    databaseOperations: {
      tables: ['profiles', 'batches'],
      operations: ['SELECT', 'UPDATE'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'fetch-exam-subjects',
    name: 'Fetch Exam Subjects',
    category: 'Batch & Roadmap',
    description: 'Get subjects for exam type',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { examType: 'string' },
    databaseOperations: {
      tables: ['exam_types', 'subjects'],
      operations: ['SELECT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'fetch-subject-chapters',
    name: 'Fetch Subject Chapters',
    category: 'Batch & Roadmap',
    description: 'Get chapters for subject',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { subjectId: 'string' },
    databaseOperations: {
      tables: ['subjects', 'chapters'],
      operations: ['SELECT'],
    },
    usedInPages: ['/admin'],
  },

  // AI Services (13)
  {
    id: 'ai-lesson-generator',
    name: 'AI Lesson Generator',
    category: 'AI Services',
    description: 'Generate lesson content with AI',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { topic: 'string', difficulty: 'string' },
    databaseOperations: {
      tables: ['lessons'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'ai-question-generator',
    name: 'AI Question Generator',
    category: 'AI Services',
    description: 'Generate MCQ questions with AI',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { topic: 'string', count: 'number' },
    databaseOperations: {
      tables: ['questions'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin', '/admin/test-builder/:testId'],
  },
  {
    id: 'ai-question-generator-v2',
    name: 'AI Question Generator V2',
    category: 'AI Services',
    description: 'Enhanced question generation',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { topic: 'string', parameters: 'object' },
    databaseOperations: {
      tables: ['questions'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin/test-builder/:testId'],
  },
  {
    id: 'ai-question-to-game',
    name: 'AI Question to Game',
    category: 'AI Services',
    description: 'Convert question to game format',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { questionId: 'string' },
    databaseOperations: {
      tables: ['gamified_exercises'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'ai-multilingual-summarizer',
    name: 'AI Multilingual Summarizer',
    category: 'AI Services',
    description: 'Summarize content in multiple languages',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { text: 'string', languages: 'array' },
    databaseOperations: {
      tables: [],
      operations: [],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'ai-pdf-topic-extractor',
    name: 'AI PDF Topic Extractor',
    category: 'AI Services',
    description: 'Extract topics from PDF',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { pdfUrl: 'string' },
    databaseOperations: {
      tables: ['topics'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'ai-generate-chapter-topics',
    name: 'AI Generate Chapter Topics',
    category: 'AI Services',
    description: 'Generate topics for chapter',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { chapterId: 'string' },
    databaseOperations: {
      tables: ['topics'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'ai-roadmap-generator',
    name: 'AI Roadmap Generator',
    category: 'AI Services',
    description: 'Generate batch roadmap with AI',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { batchId: 'string', parameters: 'object' },
    databaseOperations: {
      tables: ['batch_roadmaps', 'roadmap_chapters'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'ai-topic-breakdown',
    name: 'AI Topic Breakdown',
    category: 'AI Services',
    description: 'Break down topic into subtopics',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { topicId: 'string' },
    databaseOperations: {
      tables: ['topics'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'ai-lesson-from-youtube',
    name: 'AI Lesson from YouTube',
    category: 'AI Services',
    description: 'Generate lesson from YouTube video',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { videoUrl: 'string' },
    databaseOperations: {
      tables: ['lessons'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'ai-extract-all-questions',
    name: 'AI Extract All Questions',
    category: 'AI Services',
    description: 'Bulk extract questions from document',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { documentUrl: 'string' },
    databaseOperations: {
      tables: ['questions'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'ai-extract-all-questions-chunked',
    name: 'AI Extract Questions Chunked',
    category: 'AI Services',
    description: 'Chunked question extraction',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { documentUrl: 'string' },
    databaseOperations: {
      tables: ['questions'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'ai-question-explainer',
    name: 'AI Question Explainer',
    category: 'AI Services',
    description: 'Generate explanation for question',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { questionId: 'string' },
    databaseOperations: {
      tables: ['questions'],
      operations: ['UPDATE'],
    },
    usedInPages: ['/test/review/:attemptId'],
  },

  // Fees & Payments (4)
  {
    id: 'fee-management',
    name: 'Fee Management',
    category: 'Fees & Payments',
    description: 'Manage student fees',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', studentId: 'string' },
    databaseOperations: {
      tables: ['fees', 'payments'],
      operations: ['SELECT', 'INSERT', 'UPDATE'],
    },
    usedInPages: ['/fees', '/admin'],
  },
  {
    id: 'fee-reminders',
    name: 'Fee Reminders',
    category: 'Fees & Payments',
    description: 'Send fee payment reminders',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { studentIds: 'array' },
    databaseOperations: {
      tables: ['fees', 'profiles'],
      operations: ['SELECT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'battery-update',
    name: 'Battery Update',
    category: 'Fees & Payments',
    description: 'Update subscription battery',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { studentId: 'string', amount: 'number' },
    databaseOperations: {
      tables: ['subscriptions'],
      operations: ['UPDATE'],
    },
    usedInPages: ['/fees', '/admin'],
  },
  {
    id: 'razorpay-subscription',
    name: 'Razorpay Subscription',
    category: 'Fees & Payments',
    description: 'Handle Razorpay subscriptions',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', data: 'object' },
    databaseOperations: {
      tables: ['subscriptions', 'payments'],
      operations: ['INSERT', 'UPDATE'],
    },
    usedInPages: ['/student/dashboard'],
  },

  // Referrals & Rewards (6)
  {
    id: 'generate-referral-code',
    name: 'Generate Referral Code',
    category: 'Referrals & Rewards',
    description: 'Generate unique referral code',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { userId: 'string' },
    databaseOperations: {
      tables: ['referral_codes'],
      operations: ['INSERT'],
    },
    usedInPages: ['/student/dashboard'],
  },
  {
    id: 'validate-referral-code',
    name: 'Validate Referral Code',
    category: 'Referrals & Rewards',
    description: 'Validate referral code',
    method: 'POST',
    requiresAuth: false,
    requestSchema: { code: 'string' },
    databaseOperations: {
      tables: ['referral_codes'],
      operations: ['SELECT'],
    },
    usedInPages: ['/register'],
  },
  {
    id: 'request-withdrawal',
    name: 'Request Withdrawal',
    category: 'Referrals & Rewards',
    description: 'Request credit withdrawal',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { userId: 'string', amount: 'number' },
    databaseOperations: {
      tables: ['withdrawal_requests'],
      operations: ['INSERT'],
    },
    usedInPages: ['/student/dashboard'],
  },
  {
    id: 'admin-approve-withdrawal',
    name: 'Approve Withdrawal',
    category: 'Referrals & Rewards',
    description: 'Admin approve withdrawal request',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { requestId: 'string', status: 'string' },
    databaseOperations: {
      tables: ['withdrawal_requests'],
      operations: ['UPDATE'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'xp-coin-reward-system',
    name: 'XP Coin Reward System',
    category: 'Referrals & Rewards',
    description: 'Award XP and coins',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { userId: 'string', action: 'string' },
    databaseOperations: {
      tables: ['profiles', 'xp_transactions'],
      operations: ['UPDATE', 'INSERT'],
    },
    usedInPages: ['/student/roadmap/:roadmapId/topic/:topicId/game/:gameId'],
  },
  {
    id: 'jhakkas-points-system',
    name: 'Jhakkas Points System',
    category: 'Referrals & Rewards',
    description: 'Award Jhakkas points',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { userId: 'string', points: 'number' },
    databaseOperations: {
      tables: ['profiles'],
      operations: ['UPDATE'],
    },
    usedInPages: ['/student/roadmap/:roadmapId/topic/:topicId/game/:gameId'],
  },

  // YouTube & External (6)
  {
    id: 'youtube-search-playlists',
    name: 'YouTube Search Playlists',
    category: 'YouTube & External',
    description: 'Search YouTube playlists',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { query: 'string' },
    databaseOperations: {
      tables: [],
      operations: [],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'youtube-playlist-videos',
    name: 'YouTube Playlist Videos',
    category: 'YouTube & External',
    description: 'Get videos from playlist',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { playlistId: 'string' },
    databaseOperations: {
      tables: [],
      operations: [],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'youtube-transcript-fetcher',
    name: 'YouTube Transcript Fetcher',
    category: 'YouTube & External',
    description: 'Fetch video transcript',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { videoId: 'string' },
    databaseOperations: {
      tables: [],
      operations: [],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'youtube-video-details',
    name: 'YouTube Video Details',
    category: 'YouTube & External',
    description: 'Get video metadata',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { videoId: 'string' },
    databaseOperations: {
      tables: [],
      operations: [],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'pix2text-ocr',
    name: 'Pix2Text OCR',
    category: 'YouTube & External',
    description: 'Extract text from image',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { imageUrl: 'string' },
    databaseOperations: {
      tables: [],
      operations: [],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'pdf-content-extractor',
    name: 'PDF Content Extractor',
    category: 'YouTube & External',
    description: 'Extract content from PDF',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { pdfUrl: 'string' },
    databaseOperations: {
      tables: [],
      operations: [],
    },
    usedInPages: ['/admin'],
  },

  // Analytics & Reporting (3)
  {
    id: 'admin-analytics',
    name: 'Admin Analytics',
    category: 'Analytics & Reporting',
    description: 'Get admin dashboard analytics',
    method: 'POST',
    requiresAuth: true,
    requestSchema: {},
    databaseOperations: {
      tables: ['profiles', 'test_attempts', 'batches'],
      operations: ['SELECT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'predictive-analytics',
    name: 'Predictive Analytics',
    category: 'Analytics & Reporting',
    description: 'AI-powered predictive analytics',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { studentId: 'string' },
    databaseOperations: {
      tables: ['student_analytics', 'test_attempts'],
      operations: ['SELECT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'weekly-league',
    name: 'Weekly League',
    category: 'Analytics & Reporting',
    description: 'Get weekly league standings',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { batchId: 'string' },
    databaseOperations: {
      tables: ['profiles', 'student_analytics'],
      operations: ['SELECT'],
    },
    usedInPages: ['/leaderboard', '/student/dashboard'],
  },

  // Utilities (4)
  {
    id: 'extract-chapters-bulk',
    name: 'Extract Chapters Bulk',
    category: 'Utilities',
    description: 'Bulk extract chapters from syllabus',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { syllabusId: 'string' },
    databaseOperations: {
      tables: ['chapters'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'extract-syllabus-structure',
    name: 'Extract Syllabus Structure',
    category: 'Utilities',
    description: 'Extract syllabus structure',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { documentUrl: 'string' },
    databaseOperations: {
      tables: ['subjects', 'chapters'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'save-extracted-questions',
    name: 'Save Extracted Questions',
    category: 'Utilities',
    description: 'Save extracted questions to database',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { questions: 'array' },
    databaseOperations: {
      tables: ['questions'],
      operations: ['INSERT'],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'enrollment-api',
    name: 'Enrollment API',
    category: 'Utilities',
    description: 'Manage course enrollments',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', data: 'object' },
    databaseOperations: {
      tables: ['enrollments'],
      operations: ['SELECT', 'INSERT', 'UPDATE'],
    },
    usedInPages: ['/courses'],
  },

  // Parent Portal (2)
  {
    id: 'parent-portal',
    name: 'Parent Portal',
    category: 'Parent Portal',
    description: 'Get parent dashboard data',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { parentId: 'string' },
    databaseOperations: {
      tables: ['profiles', 'student_analytics'],
      operations: ['SELECT'],
      relationships: ['profiles.parent_id → profiles.id']
    },
    usedInPages: ['/parent'],
  },
  {
    id: 'live-racing',
    name: 'Live Racing',
    category: 'Parent Portal',
    description: 'Get live racing leaderboard data',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { raceType: 'string' },
    databaseOperations: {
      tables: ['profiles', 'student_analytics'],
      operations: ['SELECT'],
    },
    usedInPages: ['/student/racing', '/parent'],
  },

  // Profile & Users (2)
  {
    id: 'profile-management',
    name: 'Profile Management',
    category: 'Profile & Users',
    description: 'Manage user profile',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', data: 'object' },
    databaseOperations: {
      tables: ['profiles'],
      operations: ['SELECT', 'UPDATE'],
    },
    usedInPages: ['/profile'],
  },
  {
    id: 'users-api',
    name: 'Users API',
    category: 'Profile & Users',
    description: 'User management API',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { action: 'string', userId: 'string' },
    databaseOperations: {
      tables: ['profiles'],
      operations: ['SELECT', 'UPDATE', 'DELETE'],
    },
    usedInPages: ['/admin'],
  },

  // Admin Tools (2)
  {
    id: 'admin-ai-assistant',
    name: 'Admin AI Assistant',
    category: 'Admin Tools',
    description: 'AI assistant for admin tasks',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { query: 'string' },
    databaseOperations: {
      tables: [],
      operations: [],
    },
    usedInPages: ['/admin'],
  },
  {
    id: 'content-approval-api',
    name: 'Content Approval API',
    category: 'Admin Tools',
    description: 'Approve/reject content',
    method: 'POST',
    requiresAuth: true,
    requestSchema: { contentId: 'string', status: 'string' },
    databaseOperations: {
      tables: ['content_approvals'],
      operations: ['UPDATE'],
    },
    usedInPages: ['/admin'],
  },
];

export const categories = Array.from(new Set(edgeFunctionRegistry.map(f => f.category)));

export function getFunctionsByCategory(category: string): EdgeFunctionMetadata[] {
  return edgeFunctionRegistry.filter(f => f.category === category);
}

export function getFunctionById(id: string): EdgeFunctionMetadata | undefined {
  return edgeFunctionRegistry.find(f => f.id === id);
}

export function getFunctionsByPage(page: string): EdgeFunctionMetadata[] {
  return edgeFunctionRegistry.filter(f => 
    f.usedInPages.some(p => {
      // Handle dynamic routes
      const pattern = p.replace(/:[^/]+/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(page);
    })
  );
}
