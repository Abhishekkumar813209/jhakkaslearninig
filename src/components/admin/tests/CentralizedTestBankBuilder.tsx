import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, ArrowLeft, Plus, FileText, Clock, Target } from "lucide-react";
import { useExamTypes } from "@/hooks/useExamTypes";
import { BoardClassSelector } from "../BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";
import { useSearchParams, useNavigate } from "react-router-dom";
import * as LucideIcons from "lucide-react";

interface CentralizedChapter {
  id: string;
  chapter_name: string;
  subject: string;
  exam_type: string;
  class_level?: string;
  display_order?: number;
}

interface Test {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  duration_minutes: number;
  total_marks: number;
  default_xp: number;
  is_centralized: boolean;
  chapter_library_id?: string;
}

export const CentralizedTestBankBuilder = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { examTypes } = useExamTypes();
  const { selectedBoard, selectedClass, setBoard, setClass, resetFromBoard, resetToBoard } = useBoardClassHierarchy();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  
  // Domain selection (Step 1)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  // Subject selection (Step 3)
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  
  // Chapter selection (Step 4)
  const [chapters, setChapters] = useState<CentralizedChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<CentralizedChapter | null>(null);

  // Tests list
  const [tests, setTests] = useState<Test[]>([]);

  // Test counts for board/class cards
  const [centralizedCountsByBoard, setCentralizedCountsByBoard] = useState<Record<string, number>>({});
  const [centralizedCountsByClass, setCentralizedCountsByClass] = useState<Record<string, Record<string, number>>>({});

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

  // Restore state from URL
  useEffect(() => {
    if (examTypes.length === 0) return;
    
    const domain = searchParams.get('domain');
    const board = searchParams.get('board');
    const classParam = searchParams.get('class');
    const subject = searchParams.get('subject');
    const chapter = searchParams.get('chapter');
    
    if (chapter && subject && domain) {
      if (!selectedDomain) setSelectedDomain(domain);
      if (board && !selectedBoard) setBoard(board as any);
      if (classParam && !selectedClass) setClass(classParam as any);
      if (!selectedSubject) setSelectedSubject(subject);
      if (currentStep < 5) setCurrentStep(5);
      if (!selectedChapter) {
        supabase.from('chapter_library').select('*').eq('id', chapter).single().then(({ data }) => {
          if (data) setSelectedChapter(data);
        });
      }
    } else if (subject && domain) {
      if (!selectedDomain) setSelectedDomain(domain);
      if (board && !selectedBoard) setBoard(board as any);
      if (classParam && !selectedClass) setClass(classParam as any);
      if (!selectedSubject) setSelectedSubject(subject);
      if (currentStep < 4) setCurrentStep(4);
    } else if (domain) {
      if (!selectedDomain) setSelectedDomain(domain);
      if (board && !selectedBoard) setBoard(board as any);
      if (classParam && !selectedClass) setClass(classParam as any);
      const domainData = examTypes.find(et => et.code === domain);
      if (currentStep < 3 && domainData?.requires_board) {
        setCurrentStep(2);
      } else if (currentStep < 3) {
        setCurrentStep(3);
      }
    }
  }, [examTypes, searchParams]);

  // Fetch test counts for board/class cards
  useEffect(() => {
    const fetchCentralizedCounts = async () => {
      if (selectedDomain !== 'school') return;
      
      const { data } = await supabase
        .from('tests')
        .select(`
          id,
          chapter_library:chapter_library_id(class_level)
        `)
        .eq('is_centralized', true)
        .eq('exam_domain', 'school');
      
      if (!data) return;
      
      // Aggregate by class_level
      const byClass: Record<string, number> = {};
      
      data.forEach((test: any) => {
        const classLevel = test.chapter_library?.class_level;
        if (classLevel) {
          byClass[classLevel] = (byClass[classLevel] || 0) + 1;
        }
      });
      
      // Since centralized tests aren't board-specific, show total for all boards
      const totalTests = Object.values(byClass).reduce((a, b) => a + b, 0);
      const boards = ['CBSE', 'ICSE', 'State Board'];
      
      const boardCounts = boards.reduce((acc, board) => {
        acc[board] = totalTests;
        return acc;
      }, {} as Record<string, number>);
      
      // Class counts same for all boards
      const classCounts = boards.reduce((acc, board) => {
        acc[board] = byClass;
        return acc;
      }, {} as Record<string, Record<string, number>>);
      
      setCentralizedCountsByBoard(boardCounts);
      setCentralizedCountsByClass(classCounts);
    };
    
    fetchCentralizedCounts();
  }, [selectedDomain]);

  // Fetch subjects when domain/board/class selected
  useEffect(() => {
    if (selectedDomain && currentStep >= 3) {
      fetchSubjects();
    }
  }, [selectedDomain, selectedBoard, selectedClass, currentStep]);

  // Fetch chapters when subject selected
  useEffect(() => {
    if (selectedSubject && currentStep >= 4) {
      fetchChapters();
    }
  }, [selectedSubject, currentStep]);

  // Fetch tests when chapter selected
  useEffect(() => {
    if (selectedChapter && currentStep >= 5) {
      fetchTests();
    }
  }, [selectedChapter, currentStep]);

  const fetchSubjects = async () => {
    try {
      let query = supabase
        .from('chapter_library')
        .select('subject')
        .eq('exam_type', selectedDomain);

      const domainData = examTypes.find(et => et.code === selectedDomain);
      if (domainData?.requires_class && selectedClass) {
        query = query.eq('class_level', selectedClass);
      }

      const { data, error } = await query.order('subject');
      if (error) throw error;
      
      const uniqueSubjects = [...new Set(data.map(d => d.subject))];
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch subjects",
        variant: "destructive"
      });
    }
  };

  const fetchChapters = async () => {
    try {
      let query = supabase
        .from('chapter_library')
        .select('*')
        .eq('exam_type', selectedDomain)
        .eq('subject', selectedSubject)
        .eq('is_active', true);

      const domainData = examTypes.find(et => et.code === selectedDomain);
      if (domainData?.requires_class && selectedClass) {
        query = query.eq('class_level', selectedClass);
      }

      const { data, error } = await query.order('display_order', { ascending: true });
      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Error fetching chapters:', error);
      toast({
        title: "Error",
        description: "Failed to fetch chapters",
        variant: "destructive"
      });
    }
  };

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('is_centralized', true)
        .eq('chapter_library_id', selectedChapter!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tests",
        variant: "destructive"
      });
    }
  };

  const handleDomainSelect = (domain: string) => {
    setSelectedDomain(domain);
    const params = new URLSearchParams(searchParams);
    params.set('domain', domain);
    params.delete('board');
    params.delete('class');
    params.delete('subject');
    params.delete('chapter');
    setSearchParams(params);

    const domainData = examTypes.find(et => et.code === domain);
    if (domainData?.requires_board) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  };

  const handleBoardClassNext = () => {
    const params = new URLSearchParams(searchParams);
    if (selectedBoard) params.set('board', selectedBoard);
    if (selectedClass) params.set('class', selectedClass);
    setSearchParams(params);
    setCurrentStep(3);
  };

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    const params = new URLSearchParams(searchParams);
    params.set('subject', subject);
    params.delete('chapter');
    setSearchParams(params);
    setCurrentStep(4);
  };

  const handleChapterSelect = (chapter: CentralizedChapter) => {
    setSelectedChapter(chapter);
    const params = new URLSearchParams(searchParams);
    params.set('chapter', chapter.id);
    setSearchParams(params);
    setCurrentStep(5);
  };

  const handleCreateTest = () => {
    const params = new URLSearchParams();
    params.set('context', 'centralized');
    if (selectedChapter?.id) {
      params.set('chapter_library_id', selectedChapter.id);
    }
    if (selectedDomain) params.set('exam_domain', selectedDomain);
    if (selectedBoard) params.set('board', selectedBoard);
    if (selectedClass) params.set('class', selectedClass);
    if (selectedSubject) params.set('subject', selectedSubject);
    
    navigate(`/admin/test-builder/new?${params.toString()}`);
  };

  const handleEditTest = (testId: string) => {
    navigate(`/admin/test-builder/${testId}`);
  };

  const handleBack = () => {
    const params = new URLSearchParams(searchParams);
    
    if (currentStep === 5) {
      setSelectedChapter(null);
      setTests([]);
      params.delete('chapter');
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setSelectedSubject("");
      params.delete('subject');
      params.delete('chapter');
      setChapters([]);
      setTests([]);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const domainData = examTypes.find(et => et.code === selectedDomain);
      params.delete('subject');
      params.delete('chapter');
      setSubjects([]);
      setChapters([]);
      setTests([]);
      if (domainData?.requires_board) {
        setCurrentStep(2);
      } else {
        setSelectedDomain(null);
        params.delete('domain');
        params.delete('board');
        params.delete('class');
        resetFromBoard();
        setCurrentStep(1);
      }
    } else if (currentStep === 2) {
      setSelectedDomain(null);
      params.delete('domain');
      params.delete('board');
      params.delete('class');
      params.delete('subject');
      params.delete('chapter');
      resetFromBoard();
      setSubjects([]);
      setChapters([]);
      setTests([]);
      setCurrentStep(1);
    }
    
    setSearchParams(params);
  };

  const renderContent = () => {
    // Step 1: Domain Selection
    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Select Exam Domain</h2>
            <p className="text-sm text-muted-foreground">Choose the category of exam</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examTypes.map((examType) => {
              const IconComponent = iconMap[examType.icon_name || 'BookOpen'] || LucideIcons.BookOpen;
              return (
                <Card
                  key={examType.id}
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
                  onClick={() => handleDomainSelect(examType.code)}
                >
                  <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <IconComponent className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{examType.display_name}</CardTitle>
              </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      );
    }

    // Step 2: Board & Class Selection
    if (currentStep === 2) {
      const domainData = examTypes.find(et => et.code === selectedDomain);
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <BoardClassSelector
            examType={domainData?.code || ''}
            selectedBoard={selectedBoard}
            selectedClass={selectedClass}
            onBoardSelect={setBoard}
            onClassSelect={setClass}
            onReset={resetFromBoard}
            onResetToBoard={resetToBoard}
            studentCounts={{ byBoard: centralizedCountsByBoard, byClass: centralizedCountsByClass }}
            countLabel="centralized tests"
          />
          <div className="mt-4">
            <Button onClick={handleBoardClassNext} size="lg">
              Continue <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      );
    }

    // Step 3: Subject Selection
    if (currentStep === 3) {
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold mb-1">Select Subject</h2>
            <p className="text-sm text-muted-foreground">Choose a subject from centralized library</p>
          </div>
          {subjects.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No subjects found in the centralized library for this domain.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <Card
                  key={subject}
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
                  onClick={() => handleSubjectSelect(subject)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{subject}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Step 4: Chapter Selection
    if (currentStep === 4) {
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold mb-1">Select Chapter</h2>
            <p className="text-sm text-muted-foreground">Choose a chapter from centralized library</p>
          </div>
          {chapters.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No chapters found for this subject in the centralized library.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chapters.map((chapter) => (
                <Card
                  key={chapter.id}
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
                  onClick={() => handleChapterSelect(chapter)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{chapter.chapter_name}</CardTitle>
                    <CardDescription>
                      <Badge variant="secondary" className="mt-2">
                        Centralized Library
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Step 5: Tests List & Builder
    if (currentStep === 5 && selectedChapter) {
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chapters
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedChapter.chapter_name}</h2>
              <p className="text-sm text-muted-foreground">{selectedSubject} • Centralized Library</p>
            </div>
            <Button onClick={handleCreateTest}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Test
            </Button>
          </div>

          <div className="grid gap-4">
            {tests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Tests Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first centralized test for this chapter
                  </p>
                  <Button onClick={handleCreateTest}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Test
                  </Button>
                </CardContent>
              </Card>
            ) : (
              tests.map((test) => (
                <Card key={test.id} className="hover:border-primary transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{test.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {test.description || 'No description'}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTest(test.id)}
                      >
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={
                        test.difficulty === 'hard' ? 'destructive' :
                        test.difficulty === 'medium' ? 'default' : 'secondary'
                      }>
                        {test.difficulty}
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {test.duration_minutes} min
                      </Badge>
                      <Badge variant="outline">
                        <Target className="h-3 w-3 mr-1" />
                        {test.total_marks} marks
                      </Badge>
                      <Badge variant="outline">
                        {test.default_xp} XP
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return renderContent();
};
