import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TableSelector } from '@/components/admin/TableSelector';
import { TableDataViewer } from '@/components/admin/TableDataViewer';
import { AIAssistantPanel } from '@/components/admin/AIAssistantPanel';
import { IDResolver } from '@/components/admin/IDResolver';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const databaseSchema = {
  profiles: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'email', type: 'text', nullable: false, default_value: null },
      { name: 'name', type: 'text', nullable: true, default_value: null },
      { name: 'avatar_url', type: 'text', nullable: true, default_value: null },
      { name: 'batch_id', type: 'uuid', nullable: true, default_value: null },
      { name: 'exam_domain', type: 'text', nullable: true, default_value: null },
      { name: 'role', type: 'text', nullable: true, default_value: 'student' },
      { name: 'school_id', type: 'uuid', nullable: true, default_value: null },
      { name: 'zone_id', type: 'uuid', nullable: true, default_value: null },
      { name: 'phone', type: 'text', nullable: true, default_value: null },
      { name: 'address', type: 'text', nullable: true, default_value: null },
      { name: 'city', type: 'text', nullable: true, default_value: null },
      { name: 'state', type: 'text', nullable: true, default_value: null },
      { name: 'country', type: 'text', nullable: true, default_value: null },
      { name: 'zip', type: 'text', nullable: true, default_value: null },
    ],
    relationships: [
      { from_column: 'batch_id', to_table: 'batches', to_column: 'id', type: 'one-to-many' },
      { from_column: 'school_id', to_table: 'schools', to_column: 'id', type: 'one-to-many' },
      { from_column: 'zone_id', to_table: 'zones', to_column: 'id', type: 'one-to-many' },
    ]
  },
  batches: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'name', type: 'text', nullable: false, default_value: null },
      { name: 'start_date', type: 'date', nullable: false, default_value: null },
      { name: 'end_date', type: 'date', nullable: false, default_value: null },
      { name: 'exam_domain', type: 'text', nullable: false, default_value: null },
      { name: 'description', type: 'text', nullable: true, default_value: null },
      { name: 'school_id', type: 'uuid', nullable: true, default_value: null },
      { name: 'zone_id', type: 'uuid', nullable: true, default_value: null },
    ],
    relationships: [
      { from_column: 'school_id', to_table: 'schools', to_column: 'id', type: 'one-to-many' },
      { from_column: 'zone_id', to_table: 'zones', to_column: 'id', type: 'one-to-many' },
    ]
  },
  schools: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'name', type: 'text', nullable: false, default_value: null },
      { name: 'address', type: 'text', nullable: true, default_value: null },
      { name: 'city', type: 'text', nullable: true, default_value: null },
      { name: 'state', type: 'text', nullable: true, default_value: null },
      { name: 'country', type: 'text', nullable: true, default_value: null },
      { name: 'zip', type: 'text', nullable: true, default_value: null },
      { name: 'phone', type: 'text', nullable: true, default_value: null },
      { name: 'email', type: 'text', nullable: true, default_value: null },
      { name: 'website', type: 'text', nullable: true, default_value: null },
      { name: 'zone_id', type: 'uuid', nullable: true, default_value: null },
    ],
    relationships: [
      { from_column: 'zone_id', to_table: 'zones', to_column: 'id', type: 'one-to-many' },
    ]
  },
  zones: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'name', type: 'text', nullable: false, default_value: null },
      { name: 'description', type: 'text', nullable: true, default_value: null },
    ],
    relationships: []
  },
  user_roles: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'user_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'role', type: 'text', nullable: false, default_value: null },
    ],
    relationships: []
  },
  batch_roadmaps: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'batch_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'roadmap_id', type: 'uuid', nullable: false, default_value: null },
    ],
    relationships: []
  },
  student_roadmaps: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'student_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'roadmap_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'progress', type: 'jsonb', nullable: true, default_value: null },
    ],
    relationships: []
  },
  roadmap_chapters: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'roadmap_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'chapter_number', type: 'integer', nullable: false, default_value: null },
      { name: 'title', type: 'text', nullable: false, default_value: null },
    ],
    relationships: []
  },
  roadmap_topics: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'chapter_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'topic_number', type: 'integer', nullable: false, default_value: null },
      { name: 'title', type: 'text', nullable: false, default_value: null },
      { name: 'content_type', type: 'text', nullable: false, default_value: null },
      { name: 'content_id', type: 'uuid', nullable: false, default_value: null },
    ],
    relationships: []
  },
  question_bank: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'question_text', type: 'text', nullable: false, default_value: null },
      { name: 'options', type: 'jsonb', nullable: false, default_value: null },
      { name: 'correct_answer', type: 'text', nullable: false, default_value: null },
      { name: 'topic_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'difficulty', type: 'integer', nullable: false, default_value: null },
    ],
    relationships: []
  },
  topic_content_mapping: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'topic_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'content_type', type: 'text', nullable: false, default_value: null },
      { name: 'content_id', type: 'uuid', nullable: false, default_value: null },
    ],
    relationships: []
  },
  gamified_exercises: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'topic_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'game_type', type: 'text', nullable: false, default_value: null },
      { name: 'game_data', type: 'jsonb', nullable: false, default_value: null },
    ],
    relationships: []
  },
  student_topic_game_progress: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'student_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'topic_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'game_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'progress_data', type: 'jsonb', nullable: false, default_value: null },
    ],
    relationships: []
  },
  student_analytics: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'student_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'topic_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'time_spent', type: 'integer', nullable: false, default_value: null },
      { name: 'questions_answered', type: 'integer', nullable: false, default_value: null },
      { name: 'correct_answers', type: 'integer', nullable: false, default_value: null },
    ],
    relationships: []
  },
  subject_analytics: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'topic_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'average_time_spent', type: 'integer', nullable: false, default_value: null },
      { name: 'average_questions_answered', type: 'integer', nullable: false, default_value: null },
      { name: 'average_correct_answers', type: 'integer', nullable: false, default_value: null },
    ],
    relationships: []
  },
  tests: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'name', type: 'text', nullable: false, default_value: null },
      { name: 'topic_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'questions', type: 'jsonb', nullable: false, default_value: null },
      { name: 'duration', type: 'integer', nullable: false, default_value: null },
    ],
    relationships: []
  },
  test_attempts: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'test_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'student_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'answers', type: 'jsonb', nullable: false, default_value: null },
      { name: 'score', type: 'integer', nullable: false, default_value: null },
    ],
    relationships: []
  },
  questions: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'question_text', type: 'text', nullable: false, default_value: null },
      { name: 'options', type: 'jsonb', nullable: false, default_value: null },
      { name: 'correct_answer', type: 'text', nullable: false, default_value: null },
      { name: 'test_id', type: 'uuid', nullable: false, default_value: null },
    ],
    relationships: []
  },
  fee_records: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'student_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'amount', type: 'integer', nullable: false, default_value: null },
      { name: 'due_date', type: 'date', nullable: false, default_value: null },
      { name: 'status', type: 'text', nullable: false, default_value: null },
    ],
    relationships: []
  },
  payments: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'student_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'amount', type: 'integer', nullable: false, default_value: null },
      { name: 'payment_date', type: 'date', nullable: false, default_value: null },
      { name: 'payment_method', type: 'text', nullable: false, default_value: null },
    ],
    relationships: []
  },
  referrals: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'referrer_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'referred_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'status', type: 'text', nullable: false, default_value: null },
    ],
    relationships: []
  },
  referral_credits: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_value: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_value: 'now()' },
      { name: 'user_id', type: 'uuid', nullable: false, default_value: null },
      { name: 'credits', type: 'integer', nullable: false, default_value: null },
      { name: 'description', type: 'text', nullable: false, default_value: null },
    ],
    relationships: []
  },
};

