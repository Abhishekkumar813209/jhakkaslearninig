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
  {
    table: "roadmap_xp_topic_complete_flow",
    description: "🎯 COMPLETE SYSTEM: Roadmap Structure → XP Distribution → Topic Status Calculation → Parent-Student Portal Sync",
    mermaidDiagram: `graph TD
    A[📚 Admin Creates Roadmap] --> B[batch_roadmaps]
    B --> C[roadmap_chapters]
    C --> D[roadmap_topics]
    D --> E[topic_content_mapping]
    E --> F[gamified_exercises]
    
    F --> G[💰 XP Distribution]
    G --> H{XP Budget Source?}
    H -->|Topic Level| I[roadmap_topics.xp_reward]
    H -->|Auto-Distribute| J[auto-distribute-xp Edge Function]
    J --> K[Divides XP evenly: floor budget/games]
    K --> L[Remainder to first N games]
    L --> F
    
    F --> M[🎮 Student Plays Game]
    M --> N[TopicStudyView.handleGameComplete]
    N --> O[Fetch xp_reward from gamified_exercises]
    O --> P[⚡ jhakkas-points-system Edge Function]
    P --> Q[student_gamification.current_xp += reward]
    Q --> R[total_xp, level, streaks updated]
    
    N --> S[💾 student_topic_game_progress]
    S --> T[completed_game_ids.push game_id]
    T --> U[questions_completed++]
    U --> V[🔔 Trigger: update_topic_status_trigger]
    V --> W[📊 calculate_topic_status DB Function]
    
    W --> X[game_completion_rate = completed/total * 100]
    X --> Y{⚠️ OLD DB Logic}
    Y -->|Rate >= 60%| Z[status = 'green']
    Y -->|Rate >= 40%| AA[status = 'yellow']
    Y -->|Rate < 40%| AB[status = 'red']
    Y -->|Rate = 0%| AC[status = 'grey']
    
    Z --> AD[💾 student_topic_status upsert]
    AA --> AD
    AB --> AD
    AC --> AD
    
    AD --> AE[📅 Parent Portal: parent-portal Edge Function]
    AD --> AF[📅 Student Portal: student-roadmap-api Edge Function]
    
    AE --> AG[ParentRoadmapCalendar.tsx]
    AF --> AH[StudentRoadmapCalendar.tsx]
    
    AG --> AI{⚠️ NEW Frontend Logic - progressColors.ts}
    AH --> AI
    AI -->|Rate > 70%| AJ[Display GREEN ✅]
    AI -->|Rate 50-70%| AK[Display GREY ⏳]
    AI -->|Rate < 50%| AL[Display RED 🔴]
    AI -->|Rate = 0%| AM[Display GREY NOT STARTED ⚪]
    
    AN[📊 MISMATCH ZONE] -.->|60% completion| AO[DB says GREEN]
    AN -.->|60% completion| AP[Frontend shows GREY]
    
    style A fill:#90EE90
    style G fill:#FFD700
    style J fill:#9370DB
    style P fill:#87CEEB
    style W fill:#FFB6C1
    style Y fill:#FF6B6B
    style AI fill:#FF4500
    style AN fill:#FF0000
    style AO fill:#00FF00
    style AP fill:#808080`,
    steps: [
      { title: "1. Roadmap Structure", description: "batch_roadmaps → roadmap_chapters → roadmap_topics → topic_content_mapping → gamified_exercises" },
      { title: "2. Topic XP Budget", description: "Admin sets roadmap_topics.xp_reward (30 easy / 40 medium / 50 hard) OR uses auto-distribute" },
      { title: "3. Auto-Distribution", description: "Edge function: auto-distribute-xp/index.ts divides topic budget evenly among games" },
      { title: "4. XP Formula", description: "baseXP = floor(topic_xp_reward / total_games), remainder distributed to first N games" },
      { title: "5. Game XP Storage", description: "Each gamified_exercises.xp_reward updated (typically 2-5 XP per game)" },
      { title: "6. Student Completion", description: "GamePlayerPage → TopicStudyView.handleGameComplete fetches xp_reward from DB" },
      { title: "7. XP Award", description: "Edge function: jhakkas-points-system/index.ts receives activity='game_completed' + xp_amount" },
      { title: "8. Gamification Update", description: "Updates student_gamification: game_xp, total_xp, level (floor(total_xp/100)), streaks" },
      { title: "9. Progress Tracking", description: "Adds game_id to student_topic_game_progress.completed_game_ids[] array" },
      { title: "10. Status Trigger", description: "DB Trigger: update_topic_status_trigger fires → calculate_topic_status() function" },
      { title: "11. ⚠️ DB Color Logic", description: "OLD THRESHOLDS: Green >= 60%, Yellow >= 40%, Red < 40%, Grey = 0% (in migrations/*.sql)" },
      { title: "12. Status Upsert", description: "Updates student_topic_status with game_completion_rate, test_average, status" },
      { title: "13. Portal Fetch - Parent", description: "Edge function: parent-portal/index.ts fetches roadmap + student_topic_status" },
      { title: "14. Portal Fetch - Student", description: "Edge function: student-roadmap-api/index.ts fetches roadmap + student_topic_status" },
      { title: "15. ⚠️ Frontend Color Logic", description: "NEW THRESHOLDS: Green > 70%, Grey 50-70%, Red < 50%, Grey = 0% (src/lib/progressColors.ts)" },
      { title: "16. Calendar Display", description: "ParentRoadmapCalendar.tsx & StudentRoadmapCalendar.tsx use getTopicColor() from progressColors.ts" },
      { title: "17. 🚨 CRITICAL MISMATCH", description: "60% completion: DB marks 'green', Frontend displays GREY → User confusion!" },
    ],
    deleteBehavior: {
      warning: "🚨 CRITICAL COLOR THRESHOLD MISMATCH: Database uses >= 60% green, Frontend uses > 70% green!",
      orphans: [
        "⚠️ student_topic_status recalculates on next game completion",
        "⚠️ student_gamification XP preserved even if games deleted",
        "⚠️ roadmap_topics orphaned if batch_roadmap deleted",
        "⚠️ 60-70% completion range shows as GREY instead of GREEN",
      ],
      cleanup: "UPDATE calculate_topic_status() function in migrations to use >70% threshold to match progressColors.ts",
    },
  },
  {
    table: "game_selection_unlocking_system",
    description: "Complete documentation of game selection flow, unlocking mechanics, and roadmap display systems",
    mermaidDiagram: `graph TD
    A[👨‍🎓 Student Opens Topic] --> B[TopicDetailPage loads]
    B --> C[DuolingoLessonPath fetches games]
    C --> D[Query: gamified_exercises WHERE topic_content_id IN...]
    D --> E[Query: student_topic_game_progress]
    E --> F{Deduplication Logic}
    F -->|Same question_text| G[❌ Filters Out Duplicates]
    F -->|Unique| H[✅ Keeps Game]
    
    H --> I{Unlocking Logic Check}
    I -->|Bug: checks ANY previous| J[🚨 All Games Unlock After 1 Completion]
    I -->|Should: check ONLY prev| K[✅ Sequential Unlock]
    
    H --> L[🎮 Student Clicks Game]
    L --> M[GamePlayerPage loads]
    M --> N[Plays Game & Submits]
    N --> O[handleGameComplete fires]
    O --> P{Has nextGameId?}
    P -->|Yes| Q[Navigate to next game]
    P -->|No| R[🚨 Bug: Navigate back to topic]
    
    R --> S[Why No Next Game?]
    S --> T[getAdjacentGames filters by approved_lessons]
    T --> U[Only returns games with content_status=approved]
    U --> V[Should return ALL games in order]
    
    style J fill:#FF6B6B
    style R fill:#FF6B6B
    style G fill:#FFE4B5
    style K fill:#90EE90
    style V fill:#90EE90`,
    steps: [
      { title: "1. Topic Page Load", description: "TopicDetailPage.tsx renders DuolingoLessonPath component with topicId" },
      { title: "2. Fetch Games", description: "Queries gamified_exercises JOIN topic_content_mapping WHERE topic_id = ?" },
      { title: "3. Fetch Progress", description: "Queries student_topic_game_progress for completed_game_ids array" },
      { title: "4. Deduplication Bug", description: "🚨 Lines 150-172 filter by unique question_text, causing only 1 game per topic" },
      { title: "5. Unlocking Bug", description: "🚨 Lines 197-220 check lessonsData.slice(0, index).some(...) unlocking ALL after 1 completion" },
      { title: "6. Game Click", description: "Student clicks game → navigates to /game/:gameId" },
      { title: "7. Game Play", description: "GamePlayerPage.tsx loads game data and renders appropriate game component" },
      { title: "8. Completion", description: "handleGameComplete calls jhakkas-points-system edge function" },
      { title: "9. Navigation Bug", description: "🚨 getAdjacentGames filters by approved_lessons, returns null next_game_id" },
      { title: "10. Redirect Issue", description: "🚨 No nextGameId → navigates back to /topic/:topicId instead of next game" },
    ],
    deleteBehavior: {
      warning: "⚠️ CRITICAL BUGS IDENTIFIED IN GAME FLOW",
      orphans: [
        "Bug 1: Deduplication removes valid games (lines 150-172 DuolingoLessonPath.tsx)",
        "Bug 2: Mass unlock after 1 completion (lines 197-220 DuolingoLessonPath.tsx)",
        "Bug 3: Navigation returns to topic instead of next game (GamePlayerPage.tsx line 89)",
        "Bug 4: getAdjacentGames filters by approved_lessons (gameNavigation.ts line 22)",
      ],
      cleanup: "Fix sequential unlocking logic + remove approved_lessons filter in getAdjacentGames + remove deduplication",
    },
  },
  {
    table: "roadmap_unlocking_mechanisms",
    description: "How Calendar, Card, and Path views determine which topics are locked/unlocked",
    mermaidDiagram: `graph TD
    A[📅 Roadmap Display] --> B{View Type?}
    B -->|Calendar| C[StudentRoadmapCalendar.tsx]
    B -->|Card| D[RoadmapCardView.tsx]
    B -->|Path| E[DuolingoLessonPath.tsx]
    
    C --> F[First topic always unlocked]
    C --> G[Today/past topics unlocked]
    C --> H[Future topics locked]
    C --> I[Shows game_completion_rate from student_topic_status]
    
    D --> J[No explicit locking]
    D --> K[All chapters/topics clickable]
    D --> L[Shows average progress_percentage]
    
    E --> M{Sequential Unlock Logic}
    M -->|Current Bug| N[All unlock after 1 completion]
    M -->|Intended| O[Unlock only after prev game completed]
    
    I --> P[Color Calculation]
    P --> Q{game_completion_rate}
    Q -->|> 0.70| R[🟢 Green]
    Q -->|0.50-0.70| S[⚪ Grey]
    Q -->|< 0.50| T[🔴 Red]
    Q -->|= 0| U[⚪ Grey Not Started]
    
    style N fill:#FF6B6B
    style O fill:#90EE90
    style R fill:#90EE90
    style T fill:#FF6B6B`,
    steps: [
      { title: "1. Calendar View", description: "First topic + today/past = unlocked, future = locked (StudentRoadmapCalendar.tsx)" },
      { title: "2. Card View", description: "No locking mechanism - all topics clickable (RoadmapCardView.tsx)" },
      { title: "3. Path View", description: "Sequential unlocking intended, but buggy (DuolingoLessonPath.tsx)" },
      { title: "4. Progress Fetch", description: "Queries student_topic_status for game_completion_rate" },
      { title: "5. Color Calculation", description: "progressColors.ts getTopicColor: >70% green, 50-70% grey, <50% red" },
      { title: "6. Status Update", description: "calculate_topic_status DB function recalculates on game completion" },
      { title: "7. Parent Sync", description: "parent-portal edge function fetches same student_topic_status data" },
    ],
    deleteBehavior: {
      warning: "⚠️ No cascading deletes for roadmap items - manual cleanup required",
      orphans: [
        "student_topic_status (recalculates on next completion)",
        "roadmap_topics (orphaned if batch_roadmap deleted)",
        "topic_content_mapping (orphaned if topic deleted)",
      ],
      cleanup: "Manually delete from student_topic_status when roadmap deleted to reset progress",
    },
  },
  {
    table: "game_formation_system",
    description: "How games are created from questions - AI generation, admin review, and game type conversion",
    mermaidDiagram: `graph TD
    A[🤖 AI Question Generation] --> B{Source Type?}
    B -->|PDF Upload| C[ai-extract-all-questions-chunked]
    B -->|Manual Input| D[Admin fills QuestionBankBuilder]
    B -->|Topic Generator| E[ai-question-generator-v2]
    
    C --> F[💾 question_bank table]
    D --> F
    E --> F
    
    F --> G[Admin Reviews in SmartQuestionExtractor]
    G --> H{Question Type?}
    H -->|MCQ| I[Sets 4 options + correct_answer_index]
    H -->|Match Pairs| J[Sets pairs array in options jsonb]
    H -->|Fill Blank| K[Sets blanks array in question_text]
    H -->|True/False| L[Sets 2 options True/False]
    H -->|Assertion-Reason| M[🚧 Not Implemented Yet]
    H -->|Match Column| N[🚧 Not Implemented Yet]
    
    I --> O[Admin clicks Convert to Game]
    J --> O
    K --> O
    L --> O
    
    O --> P[Creates in topic_learning_content]
    P --> Q[Admin approves human_reviewed=true]
    Q --> R[🔄 Trigger: sync_gamified_exercises_from_content]
    R --> S[💾 gamified_exercises table]
    
    S --> T{Game Component Mapping}
    T -->|exercise_type=mcq| U[MCQGame.tsx]
    T -->|exercise_type=match_pairs| V[MatchPairsGame.tsx]
    T -->|exercise_type=fill_blank| W[InteractiveBlanks.tsx]
    T -->|exercise_type=drag_drop_sort| X[DragDropSequence.tsx]
    T -->|exercise_type=typing_race| Y[TypingRaceGame.tsx]
    
    style M fill:#FFE4B5
    style N fill:#FFE4B5
    style S fill:#87CEEB
    style R fill:#90EE90`,
    steps: [
      { title: "1. Question Source", description: "AI extracts from PDF OR admin manually creates OR AI generates from topic" },
      { title: "2. Save to question_bank", description: "Question saved with is_approved=false, awaiting review" },
      { title: "3. Admin Review", description: "Admin opens AnswerManagementPanel to add options and correct answer" },
      { title: "4. Game Type Selection", description: "Admin chooses game type: MCQ, Match Pairs, Fill Blank, True/False" },
      { title: "5. Answer Configuration", description: "Admin sets options array and correct_answer based on game type" },
      { title: "6. Convert to Game", description: "Creates entry in topic_learning_content with human_reviewed=false" },
      { title: "7. Approval", description: "Admin sets human_reviewed=true to publish" },
      { title: "8. Trigger Sync", description: "sync_gamified_exercises_from_content copies to gamified_exercises" },
      { title: "9. Student Visibility", description: "Game appears in DuolingoLessonPath for students" },
      { title: "10. Game Rendering", description: "GamePlayerPage loads appropriate component based on exercise_type" },
    ],
    deleteBehavior: {
      warning: "⚠️ Deleting question_bank does NOT delete topic_learning_content or gamified_exercises",
      orphans: [
        "topic_learning_content (no cascade from question_bank)",
        "gamified_exercises (no cascade from topic_learning_content)",
        "student_question_attempts (orphaned if game deleted)",
      ],
      cleanup: "Manually delete from all 3 tables when removing a question completely",
    },
  },
  {
    table: "xp_progress_calculation_flow",
    description: "How XP is awarded and progress is calculated after game completion",
    mermaidDiagram: `sequenceDiagram
    participant Student
    participant GamePlayerPage
    participant Edge as jhakkas-points-system
    participant DB as student_gamification
    participant Progress as student_topic_game_progress
    participant Trigger as update_topic_status_trigger
    participant Calc as calculate_topic_status()
    participant Status as student_topic_status
    
    Student->>GamePlayerPage: Completes game
    GamePlayerPage->>Edge: POST /jhakkas-points-system
    Note over Edge: xp_earned, coins_earned, game_id
    Edge->>DB: UPDATE current_xp += xp_earned
    Edge->>DB: UPDATE coins += coins_earned
    Edge-->>GamePlayerPage: Success response
    
    GamePlayerPage->>Progress: UPDATE completed_game_ids
    Note over Progress: Adds game_id to array
    Progress->>Trigger: ON UPDATE fires
    Trigger->>Calc: EXECUTE calculate_topic_status(topic_id)
    
    Note over Calc: completed = array_length(completed_game_ids)<br/>total = count(*) FROM gamified_exercises<br/>rate = completed / total
    
    Calc->>Calc: CASE WHEN rate >= 0.60 THEN green<br/>WHEN rate >= 0.40 THEN yellow<br/>ELSE red
    Calc->>Status: UPSERT game_completion_rate, status
    Status-->>Student: Updated progress visible`,
    steps: [
      { title: "1. Game Completion", description: "Student submits answer in GamePlayerPage.tsx" },
      { title: "2. XP Award Call", description: "handleGameComplete calls jhakkas-points-system edge function" },
      { title: "3. Update Gamification", description: "Edge function updates student_gamification.current_xp and coins" },
      { title: "4. Record Progress", description: "Adds game_id to student_topic_game_progress.completed_game_ids array" },
      { title: "5. Trigger Fires", description: "update_topic_status_trigger detects UPDATE on student_topic_game_progress" },
      { title: "6. Calculate Rate", description: "calculate_topic_status() counts completed vs total games" },
      { title: "7. Determine Color", description: "⚠️ Uses >=60% green threshold (MISMATCH with frontend 70%)" },
      { title: "8. Upsert Status", description: "Updates student_topic_status with game_completion_rate and status" },
      { title: "9. Calendar Fetch", description: "StudentRoadmapCalendar queries student_topic_status for display" },
      { title: "10. Color Apply", description: "progressColors.ts applies frontend logic (>70% green)" },
    ],
    deleteBehavior: {
      warning: "⚠️ XP is permanent - deleting games does NOT reduce student XP",
      orphans: [
        "student_gamification.current_xp (never decremented)",
        "student_topic_game_progress (recalculates on next completion)",
        "completed_game_ids array may contain deleted game IDs",
      ],
      cleanup: "No automatic cleanup - consider manual XP adjustment if game deleted",
    },
  },
];

