import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Database, Link2, Users, FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Column-level documentation with why/without/example
const columnDocumentation = {
  profiles: {
    batch_id: {
      criticality: 'critical',
      why: "Links student to their learning cohort/group",
      without: ["Students wouldn't know which roadmap to follow", "Can't auto-assign study plans on signup", "No batch-level analytics or comparisons possible", "Manual roadmap assignment for each student"],
      example: "Student A joins 'JEE 2025 Batch' → Automatically gets JEE roadmap with daily tasks"
    },
    exam_domain: {
      criticality: 'critical',
      why: "Categorizes student by exam type (School/Competitive/Skill-based)",
      without: ["Can't filter relevant content for student", "Wrong subjects/chapters shown to student", "Rankings would mix JEE students with NEET students", "No domain-specific analytics possible"],
      example: "NEET student gets Biology-heavy content, not CS topics meant for JEE students"
    },
    target_exam: {
      criticality: 'critical',
      why: "Specific exam name within domain (e.g., 'JEE Main' vs 'JEE Advanced')",
      without: ["Can't customize syllabus per exam variant", "Generic content shown to all students", "No exam-specific difficulty tuning", "Rankings mix different exam types"],
      example: "JEE Main syllabus is different from JEE Advanced - needs separate roadmaps"
    },
    student_class: {
      criticality: 'important',
      why: "Current academic class/grade of student (9th, 10th, 11th, 12th)",
      without: ["Can't filter age-appropriate content", "Rankings mix 9th graders with 12th graders", "Wrong difficulty level shown", "No class-based batch assignment"],
      example: "Class 11 student shouldn't compete with Class 12 students in rankings"
    }
  },
  
  question_bank: {
    is_published: {
      criticality: 'critical',
      why: "Flag to track if question is live for students or still in draft/review",
      without: ["Draft/incorrect questions visible to students immediately", "Can't test questions before going live", "No admin review workflow", "Quality control becomes impossible"],
      example: "Admin extracts 100 questions from PDF → Reviews 20 → Marks 10 as published → Only those 10 go live"
    },
    topic_id: {
      criticality: 'critical',
      why: "Links question to specific topic for targeted practice",
      without: ["Questions become orphaned (YOUR CURRENT ISSUE!)", "Can't show topic-wise games to students", "No way to track topic mastery", "Questions exist but students never see them"],
      example: "Question on 'Friction in Physics' must link to 'Friction' topic, not just 'Physics' subject"
    },
    correct_answer: {
      criticality: 'critical',
      why: "Stores the correct answer for automatic scoring",
      without: ["Can't auto-check student answers", "Manual grading needed for every response", "No instant feedback to students", "Gamification breaks (no XP/coins awarded)"],
      example: "Student selects option B → System checks against correct_answer → Awards 10 XP if correct"
    },
    options: {
      criticality: 'critical',
      why: "JSON array of multiple choice options",
      without: ["MCQ questions become impossible", "Only text-based questions allowed", "No randomization of options", "Students can't select answers"],
      example: "Question shows 4 options: [A, B, C, D] → Student clicks C → System validates"
    }
  },
  
  topic_content_mapping: {
    topic_id: {
      criticality: 'critical',
      why: "THE CRITICAL LINK between roadmap topic and its games/content",
      without: ["Questions in question_bank but NOT visible as games", "Students see 'No games available' despite data existing", "Admin confusion: questions exist but not playable", "Orphaned content in database (wasted effort)"],
      example: "Without this: 21 questions exist for 'Friction' but aren't linked → Students can't play → Orphaned!"
    },
    content_type: {
      criticality: 'important',
      why: "Specifies type: 'theory', 'game', 'video', 'pdf'",
      without: ["Can't distinguish between learning materials", "Everything looks the same in UI", "No structured learning path", "Students confused about what to do"],
      example: "Show theory first → Then practice games → Then assessment test"
    },
    order_num: {
      criticality: 'important',
      why: "Controls sequence of content/games (easy → medium → hard progression)",
      without: ["Random order confuses students", "Hard questions shown first = demotivation", "Can't implement learning curves", "Progress tracking becomes meaningless"],
      example: "Game 1: Basic concepts (easy) → Game 5: Mixed problems (medium) → Game 10: Complex scenarios (hard)"
    }
  },
  
  gamified_exercises: {
    topic_content_id: {
      criticality: 'critical',
      why: "Foreign key linking exercise to topic via mapping table",
      without: ["Exercise exists in isolation, not attached anywhere", "Students never see the game in their UI", "Wasted content in database", "No connection to learning roadmap"],
      example: "Exercise must point to mapping → Mapping points to topic → Topic shows in student dashboard"
    },
    game_order: {
      criticality: 'important',
      why: "Determines which game appears first/last within a topic",
      without: ["Games shuffle randomly on each page load", "Students lose track of which games they've done", "No curated difficulty progression", "Frustrating UX"],
      example: "Yesterday's Game 5 becomes today's Game 1 → Student confused: 'Did I complete this?'"
    },
    xp_reward: {
      criticality: 'important',
      why: "XP points awarded for completing this game correctly",
      without: ["No gamification = boring experience", "Students lose interest quickly", "Can't track engagement via XP", "No leveling system possible"],
      example: "Student completes hard game → Earns 20 XP → Levels up from Bronze to Silver → Feels achievement"
    },
    coin_reward: {
      criticality: 'nice-to-have',
      why: "Coins for unlocking premium features/hints",
      without: ["Secondary currency missing", "Can't implement shop/unlock mechanics", "Reduced engagement loop"],
      example: "Earn 5 coins per game → Save 100 coins → Unlock 'Show hint' feature"
    }
  },
  
  student_topic_game_progress: {
    completed_game_ids: {
      criticality: 'critical',
      why: "Array storing UUIDs of games student has finished (prevents replay abuse)",
      without: ["Students can replay same game infinitely for XP farming", "Cheating becomes trivial", "Leaderboards become meaningless", "Progress % calculation breaks"],
      example: "Student completes game uuid-abc123 → Added to array → Button shows 'Completed' not 'Play'"
    },
    total_games: {
      criticality: 'important',
      why: "Cached count of games in topic (for fast progress calculation)",
      without: ["Every progress query needs expensive COUNT(*) join", "Dashboard loads slowly with many students", "Database performance degrades at scale", "Poor UX"],
      example: "Topic has 10 games (stored here) → Student completed 7 → Progress = 7/10 = 70% (instant calculation)"
    },
    completed_games: {
      criticality: 'important',
      why: "Denormalized count for quick access (alternative to array length)",
      without: ["Must calculate array_length() on every query", "Slower than reading integer directly", "Indexing becomes harder"],
      example: "Show '7 of 10 completed' without counting array elements"
    }
  },
  
  fee_records: {
    battery_level: {
      criticality: 'important',
      why: "Visual urgency indicator (100% → 0% over month) - psychological trigger",
      without: ["Just a boring due_date that parents ignore", "No visual urgency cue", "Lower payment conversion rates", "Static reminders don't work"],
      example: "Battery at 95% (green) → 50% (yellow) → 20% (red) → Parent panics and pays immediately"
    },
    is_paid: {
      criticality: 'critical',
      why: "Boolean flag for fast payment status check (denormalized)",
      without: ["Must join payments table on every query", "Fee dashboard loads slowly", "Can't quickly filter unpaid fees", "Performance degrades with scale"],
      example: "Show all unpaid fees: WHERE is_paid = false → Instant results without joins"
    },
    month: {
      criticality: 'critical',
      why: "Which month this fee is for (composite key with year, student_id)",
      without: ["Can't generate monthly fee records", "No way to track recurring payments", "Bulk operations impossible", "Unique constraint breaks"],
      example: "Generate fee for January 2025 → month = 1, year = 2025 → Unique per student"
    }
  },
  
  student_analytics: {
    zone_rank: {
      criticality: 'important',
      why: "Rank within geographical zone (city/state-level motivation)",
      without: ["Only overall rank → Student ranked 5000 feels bad", "No local competition motivation", "Retention drops in non-metro areas", "Students quit seeing global rankings"],
      example: "Rank 2500 overall BUT #5 in Delhi → Shows 'Top 10 in your city!' → Student feels great"
    },
    streak_days: {
      criticality: 'important',
      why: "Consecutive days of activity (Duolingo-style retention mechanic)",
      without: ["No daily habit formation", "Students don't login regularly", "Retention drops by 60%+", "Platform becomes 'exam-only' tool"],
      example: "45-day streak displayed → Student won't skip today → Keeps engagement high"
    },
    average_score: {
      criticality: 'critical',
      why: "Mean score across all tests (for ranking calculation)",
      without: ["Can't rank students fairly", "Leaderboards become random", "No performance tracking over time", "Analytics dashboard empty"],
      example: "Student A: 85% average → Student B: 75% average → A ranks higher in leaderboard"
    }
  },
  
  batches: {
    linked_roadmap_id: {
      criticality: 'critical',
      why: "References which roadmap this batch follows",
      without: ["Batch exists but students have no study plan", "Manual roadmap assignment per student needed", "Scaling becomes impossible", "Chaos in curriculum management"],
      example: "'JEE 2025 Batch' → Links to '365-day JEE roadmap' → All 500 students get same structured plan"
    },
    auto_assign_roadmap: {
      criticality: 'critical',
      why: "Auto-assigns linked roadmap to new students joining batch",
      without: ["Admin must manually assign roadmap to each new student", "New students see empty dashboard on first login", "Operations nightmare at scale", "Poor first-time UX"],
      example: "New student joins batch → Trigger fires → Roadmap auto-assigned → Student sees tasks immediately"
    },
    max_capacity: {
      criticality: 'important',
      why: "Limits batch size for quality control",
      without: ["Batches grow infinitely", "Teacher can't manage large groups", "No scarcity/urgency in enrollment", "Quality of education suffers"],
      example: "Batch capacity = 50 → 49 students enrolled → Dashboard shows 'Only 1 seat left!' → Creates urgency"
    }
  },
  
  batch_roadmaps: {
    ai_generated_plan: {
      criticality: 'important',
      why: "Stores AI-generated daily study schedule as JSON",
      without: ["Roadmap exists but no day-wise breakdown", "Students don't know what to study when", "AI generation wasted if not stored", "Manual planning needed"],
      example: "AI generates: Day 1 → Physics Ch1, Day 2 → Chemistry Ch1... stored in this JSON field"
    },
    start_date: {
      criticality: 'critical',
      why: "When roadmap begins (for calculating current day)",
      without: ["Can't determine which day student is on", "No 'Day 45 of 365' tracking", "Progress becomes meaningless", "Can't sync calendar dates"],
      example: "Start date = Jan 1, 2025 → Today = Feb 14, 2025 → Student is on Day 45"
    }
  },
  
  student_roadmaps: {
    is_active: {
      criticality: 'critical',
      why: "Marks if this is the student's current active roadmap",
      without: ["Student sees multiple roadmaps (old + new) causing confusion", "Can't switch roadmaps cleanly", "Completed roadmaps clutter dashboard", "No clear 'current plan'"],
      example: "Student switches batch → Old roadmap: is_active = false → New roadmap: is_active = true"
    },
    progress: {
      criticality: 'important',
      why: "Percentage completion of roadmap (0-100)",
      without: ["No progress bar on dashboard", "Student doesn't know how much is left", "Demotivating UX", "Can't celebrate milestones"],
      example: "Completed 180 of 365 days → Progress = 49% → Shows 'Almost halfway there!'"
    }
  },
  
  test_attempts: {
    status: {
      criticality: 'critical',
      why: "Tracks attempt state: 'in_progress', 'submitted', 'auto_submitted'",
      without: ["Can't distinguish active vs completed tests", "Students can submit multiple times", "No auto-submit on timer expiry", "Analytics count wrong attempts"],
      example: "Status = 'in_progress' → Timer expires → Auto-changes to 'auto_submitted' → Score calculated"
    },
    started_at: {
      criticality: 'critical',
      why: "Timestamp when student began test (for time-limit enforcement)",
      without: ["Can't enforce time limits", "Students can take unlimited time", "Cheating becomes easy", "No fair competition"],
      example: "Started at 10:00 AM, Duration = 60 min → Must submit by 11:00 AM or auto-submit"
    }
  },
  
  referrals: {
    referral_code: {
      criticality: 'critical',
      why: "Unique shareable code (e.g., 'ROHAN-A3F2B1') for tracking referrals",
      without: ["Can't attribute signups to referrers", "No viral growth mechanism", "Referrer doesn't get credit", "Word-of-mouth tracking impossible"],
      example: "Rohan shares code 'ROHAN-A3F2B1' → Friend signs up with it → Rohan earns ₹100 credit"
    },
    successful_referrals: {
      criticality: 'important',
      why: "Count of referrals that paid (not just signed up)",
      without: ["Can't distinguish active vs inactive referrals", "Reward system becomes exploitable", "Fake signups count as success", "Revenue attribution unclear"],
      example: "10 signups via code but only 6 paid → successful_referrals = 6 → Rohan gets 6 × ₹100 = ₹600"
    }
  }
};