const categoryGroups = {
  "User Management": ["profiles", "user_roles"],
  "Batch & Roadmap": ["batches", "batch_roadmaps", "student_roadmaps", "roadmap_chapters", "roadmap_topics"],
  "Content & Learning": ["question_bank", "topic_content_mapping", "gamified_exercises"],
  "Progress & Analytics": ["student_topic_game_progress", "student_analytics", "subject_analytics"],
  "Tests & Assessments": ["tests", "test_attempts", "questions"],
  "Finance": ["fee_records", "payments", "referrals", "referral_credits"],
  "School & Zone": ["schools", "zones"],
};

const questionExtractionDocs = {
  title: "📝 Question Extraction & Management",
  description: "Bulk question extraction from PDFs with AI, draft workflow, and CRUD operations",
  
  tables: [
    {
      name: "question_bank",
      description: "Central repository for all extracted questions (draft & approved)",
      columns: [
        { name: "id", type: "uuid", description: "Primary key" },
        { name: "question_text", type: "text", description: "Main question content (supports math notation)" },
        { name: "question_type", type: "enum", description: "mcq | fill_blank | true_false | subjective | match_column" },
        { name: "options", type: "jsonb", description: "Array of options (MCQ only)" },
        { name: "correct_answer", type: "jsonb", description: "Null in draft mode; normalized format after review" },
        { name: "marks", type: "integer", description: "Points for this question" },
        { name: "difficulty", type: "text", description: "easy | medium | hard" },
        { name: "topic_id", type: "uuid", description: "FK to roadmap_topics" },
        { name: "is_approved", type: "boolean", description: "False = draft, True = ready for students" },
        { name: "approved_by", type: "uuid", description: "Admin who approved" },
        { name: "source_id", type: "uuid", description: "FK to content_sources (PDF origin)" }
      ]
    },
    {
      name: "topic_content_mapping",
      description: "Links approved questions to topics for student view",
      columns: [
        { name: "id", type: "uuid", description: "Primary key" },
        { name: "topic_id", type: "uuid", description: "FK to roadmap_topics" },
        { name: "question_id", type: "uuid", description: "FK to question_bank" },
        { name: "order_num", type: "integer", description: "Display sequence" }
      ]
    },
    {
      name: "gamified_exercises",
      description: "Student-facing game representations of questions",
      columns: [
        { name: "topic_content_id", type: "uuid", description: "FK to topic_content_mapping" },
        { name: "exercise_type", type: "enum", description: "mcq | fill_blank | true_false" },
        { name: "exercise_data", type: "jsonb", description: "Game-specific format" },
        { name: "correct_answer", type: "jsonb", description: "Normalized answer" },
        { name: "xp_reward", type: "integer", description: "XP for correct answer" }
      ]
    }
  ],
  
  workflow: [
    "1️⃣ Admin uploads PDF → AI extracts questions → Saves to question_bank (correct_answer = null, is_approved = false)",
    "2️⃣ Admin reviews in SmartQuestionExtractor → Adds correct answers → Edits question text/options",
    "3️⃣ Admin clicks 'Finalize & Link' → Updates is_approved = true → Creates topic_content_mapping + gamified_exercises",
    "4️⃣ Students can now see/play questions in their learning path"
  ],
  
  apiEndpoints: [
    { action: "save_draft_questions", description: "Bulk save without answers", params: "questions[], topic_id" },
    { action: "get_topic_questions", description: "Load all questions for a topic", params: "topic_id" },
    { action: "update_question", description: "Edit question text/options/marks", params: "question_id, updates{}" },
    { action: "update_question_answer", description: "Add/edit answer + explanation", params: "question_id, correct_answer, explanation" },
    { action: "delete_question", description: "Delete question + cleanup", params: "question_id" },
    { action: "finalize_and_link", description: "Approve & link to students", params: "question_ids[], topic_id" }
  ],
  
  securityNotes: [
    "⚠️ Only admins can save/edit/delete questions",
    "✅ Students can only see questions where is_approved = true AND correct_answer IS NOT NULL",
    "🔒 RLS policies prevent students from accessing question_bank directly"
  ]
};

