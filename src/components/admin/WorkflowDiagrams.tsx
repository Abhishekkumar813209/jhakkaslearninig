import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WorkflowData {
  table: string;
  description: string;
  mermaidDiagram: string;
  steps: { title: string; description: string }[];
  deleteBehavior: { warning: string; orphans: string[]; cleanup: string };
}

const workflows: WorkflowData[] = [
  {
    table: 'question_bank',
    description: 'AI-extracted questions waiting for admin review and answer assignment',
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
      { title: '1. PDF Upload', description: 'Admin uploads PDF in SmartQuestionExtractor' },
      { title: '2. AI Extraction', description: 'Edge function ai-extract-all-questions-chunked processes PDF' },
      { title: '3. Database Save', description: 'Questions saved to question_bank with is_approved=false' },
      { title: '4. Admin Review', description: 'Admin views in SmartQuestionExtractor or AnswerManagement' },
      { title: '5. Answer Assignment', description: 'Admin adds options and correct_answer' },
      { title: '6. Ready State', description: 'Question ready to convert to topic_learning_content' }
    ],
    deleteBehavior: {
      warning: 'Deleting from question_bank ONLY removes the draft question',
      orphans: ['No cascades - safe to delete'],
      cleanup: 'No cleanup needed - this is the source table'
    }
  },
  {
    table: 'topic_learning_content',
    description: 'Lesson builder content - converted from question_bank, awaiting approval to publish as games',
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
      { title: '1. Conversion Click', description: 'Admin clicks "Convert to Game" in LessonContentBuilder' },
      { title: '2. Create Lesson', description: 'Inserts into topic_learning_content with human_reviewed=false' },
      { title: '3. Draft State', description: 'Content visible in lesson builder but NOT to students' },
      { title: '4. Admin Approval', description: 'Admin reviews and sets human_reviewed=true' },
      { title: '5. Trigger Activation', description: 'sync_gamified_exercises_from_content trigger fires' },
      { title: '6. Student Visibility', description: 'Content appears in gamified_exercises for students' }
    ],
    deleteBehavior: {
      warning: '⚠️ CRITICAL BUG: Deleting does NOT cascade to gamified_exercises!',
      orphans: ['gamified_exercises (students still see the game!)', 'topic_content_mapping (orphaned reference)'],
      cleanup: 'Manually delete from gamified_exercises and topic_content_mapping using same topic_id'
    }
  },
  {
    table: 'gamified_exercises',
    description: 'Published games visible to students - synced from topic_learning_content',
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
      { title: '1. Sync Trigger', description: 'sync_gamified_exercises_from_content fires on approval' },
      { title: '2. Insert/Update', description: 'Creates or updates gamified_exercises row' },
      { title: '3. Student Discovery', description: 'DuolingoLessonPath fetches via topic_content_mapping' },
      { title: '4. Deduplication', description: 'Frontend filters duplicates by question text + type' },
      { title: '5. Game Display', description: 'Shows game in lesson path UI' },
      { title: '6. Student Play', description: 'GamePlayerPage renders MCQGame/etc' },
      { title: '7. Answer Recording', description: 'Saves to student_question_attempts' },
      { title: '8. Progress Update', description: 'Updates student_topic_game_progress.completed_game_ids' }
    ],
    deleteBehavior: {
      warning: 'Deleting removes game from students immediately',
      orphans: ['student_question_attempts (historical data preserved)', 'student_topic_game_progress (completed_game_ids may reference deleted ID)'],
      cleanup: 'Consider soft delete flag instead of hard delete'
    }
  },
  {
    table: 'test_attempts',
    description: 'Student test submissions with auto-analytics updates',
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
      { title: '1. Test Start', description: 'Student clicks "Start Test" in TakeTest component' },
      { title: '2. Create Attempt', description: 'Inserts test_attempts with status=in_progress' },
      { title: '3. Answer Collection', description: 'Frontend updates answers array in real-time' },
      { title: '4. Submission', description: 'Student submits or time expires (auto_submit)' },
      { title: '5. Score Calculation', description: 'Backend calculates percentage, score, total_marks' },
      { title: '6. Analytics Update', description: 'update_student_analytics_after_test trigger fires' },
      { title: '7. Subject Stats', description: 'update_subject_analytics_after_test updates per-subject data' },
      { title: '8. Zone Ranking', description: 'calculate_zone_rankings() recalcs school/zone/overall ranks' }
    ],
    deleteBehavior: {
      warning: '⚠️ Deleting invalidates all analytics and rankings!',
      orphans: ['student_analytics (average_score becomes incorrect)', 'subject_analytics (tests_taken count wrong)', 'Zone rankings become stale'],
      cleanup: 'Run calculate_zone_rankings() after deletion to fix rankings'
    }
  },
  {
    table: 'student_topic_game_progress',
    description: 'Tracks which games student completed per topic',
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
      { title: '1. Game Completion', description: 'Student gets correct answer in GamePlayerPage' },
      { title: '2. Progress Update', description: 'Adds game ID to completed_game_ids array' },
      { title: '3. Count Increment', description: 'Increments questions_completed counter' },
      { title: '4. Timestamp Update', description: 'Updates last_played_at for activity tracking' },
      { title: '5. Completion Check', description: 'is_topic_fully_completed() function checks if done' },
      { title: '6. Status Calculation', description: 'calculate_topic_status() determines red/yellow/green' }
    ],
    deleteBehavior: {
      warning: 'Deleting removes all progress tracking for that student+topic',
      orphans: ['student_topic_status may become stale', 'DuolingoLessonPath will recreate on next play'],
      cleanup: 'Progress auto-recreates when student plays games again'
    }
  },
  {
    table: 'batch_roadmaps',
    description: 'Master roadmap templates assigned to batches',
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
      { title: '1. Roadmap Creation', description: 'Admin uses CreateRoadmapWizard or AI generator' },
      { title: '2. Draft Save', description: 'Creates batch_roadmaps with status=draft' },
      { title: '3. Topic Addition', description: 'Adds roadmap_chapters and roadmap_topics' },
      { title: '4. Publish', description: 'Admin sets status=published' },
      { title: '5. Batch Link', description: 'Updates batches.linked_roadmap_id' },
      { title: '6. Student Sync', description: 'sync_students_on_batch_roadmap_change trigger copies to all batch students' }
    ],
    deleteBehavior: {
      warning: 'Deleting breaks all student roadmaps linked to it!',
      orphans: ['student_roadmaps (foreign key may fail)', 'roadmap_topics, roadmap_chapters (cascade delete)', 'batches.linked_roadmap_id becomes NULL'],
      cleanup: 'Unlink from batches first, then delete roadmap'
    }
  },
  {
    table: 'referral_credits',
    description: 'Student referral earnings and withdrawal tracking',
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
      { title: '1. Referral Signup', description: 'New student uses referral code during registration' },
      { title: '2. Bonus Award', description: 'add_referrer_bonus() adds credits to referrer' },
      { title: '3. Credit Accumulation', description: 'total_credits increases with each successful referral' },
      { title: '4. Withdrawal Request', description: 'Student requests withdrawal via WithdrawCreditsDialog' },
      { title: '5. Credit Lock', description: 'lock_credits_for_withdrawal() prevents double-spending' },
      { title: '6. Admin Review', description: 'Admin approves/rejects in WithdrawalManagement' },
      { title: '7. Completion', description: 'complete_withdrawal() moves locked to used_credits' }
    ],
    deleteBehavior: {
      warning: '⚠️ Never delete - breaks financial audit trail!',
      orphans: ['withdrawal_requests (references student_id)', 'referral_signups (tracks who was referred)'],
      cleanup: 'Use soft delete or archive to different table'
    }
  }
];