// Database schema with descriptions and relationships
const databaseSchema = {
  // User Management
  profiles: {
    description: "Core user profile data - stores student/parent/admin information",
    purpose: "Central user table with personal info, batch assignment, exam preferences",
    columns: ['id', 'email', 'full_name', 'phone_number', 'batch_id', 'exam_domain', 'target_exam', 'student_class'],
    relationships: ['batches (via batch_id)', 'user_roles (via id)'],
    userFlow: "Entry point → Profile created on signup → Linked to batch → Assigned roles"
  },
  user_roles: {
    description: "Manages user permissions (admin/student/parent)",
    purpose: "Security - controls who can access what features",
    columns: ['user_id', 'role'],
    relationships: ['profiles (via user_id)'],
    userFlow: "Created on signup → Determines dashboard access → Controls RLS policies"
  },
  parent_student_links: {
    description: "Connects parents to their children's accounts",
    purpose: "Parent portal - allows parents to monitor student progress",
    columns: ['parent_id', 'student_id', 'relationship', 'is_primary_contact'],
    relationships: ['profiles (parent_id, student_id)'],
    userFlow: "Admin creates link → Parent can view student data → Receives fee reminders"
  },

  // Batch & Course Management
  batches: {
    description: "Student groups/cohorts with common exam goals",
    purpose: "Organize students by exam type, class, intake period",
    columns: ['id', 'name', 'exam_type', 'exam_name', 'target_class', 'start_date', 'end_date', 'max_capacity', 'linked_roadmap_id'],
    relationships: ['batch_roadmaps (via linked_roadmap_id)', 'profiles (students in batch)'],
    userFlow: "Created by admin → Students auto-assigned on signup → Linked to roadmap → Roadmap synced to students"
  },
  batch_roadmaps: {
    description: "AI-generated study plans for batches",
    purpose: "Daily study schedule with chapters/topics to cover",
    columns: ['id', 'batch_id', 'title', 'start_date', 'end_date', 'total_days', 'ai_generated_plan', 'selected_subjects'],
    relationships: ['batches (via batch_id)', 'roadmap_chapters', 'student_roadmaps'],
    userFlow: "Admin creates → AI generates plan → Linked to batch → Students see daily tasks"
  },
  roadmap_chapters: {
    description: "Chapters within a roadmap",
    purpose: "Break down roadmap into subject-wise chapters",
    columns: ['roadmap_id', 'chapter_name', 'subject', 'day_number', 'order_num'],
    relationships: ['batch_roadmaps (via roadmap_id)', 'roadmap_topics'],
    userFlow: "Part of roadmap → Contains topics → Students complete in sequence"
  },
  roadmap_topics: {
    description: "Individual topics within chapters",
    purpose: "Smallest unit of study - contains theory, games, tests",
    columns: ['id', 'chapter_id', 'topic_name', 'estimated_minutes', 'day_number'],
    relationships: ['roadmap_chapters (via chapter_id)', 'topic_content_mapping', 'study_content'],
    userFlow: "Part of chapter → Has study content → Games created → Students play & learn"
  },

  // Content Management
  study_content: {
    description: "Theory/lesson content for topics",
    purpose: "Educational material - text, images, videos",
    columns: ['id', 'topic_id', 'content_type', 'content_text', 'video_url', 'lesson_type'],
    relationships: ['roadmap_topics (via topic_id)'],
    userFlow: "Admin uploads → Students read/watch → Marks as completed"
  },
  topic_content_mapping: {
    description: "Links topics to their games/exercises",
    purpose: "Maps which games belong to which topic",
    columns: ['id', 'topic_id', 'content_type', 'order_num'],
    relationships: ['roadmap_topics (via topic_id)', 'gamified_exercises'],
    userFlow: "Created when games published → Students see games in topic"
  },
  gamified_exercises: {
    description: "MCQ games for each topic",
    purpose: "Interactive learning - students answer questions for XP/coins",
    columns: ['id', 'topic_content_id', 'exercise_type', 'exercise_data', 'correct_answer', 'xp_reward', 'coin_reward'],
    relationships: ['topic_content_mapping (via topic_content_id)', 'student_topic_game_progress'],
    userFlow: "Published by admin → Visible in games → Students play → Earn rewards"
  },
  question_bank: {
    description: "Master repository of all questions",
    purpose: "Store questions before publishing as games",
    columns: ['id', 'topic_id', 'question_text', 'options', 'correct_answer', 'is_published'],
    relationships: ['roadmap_topics (via topic_id)', 'gamified_exercises (published)'],
    userFlow: "AI extracts from PDF → Admin reviews → Published as game → Visible to students"
  },

  // Student Progress Tracking
  student_roadmaps: {
    description: "Individual student's roadmap assignment",
    purpose: "Track which roadmap each student is following",
    columns: ['student_id', 'batch_roadmap_id', 'status', 'progress', 'is_active'],
    relationships: ['profiles (via student_id)', 'batch_roadmaps (via batch_roadmap_id)'],
    userFlow: "Auto-created when student joins batch → Updates as they progress"
  },
  student_topic_progress: {
    description: "Tracks completion of each topic by student",
    purpose: "Monitor which topics student has finished",
    columns: ['student_id', 'topic_id', 'status', 'completed_at'],
    relationships: ['profiles (via student_id)', 'roadmap_topics (via topic_id)'],
    userFlow: "Created when topic started → Updated on completion → Used for progress %"
  },
  student_topic_game_progress: {
    description: "Tracks which games student has completed",
    purpose: "Prevent duplicate game plays, track game completion",
    columns: ['student_id', 'topic_id', 'completed_game_ids', 'total_games', 'completed_games'],
    relationships: ['profiles (via student_id)', 'roadmap_topics (via topic_id)'],
    userFlow: "Updated on each game completion → All games done → Topic marked complete"
  },

  // Testing System
  tests: {
    description: "Assessments/exams created by instructors",
    purpose: "Evaluate student knowledge",
    columns: ['id', 'title', 'subject', 'total_marks', 'duration_minutes', 'created_by', 'is_published'],
    relationships: ['questions', 'test_attempts'],
    userFlow: "Created by admin → Questions added → Published → Students take test"
  },
  questions: {
    description: "Individual questions in tests",
    purpose: "Test questions with options and correct answers",
    columns: ['id', 'test_id', 'question_text', 'question_type', 'marks'],
    relationships: ['tests (via test_id)', 'options'],
    userFlow: "Added to test → Options created → Students see in test attempt"
  },
  test_attempts: {
    description: "Student test submissions",
    purpose: "Record student answers and scores",
    columns: ['id', 'test_id', 'student_id', 'score', 'percentage', 'status', 'submitted_at'],
    relationships: ['tests (via test_id)', 'profiles (via student_id)'],
    userFlow: "Student starts test → Answers saved → Submits → Score calculated → Analytics updated"
  },

  // Analytics & Gamification
  student_analytics: {
    description: "Aggregate student performance metrics",
    purpose: "Rankings, streaks, overall scores across all subjects",
    columns: ['student_id', 'tests_attempted', 'average_score', 'streak_days', 'zone_rank', 'overall_rank'],
    relationships: ['profiles (via student_id)'],
    userFlow: "Updated after each test → Calculates rankings → Shows in leaderboards"
  },
  subject_analytics: {
    description: "Per-subject performance tracking",
    purpose: "Track student mastery in each subject separately",
    columns: ['student_id', 'subject', 'tests_taken', 'average_score', 'mastery_level', 'subject_rank'],
    relationships: ['profiles (via student_id)'],
    userFlow: "Updated after subject test → Shows strength/weakness → Used in zone analysis"
  },
  student_xp_coins: {
    description: "Student rewards (XP and coins)",
    purpose: "Gamification - track XP levels and coin balance",
    columns: ['student_id', 'total_xp', 'current_level', 'coins', 'lifetime_coins_earned'],
    relationships: ['profiles (via student_id)', 'xp_transactions'],
    userFlow: "Earned from games/tests → Levels up → Coins used for unlocks"
  },
  daily_attendance: {
    description: "Daily login tracking",
    purpose: "Attendance streaks, daily XP bonus",
    columns: ['student_id', 'date', 'streak_days', 'xp_earned'],
    relationships: ['profiles (via student_id)'],
    userFlow: "Marked daily → Streak increases → XP awarded → Share achievement"
  },

  // Fee Management
  fee_records: {
    description: "Monthly fee tracking",
    purpose: "Student billing, payment status, battery system",
    columns: ['student_id', 'month', 'year', 'amount', 'is_paid', 'battery_level', 'due_date'],
    relationships: ['profiles (via student_id)', 'batches (via batch_id)'],
    userFlow: "Generated monthly → Battery drains → Reminder sent → Payment made → Battery restored"
  },
  fee_reminders: {
    description: "Automated fee reminder emails",
    purpose: "Notify parents about pending fees",
    columns: ['fee_record_id', 'parent_id', 'sent_at', 'reminder_type', 'email_status'],
    relationships: ['fee_records', 'parent_student_links'],
    userFlow: "Triggered by low battery → Email sent to parent → Logged"
  },

  // Referral System
  referrals: {
    description: "Student referral codes",
    purpose: "Track who referred whom, reward credits",
    columns: ['referrer_id', 'referral_code', 'total_referrals', 'successful_referrals'],
    relationships: ['profiles (via referrer_id)', 'referral_signups'],
    userFlow: "Auto-generated on signup → Student shares code → New signup uses code → Credit awarded"
  },
  referral_credits: {
    description: "Referral earnings and usage",
    purpose: "Track credits earned, used, available for withdrawal",
    columns: ['student_id', 'total_credits', 'used_credits', 'locked_for_withdrawal'],
    relationships: ['profiles (via student_id)', 'credit_withdrawals'],
    userFlow: "Earned from referrals → Can withdraw or use for fees → Admin approves withdrawal"
  }
};