interface CriticalFinding {
  title: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  details: {
    database?: string;
    frontend?: string;
    impact?: string;
    location?: {
      db?: string;
      frontend?: string;
      edgeFunctions?: string[];
    };
    manual?: string;
    automatic?: string;
    formula?: string;
    example?: string;
  };
  recommendation: string;
}

const criticalFindings: CriticalFinding[] = [
  {
    title: "🚨 Color Threshold Mismatch",
    severity: "high",
    description: "Database and Frontend use different thresholds for topic status colors, causing 60-70% completion to show as GREY instead of GREEN",
    details: {
      database: "Green >= 60%, Yellow >= 40%, Red < 40%, Grey = 0% (calculate_topic_status function)",
      frontend: "Green > 70%, Grey 50-70%, Red < 50%, Grey = 0% (src/lib/progressColors.ts getTopicColor function)",
      impact: "60% completion shows as GREY on frontend but should be GREEN per DB logic. 65% also shows GREY. Only 71%+ shows GREEN.",
      location: {
        db: "supabase/migrations/*-create-topic-status-function.sql (calculate_topic_status)",
        frontend: "src/lib/progressColors.ts (getTopicColor function)",
        edgeFunctions: ["parent-portal/index.ts", "student-roadmap-api/index.ts"],
      },
    },
    recommendation: "Update calculate_topic_status() SQL function to use CASE WHEN game_completion_rate > 70 THEN 'green' to match frontend logic",
  },
  {
    title: "⚡ XP Distribution Flow",
    severity: "medium",
    description: "XP can be set at topic level OR auto-distributed from batch budget - needs clear documentation",
    details: {
      manual: "Admin sets roadmap_topics.xp_reward directly (30/40/50 based on difficulty)",
      automatic: "auto-distribute-xp edge function divides topic budget evenly among all games",
      formula: "baseXP = floor(topic_xp_reward / total_games), remainder = budget % total_games, first N games get baseXP + 1",
      example: "Topic with 100 XP budget + 10 games = 10 XP per game. Topic with 30 XP + 8 games = 3 XP for first 6 games, 4 XP for last 2 games",
    },
    recommendation: "Document which method is used for each batch. Consider UI indicator showing 'Manual' vs 'Auto-Distributed' XP",
  },
  {
    title: "📊 Complete Data Flow Tables",
    severity: "low",
    description: "Reference of all database tables involved in the roadmap → XP → topic status system",
    details: {
      database: "batch_roadmaps, roadmap_chapters, roadmap_topics, topic_content_mapping, gamified_exercises, student_topic_game_progress, student_topic_status, student_gamification, student_xp_coins",
      frontend: "ParentRoadmapCalendar.tsx, StudentRoadmapCalendar.tsx, TopicStudyView.tsx, GamePlayerPage.tsx, DuolingoLessonPath.tsx",
      impact: "Complete system requires 9 tables + 4 edge functions + 3 frontend components + 2 DB triggers + 1 color utility",
      location: {
        edgeFunctions: ["parent-portal/index.ts", "student-roadmap-api/index.ts", "jhakkas-points-system/index.ts", "auto-distribute-xp/index.ts"],
      },
    },
    recommendation: "Keep this workflow documentation updated when adding new features to roadmap or XP systems",
  },
  {
    title: "🎮 Game Navigation Breaks After First Completion",
    severity: "high",
    description: "Students are redirected back to topic page after completing one game instead of advancing to next game",
    details: {
      impact: "Poor UX - students must manually click each game instead of flowing through them sequentially",
      location: {
        frontend: "src/pages/GamePlayerPage.tsx (line 89), src/lib/gameNavigation.ts (line 22)",
        db: "topic_learning_content.content_status filter issue",
      },
      database: "getAdjacentGames() filters by content_status='approved' in topic_learning_content, returns null for next_game_id",
      frontend: "GamePlayerPage navigates to /topic/:topicId when nextGameId is null instead of staying on game",
    },
    recommendation: "Remove approved_lessons filter in gameNavigation.ts line 22-24. Return ALL games in game_order sequence regardless of content_status. Only check human_reviewed in topic_learning_content.",
  },
  {
    title: "🔓 All Games Unlock After Completing First Game",
    severity: "high",
    description: "Sequential unlocking logic is broken - completing one game unlocks ALL remaining games instead of just the next one",
    details: {
      impact: "Students can skip ahead without completing games in order, breaking progression system",
      location: {
        frontend: "src/components/student/DuolingoLessonPath.tsx (lines 197-220)",
      },
      database: "lessonsData.slice(0, index).some(prev => completedGameIds.includes(prev.id)) checks if ANY previous game is completed",
      frontend: "Should check ONLY the immediately previous game: completedGameIds.includes(lessonsData[index - 1]?.id)",
    },
    recommendation: "Fix line 208-210 in DuolingoLessonPath.tsx:\n\nChange FROM:\nconst isPreviousCompleted = lessonsData.slice(0, index).some(prev => completedGameIds.includes(prev.id));\n\nChange TO:\nconst isPreviousCompleted = index === 0 || completedGameIds.includes(lessonsData[index - 1]?.id);",
  },
  {
    title: "🔍 Deduplication Logic Removes Valid Games",
    severity: "medium",
    description: "Only one game per topic is shown because deduplication filters by question_text, removing games with similar questions",
    details: {
      impact: "Topics with multiple MCQs on same concept show only 1 game, hiding other valid exercises",
      location: {
        frontend: "src/components/student/DuolingoLessonPath.tsx (lines 150-172)",
      },
      database: "Queries return all games but frontend filters by unique question_text",
      frontend: "const seenQuestions = new Set<string>(); gameData = gameData.filter(game => !seenQuestions.has(game.question_text))",
    },
    recommendation: "Remove deduplication logic entirely OR change to dedupe by game.id instead of question_text. Games should be unique by database ID, not by question text.",
  },
  {
    title: "🚧 Missing Game Types: True/False, Assertion-Reason, Match Column",
    severity: "low",
    description: "Only 5 game types implemented out of 8 planned types",
    details: {
      database: "gamified_exercises.exercise_type enum allows: mcq, match_pairs, fill_blank, drag_drop_sort, typing_race",
      frontend: "Components exist: MCQGame, MatchPairsGame, InteractiveBlanks, DragDropSequence, TypingRaceGame",
      impact: "Cannot create True/False, Assertion-Reason, or Match Column games yet",
    },
    recommendation: "Implement TrueFalseGame.tsx, AssertionReasonGame.tsx, and MatchColumnGame.tsx components. Add corresponding exercise_type enum values to database.",
  },
  {
    title: "💥 Game XP Never Updates student_gamification Table",
    severity: "high",
    description: "Game XP updates profiles.xp but Test XP updates student_gamification.current_xp - creates XP data fragmentation",
    details: {
      impact: "XP leaderboards show incomplete data, analytics cannot track game vs test XP separately, potential student confusion",
      location: {
        frontend: "XPDisplay.tsx fetches inconsistently | GamePlayerPage.tsx calls increment_student_xp() RPC → profiles.xp | TakeTest.tsx calls jhakkas-points-system → student_gamification.current_xp",
        db: "profiles.xp (game XP) vs student_gamification.current_xp (test XP) - NO unified source",
      },
      database: "Two separate XP storage locations: profiles.xp contains game XP totals, student_gamification.current_xp contains test XP totals",
      frontend: "XPDisplay.tsx fetches from profiles.xp for games OR student_gamification for tests inconsistently",
    },
    recommendation: "UNIFY XP SYSTEMS:\n1. Deprecate profiles.xp for XP storage\n2. Route ALL XP (game + test) through jhakkas-points-system edge function\n3. Use student_gamification.current_xp as single source of truth\n4. Create xp_transactions table to track: { student_id, source_type: 'game'|'test', source_id, xp_amount, created_at }",
  },
  {
    title: "♻️ Test XP Awards Full Amount on Every Retake",
    severity: "high",
    description: "Students can farm XP by repeatedly taking easy tests - no diminishing returns implemented",
    details: {
      impact: "XP inflation, leaderboard manipulation, progression system broken",
      location: {
        frontend: "TestsOverview.tsx shows attempt count but doesn't prevent retakes",
        db: "test_attempts stores all attempts but post-test-analytics doesn't query for previous attempts",
        edgeFunctions: ["post-test-analytics/index.ts (no attempt check before awarding XP)"],
      },
      example: "Student takes 10-question test 5 times → gets 100 XP each time = 500 XP total for same test",
      database: "test_attempts stores all attempts but post-test-analytics edge function doesn't query for previous attempts before awarding XP",
    },
    recommendation: "IMPLEMENT DIMINISHING RETURNS:\n1. In post-test-analytics: Query test_attempts for previous attempts before awarding XP\n2. Apply formula:\n   - Attempt 1: 100% XP (base + marks + bonuses)\n   - Attempt 2: 50% XP (only marks XP, no bonuses)\n   - Attempt 3+: 25% XP (only marks XP, no bonuses)\n3. Store attempt_number in test_attempts\n4. Show 'Reduced XP' badge in UI for retakes",
  },
  {
    title: "⚙️ Game XP Not Configurable (Hardcoded in xpConfig.ts)",
    severity: "medium",
    description: "Test XP has full admin UI configuration (XPManagement.tsx), but Game XP is hardcoded - inconsistent admin control",
    details: {
      impact: "Cannot adjust game XP for difficulty balancing, cannot run XP events for games, admins must edit code to change game XP",
      location: {
        frontend: "src/lib/xpConfig.ts (hardcoded ATTEMPT_XP) | XPManagement.tsx (test XP has full admin UI) | No Game XP Management UI exists",
        db: "tests table has xp_config columns, gamified_exercises has no xp_reward configuration",
      },
      database: "tests table has xp_config columns for admin configuration, but gamified_exercises has no xp_reward or difficulty_multiplier columns",
      frontend: "No Game XP Management UI exists - admins must edit src/lib/xpConfig.ts code directly",
    },
    recommendation: "CREATE GAME XP CONFIGURATION UI:\n1. Add columns to gamified_exercises: base_xp_reward, difficulty_multiplier\n2. Create GameXPManagement.tsx component similar to XPManagement.tsx\n3. Allow admins to set XP per difficulty: { easy: 20-40, medium: 30-50, hard: 40-60 }\n4. Deprecate hardcoded xpConfig.ts values\n5. Fetch XP config from database when awarding game XP",
  },
  {
    title: "📊 No XP Transaction History Table",
    severity: "medium",
    description: "Cannot audit XP sources, no rollback capability, difficult to debug XP discrepancies",
    details: {
      impact: "Cannot answer questions like: 'Where did this student's XP come from?', 'How much XP from games vs tests?', 'Has XP been manipulated?' | Cannot generate reports: 'XP earned per day', 'XP by source type', 'Top XP activities', 'XP manipulation detection'",
      location: {
        frontend: "No analytics UI for XP breakdown | Cannot generate XP transaction reports",
        db: "No xp_transactions or xp_history table exists | increment_student_xp() directly updates profiles.xp with no transaction log | test_attempts.xp_earned records test XP but not linked to student_gamification updates",
        edgeFunctions: ["jhakkas-points-system/index.ts (no transaction logging)", "increment_student_xp RPC (no audit trail)"],
      },
      database: "No xp_transactions or xp_history table exists to track XP sources and changes over time",
      frontend: "No analytics UI for XP transaction history, source breakdown, or manipulation detection",
    },
    recommendation: "CREATE XP TRANSACTIONS TABLE:\n```sql\nCREATE TABLE xp_transactions (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  student_id uuid REFERENCES profiles(id),\n  source_type text CHECK (source_type IN ('game', 'test', 'achievement', 'bonus', 'admin_adjustment')),\n  source_id uuid, -- game_id or test_attempt_id\n  xp_amount int NOT NULL,\n  previous_xp int,\n  new_xp int,\n  metadata jsonb, -- { difficulty, attempt_number, etc }\n  created_at timestamptz DEFAULT now()\n);\n```\nModify jhakkas-points-system to INSERT transaction record on every XP award",
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
        <>
          {/* Critical Findings Section */}
          <Card className="border-4 border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
            <CardHeader className="px-3 md:px-6 py-4 md:py-6">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 text-lg md:text-xl">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>🚨 Critical System Findings</span>
              </CardTitle>
              <CardDescription className="text-red-600 dark:text-red-300 text-xs md:text-sm">
                Important issues and mismatches detected in the roadmap, XP, and topic status system
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <Accordion type="single" collapsible className="space-y-2">
                {criticalFindings.map((finding, idx) => (
                  <AccordionItem 
                    key={idx} 
                    value={`finding-${idx}`}
                    className="border rounded-lg px-2 md:px-4 bg-background"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-left">
                        <Badge 
                          variant={
                            finding.severity === 'high' ? 'destructive' : 
                            finding.severity === 'medium' ? 'default' : 
                            'secondary'
                          }
                          className="uppercase text-xs shrink-0 self-start sm:self-auto"
                        >
                          {finding.severity}
                        </Badge>
                        <span className="text-xs md:text-sm font-semibold">{finding.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <p className="text-xs md:text-sm text-muted-foreground">{finding.description}</p>
                        
                        <div className="space-y-2 text-xs md:text-sm">
                          {finding.details.database && (
                            <div className="break-words">
                              <span className="font-semibold text-foreground">Database Logic: </span>
                              <span className="text-muted-foreground">{finding.details.database}</span>
                            </div>
                          )}
                          {finding.details.frontend && (
                            <div className="break-words">
                              <span className="font-semibold text-foreground">Frontend Logic: </span>
                              <span className="text-muted-foreground">{finding.details.frontend}</span>
                            </div>
                          )}
                          {finding.details.impact && (
                            <div className="break-words">
                              <span className="font-semibold text-foreground">Impact: </span>
                              <span className="text-muted-foreground">{finding.details.impact}</span>
                            </div>
                          )}
                          {finding.details.manual && (
                            <div className="break-words">
                              <span className="font-semibold text-foreground">Manual Method: </span>
                              <span className="text-muted-foreground">{finding.details.manual}</span>
                            </div>
                          )}
                          {finding.details.automatic && (
                            <div className="break-words">
                              <span className="font-semibold text-foreground">Automatic Method: </span>
                              <span className="text-muted-foreground">{finding.details.automatic}</span>
                            </div>
                          )}
                          {finding.details.formula && (
                            <div className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0">
                              <span className="font-semibold text-foreground">Formula: </span>
                              <code className="text-xs bg-muted px-2 py-1 rounded inline-block">{finding.details.formula}</code>
                            </div>
                          )}
                          {finding.details.example && (
                            <div className="break-words">
                              <span className="font-semibold text-foreground">Example: </span>
                              <span className="text-muted-foreground">{finding.details.example}</span>
                            </div>
                          )}
                          {finding.details.location && (
                            <div className="mt-3">
                              <span className="font-semibold text-foreground">File Locations:</span>
                              <ul className="list-disc list-inside ml-2 md:ml-4 mt-1 space-y-1">
                                {finding.details.location.db && (
                                  <li className="text-xs font-mono text-muted-foreground break-all">{finding.details.location.db}</li>
                                )}
                                {finding.details.location.frontend && (
                                  <li className="text-xs font-mono text-muted-foreground break-all">{finding.details.location.frontend}</li>
                                )}
                                {finding.details.location.edgeFunctions && finding.details.location.edgeFunctions.map((ef, i) => (
                                  <li key={i} className="text-xs font-mono text-muted-foreground break-all">supabase/functions/{ef}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                          <AlertDescription>
                            <p className="font-semibold text-blue-900 dark:text-blue-100">💡 Recommendation:</p>
                            <p className="text-blue-800 dark:text-blue-200 text-sm mt-1">{finding.recommendation}</p>
                          </AlertDescription>
                        </Alert>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Workflows Section */}
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
        </>
      )}
    </div>
  );
};
