import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Download, Clock, Users, FileText, Wand2, BookOpen, Calendar, GraduationCap, Building2, Briefcase, Globe, Shield, Zap, Award, Pencil, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useExamTypes } from '@/hooks/useExamTypes';
import { useBoards } from '@/hooks/useBoards';
import { BoardClassSelector } from './BoardClassSelector';
import { useBoardClassHierarchy } from '@/hooks/useBoardClassHierarchy';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import * as LucideIcons from 'lucide-react';
import { TestManagementTabs } from './tests/TestManagementTabs';

interface Test {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  target_class?: string;
  target_board?: string;
  exam_domain?: string;
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
  target_class: string;
  target_board: string;
  exam_domain: string;
  difficulty: string;
  duration_minutes: number;
  passing_marks: number;
  status: string;
  chapter_id?: string;
}

const TestManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { examTypes, loading: examTypesLoading } = useExamTypes();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const { selectedBoard, selectedClass, setBoard, setClass, resetFromBoard, resetToBoard } = useBoardClassHierarchy();
  const [availableChapters, setAvailableChapters] = useState<any[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // Hydrate from URL on mount
  useEffect(() => {
    const domain = searchParams.get('domain');
    const board = searchParams.get('board');
    const cls = searchParams.get('class');
    
    if (domain) setSelectedDomain(domain);
    if (board && domain === 'school') setBoard(board);
    if (cls && domain === 'school') setClass(cls);
  }, []);

  // URL-aware handlers
  const handleDomainSelect = (domain: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('domain', domain);
    params.delete('board');
    params.delete('class');
    setSearchParams(params);
    
    setSelectedDomain(domain);
    resetFromBoard();
  };

  const handleBoardSelect = (board: string | null) => {
    setBoard(board);
    const params = new URLSearchParams(searchParams);
    if (board) params.set('board', board);
    else params.delete('board');
    params.delete('class');
    setSearchParams(params);
  };

  const handleClassSelect = (cls: string | null) => {
    setClass(cls);
    const params = new URLSearchParams(searchParams);
    if (cls) params.set('class', cls);
    else params.delete('class');
    setSearchParams(params);
  };

  const resetFromBoardURL = () => {
    resetFromBoard();
    const params = new URLSearchParams(searchParams);
    params.delete('board');
    params.delete('class');
    setSearchParams(params);
  };

  const resetToBoardURL = () => {
    resetToBoard();
    const params = new URLSearchParams(searchParams);
    params.delete('class');
    setSearchParams(params);
  };
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [mode, setMode] = useState<'batch-specific' | 'centralized'>('batch-specific');
  
  // Form persistence for test creation
  const {
    data: newTest,
    setData: setNewTest,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showResumeDialog,
    setShowResumeDialog,
    clearProgress,
    resumeProgress,
    startFresh
  } = useFormPersistence<NewTestData>(
    'test-creation-form',
    {
      title: '',
      description: '',
      subject: '',
      class: '',
      target_class: '',
      target_board: '',
      exam_domain: 'school',
      difficulty: 'medium',
      duration_minutes: 60,
      passing_marks: 50,
      status: 'draft'
    },
    24, // 24 hours expiry
    showCreateDialog
  );
  
  const { boards: availableBoards, requiresBoard } = useBoards(newTest.exam_domain);
  const { toast } = useToast();

  // Icon map for exam types
  const iconMap: Record<string, any> = {
    GraduationCap: LucideIcons.GraduationCap,
    BookOpen: LucideIcons.BookOpen,
    Briefcase: LucideIcons.Briefcase,
    Building2: LucideIcons.Building2,
    Globe: LucideIcons.Globe,
    Shield: LucideIcons.Shield,
    Zap: LucideIcons.Zap,
    Award: LucideIcons.Award,
    Pencil: LucideIcons.Pencil,
  };

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
        .insert({
          title: newTest.title,
          description: newTest.description,
          subject: newTest.subject,
          class: newTest.class,
          target_class: newTest.target_class as any,
          target_board: newTest.target_board as any,
          exam_domain: newTest.exam_domain,
          difficulty: newTest.difficulty as 'easy' | 'medium' | 'hard',
          duration_minutes: newTest.duration_minutes,
          passing_marks: newTest.passing_marks,
          total_marks: 0,
          created_by: user.id,
          is_published: newTest.status === 'published',
          chapter_id: selectedChapterId || null
        })
        .select()
        .single();

      if (error) throw error;

      setTests(prev => [{ ...data, question_count: 0, attempt_count: 0 }, ...prev]);
      setShowCreateDialog(false);
      
      // Clear saved form data on successful creation
      clearProgress();
      
      setNewTest({
        title: '',
        description: '',
        subject: '',
        class: '',
        target_class: '',
        target_board: '',
        exam_domain: 'school',
        difficulty: 'medium',
        duration_minutes: 60,
        passing_marks: 50,
        status: 'draft'
      });
      setSelectedChapterId('');
      setAvailableChapters([]);

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

  const getDomainTestCount = (examType: string) => {
    return tests.filter(t => t.exam_domain === examType).length;
  };

  const getTestCounts = () => {
    const domainTests = tests.filter(t => t.exam_domain === selectedDomain);
    const byBoard: Record<string, number> = {};
    const byClass: Record<string, Record<string, number>> = {};

    domainTests.forEach(test => {
      const board = test.target_board || 'General';
      const cls = test.target_class;
      
      byBoard[board] = (byBoard[board] || 0) + 1;
      
      if (!byClass[board]) byClass[board] = {};
      if (cls) {
        byClass[board][cls] = (byClass[board][cls] || 0) + 1;
      }
    });

    return { byBoard, byClass };
  };

  const filteredTests = tests.filter(t => {
    if (!selectedDomain) return false;
    if (t.exam_domain !== selectedDomain) return false;
    
    if (selectedDomain === 'school') {
      if (selectedBoard && t.target_board !== selectedBoard) return false;
      if (selectedClass && t.target_class !== selectedClass) return false;
    }
    
    return true;
  });

  const publishedTests = filteredTests.filter(t => t.status === 'published').length;
  const totalQuestions = filteredTests.reduce((sum, t) => sum + t.question_count, 0);

  const handleOpenCreateDialog = () => {
    setNewTest(prev => ({
      ...prev,
      exam_domain: selectedDomain || 'school',
      target_board: selectedBoard || '',
      target_class: selectedClass || ''
    }));
    setShowCreateDialog(true);
    setHasUnsavedChanges(false); // Reset unsaved changes when opening dialog
  };

  const handleChangeDomain = () => {
    setSelectedDomain(null);
    resetFromBoard();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Test Management</h2>
          <p className="text-muted-foreground mt-1">
            {selectedDomain 
              ? `Managing tests for ${examTypes.find(t => t.code === selectedDomain)?.display_name}` 
              : "Select an exam domain to manage tests"}
          </p>
        </div>
        {selectedDomain && (
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleChangeDomain} variant="outline">
              Change Domain
            </Button>
            
            {selectedDomain === 'school' && selectedBoard && (
              <Button variant="outline" onClick={resetFromBoard}>
                Change Board
              </Button>
            )}
            
            {selectedDomain === 'school' && selectedBoard && selectedClass && (
              <Button variant="outline" onClick={resetToBoard}>
                Change Class
              </Button>
            )}
          </div>
        )}
      </div>

      {!selectedDomain ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Select Exam Domain</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {examTypes.map((examType, index) => {
              const IconComponent = examType.icon_name 
                ? iconMap[examType.icon_name] || LucideIcons.BookOpen 
                : LucideIcons.BookOpen;
              const count = getDomainTestCount(examType.code);
              
              return (
                <Card 
                  key={examType.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 animate-fade-in hover:scale-105 border-2 hover:border-primary"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => handleDomainSelect(examType.code)}
                >
                  <CardContent className="p-6">
                    <div className={`w-full h-24 ${examType.color_class || 'bg-gradient-to-br from-gray-500 to-gray-600'} rounded-lg mb-4 flex items-center justify-center`}>
                      <IconComponent className="h-12 w-12 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{examType.display_name}</h4>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{count} tests</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : selectedDomain === 'school' && (!selectedBoard || !selectedClass) ? (
        <BoardClassSelector
          examType={selectedDomain}
          selectedBoard={selectedBoard}
          selectedClass={selectedClass}
          onBoardSelect={handleBoardSelect}
          onClassSelect={handleClassSelect}
          onReset={resetFromBoardURL}
          onResetToBoard={resetToBoardURL}
          studentCounts={getTestCounts()}
          countLabel="tests"
        />
      ) : (
        <>
          <Card className="animate-fade-in bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const examType = examTypes.find(e => e.code === selectedDomain);
                  const IconComponent = examType?.icon_name 
                    ? iconMap[examType.icon_name] || LucideIcons.BookOpen 
                    : LucideIcons.BookOpen;
                  return (
                    <>
                      <div className={`p-3 rounded-lg ${examType?.color_class || 'bg-primary/20'}`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{examType?.display_name}</h3>
                        {selectedDomain === 'school' && (
                          <p className="text-sm text-muted-foreground">
                            {selectedBoard} • Class {selectedClass}
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
              <Badge className="text-lg px-4 py-2">{filteredTests.length} tests</Badge>
            </CardContent>
          </Card>

          {/* NEW: Centralized Test Bank & Batch Assignment Tabs */}
          <TestManagementTabs />

          {/* LEGACY: Original Test Management (kept for backward compatibility) */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Legacy Tests (Old System)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This section shows tests created before the centralized system. 
                Use the tabs above for new centralized tests and batch assignments.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end mt-4">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" onClick={handleOpenCreateDialog}>
                  <Plus className="h-4 w-4" />
                  Create Test
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Test</DialogTitle>
                </DialogHeader>
                
                {/* Resume Dialog */}
                {showResumeDialog && (
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Draft found from previous session. Resume or start fresh?</span>
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline" onClick={startFresh}>
                          Start Fresh
                        </Button>
                        <Button size="sm" onClick={resumeProgress}>
                          Resume
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Test Title</Label>
                    <Input
                      id="title"
                      value={newTest.title}
                      onChange={(e) => {
                        setNewTest(prev => ({ ...prev, title: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
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
                      onChange={async (e) => {
                        const subject = e.target.value;
                        setNewTest(prev => ({ ...prev, subject }));
                        
                        // Fetch chapters for this subject and exam domain
                        if (subject && newTest.exam_domain) {
                          try {
                            const { data: chapters } = await supabase
                              .from('roadmap_chapters')
                              .select('id, chapter_name, subject, roadmap_id')
                              .eq('subject', subject)
                              .order('chapter_name');
                            
                            setAvailableChapters(chapters || []);
                          } catch (error) {
                            console.error('Error fetching chapters:', error);
                          }
                        } else {
                          setAvailableChapters([]);
                        }
                      }}
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
                
                {/* Chapter Selection */}
                {availableChapters.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="chapter">Chapter (Optional)</Label>
                    <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a chapter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {availableChapters.map((chapter) => (
                          <SelectItem key={chapter.id} value={chapter.id}>
                            {chapter.chapter_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="target_class">Target Class</Label>
                      <Select value={newTest.target_class} onValueChange={(value) => setNewTest(prev => ({ ...prev, target_class: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Class 1</SelectItem>
                          <SelectItem value="2">Class 2</SelectItem>
                          <SelectItem value="3">Class 3</SelectItem>
                          <SelectItem value="4">Class 4</SelectItem>
                          <SelectItem value="5">Class 5</SelectItem>
                          <SelectItem value="6">Class 6</SelectItem>
                          <SelectItem value="7">Class 7</SelectItem>
                          <SelectItem value="8">Class 8</SelectItem>
                          <SelectItem value="9">Class 9</SelectItem>
                          <SelectItem value="10">Class 10</SelectItem>
                          <SelectItem value="11">Class 11</SelectItem>
                          <SelectItem value="12">Class 12</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {requiresBoard && (
                      <div className="grid gap-2">
                        <Label htmlFor="target_board">Target Board</Label>
                        <Select value={newTest.target_board} onValueChange={(value) => setNewTest(prev => ({ ...prev, target_board: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select board" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableBoards.map(board => (
                              <SelectItem key={board} value={board}>
                                {board}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="exam_domain">Exam Domain</Label>
                    <Select value={newTest.exam_domain} onValueChange={(value) => setNewTest(prev => ({ ...prev, exam_domain: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school">School</SelectItem>
                        <SelectItem value="ssc">SSC</SelectItem>
                        <SelectItem value="upsc">UPSC</SelectItem>
                        <SelectItem value="gate">GATE</SelectItem>
                        <SelectItem value="cat">CAT</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Button onClick={handleCreateTest} disabled={!newTest.title || !newTest.subject || !newTest.target_class || !newTest.target_board}>
                    Create Test
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}

      {selectedDomain && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Domain Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{filteredTests.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Published Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{publishedTests}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{totalQuestions}</div>
              </CardContent>
            </Card>
          </div>

      {/* Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tests</CardTitle>
        </CardHeader>
        <CardContent>
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
              {filteredTests.map((test) => (
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
                        onClick={() => navigate(`/admin/test-builder/${test.id}`)}
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
        </CardContent>
      </Card>

      {selectedDomain && filteredTests.length === 0 && (
        <Card className="text-center p-12 animate-scale-in">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tests in this domain yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first test for {examTypes.find(e => e.code === selectedDomain)?.display_name}
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Test
          </Button>
        </Card>
      )}
        </>
      )}
    </div>
  );
};

export default TestManagement;