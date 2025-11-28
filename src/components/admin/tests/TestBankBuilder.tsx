import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, ArrowLeft, FileText, Plus } from "lucide-react";
import { useExamTypes } from "@/hooks/useExamTypes";
import { BoardClassSelector } from "../BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BatchAssignedTestsView } from "./BatchAssignedTestsView";
import { CentralizedTestBrowser } from "./CentralizedTestBrowser";
import * as LucideIcons from "lucide-react";

interface Batch {
  id: string;
  name: string;
  exam_type: string;
  exam_name: string;
  linked_roadmap_id: string;
  target_board?: string;
  target_class?: string;
  current_strength: number;
}

interface Chapter {
  id: string;
  chapter_name: string;
  subject: string;
  roadmap_id: string;
  chapter_library_id?: string;
}

export const TestBankBuilder = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { examTypes } = useExamTypes();
  const { selectedBoard, selectedClass, setBoard, setClass, resetFromBoard, resetToBoard } = useBoardClassHierarchy();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  
  // Domain selection (Step 1)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  // Batch selection (Step 3)
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  
  // Subject selection (Step 4)
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  
  // Chapter selection (Step 5)
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

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

  // Restore state from URL on mount
  useEffect(() => {
    if (examTypes.length === 0) return;
    
    const domain = searchParams.get('domain');
    const board = searchParams.get('board');
    const classParam = searchParams.get('class');
    const batch = searchParams.get('batch');
    const subject = searchParams.get('subject');
    const chapter = searchParams.get('chapter');
    
    if (chapter && subject && batch && domain) {
      if (!selectedDomain) setSelectedDomain(domain);
      if (board && !selectedBoard) setBoard(board as any);
      if (classParam && !selectedClass) setClass(classParam as any);
      if (!selectedBatch) setSelectedBatch(batch);
      if (!selectedSubject) setSelectedSubject(subject);
      if (currentStep < 6) setCurrentStep(6);
      if (!selectedChapter) {
        supabase.from('roadmap_chapters').select('*').eq('id', chapter).single().then(({ data }) => {
          if (data) setSelectedChapter(data);
        });
      }
    } else if (subject && batch && domain) {
      if (!selectedDomain) setSelectedDomain(domain);
      if (board && !selectedBoard) setBoard(board as any);
      if (classParam && !selectedClass) setClass(classParam as any);
      if (!selectedBatch) setSelectedBatch(batch);
      if (!selectedSubject) setSelectedSubject(subject);
      if (currentStep < 5) setCurrentStep(5);
    } else if (batch && domain) {
      if (!selectedDomain) setSelectedDomain(domain);
      if (board && !selectedBoard) setBoard(board as any);
      if (classParam && !selectedClass) setClass(classParam as any);
      if (!selectedBatch) setSelectedBatch(batch);
      if (currentStep < 4) setCurrentStep(4);
    } else if (domain) {
      if (!selectedDomain) setSelectedDomain(domain);
      if (board && !selectedBoard) setBoard(board as any);
      if (classParam && !selectedClass) setClass(classParam as any);
      if (currentStep < 3) {
        const domainData = examTypes.find(et => et.code === domain);
        if (domainData?.requires_board) {
          setCurrentStep(2);
        } else {
          setCurrentStep(3);
        }
      }
    }
  }, [examTypes, searchParams, selectedDomain, selectedBoard, selectedClass, selectedBatch, selectedSubject, selectedChapter, currentStep]);

  // Fetch batches when domain/board/class selected
  useEffect(() => {
    if (selectedDomain && currentStep >= 3) {
      fetchBatches();
    }
  }, [selectedDomain, selectedBoard, selectedClass, currentStep]);

  // Fetch subjects when batch selected
  useEffect(() => {
    if (selectedBatch && currentStep >= 4) {
      fetchSubjects();
    }
  }, [selectedBatch, currentStep]);

  // Fetch chapters when subject selected
  useEffect(() => {
    if (selectedBatch && selectedSubject && currentStep >= 5) {
      fetchChapters();
    }
  }, [selectedBatch, selectedSubject, currentStep]);

  const fetchBatches = async () => {
    try {
      let query = supabase
        .from('batches')
        .select('*')
        .eq('exam_type', selectedDomain)
        .not('linked_roadmap_id', 'is', null)
        .eq('is_active', true);

      const domainData = examTypes.find(et => et.code === selectedDomain);
      if (domainData?.requires_board && selectedBoard) {
        query = query.eq('target_board', selectedBoard as any);
      }
      if (domainData?.requires_class && selectedClass) {
        query = query.eq('target_class', selectedClass as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast({
        title: "Error",
        description: "Failed to fetch batches",
        variant: "destructive"
      });
    }
  };

  const fetchSubjects = async () => {
    try {
      const batch = batches.find(b => b.id === selectedBatch);
      if (!batch?.linked_roadmap_id) return;

      const { data, error } = await supabase
        .from('roadmap_chapters')
        .select('subject')
        .eq('roadmap_id', batch.linked_roadmap_id)
        .order('subject');

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
      const batch = batches.find(b => b.id === selectedBatch);
      if (!batch?.linked_roadmap_id) return;

      const { data, error } = await supabase
        .from('roadmap_chapters')
        .select('*')
        .eq('roadmap_id', batch.linked_roadmap_id)
        .eq('subject', selectedSubject)
        .order('order_num');

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

  const handleDomainSelect = (domain: string) => {
    setSelectedDomain(domain);
    const params = new URLSearchParams(searchParams);
    params.set('domain', domain);
    params.delete('board');
    params.delete('class');
    params.delete('batch');
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

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatch(batchId);
    const params = new URLSearchParams(searchParams);
    params.set('batch', batchId);
    params.delete('subject');
    params.delete('chapter');
    setSearchParams(params);
    setCurrentStep(4);
  };

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    const params = new URLSearchParams(searchParams);
    params.set('subject', subject);
    params.delete('chapter');
    setSearchParams(params);
    setCurrentStep(5);
  };

  const handleChapterSelect = (chapter: Chapter) => {
    console.log(`📂 [TestBankBuilder] Chapter selected:`, {
      id: chapter.id,
      name: chapter.chapter_name,
      subject: chapter.subject,
      chapter_library_id: chapter.chapter_library_id || 'NULL (not linked)',
      roadmap_id: chapter.roadmap_id
    });
    
    setSelectedChapter(chapter);
    const params = new URLSearchParams(searchParams);
    params.set('chapter', chapter.id);
    setSearchParams(params);
    setCurrentStep(6);
  };

  const handleBack = () => {
    const params = new URLSearchParams(searchParams);
    
    if (currentStep === 6) {
      setSelectedChapter(null);
      params.delete('chapter');
      setCurrentStep(5);
    } else if (currentStep === 5) {
      setSelectedSubject("");
      params.delete('subject');
      params.delete('chapter');
      setChapters([]);
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setSelectedBatch("");
      params.delete('batch');
      params.delete('subject');
      params.delete('chapter');
      setSubjects([]);
      setChapters([]);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const domainData = examTypes.find(et => et.code === selectedDomain);
      params.delete('batch');
      params.delete('subject');
      params.delete('chapter');
      setBatches([]);
      setSubjects([]);
      setChapters([]);
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
      params.delete('batch');
      params.delete('subject');
      params.delete('chapter');
      resetFromBoard();
      setBatches([]);
      setSubjects([]);
      setChapters([]);
      setCurrentStep(1);
    }
    
    setSearchParams(params);
  };

  const handleCreateTest = () => {
    // Navigate to test builder with context
    const params = new URLSearchParams();
    params.set('context', 'centralized');
    if (selectedChapter?.chapter_library_id) {
      params.set('chapter_library_id', selectedChapter.chapter_library_id);
    }
    if (selectedDomain) params.set('exam_domain', selectedDomain);
    if (selectedBoard) params.set('board', selectedBoard);
    if (selectedClass) params.set('class', selectedClass);
    if (selectedSubject) params.set('subject', selectedSubject);
    
    navigate(`/admin/test-builder/new?${params.toString()}`);
  };

  const renderContent = () => {
    // Step 1: Domain Selection
    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Select Exam Domain</h2>
            <p className="text-sm text-muted-foreground">Choose the category of exam for this test</p>
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
          />
          <div className="mt-4">
            <Button onClick={handleBoardClassNext} size="lg">
              Continue <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      );
    }

    // Step 3: Batch Selection
    if (currentStep === 3) {
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold mb-1">Select Batch</h2>
            <p className="text-sm text-muted-foreground">Choose a batch with an active roadmap</p>
          </div>
          {batches.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No batches found. Create a batch with a linked roadmap first.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map((batch) => (
                <Card
                  key={batch.id}
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
                  onClick={() => handleBatchSelect(batch.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{batch.name}</CardTitle>
                    <CardDescription>
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{batch.current_strength} students</Badge>
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Step 4: Subject Selection
    if (currentStep === 4) {
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold mb-1">Select Subject</h2>
            <p className="text-sm text-muted-foreground">Choose a subject from the batch's roadmap</p>
          </div>
          {subjects.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No subjects found in this batch's roadmap.
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

    // Step 5: Chapter Selection
    if (currentStep === 5) {
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold mb-1">Select Chapter</h2>
            <p className="text-sm text-muted-foreground">Choose a chapter to manage tests for</p>
          </div>
          {chapters.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No chapters found for this subject.
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
                      {chapter.chapter_library_id && (
                        <Badge variant="secondary" className="mt-2">
                          Linked to Centralized Library
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Step 6: Test Management Tabs
    if (currentStep === 6 && selectedChapter) {
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chapters
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedChapter.chapter_name}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedSubject} • {batches.find(b => b.id === selectedBatch)?.name}
              </p>
            </div>
          </div>

          <Tabs defaultValue="view-all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="view-all">View All Tests</TabsTrigger>
              <TabsTrigger value="centralized">Centralized</TabsTrigger>
              <TabsTrigger value="create">Create Test</TabsTrigger>
            </TabsList>
            
            <TabsContent value="view-all">
              <BatchAssignedTestsView
                batchId={selectedBatch}
                chapterLibraryId={selectedChapter.chapter_library_id || null}
              />
            </TabsContent>
            
            <TabsContent value="centralized">
              <CentralizedTestBrowser
                batchId={selectedBatch}
                chapterLibraryId={selectedChapter.chapter_library_id || ''}
                examDomain={selectedDomain || ''}
                board={selectedBoard}
                studentClass={selectedClass}
                subject={selectedSubject}
                chapterName={selectedChapter.chapter_name}
              />
            </TabsContent>
            
            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Test</CardTitle>
                  <CardDescription>
                    Create a new centralized test for this chapter that can be assigned to multiple batches
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleCreateTest} size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Open Test Builder
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    return null;
  };

  return renderContent();
};
