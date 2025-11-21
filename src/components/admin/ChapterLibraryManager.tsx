import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, BookOpen, Sparkles, Library, Save, FileText, CheckCircle2, Settings, Pencil } from "lucide-react";
import { useExamTypes } from "@/hooks/useExamTypes";
import { useBoards } from "@/hooks/useBoards";

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { examTypes } = useExamTypes();
  const [isClient, setIsClient] = useState(false);
  
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
  const [showTopicEditor, setShowTopicEditor] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<{[chapterId: string]: number[]}>({});

  // Chapter edit states
  const [showEditChapterDialog, setShowEditChapterDialog] = useState(false);
  const [editingChapterData, setEditingChapterData] = useState({
    id: '',
    chapter_name: '',
    suggested_days: 5
  });

  // Bulk chapter selection
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);

  // Topic edit states
  const [editingTopicIndex, setEditingTopicIndex] = useState<{chapterId: string, index: number} | null>(null);
  const [editingTopicData, setEditingTopicData] = useState<{topic_name: string, difficulty: 'easy' | 'medium' | 'hard'} | null>(null);
  const [editingDialogTopicIndex, setEditingDialogTopicIndex] = useState<number | null>(null);
  const [editingDialogTopicData, setEditingDialogTopicData] = useState<{topic_name: string, difficulty: 'easy' | 'medium' | 'hard'} | null>(null);

  // Set isClient for hydration safety
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize filters from URL on mount
  useEffect(() => {
    if (isClient) {
      const examDomain = searchParams.get('exam_domain');
      const board = searchParams.get('board');
      const studentClass = searchParams.get('class');
      const subject = searchParams.get('subject');
      
      if (examDomain) setSelectedDomain(examDomain);
      if (board) setSelectedBoard(board);
      if (studentClass) setSelectedClass(studentClass);
      if (subject) setSelectedSubject(subject);
    }
  }, [isClient]);

  // Sync selectedDomain with URL
  useEffect(() => {
    if (isClient && selectedDomain) {
      const params = new URLSearchParams(searchParams);
      params.set('exam_domain', selectedDomain);
      navigate(`?${params.toString()}`, { replace: true });
    }
  }, [selectedDomain, isClient]);

  // Sync selectedBoard with URL
  useEffect(() => {
    if (isClient && selectedBoard) {
      const params = new URLSearchParams(searchParams);
      params.set('board', selectedBoard);
      navigate(`?${params.toString()}`, { replace: true });
    }
  }, [selectedBoard, isClient]);

  // Sync selectedClass with URL
  useEffect(() => {
    if (isClient && selectedClass) {
      const params = new URLSearchParams(searchParams);
      params.set('class', selectedClass);
      navigate(`?${params.toString()}`, { replace: true });
    }
  }, [selectedClass, isClient]);

  // Sync selectedSubject with URL
  useEffect(() => {
    if (isClient && selectedSubject) {
      const params = new URLSearchParams(searchParams);
      params.set('subject', selectedSubject);
      navigate(`?${params.toString()}`, { replace: true });
    }
  }, [selectedSubject, isClient]);

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

  // Helper: Get correct exam_name based on domain (includes class for uniqueness)
  const getExamName = () => {
    if (selectedDomain === 'school') {
      const board = selectedBoard || selectedDomain;
      const classInfo = selectedClass ? `_Class_${selectedClass}` : '';
      return `${board}${classInfo}`; // e.g., 'CBSE_Class_12', 'CBSE_Class_9'
    }
    return selectedDomain;
  };

  // Reset subjects when filters change
  useEffect(() => {
    setSubjects([]);
    setSelectedSubject(null);
    setSubjectSource(null);
  }, [selectedDomain, selectedBoard, selectedClass]);

  // Fetch subjects from exam_templates
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedDomain) {
        console.log('❌ No domain selected');
        setSubjects([]);
        setSubjectSource(null);
        return;
      }

      // Must have board selected for school domain
      if (selectedDomain === 'school' && !selectedBoard) {
        console.log('❌ School domain requires board');
        setSubjects([]);
        setSubjectSource(null);
        return;
      }

      // Must have class selected if required
      if (requiresClass && !selectedClass) {
        console.log('❌ Class required but not selected');
        setSubjects([]);
        setSubjectSource(null);
        return;
      }
      
      const examName = getExamName();
      console.log('🔍 Fetching subjects for:', { 
        examName, 
        domain: selectedDomain, 
        board: selectedBoard, 
        class: selectedClass 
      });
      
      const { data, error } = await supabase
        .from('exam_templates')
        .select('standard_subjects')
        .eq('exam_type', selectedDomain)
        .eq('exam_name', examName)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Error fetching subjects:', error);
        toast.error('Failed to fetch subjects');
        setSubjects([]);
        setSubjectSource(null);
        return;
      }

      if (data?.standard_subjects) {
        const subjectList = Array.isArray(data.standard_subjects) 
          ? (data.standard_subjects as string[]) 
          : [];
        console.log('✅ Found subjects:', subjectList);
        setSubjects(subjectList);
        setSubjectSource('database');
      } else {
        console.log('ℹ️ No subjects found, showing empty state');
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
      const examName = getExamName();
      const { data, error } = await supabase.functions.invoke('fetch-exam-subjects', {
        body: {
          exam_type: selectedDomain,
          board: selectedBoard || '',
          student_class: selectedClass || '',
          exam_name: examName
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

  // Handler: Add custom subject and save to database
  const handleAddCustomSubject = async () => {
    const trimmed = customSubject.trim();
    if (!trimmed) {
      toast.error('Please enter a subject name');
      return;
    }
    
    if (subjects.includes(trimmed)) {
      toast.error('Subject already exists');
      return;
    }

    try {
      const examName = getExamName();
      
      // Check if exam_template exists for current filters
      const { data: existing, error: fetchError } = await supabase
        .from('exam_templates')
        .select('id, standard_subjects')
        .eq('exam_type', selectedDomain)
        .eq('board', selectedBoard || '')
        .eq('student_class', selectedClass || '')
        .eq('exam_name', examName)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const updatedSubjects = existing?.standard_subjects 
        ? [...(existing.standard_subjects as string[]), trimmed]
        : [trimmed];

      if (existing) {
        // UPDATE existing exam_template
        const { error: updateError } = await supabase
          .from('exam_templates')
          .update({ 
            standard_subjects: updatedSubjects,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // INSERT new exam_template
        const { error: insertError } = await supabase
          .from('exam_templates')
          .insert({
            exam_type: selectedDomain,
            board: selectedBoard || '',
            student_class: selectedClass || '',
            exam_name: examName,
            standard_subjects: updatedSubjects,
            is_active: true
          });

        if (insertError) throw insertError;
      }

      // Update local state only after successful database save
      setSubjects(updatedSubjects);
      setSelectedSubject(trimmed);
      setCustomSubject('');
      setShowManualInput(false);
      setSubjectSource('database');
      toast.success(`Added and saved "${trimmed}"`);
    } catch (error: any) {
      console.error('Error saving subject:', error);
      toast.error(`Failed to save subject: ${error.message}`);
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
  const handleAddTopicQuick = () => {
    if (!currentTopicForm.topic_name.trim()) {
      toast.error('Topic name is required');
      return;
    }
    
    const newTopic = {
      topic_name: currentTopicForm.topic_name.trim(),
      difficulty: currentTopicForm.difficulty
    };
    
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


  const handleDeleteTopic = (index: number) => {
    setManualTopics(manualTopics.filter((_: any, i: number) => i !== index));
    toast.success('Topic removed');
  };

  // Update topic in inline table
  const handleUpdateTopic = async (chapterId: string, topicIndex: number) => {
    if (!editingTopicData) return;
    
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    const updatedTopics = [...chapter.full_topics];
    updatedTopics[topicIndex] = editingTopicData;
    
    const { error } = await supabase
      .from('chapter_library')
      .update({ full_topics: updatedTopics })
      .eq('id', chapterId);
    
    if (!error) {
      toast.success('Topic updated successfully');
      setEditingTopicIndex(null);
      setEditingTopicData(null);
      fetchChapterLibrary();
    } else {
      toast.error('Failed to update topic');
    }
  };

  // Update topic in dialog
  const handleUpdateDialogTopic = (index: number) => {
    if (!editingDialogTopicData) return;
    
    const updatedTopics = [...manualTopics];
    updatedTopics[index] = editingDialogTopicData;
    setManualTopics(updatedTopics);
    
    setEditingDialogTopicIndex(null);
    setEditingDialogTopicData(null);
    toast.success('Topic updated');
  };

  // Edit chapter handler
  const handleEditChapter = async () => {
    if (!editingChapterData.chapter_name.trim()) {
      toast.error('Chapter name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('chapter_library')
        .update({
          chapter_name: editingChapterData.chapter_name,
          suggested_days: editingChapterData.suggested_days,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingChapterData.id);

      if (error) throw error;

      toast.success('Chapter updated successfully!');
      setShowEditChapterDialog(false);
      fetchChapterLibrary();
    } catch (error: any) {
      console.error('Error updating chapter:', error);
      toast.error('Failed to update chapter');
    }
  };

  // Bulk delete chapters
  const handleBulkDeleteChapters = async () => {
    if (selectedChapters.length === 0) {
      toast.error('No chapters selected');
      return;
    }

    try {
      const { error } = await supabase
        .from('chapter_library')
        .update({ is_active: false })
        .in('id', selectedChapters);

      if (!error) {
        toast.success(`Deleted ${selectedChapters.length} chapter${selectedChapters.length > 1 ? 's' : ''}`);
        setSelectedChapters([]);
        fetchChapterLibrary();
      } else {
        toast.error('Failed to delete chapters');
      }
    } catch (error: any) {
      console.error('Error bulk deleting chapters:', error);
      toast.error('Failed to delete chapters');
    }
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

          {/* User Guidance Message */}
          {selectedDomain && selectedSubject && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Next Steps:</strong>
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <li>Click "Generate Chapter Library with AI" or manually add chapters below</li>
                <li>Once chapters are added, click on a chapter to manage its topics</li>
                <li>Add topics to the chapter</li>
                <li>Click "Manage Questions" button on any topic to add questions</li>
              </ol>
            </div>
          )}

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
        <div className="space-y-4">
          {/* Bulk Actions */}
          {selectedChapters.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Badge variant="secondary">{selectedChapters.length} chapter{selectedChapters.length > 1 ? 's' : ''} selected</Badge>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDeleteChapters}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedChapters([])}
              >
                Clear Selection
              </Button>
            </div>
          )}

          <div className="grid gap-4">
            {chapters.map((chapter) => (
              <Card key={chapter.id} className={selectedChapters.includes(chapter.id) ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    {/* Checkbox */}
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedChapters.includes(chapter.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChapters(prev => [...prev, chapter.id]);
                          } else {
                            setSelectedChapters(prev => prev.filter(id => id !== chapter.id));
                          }
                        }}
                        className="cursor-pointer w-4 h-4"
                      />
                    </div>
                    
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
                        onClick={() => {
                          if (chapter.topics_generated && chapter.full_topics?.length > 0) {
                            if (confirm(`⚠️ This will replace all ${chapter.full_topics.length} existing topics with AI-generated ones. Continue?`)) {
                              handleGenerateTopics(chapter.id, true);
                            }
                          } else {
                            handleGenerateTopics(chapter.id, false);
                          }
                        }}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {chapter.topics_generated ? 'Replace with AI' : 'AI Generate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingChapterId(chapter.id);
                          setManualTopics(chapter.full_topics || []);
                          setShowTopicEditor(true);
                        }}
                        title="Add, edit, or delete topics for this chapter"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Topics
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingChapterData({
                            id: chapter.id,
                            chapter_name: chapter.chapter_name,
                            suggested_days: chapter.suggested_days
                          });
                          setShowEditChapterDialog(true);
                        }}
                        title="Edit chapter details"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const { error } = await supabase
                            .from('chapter_library')
                            .update({ is_active: false })
                            .eq('id', chapter.id);
                          
                          if (!error) {
                            toast.success('Chapter deleted');
                            fetchChapterLibrary();
                          } else {
                            toast.error('Failed to delete chapter');
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                        title="Delete this chapter"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              {chapter.topics_generated && chapter.full_topics?.length > 0 && (
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">Topics ({chapter.full_topics.length})</p>
                      {(selectedTopics[chapter.id]?.length > 0) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            const indicesToDelete = selectedTopics[chapter.id] || [];
                            const updatedTopics = chapter.full_topics.filter((_: any, i: number) => 
                              !indicesToDelete.includes(i)
                            );
                            
                            const { error } = await supabase
                              .from('chapter_library')
                              .update({ full_topics: updatedTopics })
                              .eq('id', chapter.id);
                            
                            if (!error) {
                              toast.success(`Deleted ${indicesToDelete.length} topic${indicesToDelete.length > 1 ? 's' : ''}`);
                              setSelectedTopics(prev => ({...prev, [chapter.id]: []}));
                              fetchChapterLibrary();
                            } else {
                              toast.error('Failed to delete topics');
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete ({selectedTopics[chapter.id]?.length})
                        </Button>
                      )}
                    </div>
                    
                    {/* Interactive Topics Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-2 w-10">
                              <input
                                type="checkbox"
                                checked={selectedTopics[chapter.id]?.length === chapter.full_topics.length && chapter.full_topics.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTopics(prev => ({
                                      ...prev,
                                      [chapter.id]: chapter.full_topics.map((_:any, i:number) => i)
                                    }));
                                  } else {
                                    setSelectedTopics(prev => ({...prev, [chapter.id]: []}));
                                  }
                                }}
                                className="cursor-pointer"
                              />
                            </th>
                            <th className="text-left p-2 font-medium w-12">#</th>
                            <th className="text-left p-2 font-medium">Topic Name</th>
                            <th className="text-left p-2 font-medium w-24">Difficulty</th>
                            <th className="text-right p-2 font-medium w-32">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chapter.full_topics.map((topic: any, idx: number) => {
                            const isEditing = editingTopicIndex?.chapterId === chapter.id && editingTopicIndex?.index === idx;
                            
                            return isEditing ? (
                              // EDIT MODE
                              <tr key={idx} className="border-t bg-blue-50 dark:bg-blue-950/30">
                                <td className="p-2">
                                  <input type="checkbox" disabled className="opacity-30" />
                                </td>
                                <td className="p-2 text-muted-foreground">{idx + 1}</td>
                                <td className="p-2">
                                  <Input 
                                    value={editingTopicData?.topic_name || ''} 
                                    onChange={(e) => setEditingTopicData({...editingTopicData!, topic_name: e.target.value})}
                                    className="h-8"
                                    autoFocus
                                  />
                                </td>
                                <td className="p-2">
                                  <Select 
                                    value={editingTopicData?.difficulty} 
                                    onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                                      setEditingTopicData({...editingTopicData!, difficulty: value})
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="easy">Easy</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateTopic(chapter.id, idx)}
                                      className="h-7 text-xs"
                                    >
                                      <Save className="w-3 h-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingTopicIndex(null);
                                        setEditingTopicData(null);
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              // VIEW MODE
                              <tr key={idx} className="border-t hover:bg-muted/20">
                                <td className="p-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedTopics[chapter.id]?.includes(idx) || false}
                                    onChange={(e) => {
                                      setSelectedTopics(prev => {
                                        const current = prev[chapter.id] || [];
                                        if (e.target.checked) {
                                          return {...prev, [chapter.id]: [...current, idx]};
                                        } else {
                                          return {...prev, [chapter.id]: current.filter(i => i !== idx)};
                                        }
                                      });
                                    }}
                                    className="cursor-pointer"
                                    disabled={editingTopicIndex !== null}
                                  />
                                </td>
                                <td className="p-2 text-muted-foreground">{idx + 1}</td>
                                <td className="p-2 font-medium">{topic.topic_name}</td>
                                <td className="p-2">
                                  <Badge variant={
                                    topic.difficulty === 'easy' ? 'default' :
                                    topic.difficulty === 'medium' ? 'secondary' :
                                    'destructive'
                                  } className="text-xs">
                                    {topic.difficulty}
                                  </Badge>
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const params = new URLSearchParams();
                                        params.set('tab', 'question-bank');
                                        params.set('mode', 'centralized');
                                        params.set('subTab', 'questions');
                                        params.set('exam_domain', selectedDomain);
                                        if (selectedBoard) params.set('board', selectedBoard);
                                        if (selectedClass) params.set('class', selectedClass);
                                        params.set('subject', selectedSubject);
                                        params.set('chapter_id', chapter.id);
                                        params.set('chapter_name', chapter.chapter_name);
                                        params.set('topic_name', topic.topic_name);
                                        navigate(`/admin?${params.toString()}`);
                                      }}
                                      className="h-7 text-xs"
                                      disabled={editingTopicIndex !== null}
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      Questions
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingTopicIndex({chapterId: chapter.id, index: idx});
                                        setEditingTopicData({
                                          topic_name: topic.topic_name,
                                          difficulty: topic.difficulty
                                        });
                                      }}
                                      className="h-7 w-7 p-0"
                                      disabled={editingTopicIndex !== null}
                                      title="Edit topic"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={async () => {
                                        const updatedTopics = chapter.full_topics.filter((_: any, i: number) => i !== idx);
                                        const { error } = await supabase
                                          .from('chapter_library')
                                          .update({ full_topics: updatedTopics })
                                          .eq('id', chapter.id);
                                        
                                        if (!error) {
                                          toast.success('Topic deleted');
                                          fetchChapterLibrary();
                                        } else {
                                          toast.error('Failed to delete topic');
                                        }
                                      }}
                                      className="h-7 w-7 p-0"
                                      disabled={editingTopicIndex !== null}
                                    >
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
          </div>
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
        
        {/* Simple Table Format for Adding Topics */}
        <div className="space-y-4">
          {/* Add New Topic Row */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-end p-3 border rounded-lg bg-muted/20">
            <div>
              <Label className="text-xs mb-1.5 block">Topic Name</Label>
              <Input
                value={currentTopicForm.topic_name}
                onChange={(e) => setCurrentTopicForm({...currentTopicForm, topic_name: e.target.value})}
                placeholder="e.g., Laws of Motion"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Difficulty</Label>
              <Select
                value={currentTopicForm.difficulty}
                onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                  setCurrentTopicForm({...currentTopicForm, difficulty: value})
                }
              >
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAddTopicQuick}
              disabled={!currentTopicForm.topic_name.trim()}
              className="h-9"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Topics List Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Topic Name</th>
                  <th className="text-left p-3 text-sm font-medium w-32">Difficulty</th>
                  <th className="text-right p-3 text-sm font-medium w-48">Actions</th>
                </tr>
              </thead>
              <tbody>
                {manualTopics.map((topic, idx) => {
                  const isEditing = editingDialogTopicIndex === idx;
                  
                  return isEditing ? (
                    // EDIT MODE
                    <tr key={idx} className="border-t bg-blue-50 dark:bg-blue-950/30">
                      <td className="p-3">
                        <Input
                          value={editingDialogTopicData?.topic_name || ''}
                          onChange={(e) => setEditingDialogTopicData({...editingDialogTopicData!, topic_name: e.target.value})}
                          className="h-9"
                          autoFocus
                        />
                      </td>
                      <td className="p-3">
                        <Select
                          value={editingDialogTopicData?.difficulty}
                          onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                            setEditingDialogTopicData({...editingDialogTopicData!, difficulty: value})
                          }
                        >
                          <SelectTrigger className="w-32 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateDialogTopic(idx)}
                            className="h-8"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingDialogTopicIndex(null);
                              setEditingDialogTopicData(null);
                            }}
                            className="h-8"
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // VIEW MODE
                    <tr key={idx} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-sm">{topic.topic_name}</td>
                      <td className="p-3">
                        <Badge variant={
                          topic.difficulty === 'easy' ? 'default' :
                          topic.difficulty === 'medium' ? 'secondary' :
                          'destructive'
                        }>
                          {topic.difficulty}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const params = new URLSearchParams();
                              params.set('tab', 'question-bank');
                              params.set('mode', 'centralized');
                              params.set('subTab', 'questions');
                              params.set('exam_domain', selectedDomain);
                              if (selectedBoard) params.set('board', selectedBoard);
                              if (selectedClass) params.set('class', selectedClass);
                              params.set('subject', selectedSubject);
                              params.set('chapter_id', editingChapterId || '');
                              params.set('chapter_name', chapters.find(c => c.id === editingChapterId)?.chapter_name || '');
                              params.set('topic_name', topic.topic_name);
                              navigate(`/admin?${params.toString()}`);
                            }}
                            className="h-8"
                            disabled={editingDialogTopicIndex !== null}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Questions
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingDialogTopicIndex(idx);
                              setEditingDialogTopicData({
                                topic_name: topic.topic_name,
                                difficulty: topic.difficulty
                              });
                            }}
                            className="h-8 w-8 p-0"
                            disabled={editingDialogTopicIndex !== null}
                            title="Edit topic"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDeleteTopic(idx)}
                            className="h-8 w-8 p-0"
                            disabled={editingDialogTopicIndex !== null}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {manualTopics.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-sm text-muted-foreground">
                      No topics added yet. Add your first topic above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bulk Import Option */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const result = prompt('Paste topics (one per line, format: "Topic Name | difficulty")\nExample:\nLaws of Motion | medium\nWork and Energy | hard');
              if (result) {
                const lines = result.split('\n').filter(l => l.trim());
                const newTopics = lines.map(line => {
                  const parts = line.split('|').map(p => p.trim());
                  return {
                    topic_name: parts[0],
                    difficulty: (parts[1] as 'easy' | 'medium' | 'hard') || 'medium'
                  };
                });
                setManualTopics(prev => [...prev, ...newTopics]);
                toast.success(`Added ${newTopics.length} topics`);
              }
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
        </div>
        
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

      {/* Edit Chapter Dialog */}
      <Dialog open={showEditChapterDialog} onOpenChange={setShowEditChapterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Chapter</DialogTitle>
            <DialogDescription>
              Update chapter name and suggested days
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Chapter Name *</Label>
              <Input
                value={editingChapterData.chapter_name}
                onChange={(e) => setEditingChapterData({...editingChapterData, chapter_name: e.target.value})}
                placeholder="e.g., Introduction to Algebra"
              />
            </div>
            
            <div>
              <Label>Suggested Days</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={editingChapterData.suggested_days}
                onChange={(e) => setEditingChapterData({...editingChapterData, suggested_days: parseInt(e.target.value) || 5})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditChapterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditChapter}>
              <Save className="w-4 h-4 mr-2" />
              Update Chapter
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