export const WorkflowDiagrams: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWorkflows = workflows.filter(wf =>
    wf.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wf.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>📊 Database Workflow Diagrams</CardTitle>
        <CardDescription>
          Complete data flows organized by table - shows what happens on every action
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows by table name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-auto">
          <Accordion type="single" collapsible className="space-y-2">
            {filteredWorkflows.map((workflow) => (
              <AccordionItem key={workflow.table} value={workflow.table} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {workflow.table}
                    </Badge>
                    <span className="text-sm text-muted-foreground text-left">
                      {workflow.description}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                  {/* Mermaid Diagram */}
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <span>📈 Visual Flow</span>
                    </h4>
                    <div 
                      dangerouslySetInnerHTML={{
                        __html: `<lov-mermaid>${workflow.mermaidDiagram}</lov-mermaid>`
                      }}
                    />
                  </div>

                  {/* Step-by-Step Breakdown */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <span>🔄 Step-by-Step Breakdown</span>
                    </h4>
                    <div className="space-y-2">
                      {workflow.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3 items-start">
                          <Badge variant="secondary" className="mt-0.5 min-w-[60px] justify-center">
                            Step {idx + 1}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{step.title}</p>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delete Behavior */}
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">⚠️ What Happens on Delete</p>
                        <p className="text-sm">{workflow.deleteBehavior.warning}</p>
                        
                        <div className="mt-3">
                          <p className="font-medium text-sm mb-1">Orphaned Records:</p>
                          <ul className="text-xs space-y-1 list-disc list-inside ml-2">
                            {workflow.deleteBehavior.orphans.map((orphan, idx) => (
                              <li key={idx}>{orphan}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-3 p-2 bg-background rounded border">
                          <p className="font-medium text-sm mb-1 flex items-center gap-2">
                            <Info className="h-3 w-3" />
                            Recommended Cleanup:
                          </p>
                          <p className="text-xs">{workflow.deleteBehavior.cleanup}</p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {filteredWorkflows.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>No workflows found matching "{searchQuery}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