const columnDocumentation = {
  profiles: {
    batch_id: {
      criticality: 'critical',
      why: "Links student to their learning cohort/group",
      without: ["Students wouldn't know which roadmap to follow", "Can't auto-assign study plans on signup", "No batch-level analytics or comparisons possible"],
      example: "Student joins 'JEE 2025 Batch' → Gets JEE roadmap automatically"
    },
    exam_domain: {
      criticality: 'critical',
      why: "Categorizes student by exam type (School/Competitive/Skill)",
      without: ["Can't filter relevant content", "Wrong subjects shown", "Rankings would mix different exam types"],
      example: "NEET student shouldn't see JEE physics topics"
    }
  }
};

const DatabaseExplorer = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  return (
    <div className="h-screen w-full bg-background flex flex-col">
      {/* Header with back button */}
      <header className="h-14 border-b border-border bg-card px-6 flex items-center gap-4 sticky top-0 z-10 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Button>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Database Explorer & AI Assistant</h1>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full gap-6">
          {/* Left: Database Viewer (60%) */}
          <ResizablePanel defaultSize={60} minSize={30} className="flex flex-col gap-4 min-w-0 overflow-hidden">
            <TableSelector value={selectedTable} onChange={setSelectedTable} />
            
            <Tabs defaultValue="data" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-4 shrink-0">
                <TabsTrigger value="data">Live Data</TabsTrigger>
                <TabsTrigger value="resolver">ID Resolver</TabsTrigger>
                <TabsTrigger value="columns">Column Details</TabsTrigger>
                <TabsTrigger value="flows">User Flows</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="flex-1 mt-4 overflow-hidden">
                <TableDataViewer 
                  tableName={selectedTable} 
                  onRowSelect={setSelectedRow}
                />
              </TabsContent>

              <TabsContent value="resolver" className="flex-1 mt-4 overflow-auto">
                <IDResolver />
              </TabsContent>

              <TabsContent value="columns" className="flex-1 mt-4 overflow-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Column-Level Documentation</CardTitle>
                    <CardDescription>
                      Understand why each column exists and what breaks without it
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {Object.entries(columnDocumentation).map(([table, columns]) => (
                        <AccordionItem key={table} value={table}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{table}</Badge>
                              <span className="text-sm text-muted-foreground">{Object.keys(columns).length} critical columns</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              {Object.entries(columns).map(([colName, col]: [string, any]) => (
                                <div key={colName} className="border-l-2 border-primary pl-4 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{colName}</code>
                                    <Badge variant={col.criticality === 'critical' ? 'destructive' : 'secondary'}>
                                      {col.criticality}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{col.why}</p>
                                  <Alert variant={col.criticality === 'critical' ? 'destructive' : 'default'}>
                                    <AlertDescription>
                                      <strong>Without it:</strong>
                                      <ul className="list-disc list-inside mt-1">
                                        {col.without.map((item: string, idx: number) => (
                                          <li key={idx}>{item}</li>
                                        ))}
                                      </ul>
                                    </AlertDescription>
                                  </Alert>
                                  {col.example && (
                                    <p className="text-xs text-muted-foreground italic">Example: {col.example}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="question-system" className="flex-1 mt-4 overflow-auto px-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      {questionExtractionDocs.title}
                    </CardTitle>
                    <CardDescription>{questionExtractionDocs.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">📊 Database Tables</h3>
                      <div className="space-y-4">
                        {questionExtractionDocs.tables.map((table: any) => (
                          <Card key={table.name}>
                            <CardHeader>
                              <CardTitle className="text-base">{table.name}</CardTitle>
                              <CardDescription>{table.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {table.columns.map((col: any) => (
                                  <div key={col.name} className="flex gap-2 text-sm">
                                    <Badge variant="outline">{col.name}</Badge>
                                    <span className="text-muted-foreground">{col.type}</span>
                                    <span>- {col.description}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">🔄 Workflow</h3>
                      <div className="space-y-2">
                        {questionExtractionDocs.workflow.map((step: string, idx: number) => (
                          <Alert key={idx}>
                            <AlertDescription>{step}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">🔌 API Endpoints (topic-questions-api)</h3>
                      <div className="space-y-2">
                        {questionExtractionDocs.apiEndpoints.map((endpoint: any) => (
                          <div key={endpoint.action} className="p-3 border rounded-md">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge>{endpoint.action}</Badge>
                              <span className="text-sm text-muted-foreground">{endpoint.description}</span>
                            </div>
                            <code className="text-xs text-muted-foreground">{endpoint.params}</code>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">🔒 Security</h3>
                      <div className="space-y-2">
                        {questionExtractionDocs.securityNotes.map((note: string, idx: number) => (
                          <Alert key={idx} variant={note.includes('⚠️') ? 'destructive' : 'default'}>
                            <AlertDescription>{note}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="flows" className="flex-1 mt-4 overflow-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Critical Data Flows</CardTitle>
                    <CardDescription>
                      Understand how data moves through the system
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">📝 Student Signup Flow</h3>
                      <div className="text-sm space-y-1 text-muted-foreground pl-4 border-l-2">
                        <p>1. User signs up → <code className="bg-muted px-1">auth.users</code> created</p>
                        <p>2. Trigger fires → <code className="bg-muted px-1">profiles</code> row created</p>
                        <p>3. Batch auto-assigned → <code className="bg-muted px-1">profiles.batch_id</code> updated</p>
                        <p>4. Roadmap synced → <code className="bg-muted px-1">student_roadmaps</code> entry created</p>
                        <p>5. Initialize rewards → <code className="bg-muted px-1">student_xp_coins</code> created</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">🎮 Game Completion Flow</h3>
                      <div className="text-sm space-y-1 text-muted-foreground pl-4 border-l-2">
                        <p>1. Student plays game → Answer submitted</p>
                        <p>2. Correct answer → XP/coins added</p>
                        <p>3. Game ID added to completed list</p>
                        <p>4. All games done → Topic marked complete</p>
                        <p>5. Roadmap progress updated</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">📊 Test Attempt Flow</h3>
                      <div className="text-sm space-y-1 text-muted-foreground pl-4 border-l-2">
                        <p>1. Student starts test → <code className="bg-muted px-1">test_attempts</code> created</p>
                        <p>2. Answers saved → Array updated</p>
                        <p>3. Submit → Score calculated</p>
                        <p>4. Analytics updated → Rankings recalculated</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border" />

          {/* Right: AI Assistant (40%) */}
          <ResizablePanel defaultSize={40} minSize={25} className="overflow-hidden flex flex-col h-full">
            <AIAssistantPanel
              context={{
                tableName: selectedTable || undefined,
                selectedRow: selectedRow,
                tableCount: undefined
              }}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
        </div>
    );
};

export default DatabaseExplorer;
