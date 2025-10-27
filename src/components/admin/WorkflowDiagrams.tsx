import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Search, Database, AlertCircle, X, Target, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface WorkflowData {
  table: string;
  description: string;
  mermaidDiagram: string;
  steps: { title: string; description: string }[];
  deleteBehavior: { warning: string; orphans: string[]; cleanup: string };
}

const workflows: WorkflowData[] = [
  {
    table: "question_bank",
    description: "AI-extracted questions waiting for admin review and answer assignment",
    mermaidDiagram: `graph TD
    A[📄 Admin Uploads PDF] --> B[🤖 AI Extracts Questions]
    B --> C[💾 Saves to question_bank]
    C --> D{Admin Reviews in SmartQuestionExtractor}
    D -->|Approve| E[✅ Adds Answer via AnswerManagementPanel]
    D -->|Reject| F[❌ Stays in Draft]
    E --> G[Ready for Conversion]
    
    style A fill:#90EE90
    style C fill:#87CEEB
    style E fill:#FFB6C1
    style F fill:#FFE4B5`,
    steps: [
      { title: "1. PDF Upload", description: "Admin uploads PDF in SmartQuestionExtractor" },
      { title: "2. AI Extraction", description: "Edge function ai-extract-all-questions-chunked processes PDF" },
      { title: "3. Database Save", description: "Questions saved to question_bank with is_approved=false" },
      { title: "4. Admin Review", description: "Admin views in SmartQuestionExtractor or AnswerManagement" },
      { title: "5. Answer Assignment", description: "Admin adds options and correct_answer" },
      { title: "6. Ready State", description: "Question ready to convert to topic_learning_content" },
    ],
    deleteBehavior: {
      warning: "Deleting from question_bank ONLY removes the draft question",
      orphans: ["No cascades - safe to delete"],
      cleanup: "No cleanup needed - this is the source table",
    },
  },
  {
    table: "topic_learning_content",
    description: "Lesson builder content - converted from question_bank, awaiting approval to publish as games",
    mermaidDiagram: `graph TD
    A[question_bank with answer] --> B[🎮 Admin Clicks Convert to Game]
    B --> C[💾 Creates in topic_learning_content]
    C --> D{human_reviewed = ?}
    D -->|false| E[📝 Draft State]
    D -->|true| F[✅ Approved State]
    F --> G[🚀 Sync Trigger Fires]
    G --> H[📋 Copies to gamified_exercises]
    H --> I[🎯 Students See in DuolingoLessonPath]
    
    E -->|Admin Clicks Approve| F
    
    style B fill:#90EE90
    style C fill:#87CEEB
    style H fill:#FFB6C1
    style I fill:#98FB98`,
    steps: [
      { title: "1. Conversion Click", description: 'Admin clicks "Convert to Game" in LessonContentBuilder' },
      { title: "2. Create Lesson", description: "Inserts into topic_learning_content with human_reviewed=false" },
      { title: "3. Draft State", description: "Content visible in lesson builder but NOT to students" },
      { title: "4. Admin Approval", description: "Admin reviews and sets human_reviewed=true" },
      { title: "5. Trigger Activation", description: "sync_gamified_exercises_from_content trigger fires" },
      { title: "6. Student Visibility", description: "Content appears in gamified_exercises for students" },
    ],
    deleteBehavior: {
      warning: "⚠️ CRITICAL BUG: Deleting does NOT cascade to gamified_exercises!",
      orphans: ["gamified_exercises (students still see the game!)", "topic_content_mapping (orphaned reference)"],
      cleanup: "Manually delete from gamified_exercises and topic_content_mapping using same topic_id",
    },
  },
  {
    table: "gamified_exercises",
    description: "Published games visible to students - synced from topic_learning_content",
    mermaidDiagram: `graph TD
    A[topic_learning_content approved] --> B[🔄 Trigger Sync]
    B --> C[💾 Upserts to gamified_exercises]
    C --> D[🎯 Student Opens Topic]
    D --> E[📱 DuolingoLessonPath Fetches]
    E --> F{Deduplication Check}
    F -->|Unique| G[✅ Shows Game]
    F -->|Duplicate| H[❌ Filters Out]
    G --> I[🎮 Student Plays]
    I --> J[📊 Records in student_question_attempts]
    J --> K[💰 Awards XP/Coins]
    K --> L[✓ Adds to student_topic_game_progress]
    
    style C fill:#87CEEB
    style G fill:#90EE90
    style I fill:#FFB6C1
    style K fill:#FFD700`,
    steps: [
      { title: "1. Sync Trigger", description: "sync_gamified_exercises_from_content fires on approval" },
      { title: "2. Insert/Update", description: "Creates or updates gamified_exercises row" },
      { title: "3. Student Discovery", description: "DuolingoLessonPath fetches via topic_content_mapping" },
      { title: "4. Deduplication", description: "Frontend filters duplicates by question text + type" },
      { title: "5. Game Display", description: "Shows game in lesson path UI" },
      { title: "6. Student Play", description: "GamePlayerPage renders MCQGame/etc" },
      { title: "7. Answer Recording", description: "Saves to student_question_attempts" },
      { title: "8. Progress Update", description: "Updates student_topic_game_progress.completed_game_ids" },
    ],
    deleteBehavior: {
      warning: "Deleting removes game from students immediately",
      orphans: [
        "student_question_attempts (historical data preserved)",
        "student_topic_game_progress (completed_game_ids may reference deleted ID)",
      ],
      cleanup: "Consider soft delete flag instead of hard delete",
    },
  },
  {
    table: "test_attempts",
    description: "Student test submissions with auto-analytics updates",
    mermaidDiagram: `graph TD
    A[🎓 Student Starts Test] --> B[💾 Creates test_attempts row]
    B --> C[⏱️ status: in_progress]
    C --> D[📝 Student Answers]
    D --> E[💾 Updates answers array]
    E --> F[✅ Submit / Auto-Submit]
    F --> G[🔢 Calculate Score]
    G --> H[📊 Multiple Triggers Fire]
    H --> I[update_student_analytics_after_test]
    H --> J[update_subject_analytics_after_test]
    H --> K[log_test_study_time]
    H --> L[update_topic_status_trigger]
    I --> M[🏆 Recalculates Rankings]
    M --> N[calculate_zone_rankings]
    
    style A fill:#90EE90
    style F fill:#FFB6C1
    style H fill:#FFD700
    style M fill:#87CEEB`,
    steps: [
      { title: "1. Test Start", description: 'Student clicks "Start Test" in TakeTest component' },
      { title: "2. Create Attempt", description: "Inserts test_attempts with status=in_progress" },
      { title: "3. Answer Collection", description: "Frontend updates answers array in real-time" },
      { title: "4. Submission", description: "Student submits or time expires (auto_submit)" },
      { title: "5. Score Calculation", description: "Backend calculates percentage, score, total_marks" },
      { title: "6. Analytics Update", description: "update_student_analytics_after_test trigger fires" },
      { title: "7. Subject Stats", description: "update_subject_analytics_after_test updates per-subject data" },
      { title: "8. Zone Ranking", description: "calculate_zone_rankings() recalcs school/zone/overall ranks" },
    ],
    deleteBehavior: {
      warning: "⚠️ Deleting invalidates all analytics and rankings!",
      orphans: [
        "student_analytics (average_score becomes incorrect)",
        "subject_analytics (tests_taken count wrong)",
        "Zone rankings become stale",
      ],
      cleanup: "Run calculate_zone_rankings() after deletion to fix rankings",
    },
  },
  {
    table: "student_topic_game_progress",
    description: "Tracks which games student completed per topic",
    mermaidDiagram: `graph TD
    A[🎮 Student Completes Game] --> B[✅ Correct Answer?]
    B -->|Yes| C[💾 Update Progress]
    B -->|No| D[❌ No Progress Update]
    C --> E[Add to completed_game_ids array]
    C --> F[Increment questions_completed]
    C --> G[Update last_played_at]
    E --> H{All Games Done?}
    H -->|Yes| I[🏆 Topic Complete]
    H -->|No| J[Continue Learning]
    I --> K[🎯 Updates student_topic_status]
    K --> L[calculate_topic_status fires]
    
    style A fill:#90EE90
    style C fill:#87CEEB
    style I fill:#FFD700
    style K fill:#FFB6C1`,
    steps: [
      { title: "1. Game Completion", description: "Student gets correct answer in GamePlayerPage" },
      { title: "2. Progress Update", description: "Adds game ID to completed_game_ids array" },
      { title: "3. Count Increment", description: "Increments questions_completed counter" },
      { title: "4. Timestamp Update", description: "Updates last_played_at for activity tracking" },
      { title: "5. Completion Check", description: "is_topic_fully_completed() function checks if done" },
      { title: "6. Status Calculation", description: "calculate_topic_status() determines red/yellow/green" },
    ],
    deleteBehavior: {
      warning: "Deleting removes all progress tracking for that student+topic",
      orphans: ["student_topic_status may become stale", "DuolingoLessonPath will recreate on next play"],
      cleanup: "Progress auto-recreates when student plays games again",
    },
  },
  {
    table: "batch_roadmaps",
    description: "Master roadmap templates assigned to batches",
    mermaidDiagram: `graph TD
    A[📝 Admin Creates Roadmap] --> B[💾 Inserts batch_roadmaps]
    B --> C{status?}
    C -->|draft| D[Not Visible]
    C -->|published| E[✅ Active]
    E --> F[Admin Links to Batch]
    F --> G[🔗 Updates batches.linked_roadmap_id]
    G --> H[🔔 Trigger: sync_students_on_batch_roadmap_change]
    H --> I[📋 Copies to student_roadmaps]
    I --> J[🎯 Each Student Gets Copy]
    J --> K[roadmap_topics define schedule]
    
    style A fill:#90EE90
    style H fill:#FFD700
    style I fill:#87CEEB
    style J fill:#FFB6C1`,
    steps: [
      { title: "1. Roadmap Creation", description: "Admin uses CreateRoadmapWizard or AI generator" },
      { title: "2. Draft Save", description: "Creates batch_roadmaps with status=draft" },
      { title: "3. Topic Addition", description: "Adds roadmap_chapters and roadmap_topics" },
      { title: "4. Publish", description: "Admin sets status=published" },
      { title: "5. Batch Link", description: "Updates batches.linked_roadmap_id" },
      {
        title: "6. Student Sync",
        description: "sync_students_on_batch_roadmap_change trigger copies to all batch students",
      },
    ],
    deleteBehavior: {
      warning: "Deleting breaks all student roadmaps linked to it!",
      orphans: [
        "student_roadmaps (foreign key may fail)",
        "roadmap_topics, roadmap_chapters (cascade delete)",
        "batches.linked_roadmap_id becomes NULL",
      ],
      cleanup: "Unlink from batches first, then delete roadmap",
    },
  },
  {
    table: "topic_content_mapping",
    description: "Links approved questions and content to specific topics for organized student access",
    mermaidDiagram: `graph TD
    A[topic_learning_content approved] --> B[🔄 Trigger Creates Mapping]
    B --> C[💾 Insert to topic_content_mapping]
    C --> D[🔗 Links content_id to topic_id]
    D --> E[📝 Sets content_type]
    E --> F{Content Type?}
    F -->|question| G[🎯 Question ID stored]
    F -->|video| H[🎥 Video ID stored]
    F -->|article| I[📄 Article ID stored]
    G --> J[🎮 Syncs to gamified_exercises]
    J --> K[📱 DuolingoLessonPath Fetches]
    K --> L[🎯 Filters by topic_id]
    L --> M[✅ Shows Content to Student]
    M --> N[🎮 Student Interacts]
    N --> O[📊 Tracks Progress]
    
    style B fill:#90EE90
    style C fill:#87CEEB
    style J fill:#FFB6C1
    style M fill:#FFD700`,
    steps: [
      { title: "1. Content Approval", description: "Admin approves content in topic_learning_content" },
      { title: "2. Auto Mapping", description: "sync_gamified_exercises_from_content trigger creates mapping entry" },
      { title: "3. Type Detection", description: "content_type set based on source (question/video/article)" },
      { title: "4. Reference Link", description: "content_id stores UUID reference to actual content" },
      { title: "5. Topic Association", description: "topic_id links content to specific roadmap topic" },
      { title: "6. Student Fetch", description: "DuolingoLessonPath queries by topic_id to get all content" },
      { title: "7. Content Display", description: "Shows games, videos, articles in organized learning path" },
      { title: "8. Progress Tracking", description: "Records completion in student_topic_game_progress" },
    ],
    deleteBehavior: {
      warning: "Deleting removes content from student learning path immediately",
      orphans: [
        "gamified_exercises (game still exists but unlinked)",
        "topic_learning_content (source content unchanged)",
        "student_topic_game_progress (may reference deleted mapping)",
      ],
      cleanup: "Safe to delete - only breaks the link, not the content itself",
    },
  },
  {
    table: "referral_credits",
    description: "Student referral earnings and withdrawal tracking",
    mermaidDiagram: `graph TD
    A[👥 New Student Signs Up] --> B{Has Referral Code?}
    B -->|Yes| C[✅ Validates Code]
    B -->|No| D[Normal Signup]
    C --> E[💰 Credits Referrer]
    E --> F[add_referrer_bonus function]
    F --> G[Updates referral_credits.total_credits]
    G --> H[Student Earns More]
    H --> I{Withdrawal Request?}
    I -->|Yes| J[🔒 lock_credits_for_withdrawal]
    J --> K[📋 Creates withdrawal_requests]
    K --> L{Admin Approval?}
    L -->|Approved| M[complete_withdrawal]
    L -->|Rejected| N[unlock_credits_for_withdrawal]
    M --> O[Updates used_credits]
    
    style E fill:#90EE90
    style J fill:#FFB6C1
    style M fill:#FFD700
    style N fill:#FF6B6B`,
    steps: [
      { title: "1. Referral Signup", description: "New student uses referral code during registration" },
      { title: "2. Bonus Award", description: "add_referrer_bonus() adds credits to referrer" },
      { title: "3. Credit Accumulation", description: "total_credits increases with each successful referral" },
      { title: "4. Withdrawal Request", description: "Student requests withdrawal via WithdrawCreditsDialog" },
      { title: "5. Credit Lock", description: "lock_credits_for_withdrawal() prevents double-spending" },
      { title: "6. Admin Review", description: "Admin approves/rejects in WithdrawalManagement" },
      { title: "7. Completion", description: "complete_withdrawal() moves locked to used_credits" },
    ],
    deleteBehavior: {
      warning: "⚠️ Never delete - breaks financial audit trail!",
      orphans: ["withdrawal_requests (references student_id)", "referral_signups (tracks who was referred)"],
      cleanup: "Use soft delete or archive to different table",
    },
  },
  {
    table: "student_topic_status",
    description: "Real-time game completion tracking for roadmap calendar (auto-calculated, auto-updated)",
    mermaidDiagram: `graph TD
    A[🎮 Student Completes Game] --> B[✅ markGameCompleted in GamePlayerPage]
    B --> C[💾 Upserts student_topic_game_progress]
    C --> D[total_questions = actual game count]
    C --> E[questions_completed++]
    C --> F[completed_game_ids array updated]
    D --> G[🔔 Trigger: update_topic_status_trigger]
    G --> H[📊 calculate_topic_status function]
    H --> I[game_completion_rate = completed/total * 100]
    I --> J{Rate >= 60%?}
    J -->|Yes| K[status = green ✅]
    J -->|No| L{Rate >= 40%?}
    L -->|Yes| M[status = yellow ⚠️]
    L -->|No| N{Rate > 0%?}
    N -->|Yes| O[status = red ❌]
    N -->|No| P[status = grey ⚪]
    K --> Q[💾 Upserts student_topic_status]
    M --> Q
    O --> Q
    P --> Q
    Q --> R[🔄 Realtime Subscription Fires]
    R --> S[📅 Student Calendar Updates]
    R --> T[👨‍👩‍👧 Parent Calendar Updates]
    S --> U{60%+ topics green?}
    U -->|Yes| V[Chapter cell turns GREEN]
    U -->|No| W[Chapter cell stays RED]
    T --> U
    
    style B fill:#90EE90
    style H fill:#FFD700
    style Q fill:#87CEEB
    style R fill:#FFB6C1
    style V fill:#98FB98`,
    steps: [
      { title: "1. Game Completion", description: "Student answers game correctly in GamePlayerPage" },
      {
        title: "2. Progress Update",
        description: "markGameCompleted fetches actual total_games from gamified_exercises",
      },
      { title: "3. Database Write", description: "Updates student_topic_game_progress with correct total_questions" },
      { title: "4. Trigger Activation", description: "update_topic_status_trigger fires automatically" },
      { title: "5. Status Calculation", description: "calculate_topic_status computes game_completion_rate" },
      { title: "6. Color Assignment", description: "Status set based PURELY on game completion (60% threshold)" },
      { title: "7. Upsert Status", description: "Updates student_topic_status with new status + metrics" },
      { title: "8. Realtime Broadcast", description: "Supabase broadcasts change via postgres_changes channel" },
      { title: "9. Frontend Sync", description: "Both Student & Parent calendars subscribe and auto-update" },
      { title: "10. Chapter Status", description: "Calendar calculates chapter green if 60%+ topics are green" },
    ],
    deleteBehavior: {
      warning: "Auto-recalculated on next game completion - safe to delete for reset",
      orphans: ["None - gets recreated by trigger when student plays games"],
      cleanup: "Will automatically rebuild from student_topic_game_progress data",
    },
  },
  {
    table: "student_gamification",
    description: "Jhakkas Points (XP) reward system - auto-distributes XP budgets and tracks all earning sources",
    mermaidDiagram: `graph TD
    A[👨‍💼 Admin Sets XP Budget] --> B[💾 roadmap_topics.xp_reward = 30/40/50]
    B --> C[🤖 auto-distribute-xp Edge Function]
    C --> D[📊 Fetches All Games for Topic]
    D --> E[🔢 Distribution Algorithm]
    E --> F[baseXP = floor budget / game_count]
    F --> G[remainder = budget % game_count]
    G --> H[First N games get baseXP + 1]
    H --> I[💾 Updates gamified_exercises.xp_reward]
    
    I --> J[🎮 Student Completes Game]
    J --> K[📱 TopicStudyView.handleGameComplete]
    K --> L[🔍 Fetches actual xp_reward from DB]
    L --> M[⚡ jhakkas-points-system Edge Function]
    M --> N{Activity Type?}
    
    N -->|game_completed| O[game_xp += reward]
    N -->|theory_read| P[theory_xp += 30/40/50]
    N -->|attendance| Q[attendance_xp += 5]
    N -->|social_share| R[social_share_xp += 10]
    N -->|referral| S[referral_xp += 50]
    N -->|exercise_completed| T[exercise_xp += reward]
    N -->|quest_completion| U[quest_xp += reward]
    
    O --> V[📊 Update Totals]
    P --> V
    Q --> V
    R --> V
    S --> V
    T --> V
    U --> V
    
    V --> W[total_xp = sum of all XP fields]
    W --> X[level = floor total_xp / 100]
    X --> Y{Check Last Activity}
    Y -->|Yesterday| Z[current_streak_days++]
    Y -->|Today| AA[Keep Streak]
    Y -->|Older| AB[current_streak_days = 1]
    
    Z --> AC[💾 Update student_gamification]
    AA --> AC
    AB --> AC
    
    AC --> AD[📊 Leaderboard Query]
    AD --> AE[Filter by exam_domain]
    AE --> AF[Filter by student_class]
    AF --> AG[Filter by exam_name]
    AG --> AH[📋 Top 100 Students]
    
    style A fill:#90EE90
    style C fill:#9370DB
    style I fill:#87CEEB
    style M fill:#9370DB
    style V fill:#FFD700
    style AC fill:#FFB6C1
    style AH fill:#98FB98`,
    steps: [
      { 
        title: "1. XP Budget Setup", 
        description: "Admin sets topic XP (30/40/50) in roadmap_topics.xp_reward during roadmap creation" 
      },
      { 
        title: "2. Auto-Distribution", 
        description: "Edge function auto-distribute-xp divides budget evenly: baseXP=floor(budget/games), remainder distributed to first N games" 
      },
      { 
        title: "3. Game XP Assignment", 
        description: "Updates gamified_exercises.xp_reward for each game (typically 2-5 XP per game)" 
      },
      { 
        title: "4. Game Completion", 
        description: "Student plays game in GamePlayerPage, TopicStudyView fetches actual xp_reward from database" 
      },
      { 
        title: "5. XP Award", 
        description: "jhakkas-points-system edge function receives activity_type and xp_amount" 
      },
      { 
        title: "6. Breakdown Tracking", 
        description: "Updates specific XP field: game_xp (2-5), theory_xp (30-50), attendance_xp (5), social_share_xp (10, 24h cooldown), referral_xp (50), exercise_xp, quest_xp" 
      },
      { 
        title: "7. Total Calculation", 
        description: "Sums all XP fields to update total_xp in student_gamification" 
      },
      { 
        title: "8. Level Progression", 
        description: "level = floor(total_xp / 100). Level 1: 0-99 XP, Level 2: 100-199 XP, etc." 
      },
      { 
        title: "9. Streak Update", 
        description: "Checks last_activity_date: if yesterday → streak++, if today → keep, if older → reset to 1" 
      },
      { 
        title: "10. Leaderboard Sync", 
        description: "Leaderboard queries filter by exam_domain, student_class, exam_name to show relevant top 100 students" 
      },
    ],
    deleteBehavior: {
      warning: "⚠️ NEVER delete student_gamification - breaks entire reward system, levels, streaks, and leaderboards!",
      orphans: [
        "daily_attendance (xp_awarded references become invalid)",
        "daily_quests (XP awards have no destination)",
        "referral_credits (referral XP tracking breaks)",
        "XPDisplay component shows errors",
        "Leaderboard becomes empty",
        "All XP history and progress lost permanently"
      ],
      cleanup: "Archive to student_gamification_archive table instead of deleting. Never hard delete this table.",
    },
  },
];

