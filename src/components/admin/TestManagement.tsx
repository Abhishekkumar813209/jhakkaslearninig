import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Download, Clock, Users, FileText, Wand2, BookOpen, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Test {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  difficulty: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  status: string;
  created_at: string;
  question_count: number;
  attempt_count: number;
}

interface NewTestData {
  title: string;
  description: string;
  subject: string;
  class: string;
  difficulty: string;
  duration_minutes: number;
  passing_marks: number;
  status: string;
}

const TestManagement: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTest, setNewTest] = useState<NewTestData>({
    title: '',
    description: '',
    subject: '',
    class: '',
    difficulty: 'medium',
    duration_minutes: 60,
    passing_marks: 50,
    status: 'draft'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      console.log('TestManagement: Starting to fetch tests...');
      
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      console.log('TestManagement: Tests query result:', { data, error });

      if (error) {
        console.error('TestManagement: Error fetching tests:', error);
        throw error;
      }

      // Count questions and attempts for each test
      console.log('TestManagement: Fetching counts for', data?.length || 0, 'tests');
      const testsWithCounts = await Promise.all(
        (data || []).map(async (test) => {
          console.log('TestManagement: Processing test:', test.id, test.title);
          
          const [questionsResult, attemptsResult] = await Promise.all([
            supabase.from('questions').select('id', { count: 'exact' }).eq('test_id', test.id),
            supabase.from('test_attempts').select('id', { count: 'exact' }).eq('test_id', test.id)
          ]);

          return {
            ...test,
            question_count: questionsResult.count || 0,
            attempt_count: attemptsResult.count || 0,
            status: test.is_published ? 'published' : 'draft'
          };
        })
      );

      console.log('TestManagement: Final tests with counts:', testsWithCounts);
      setTests(testsWithCounts);
    } catch (error) {
      console.error('TestManagement: Error in fetchTests:', error);
      toast({
        title: "Error",
        description: `Failed to fetch tests: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create tests.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('tests')
        .insert([{
          title: newTest.title,
          description: newTest.description,
          subject: newTest.subject,
          class: newTest.class,
          difficulty: newTest.difficulty as 'easy' | 'medium' | 'hard',
          duration_minutes: newTest.duration_minutes,
          passing_marks: newTest.passing_marks,
          total_marks: 0,
          created_by: user.id,
          is_published: newTest.status === 'published'
        }])
        .select()
        .single();

      if (error) throw error;

      setTests(prev => [{ ...data, question_count: 0, attempt_count: 0 }, ...prev]);
      setShowCreateDialog(false);
      setNewTest({
        title: '',
        description: '',
        subject: '',
        class: '',
        difficulty: 'medium',
        duration_minutes: 60,
        passing_marks: 50,
        status: 'draft'
      });

      toast({
        title: "Success",
        description: "Test created successfully!"
      });
    } catch (error) {
      console.error('Error creating test:', error);
      toast({
        title: "Error",
        description: "Failed to create test. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;

      setTests(prev => prev.filter(test => test.id !== testId));
      
      toast({
        title: "Success",
        description: "Test deleted successfully!"
      });
    } catch (error) {
      console.error('Error deleting test:', error);
      toast({
        title: "Error",
        description: "Failed to delete test. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'outline' as const, text: 'Draft' },
      published: { variant: 'default' as const, text: 'Published' },
      archived: { variant: 'secondary' as const, text: 'Archived' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getDifficultyBadge = (difficulty: string) => {
    const difficultyConfig = {
      easy: { variant: 'default' as const, className: 'bg-green-500' },
      medium: { variant: 'default' as const, className: 'bg-yellow-500' },
      hard: { variant: 'default' as const, className: 'bg-red-500' }
    };
    
    const config = difficultyConfig[difficulty.toLowerCase() as keyof typeof difficultyConfig] || difficultyConfig.medium;
    return <Badge variant={config.variant} className={config.className}>{difficulty}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Test Management</h2>
          <p className="text-muted-foreground">Create, manage, and monitor your tests and exams</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Test
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Test</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Test Title</Label>
                <Input
                  id="title"
                  value={newTest.title}
                  onChange={(e) => setNewTest(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter test title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTest.description}
                  onChange={(e) => setNewTest(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the test"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={newTest.subject}
                    onChange={(e) => setNewTest(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g., Mathematics"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="class">Class</Label>
                  <Input
                    id="class"
                    value={newTest.class}
                    onChange={(e) => setNewTest(prev => ({ ...prev, class: e.target.value }))}
                    placeholder="e.g., 10th Grade"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={newTest.difficulty} onValueChange={(value) => setNewTest(prev => ({ ...prev, difficulty: value }))}>
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
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newTest.duration_minutes}
                    onChange={(e) => setNewTest(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                    min="1"
                    max="300"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="passing_marks">Passing Marks (%)</Label>
                <Input
                  id="passing_marks"
                  type="number"
                  value={newTest.passing_marks}
                  onChange={(e) => setNewTest(prev => ({ ...prev, passing_marks: parseInt(e.target.value) || 50 }))}
                  min="1"
                  max="100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTest} disabled={!newTest.title || !newTest.subject}>
                Create Test
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Tests</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tests.filter(test => test.status === 'published').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tests.reduce((sum, test) => sum + test.question_count, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tests.reduce((sum, test) => sum + test.attempt_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tests created yet</h3>
              <p className="text-muted-foreground mb-4">Create your first test to get started with the Test Builder</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">{test.title}</TableCell>
                      <TableCell>{test.subject}</TableCell>
                      <TableCell>{test.class}</TableCell>
                      <TableCell>{getDifficultyBadge(test.difficulty)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {test.duration_minutes}m
                        </div>
                      </TableCell>
                      <TableCell>{test.question_count}</TableCell>
                      <TableCell>{test.attempt_count}</TableCell>
                      <TableCell>{getStatusBadge(test.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`/admin/test-builder/${test.id}`, '_blank')}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Generate PDF",
                                description: "Printable test generation will be available soon!",
                              });
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteTest(test.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestManagement;