import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Database, Link2, Users, FileText, TrendingUp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="all">All Tables</TabsTrigger>
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
