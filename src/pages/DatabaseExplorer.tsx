import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TableSelector } from '@/components/admin/TableSelector';
import { TableDataViewer } from '@/components/admin/TableDataViewer';
import { IDResolver } from '@/components/admin/IDResolver';
import { WorkflowDiagrams } from '@/components/admin/WorkflowDiagrams';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get table from URL or default to 'profiles'
  const [selectedTable, setSelectedTable] = useState<string | null>(
    searchParams.get('table') || 'profiles'
  );
  const [selectedRow, setSelectedRow] = useState<any>(null);


  // Update URL when table changes
  const handleTableChange = (table: string | null) => {
    setSelectedTable(table);
    if (table) {
      setSearchParams({ table });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="h-screen w-full bg-background flex flex-col">
      {/* Header with back button */}
      <header className="border-b border-border bg-card px-3 md:px-6 py-3 md:py-0 md:h-14 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-0 md:justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="gap-1 md:gap-2 px-2 md:px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Admin</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h1 className="text-base md:text-lg font-semibold text-foreground">Data Explorer</h1>
          </div>
        </div>
        
        <div className="w-full md:w-64">
          <TableSelector value={selectedTable} onChange={handleTableChange} />
        </div>
      </header>

      <main className="flex-1 p-3 md:p-6 overflow-hidden min-h-0">
        <Tabs defaultValue="data" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4 md:mb-6 shrink-0">
            <TabsTrigger value="data" className="text-xs md:text-sm">
              <span className="hidden sm:inline">Live Data</span>
              <span className="sm:hidden">Data</span>
            </TabsTrigger>
            <TabsTrigger value="resolver" className="text-xs md:text-sm">
              <span className="hidden sm:inline">ID Resolver</span>
              <span className="sm:hidden">IDs</span>
            </TabsTrigger>
            <TabsTrigger value="columns" className="text-xs md:text-sm">
              <span className="hidden sm:inline">Column Details</span>
              <span className="sm:hidden">Columns</span>
            </TabsTrigger>
            <TabsTrigger value="flows" className="text-xs md:text-sm">
              <span className="hidden sm:inline">User Flows</span>
              <span className="sm:hidden">Flows</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="flex-1 mt-0 overflow-hidden">
            <TableDataViewer 
              tableName={selectedTable} 
              onRowSelect={setSelectedRow}
            />
          </TabsContent>

          <TabsContent value="resolver" className="flex-1 mt-0 overflow-auto">
            <Card className="h-full">
              <CardHeader className="px-3 md:px-6 py-4 md:py-6">
                <CardTitle className="text-lg md:text-xl">ID Resolver</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Paste any UUID to find associated information across all tables
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 md:px-6">
                <IDResolver />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="columns" className="flex-1 mt-0 overflow-auto">
            <Card className="h-full">
              <CardHeader className="px-3 md:px-6 py-4 md:py-6">
                <CardTitle className="text-lg md:text-xl">Column-Level Documentation</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Understand why each column exists and what breaks without it
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 md:px-6">
                <Accordion type="multiple" className="w-full space-y-2">
                  {Object.entries(columnDocumentation).map(([table, columns]) => (
                    <AccordionItem key={table} value={table}>
                      <AccordionTrigger className="hover:no-underline text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <Badge variant="outline" className="text-xs">{table}</Badge>
                          <span className="text-xs sm:text-sm text-muted-foreground">{Object.keys(columns).length} critical columns</span>
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

          <TabsContent value="flows" className="flex-1 mt-0 overflow-hidden">
            <Card className="h-full flex flex-col min-h-0">
              <CardHeader className="px-3 md:px-6 py-4 md:py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg md:text-xl">User Workflow Diagrams</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Visual representations of key system workflows
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/50 shrink-0 text-xs">
                    🐛 WF Debug Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto px-3 md:px-6">
                <WorkflowDiagrams />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
        </div>
    );
};

export default DatabaseExplorer;