const BUILD_TIMESTAMP = new Date().toISOString();

export const WorkflowDiagrams: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debugBannerVisible, setDebugBannerVisible] = useState(true);
  const [highlightTarget, setHighlightTarget] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | undefined>("student_topic_status");
  const rootRef = useRef<HTMLDivElement>(null);
  const TARGET_TABLE = "student_topic_status";
  
  const q = searchQuery.trim().toLowerCase();

  // Pin student_topic_status to the top
  const filteredWorkflows = (() => {
    const baseFiltered = workflows.filter(
      (wf) => wf.table.toLowerCase().includes(q) || wf.description.toLowerCase().includes(q),
    );
    
    // Always put student_topic_status first
    const stsIndex = baseFiltered.findIndex(w => w.table === TARGET_TABLE);
    if (stsIndex > 0) {
      const sts = baseFiltered[stsIndex];
      return [sts, ...baseFiltered.filter((_, i) => i !== stsIndex)];
    }
    return baseFiltered;
  })();

  // Debug state
  const inSource = workflows.some(w => w.table === TARGET_TABLE);
  const inFiltered = filteredWorkflows.some(w => w.table === TARGET_TABLE);
  const [inDOM, setInDOM] = useState(false);
  const [containerMetrics, setContainerMetrics] = useState({ clientHeight: 0, scrollHeight: 0, canScroll: false });

  // Check DOM presence
  useEffect(() => {
    const timer = setTimeout(() => {
      const element = document.getElementById(`wf-${TARGET_TABLE}`);
      setInDOM(!!element);
    }, 100);
    return () => clearTimeout(timer);
  }, [filteredWorkflows]);

  // Update container metrics
  useEffect(() => {
    if (rootRef.current) {
      const { clientHeight, scrollHeight } = rootRef.current;
      setContainerMetrics({ clientHeight, scrollHeight, canScroll: scrollHeight > clientHeight });
    }
  }, [filteredWorkflows]);

  // Global debug handle
  useEffect(() => {
    (window as any).__WF_DEBUG__ = {
      tables: workflows.map(w => w.table),
      hasStudentTopicStatus: inSource,
      getFiltered: () => filteredWorkflows.map(w => w.table),
      scrollToSTS: () => {
        const element = document.getElementById(`wf-${TARGET_TABLE}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightTarget(true);
        setTimeout(() => setHighlightTarget(false), 2000);
      },
      setSearch: (s: string) => setSearchQuery(s),
      containerMetrics: () => containerMetrics,
      dumpDOM: () => {
        const items = document.querySelectorAll('[data-debug-table]');
        return Array.from(items).map(el => el.getAttribute('data-debug-table'));
      }
    };

    (window as any).__WF_DEBUG_PRINT = () => {
      console.group("🔍 WorkflowDiagrams Debug Report");
      console.log("All tables:", workflows.map(w => w.table));
      console.log(`"${TARGET_TABLE}" in source:`, inSource);
      console.log(`"${TARGET_TABLE}" in filtered:`, inFiltered);
      console.log(`"${TARGET_TABLE}" in DOM:`, inDOM);
      console.log("Container metrics:", containerMetrics);
      console.log("DOM items:", (window as any).__WF_DEBUG__.dumpDOM());
      console.groupEnd();
    };

    return () => {
      delete (window as any).__WF_DEBUG__;
      delete (window as any).__WF_DEBUG_PRINT;
    };
  }, [filteredWorkflows, inSource, inFiltered, inDOM, containerMetrics]);

  const forceInclude = () => {
    setSearchQuery("");
    setTimeout(() => {
      const element = document.getElementById(`wf-${TARGET_TABLE}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlightTarget(true);
      setTimeout(() => setHighlightTarget(false), 2000);
    }, 100);
  };

  const scrollToTarget = () => {
    const element = document.getElementById(`wf-${TARGET_TABLE}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightTarget(true);
      setTimeout(() => setHighlightTarget(false), 2000);
    }
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-4 pb-24">
      {/* Debug Banner - UNMISSABLE */}
      {debugBannerVisible && (
        <Alert className="bg-yellow-300/50 dark:bg-yellow-600/30 border-4 border-yellow-600 sticky top-0 z-50">
          <Sparkles className="h-5 w-5 text-yellow-900 dark:text-yellow-100" />
          <AlertDescription>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="font-bold text-yellow-900 dark:text-yellow-100 text-lg">
                  🚨 NEW BUILD LOADED - {BUILD_TIMESTAMP.slice(11, 19)} UTC
                </div>
                <div className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold">
                  ✅ If you see this, window.__WF_DEBUG__ exists!
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>Total workflows: <Badge variant="outline" className="ml-1">{workflows.length}</Badge></div>
                  <div>Filtered: <Badge variant="outline" className="ml-1">{filteredWorkflows.length}</Badge></div>
                  <div>In source: <Badge variant={inSource ? "default" : "destructive"} className="ml-1">{inSource ? "✓" : "✗"}</Badge></div>
                  <div>In filtered: <Badge variant={inFiltered ? "default" : "destructive"} className="ml-1">{inFiltered ? "✓" : "✗"}</Badge></div>
                  <div>In DOM: <Badge variant={inDOM ? "default" : "destructive"} className="ml-1">{inDOM ? "✓" : "✗"}</Badge></div>
                  <div>Can scroll: <Badge variant={containerMetrics.canScroll ? "default" : "secondary"} className="ml-1">{containerMetrics.canScroll ? "Yes" : "No"}</Badge></div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={forceInclude}>
                    <Target className="h-3 w-3 mr-1" />
                    Force Include
                  </Button>
                  <Button size="sm" variant="outline" onClick={scrollToTarget} disabled={!inDOM}>
                    <Search className="h-3 w-3 mr-1" />
                    Scroll to {TARGET_TABLE}
                  </Button>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0"
                onClick={() => setDebugBannerVisible(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Alert if student_topic_status missing from filtered */}
      {!inFiltered && q === "" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ <strong>student_topic_status</strong> is missing from filtered workflows even with empty search!
          </AlertDescription>
        </Alert>
      )}

      {/* Alert if in filtered but not in DOM */}
      {inFiltered && !inDOM && (
        <Alert className="bg-orange-500/10 border-orange-500/50">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription>
            ⚠️ <strong>student_topic_status</strong> is in filtered list but NOT in DOM. Container canScroll: {containerMetrics.canScroll ? "true" : "false"}
          </AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workflows by table name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredWorkflows.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No workflows found matching your search.</AlertDescription>
        </Alert>
      ) : (
        <Accordion type="single" collapsible value={openAccordion} onValueChange={setOpenAccordion} className="space-y-2">
          {filteredWorkflows.map((workflow) => (
            <AccordionItem 
              key={workflow.table} 
              id={workflow.table === TARGET_TABLE ? `wf-${TARGET_TABLE}` : undefined}
              value={workflow.table} 
              className={`border rounded-lg px-4 transition-all ${
                workflow.table === TARGET_TABLE && highlightTarget 
                  ? "ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/50" 
                  : ""
              }`}
              data-debug-table={workflow.table}
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    {workflow.table}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{workflow.description}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pt-2">
                  {/* Mermaid Diagram */}
                  <div className="border-2 border-primary/20 rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Visual Workflow</span>
                    </div>
                    <div
                      className="mermaid bg-background p-4 rounded"
                      dangerouslySetInnerHTML={{ __html: workflow.mermaidDiagram }}
                    />
                  </div>

                  {/* Step by Step Breakdown */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Step-by-Step Breakdown</h4>
                    <div className="space-y-2">
                      {workflow.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3 text-sm">
                          <span className="text-primary font-mono shrink-0">{step.title}</span>
                          <span className="text-muted-foreground">{step.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delete Behavior Warning */}
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">⚠️ Delete Behavior</p>
                        <p>{workflow.deleteBehavior.warning}</p>
                        <div>
                          <p className="font-semibold mt-2">Orphaned Records:</p>
                          <ul className="list-disc list-inside">
                            {workflow.deleteBehavior.orphans.map((orphan, idx) => (
                              <li key={idx}>{orphan}</li>
                            ))}
                          </ul>
                        </div>
                        <p className="font-semibold mt-2">Cleanup: {workflow.deleteBehavior.cleanup}</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};