const categoryGroups = {
  'User Management': ['profiles', 'user_roles', 'parent_student_links'],
  'Batch & Roadmap': ['batches', 'batch_roadmaps', 'roadmap_chapters', 'roadmap_topics'],
  'Content & Learning': ['study_content', 'topic_content_mapping', 'gamified_exercises', 'question_bank'],
  'Student Progress': ['student_roadmaps', 'student_topic_progress', 'student_topic_game_progress'],
  'Testing': ['tests', 'questions', 'test_attempts', 'options'],
  'Analytics & Gamification': ['student_analytics', 'subject_analytics', 'student_xp_coins', 'daily_attendance'],
  'Finance': ['fee_records', 'fee_reminders', 'payments'],
  'Referral System': ['referrals', 'referral_credits', 'credit_withdrawals']
};

export default function DatabaseExplorer() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTables = Object.keys(databaseSchema).filter(tableName =>
    tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    databaseSchema[tableName].description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Database className="h-8 w-8" />
          Database Explorer
        </h1>
        <p className="text-muted-foreground">
          Complete database schema with table purposes, relationships, and user flows
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tables, descriptions, or flows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="category" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="all">All Tables</TabsTrigger>
          <TabsTrigger value="columns">Column Details</TabsTrigger>
          <TabsTrigger value="flow">User Flows</TabsTrigger>
        </TabsList>

        <TabsContent value="category" className="space-y-4">
          {Object.entries(categoryGroups).map(([category, tables]) => {
            const visibleTables = tables.filter(t => filteredTables.includes(t));
            if (visibleTables.length === 0) return null;

            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category === 'User Management' && <Users className="h-5 w-5" />}
                    {category === 'Content & Learning' && <FileText className="h-5 w-5" />}
                    {category === 'Analytics & Gamification' && <TrendingUp className="h-5 w-5" />}
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {visibleTables.map(tableName => (
                      <AccordionItem key={tableName} value={tableName}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <Badge variant="outline" className="font-mono">
                              {tableName}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {databaseSchema[tableName].description}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div>
                              <h4 className="font-semibold mb-1 text-sm">Purpose</h4>
                              <p className="text-sm text-muted-foreground">
                                {databaseSchema[tableName].purpose}
                              </p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                Key Columns
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {databaseSchema[tableName].columns.map(col => (
                                  <Badge key={col} variant="secondary" className="font-mono text-xs">
                                    {col}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                                <Link2 className="h-4 w-4" />
                                Relationships
                              </h4>
                              <div className="space-y-1">
                                {databaseSchema[tableName].relationships.map(rel => (
                                  <div key={rel} className="text-sm text-muted-foreground">
                                    → {rel}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-1 text-sm">User Flow</h4>
                              <p className="text-sm text-muted-foreground">
                                {databaseSchema[tableName].userFlow}
                              </p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="all">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {filteredTables.map(tableName => (
                <Card key={tableName}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {tableName}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{databaseSchema[tableName].description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Purpose:</p>
                      <p className="text-sm text-muted-foreground">{databaseSchema[tableName].purpose}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Columns:</p>
                      <div className="flex flex-wrap gap-2">
                        {databaseSchema[tableName].columns.map(col => (
                          <Badge key={col} variant="secondary" className="font-mono text-xs">
                            {col}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="columns">
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Column Documentation:</strong> Understanding why each column exists and what breaks without it
              </AlertDescription>
            </Alert>

            {Object.entries(columnDocumentation).map(([tableName, columns]) => (
              <Card key={tableName}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    <code className="bg-muted px-2 py-1 rounded">{tableName}</code>
                  </CardTitle>
                  <CardDescription>Critical columns and their importance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(columns).map(([columnName, doc]: [string, any]) => (
                      <div key={columnName} className="border-l-4 pl-4 py-2" style={{
                        borderColor: doc.criticality === 'critical' ? 'hsl(var(--destructive))' : 
                                   doc.criticality === 'important' ? 'hsl(var(--warning))' : 
                                   'hsl(var(--muted))'
                      }}>
                        <div className="flex items-center gap-2 mb-2">
                          <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono">
                            {columnName}
                          </code>
                          <Badge variant={
                            doc.criticality === 'critical' ? 'destructive' : 
                            doc.criticality === 'important' ? 'default' : 
                            'secondary'
                          }>
                            {doc.criticality}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-semibold text-primary">📌 Why it exists:</span>
                            <p className="text-muted-foreground mt-1">{doc.why}</p>
                          </div>
                          
                          <div>
                            <span className="font-semibold text-destructive">❌ What breaks without it:</span>
                            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                              {doc.without.map((issue: string, idx: number) => (
                                <li key={idx}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <span className="font-semibold text-green-600">💡 Real Example:</span>
                            <p className="text-muted-foreground mt-1 italic">{doc.example}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flow">
          <Card>
            <CardHeader>
              <CardTitle>Critical User Flows</CardTitle>
              <CardDescription>How data moves through the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">📝 Question Publishing Flow (Your Issue)</h3>
                <div className="text-sm space-y-1 text-muted-foreground pl-4 border-l-2">
                  <p>1. AI extracts questions → <code className="bg-muted px-1">question_bank</code></p>
                  <p>2. Admin reviews → <code className="bg-muted px-1">question_bank.is_published = true</code></p>
                  <p>3. Publish action creates → <code className="bg-muted px-1">topic_content_mapping</code></p>
                  <p>4. Mapping links to → <code className="bg-muted px-1">gamified_exercises</code></p>
                  <p>5. Students see games → Play and earn XP</p>
                  <p className="text-destructive font-medium pt-2">⚠️ If step 3-4 fail, questions become orphaned!</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">👨‍🎓 Student Registration Flow</h3>
                <div className="text-sm space-y-1 text-muted-foreground pl-4 border-l-2">
                  <p>1. Signup → <code className="bg-muted px-1">profiles</code> created</p>
                  <p>2. Role assigned → <code className="bg-muted px-1">user_roles</code></p>
                  <p>3. Auto-assign batch → <code className="bg-muted px-1">profiles.batch_id</code></p>
                  <p>4. Batch has roadmap → <code className="bg-muted px-1">student_roadmaps</code> created</p>
                  <p>5. Initialize rewards → <code className="bg-muted px-1">student_xp_coins</code>, <code className="bg-muted px-1">student_analytics</code></p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">🎮 Game Completion Flow</h3>
                <div className="text-sm space-y-1 text-muted-foreground pl-4 border-l-2">
                  <p>1. Student plays game → Answer submitted</p>
                  <p>2. Correct answer → XP/coins added to <code className="bg-muted px-1">student_xp_coins</code></p>
                  <p>3. Game ID added → <code className="bg-muted px-1">student_topic_game_progress.completed_game_ids</code></p>
                  <p>4. All games done → <code className="bg-muted px-1">student_topic_progress.status = completed</code></p>
                  <p>5. Topic complete → Roadmap progress updated</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">📊 Test Attempt Flow</h3>
                <div className="text-sm space-y-1 text-muted-foreground pl-4 border-l-2">
                  <p>1. Student starts test → <code className="bg-muted px-1">test_attempts</code> created (status: in_progress)</p>
                  <p>2. Answers saved → <code className="bg-muted px-1">test_attempts.answers[]</code></p>
                  <p>3. Submit → Score calculated, status = submitted</p>
                  <p>4. Trigger updates → <code className="bg-muted px-1">student_analytics</code>, <code className="bg-muted px-1">subject_analytics</code></p>
                  <p>5. Rankings recalculated → Zone/school/overall ranks updated</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
