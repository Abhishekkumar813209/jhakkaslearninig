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
    <div className="min-h-screen w-full bg-background">
      {/* Header with back button */}
      <header className="h-14 border-b border-border bg-card px-6 flex items-center gap-4 sticky top-0 z-10">
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

      <main className="flex-1 p-6 flex gap-6 overflow-hidden">
            {/* Left: Database Viewer (60%) */}
            <div className="flex-[3] flex flex-col gap-4 min-w-0 overflow-hidden">
              <TableSelector value={selectedTable} onChange={setSelectedTable} />
              
              <Tabs defaultValue="data" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-3 shrink-0">
                  <TabsTrigger value="data">Live Data</TabsTrigger>
                  <TabsTrigger value="columns">Column Details</TabsTrigger>
                  <TabsTrigger value="flows">User Flows</TabsTrigger>
                </TabsList>

                <TabsContent value="data" className="flex-1 mt-4 overflow-hidden">
                  <TableDataViewer 
                    tableName={selectedTable} 
                    onRowSelect={setSelectedRow}
                  />
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
                        {Object.entries(columnDocumentation).map(([tableName, columns]) => (
                          <AccordionItem key={tableName} value={tableName}>
                            <AccordionTrigger className="text-lg font-semibold">
                              {tableName}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4">
                                {Object.entries(columns).map(([colName, doc]: [string, any]) => (
                                  <div key={colName} className="border-l-4 border-primary/20 pl-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                        {colName}
                                      </code>
                                      <Badge variant={
                                        doc.criticality === 'critical' ? 'destructive' :
                                        doc.criticality === 'important' ? 'default' : 'outline'
                                      }>
                                        {doc.criticality}
                                      </Badge>
                                    </div>
                                    <p className="text-sm"><strong>Why:</strong> {doc.why}</p>
                                    <div className="text-sm">
                                      <strong>Without it:</strong>
                                      <ul className="list-disc list-inside space-y-1 mt-1 text-muted-foreground">
                                        {doc.without.map((issue: string, i: number) => (
                                          <li key={i}>{issue}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <Alert>
                                      <AlertDescription>
                                        <strong>Example:</strong> {doc.example}
                                      </AlertDescription>
                                    </Alert>
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
            </div>

            {/* Right: AI Assistant (40%) */}
            <div className="flex-[2] overflow-hidden">
              <AIAssistantPanel 
                context={{
                  tableName: selectedTable || undefined,
                  selectedRow: selectedRow,
                  tableCount: undefined
                }}
              />
            </div>
          </main>
        </div>
    );
};

export default DatabaseExplorer;
