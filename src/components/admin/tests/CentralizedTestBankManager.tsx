import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Search, Filter, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CentralizedTest {
  id: string;
  title: string;
  description: string;
  exam_domain: string;
  board: string;
  class: string;
  subject: string;
  chapter_library_id: string;
  default_xp: number;
  question_count: number;
  total_marks: number;
  difficulty: string;
  created_at: string;
}

export const CentralizedTestBankManager = () => {
  const [tests, setTests] = useState<CentralizedTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('school');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newTest, setNewTest] = useState({
    title: '',
    description: '',
    default_xp: 100,
    difficulty: 'medium'
  });

  useEffect(() => {
    if (selectedDomain && selectedBoard && selectedClass && selectedSubject) {
      fetchChapters();
    }
  }, [selectedDomain, selectedBoard, selectedClass, selectedSubject]);

  useEffect(() => {
    if (selectedChapter) {
      fetchTests();
    }
  }, [selectedChapter]);

  const fetchChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapter_library')
        .select('*')
        .eq('exam_type', selectedDomain)
        .eq('subject', selectedSubject)
        .eq('class_level', selectedClass)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Error fetching chapters:', error);
      toast({ title: 'Error', description: 'Failed to fetch chapters', variant: 'destructive' });
    }
  };

  const fetchTests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          questions (count)
        `)
        .eq('is_centralized', true)
        .eq('chapter_library_id', selectedChapter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const testsWithCounts = (data || []).map(test => ({
        ...test,
        question_count: test.questions?.[0]?.count || 0
      }));
      
      setTests(testsWithCounts);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({ title: 'Error', description: 'Failed to fetch tests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    try {
      if (!newTest.title || !selectedChapter) {
        toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData: any = {
        title: newTest.title,
        description: newTest.description || '',
        exam_domain: selectedDomain,
        board: selectedBoard,
        class: selectedClass,
        subject: selectedSubject,
        chapter_library_id: selectedChapter,
        default_xp: newTest.default_xp,
        difficulty: newTest.difficulty,
        is_centralized: true,
        is_published: true,
        created_by: user.id,
        duration_minutes: 60,
        total_marks: 100,
        passing_marks: 40,
        target_class: selectedClass,
        target_board: selectedBoard
      };

      const { data, error } = await supabase
        .from('tests')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Success', description: 'Test created successfully' });
      setCreateDialogOpen(false);
      setNewTest({ title: '', description: '', default_xp: 100, difficulty: 'medium' });
      fetchTests();
    } catch (error) {
      console.error('Error creating test:', error);
      toast({ title: 'Error', description: 'Failed to create test', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Centralized Test Bank Manager
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage centralized tests that can be assigned to batches
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Exam Domain</Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school">School/Board Exams</SelectItem>
                  <SelectItem value="competitive">Competitive Exams</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Board</Label>
              <Select value={selectedBoard} onValueChange={setSelectedBoard} disabled={!selectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CBSE">CBSE</SelectItem>
                  <SelectItem value="ICSE">ICSE</SelectItem>
                  <SelectItem value="State Board">State Board</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedBoard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {[6, 7, 8, 9, 10, 11, 12].map(cls => (
                    <SelectItem key={cls} value={`Class ${cls}`}>Class {cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Science">Science</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Biology">Biology</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Social Science">Social Science</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Chapter</Label>
              <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map(chapter => (
                    <SelectItem key={chapter.id} value={chapter.id}>{chapter.chapter_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tests List */}
          {selectedChapter && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Tests in Selected Chapter</h3>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Test
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Centralized Test</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Test Title *</Label>
                        <Input
                          value={newTest.title}
                          onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                          placeholder="e.g., Atoms and Molecules - Unit Test 1"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={newTest.description}
                          onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                          placeholder="Brief description of the test"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Default XP</Label>
                          <Input
                            type="number"
                            value={newTest.default_xp}
                            onChange={(e) => setNewTest({ ...newTest, default_xp: parseInt(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Difficulty</Label>
                          <Select 
                            value={newTest.difficulty} 
                            onValueChange={(value) => setNewTest({ ...newTest, difficulty: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button onClick={handleCreateTest} className="w-full">
                        Create Test
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tests found. Create your first test!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tests.map(test => (
                    <Card key={test.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-base">{test.title}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="secondary">{test.difficulty}</Badge>
                          <Badge variant="outline">{test.default_xp} XP</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">{test.description}</p>
                        <div className="flex justify-between text-sm">
                          <span>{test.question_count} questions</span>
                          <span>{test.total_marks} marks</span>
                        </div>
                        <Button variant="outline" className="w-full" size="sm">
                          Manage Questions
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
