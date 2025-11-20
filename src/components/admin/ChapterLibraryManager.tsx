import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExamTypes } from '@/hooks/useExamTypes';
import { useBoards } from '@/hooks/useBoards';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Library, Sparkles, CheckCircle2, BookOpen, Plus, Edit, Trash2, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ChapterLibrary {
  id: string;
  exam_type: string;
  subject: string;
  chapter_name: string;
  full_topics: any;
  topics_generated: boolean;
  suggested_days: number;
  entry_source: string;
  is_active: boolean;
}

export const ChapterLibraryManager = () => {
  const { examTypes } = useExamTypes();
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  const { boards, requiresBoard, requiresClass } = useBoards(selectedDomain);
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  
  const [chapters, setChapters] = useState<ChapterLibrary[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // New states for AI subject fetching and manual input
  const [fetchingSubjects, setFetchingSubjects] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [subjectSource, setSubjectSource] = useState<'cache' | 'ai' | 'database' | null>(null);

  // Chapter entry mode states
  const [entryMode, setEntryMode] = useState<'manual' | 'ai'>('manual');
  const [manualChapterData, setManualChapterData] = useState({
    chapter_name: '',
    suggested_days: 5
  });
  const [showBulkChapterDialog, setShowBulkChapterDialog] = useState(false);
  const [bulkChaptersText, setBulkChaptersText] = useState('');

  // Topic management states
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [manualTopics, setManualTopics] = useState<any[]>([]);
  const [currentTopicForm, setCurrentTopicForm] = useState({
    topic_name: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard'
  });
  const [bulkTopicsText, setBulkTopicsText] = useState('');
  const [showTopicEditor, setShowTopicEditor] = useState(false);

  // Fetch classes when board/domain selected
  useEffect(() => {
    if (selectedDomain) {
      const examType = examTypes.find(e => e.code === selectedDomain);
      if (examType?.requires_class) {
        // Full range for School/Board exams, otherwise 11-12 for competitive
        if (selectedDomain.toLowerCase() === 'school') {
          setClasses(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
        } else {
          // Competitive exams typically 11-12
          setClasses(['11', '12']);
        }
      } else {
        setClasses([]);
      }
    }
  }, [selectedDomain, examTypes]);

  // Fetch existing subjects from chapter_library for autocomplete
  useEffect(() => {
    const fetchExistingSubjects = async () => {
      const { data } = await supabase
        .from('chapter_library')
        .select('subject')
        .eq('is_active', true);
      
      if (data) {
        const uniqueSubjects = [...new Set(data.map(d => d.subject))];
        setExistingSubjects(uniqueSubjects.sort());
      }
    };
    
    fetchExistingSubjects();
  }, []);

  // Fetch subjects from exam_templates
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedDomain) return;
      
      const query = supabase
        .from('exam_templates')
        .select('standard_subjects')
        .eq('exam_type', selectedDomain)
        .eq('is_active', true);

      if (requiresBoard && selectedBoard) {
        query.eq('board', selectedBoard);
      }
      if (requiresClass && selectedClass) {
        query.eq('student_class', selectedClass);
      }

      const { data, error } = await query.maybeSingle();
      
      if (error) {
        console.error('Error fetching subjects:', error);
        setSubjects([]);
        setSubjectSource(null);
        return;
      }

      if (data?.standard_subjects) {
        const subjectList = Array.isArray(data.standard_subjects) 
          ? (data.standard_subjects as string[]) 
          : [];
        setSubjects(subjectList);
        setSubjectSource('database');
      } else {
        setSubjects([]);
        setSubjectSource(null);
      }
    };

    fetchSubjects();
  }, [selectedDomain, selectedBoard, selectedClass, requiresBoard, requiresClass]);

  // Handler: Fetch subjects with AI
  const handleFetchSubjectsWithAI = async () => {
    setFetchingSubjects(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-exam-subjects', {
        body: {
          exam_type: selectedDomain,
          board: selectedBoard || '',
          student_class: selectedClass || '',
          exam_name: ''
        }
      });

      if (error) throw error;
      
      if (data?.subjects && Array.isArray(data.subjects)) {
        setSubjects(data.subjects);
        setSubjectSource(data.from_cache ? 'cache' : 'ai');
        toast.success(`Found ${data.subjects.length} subjects`, {
          description: data.from_cache ? 'Loaded from cache' : 'Generated with AI'
        });
      }
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to fetch subjects with AI');
    } finally {
      setFetchingSubjects(false);
    }
  };

  // Handler: Add custom subject
  const handleAddCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed]);
      setSelectedSubject(trimmed);
      setCustomSubject('');
      setShowManualInput(false);
      toast.success(`Added "${trimmed}" to subjects`);
    }
  };

  // Fetch existing chapter library
  const fetchChapterLibrary = async () => {
    if (!selectedDomain || !selectedSubject) return;

    setLoading(true);
    try {
      const filters: any = {
        exam_type: selectedDomain,
        subject: selectedSubject,
        is_active: true
      };
      
      // Add class_level filter for School/Board exams
      if (selectedClass) {
        filters.class_level = selectedClass;
      }
      
      const { data, error } = await supabase
        .from('chapter_library')
        .select('id, exam_type, subject, class_level, chapter_name, suggested_days, entry_source, topics_generated, full_topics, is_active, created_at, updated_at')
        .match(filters)
        .order('chapter_name');

      if (error) throw error;
      setChapters(data || []);
    } catch (error: any) {
      console.error('Error fetching chapter library:', error);
      toast.error('Failed to fetch chapter library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapterLibrary();
  }, [selectedDomain, selectedSubject]);

  // Generate chapter library (FIXED: No auto-topic generation)
  const handleGenerateLibrary = async () => {
    if (!selectedDomain || !selectedSubject) {
      toast.error('Please select exam type and subject');
      return;
    }

    setGenerating(true);
    const toastId = toast.loading('Generating chapter library with AI...');

    try {
      const { data, error } = await supabase.functions.invoke('generate-chapter-library', {
        body: { 
          exam_type: selectedDomain, 
          subject: selectedSubject,
          class_level: selectedClass || null
        }
      });

      if (error) throw error;

      if (data.status === 'exists') {
        toast.success('Chapter library already exists!', { id: toastId });
        fetchChapterLibrary();
        return;
      }

      const chapterCount = data.chapters?.length || 0;
      toast.success(`Generated ${chapterCount} chapters! Add topics for each chapter individually.`, { id: toastId });
      
      fetchChapterLibrary();
    } catch (error: any) {
      console.error('Error generating library:', error);
      toast.error(error.message || 'Failed to generate chapter library', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  // Manual chapter entry handler
  const handleManualChapterAdd = async () => {
    if (!selectedDomain || !selectedSubject) {
      toast.error('Please select exam domain and subject');
      return;
    }
    
    if (!manualChapterData.chapter_name.trim()) {
      toast.error('Chapter name is required');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('chapter_library')
        .insert({
          exam_type: selectedDomain,
          class_level: selectedClass || null,
          subject: selectedSubject,
          chapter_name: manualChapterData.chapter_name,
          suggested_days: manualChapterData.suggested_days,
          entry_source: 'manual',
          topics_generated: false,
          full_topics: []
        });
      
      if (error) throw error;
      
      toast.success('Chapter added successfully!');
      setManualChapterData({
        chapter_name: '',
        suggested_days: 5
      });
      
      fetchChapterLibrary();
    } catch (error: any) {
      console.error('Error adding manual chapter:', error);
      toast.error('Failed to add chapter');
    }
  };

  // Bulk chapter add handler
  const handleBulkChapterAdd = async () => {
    const lines = bulkChaptersText.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    
    if (lines.length === 0) {
      toast.error('Please enter chapter names');
      return;
    }
    
    try {
      const chaptersToInsert = lines.map(name => ({
        exam_type: selectedDomain,
        class_level: selectedClass || null,
        subject: selectedSubject,
        chapter_name: name,
        suggested_days: 5,
        entry_source: 'manual',
        topics_generated: false,
        full_topics: []
      }));
      
      const { error } = await supabase
        .from('chapter_library')
        .insert(chaptersToInsert);
      
      if (error) throw error;
      
      toast.success(`${lines.length} chapters added!`);
      setShowBulkChapterDialog(false);
      setBulkChaptersText('');
      fetchChapterLibrary();
    } catch (error: any) {
      console.error('Error bulk adding chapters:', error);
      toast.error('Failed to add chapters');
    }
  };

  // Generate topics for a single chapter
  const handleGenerateTopics = async (chapterId: string, force = false) => {
    const toastId = toast.loading('Generating comprehensive topic list...');
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-full-chapter-topics', {
        body: { chapter_library_id: chapterId, force_regenerate: force }
      });

      if (error) throw error;
      
      toast.success(`Generated ${data.topics.length} topics!`, { id: toastId });
      fetchChapterLibrary();
    } catch (error: any) {
      console.error('Error generating topics:', error);
      toast.error(error.message || 'Failed to generate topics', { id: toastId });
    }
  };

  // Manual topic handlers
  const handleAddTopic = () => {
    if (!currentTopicForm.topic_name.trim()) {
      toast.error('Topic name is required');
      return;
    }
    
    const newTopic = {
      topic_name: currentTopicForm.topic_name.trim(),
      difficulty: currentTopicForm.difficulty
    };
    
    console.log('Adding topic:', newTopic);
    console.log('Current topics before add:', manualTopics.length);
    setManualTopics(prev => [...prev, newTopic]);
    setCurrentTopicForm({
      topic_name: '',
      difficulty: 'medium'
    });
    toast.success('Topic added!');
  };

  const handleSaveTopicsToChapter = async (chapterId: string) => {
    if (manualTopics.length === 0) {
      toast.error('Please add at least one topic');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('chapter_library')
        .update({
          full_topics: manualTopics,
          topics_generated: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', chapterId);
      
      if (error) throw error;
      
      toast.success(`Saved ${manualTopics.length} topics!`);
      setShowTopicEditor(false);
      setManualTopics([]);
      fetchChapterLibrary();
    } catch (error: any) {
      console.error('Error saving topics:', error);
      toast.error('Failed to save topics');
    }
  };

  const handleBulkImport = () => {
    const lines = bulkTopicsText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);
    
    if (lines.length === 0) {
      toast.error('Please enter topic names');
      return;
    }
    
    const bulkTopics = lines.map((name: string) => ({
      topic_name: name,
      difficulty: 'medium' as const
    }));
    
    setManualTopics([...manualTopics, ...bulkTopics]);
    setBulkTopicsText('');
    toast.success(`Imported ${lines.length} topics!`);
  };

  const handleEditTopic = (index: number) => {
    const topic = manualTopics[index];
    setCurrentTopicForm({
      topic_name: topic.topic_name,
      difficulty: topic.difficulty
    });
    setManualTopics(manualTopics.filter((_: any, i: number) => i !== index));
  };

  const handleDeleteTopic = (index: number) => {
    setManualTopics(manualTopics.filter((_: any, i: number) => i !== index));
    toast.success('Topic removed');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Chapter Library Manager
          </CardTitle>
          <CardDescription>
            Generate centralized chapter library with comprehensive topic lists for question assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Exam Domain</label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {examTypes.map((exam) => (
                    <SelectItem key={exam.id} value={exam.code}>
                      {exam.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresBoard && (
              <div>
                <label className="text-sm font-medium mb-2 block">Board</label>
                <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board} value={board}>
                        {board}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedDomain && (requiresClass || selectedDomain.toLowerCase() === 'school') && (
              <div>
                <label className="text-sm font-medium mb-2 block">Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        Class {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium block">Subject</label>
              <div className="flex items-center gap-2">
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                  disabled={!selectedDomain || subjects.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subjects.length === 0 ? "No subjects available" : "Select subject"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleFetchSubjectsWithAI}
                  disabled={!selectedDomain || fetchingSubjects || (requiresBoard && !selectedBoard) || (requiresClass && !selectedClass)}
                  variant="outline"
                  size="icon"
                  title="Fetch subjects with AI"
                >
                  {fetchingSubjects ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
                
                <Button 
                  onClick={() => setShowManualInput(!showManualInput)} 
                  variant="ghost" 
                  size="icon"
                  title="Add custom subject"
                  disabled={!selectedDomain}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {subjects.length > 0 && subjectSource && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {subjects.length} subjects
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {subjectSource === 'cache' && '📋 Cached'}
                    {subjectSource === 'ai' && '🤖 AI Generated'}
                    {subjectSource === 'database' && '📚 Database'}
                  </Badge>
                </div>
              )}
              
              {subjects.length === 0 && selectedDomain && !fetchingSubjects && (
                <div className="p-4 border border-dashed rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground text-center">
                    No subjects found. Click <Sparkles className="inline h-4 w-4 mx-1" /> to fetch with AI
                    or <Plus className="inline h-4 w-4 mx-1" /> to add manually
                  </p>
                </div>
              )}
              
              {showManualInput && (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                  <Input
                    placeholder="Enter custom subject name"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customSubject.trim()) {
                        handleAddCustomSubject();
                      }
                    }}
                    list="subject-suggestions"
                  />
                  <datalist id="subject-suggestions">
                    {existingSubjects.map(sub => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                  
                  <Button 
                    onClick={handleAddCustomSubject}
                    disabled={!customSubject.trim()}
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Button 
            onClick={handleGenerateLibrary}
            disabled={!selectedDomain || !selectedSubject || generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Chapter Library with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Entry Mode Toggle & Forms */}
      {selectedDomain && selectedSubject && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Entry Mode:</label>
            <div className="flex gap-2">
              <Button
                variant={entryMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setEntryMode('manual')}
                size="sm"
              >
                ✍️ Manual Entry
              </Button>
              <Button
                variant={entryMode === 'ai' ? 'default' : 'outline'}
                onClick={() => setEntryMode('ai')}
                size="sm"
              >
                🤖 AI Generation
              </Button>
            </div>
          </div>

          {entryMode === 'manual' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Chapter Manually</CardTitle>
                <CardDescription>Enter chapter details or bulk import</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Chapter Name *</Label>
                    <Input
                      value={manualChapterData.chapter_name}
                      onChange={(e) => setManualChapterData({...manualChapterData, chapter_name: e.target.value})}
                      placeholder="e.g., Introduction to Algebra"
                    />
                  </div>
                  
                  <div>
                    <Label>Suggested Days (Optional)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={manualChapterData.suggested_days}
                      onChange={(e) => setManualChapterData({...manualChapterData, suggested_days: parseInt(e.target.value) || 5})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 5 days. Adjust based on chapter complexity.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleManualChapterAdd}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Chapter
                  </Button>
                  <Button onClick={() => setShowBulkChapterDialog(true)} variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Bulk Add Chapters
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-center">
              <Button 
                onClick={handleGenerateLibrary}
                disabled={generating || loading}
                size="lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Generate Chapter Library with AI'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Chapter List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : chapters.length > 0 ? (
        <div className="grid gap-4">
          {chapters.map((chapter) => (
            <Card key={chapter.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{chapter.chapter_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        {chapter.suggested_days} day{chapter.suggested_days !== 1 ? 's' : ''}
                      </Badge>
                      {chapter.topics_generated && chapter.full_topics?.length > 0 ? (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {chapter.full_topics.length} Topics
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No Topics</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={chapter.topics_generated ? "outline" : "default"}
                      onClick={() => handleGenerateTopics(chapter.id, chapter.topics_generated)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI {chapter.topics_generated ? 'Regenerate' : 'Generate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingChapterId(chapter.id);
                        setManualTopics(chapter.full_topics || []);
                        setShowTopicEditor(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Manually
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {chapter.topics_generated && chapter.full_topics?.length > 0 && (
                <CardContent>
                  <div className="text-sm space-y-2">
                    <p className="font-medium text-muted-foreground">Comprehensive Topic List:</p>
                    <div className="grid gap-2">
                      {chapter.full_topics.map((topic: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground">{idx + 1}.</span>
                          <div className="flex-1">
                            <span className="font-medium">{topic.topic_name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{topic.difficulty}</Badge>
                              <Badge variant="outline" className="text-xs">Weightage: {topic.weightage}/10</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : selectedDomain && selectedSubject ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
          No chapter library found. Click "Generate Chapter Library with AI" to create one.
        </CardContent>
      </Card>
    ) : null}

    {/* Topic Editor Dialog */}
    <Dialog open={showTopicEditor} onOpenChange={setShowTopicEditor}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Topics</DialogTitle>
          <DialogDescription>
            Add, edit, or organize topics for this chapter
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1">Add Single Topic</TabsTrigger>
            <TabsTrigger value="bulk" className="flex-1">Bulk Import</TabsTrigger>
            <TabsTrigger value="list" className="flex-1">Topic List ({manualTopics.length})</TabsTrigger>
          </TabsList>
          
          {/* Single Topic Form */}
          <TabsContent value="single" className="space-y-4 mt-4">
            <div>
              <Label>Topic Name *</Label>
              <Input
                value={currentTopicForm.topic_name}
                onChange={(e) => setCurrentTopicForm({...currentTopicForm, topic_name: e.target.value})}
                placeholder="e.g., Laws of Motion"
              />
            </div>
            
            <div>
              <Label>Difficulty</Label>
              <Select
                value={currentTopicForm.difficulty}
                onValueChange={(val: 'easy' | 'medium' | 'hard') => setCurrentTopicForm({...currentTopicForm, difficulty: val})}
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
            
            <Button type="button" onClick={handleAddTopic}>
              <Plus className="w-4 h-4 mr-2" />
              Add Topic
            </Button>
            
            {/* Topics Preview */}
            {manualTopics.length > 0 && (
              <div className="space-y-2 mt-4 p-4 bg-muted/50 rounded-lg">
                <Label className="text-sm font-semibold">
                  Added Topics ({manualTopics.length})
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {manualTopics.map((topic, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{topic.topic_name}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {topic.difficulty}
                        </Badge>
                      </div>
                      <Button 
                        type="button"
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteTopic(idx)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Bulk Import */}
          <TabsContent value="bulk" className="space-y-4 mt-4">
            <Label>Enter topic names (one per line)</Label>
            <Textarea
              value={bulkTopicsText}
              onChange={(e) => setBulkTopicsText(e.target.value)}
              placeholder="Laws of Motion&#10;Work and Energy&#10;Gravitation"
              rows={10}
            />
            <Button onClick={handleBulkImport} disabled={!bulkTopicsText.trim()}>
              Import {bulkTopicsText.split('\n').filter(l => l.trim()).length} Topics
            </Button>
          </TabsContent>
          
          {/* Topic List */}
          <TabsContent value="list" className="space-y-2 mt-4">
            {manualTopics.map((topic, idx) => (
              <Card key={idx}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <p className="font-medium">{topic.topic_name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={
                        topic.difficulty === 'easy' ? 'default' :
                        topic.difficulty === 'medium' ? 'secondary' :
                        'destructive'
                      }>
                        {topic.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditTopic(idx)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteTopic(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {manualTopics.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No topics added yet. Use "Add Single Topic" or "Bulk Import" tabs.
              </p>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowTopicEditor(false)}>
            Cancel
          </Button>
          <Button onClick={() => editingChapterId && handleSaveTopicsToChapter(editingChapterId)}>
            Save {manualTopics.length} Topics
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      {/* Bulk Chapter Add Dialog */}
      <Dialog open={showBulkChapterDialog} onOpenChange={setShowBulkChapterDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Add Chapters</DialogTitle>
            <DialogDescription>
              Enter chapter names (one per line)
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            value={bulkChaptersText}
            onChange={(e) => setBulkChaptersText(e.target.value)}
            placeholder="Introduction to Algebra&#10;Linear Equations&#10;Quadratic Equations&#10;Polynomials"
            rows={12}
            className="font-mono"
          />
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {bulkChaptersText.split('\n').filter(l => l.trim()).length} chapters to add
            </span>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkChapterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkChapterAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Chapters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
