import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExamTypes } from '@/hooks/useExamTypes';
import { useBoards } from '@/hooks/useBoards';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Library, Sparkles, CheckCircle2, BookOpen, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ChapterLibrary {
  id: string;
  exam_type: string;
  subject: string;
  chapter_name: string;
  full_topics: any;
  topics_generated: boolean;
  difficulty: string;
  importance_score: number;
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
      const { data, error } = await supabase
        .from('chapter_library')
        .select('*')
        .eq('exam_type', selectedDomain)
        .eq('subject', selectedSubject)
        .eq('is_active', true)
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

  // Generate chapter library
  const handleGenerateLibrary = async () => {
    if (!selectedDomain || !selectedSubject) {
      toast.error('Please select exam type and subject');
      return;
    }

    setGenerating(true);
    const toastId = toast.loading('Generating chapter library with AI...');

    try {
      // Generate chapter library
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
      } else {
        toast.success(`Generated ${data.count} chapters!`, { id: toastId });
        
        // Generate full topics for each chapter
        const chapterIds = data.chapters.map((ch: any) => ch.id);
        toast.loading(`Generating comprehensive topics for ${chapterIds.length} chapters...`);
        
        for (const chapterId of chapterIds) {
          await supabase.functions.invoke('generate-full-chapter-topics', {
            body: { chapter_library_id: chapterId }
          });
        }
        
        toast.success('Full topic lists generated for all chapters!');
      }

      fetchChapterLibrary();
    } catch (error: any) {
      console.error('Error generating library:', error);
      toast.error(error.message || 'Failed to generate chapter library', { id: toastId });
    } finally {
      setGenerating(false);
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

            {requiresClass && (
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
                      <Badge variant="outline">{chapter.difficulty}</Badge>
                      <Badge variant="outline">Score: {chapter.importance_score}/10</Badge>
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
                  <Button
                    size="sm"
                    variant={chapter.topics_generated ? "outline" : "default"}
                    onClick={() => handleGenerateTopics(chapter.id, chapter.topics_generated)}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    {chapter.topics_generated ? 'Regenerate' : 'Generate'} Topics
                  </Button>
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
    </div>
  );
};
