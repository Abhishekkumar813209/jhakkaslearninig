import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { useExamTypes } from "@/hooks/useExamTypes";
import { BoardClassSelector } from "./BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";
import { SmartQuestionExtractor } from "./SmartQuestionExtractor";
import { ManualQuestionEntry } from "./ManualQuestionEntry";
import * as LucideIcons from "lucide-react";
import { useSearchParams } from "react-router-dom";

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
}

interface Topic {
  id: string;
  topic_name: string;
  chapter_id: string;
  order_num: number;
}

export const QuestionBankBuilder = () => {
  const { toast } = useToast();
  const { examTypes } = useExamTypes();
  const { selectedBoard, selectedClass, setBoard, setClass, reset: resetBoardClass, resetFromBoard, resetToBoard } = useBoardClassHierarchy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [refetchKey, setRefetchKey] = useState(0);
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  
  // Domain selection (Step 1)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // URL-aware board/class handlers
  const handleBoardSelect = (board: string | null) => {
    setBoard(board);
    const params = new URLSearchParams(searchParams);
    if (board) {
      params.set('board', board);
    } else {
      params.delete('board');
    }
    // Clear downstream params
    params.delete('class');
    params.delete('batch');
    params.delete('subject');
    params.delete('chapter');
    params.delete('topic');
    setSearchParams(params);
  };

  const handleClassSelect = (cls: string | null) => {
    setClass(cls);
    const params = new URLSearchParams(searchParams);
    if (cls) {
      params.set('class', cls);
    } else {
      params.delete('class');
    }
    // Clear downstream params
    params.delete('batch');
    params.delete('subject');
    params.delete('chapter');
    params.delete('topic');
    setSearchParams(params);
  };

  const resetFromBoardURL = () => {
    resetFromBoard();
    const params = new URLSearchParams(searchParams);
    params.delete('board');
    params.delete('class');
    params.delete('batch');
    params.delete('subject');
    params.delete('chapter');
    params.delete('topic');
    setSearchParams(params);
  };

  const resetToBoardURL = () => {
    resetToBoard();
    const params = new URLSearchParams(searchParams);
    params.delete('class');
    params.delete('batch');
    params.delete('subject');
    params.delete('chapter');
    params.delete('topic');
    setSearchParams(params);
  };
  
  // Batch selection (Step 3)
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  
  // Subject selection (Step 4)
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  
  // Chapter selection (Step 5)
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  
  // Topic selection (Step 6)
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

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
    const domain = searchParams.get('domain');
    const board = searchParams.get('board');
    const classParam = searchParams.get('class');
    const batch = searchParams.get('batch');
    const subject = searchParams.get('subject');
    const chapter = searchParams.get('chapter');
    const topic = searchParams.get('topic');
    
    if (topic && chapter && subject && batch && domain) {
      setSelectedDomain(domain);
      if (board) setBoard(board);
      if (classParam) setClass(classParam);
      setSelectedBatch(batch);
      setSelectedSubject(subject);
      setCurrentStep(7);
      
      // Restore chapter and topic
      supabase.from('roadmap_chapters').select('*').eq('id', chapter).single().then(({ data }) => {
        if (data) setSelectedChapter(data);
      });
      supabase.from('roadmap_topics').select('*').eq('id', topic).single().then(({ data }) => {
        if (data) setSelectedTopic(data);
      });
    } else if (chapter && subject && batch && domain) {
      setSelectedDomain(domain);
      if (board) setBoard(board);
      if (classParam) setClass(classParam);
      setSelectedBatch(batch);
      setSelectedSubject(subject);
      setCurrentStep(6);
      supabase.from('roadmap_chapters').select('*').eq('id', chapter).single().then(({ data }) => {
        if (data) setSelectedChapter(data);
      });
    } else if (subject && batch && domain) {
      setSelectedDomain(domain);
      if (board) setBoard(board);
      if (classParam) setClass(classParam);
      setSelectedBatch(batch);
      setSelectedSubject(subject);
      setCurrentStep(5);
    } else if (batch && domain) {
      setSelectedDomain(domain);
      if (board) setBoard(board);
      if (classParam) setClass(classParam);
      setSelectedBatch(batch);
      setCurrentStep(4);
    } else if (domain) {
      setSelectedDomain(domain);
      if (board) setBoard(board);
      if (classParam) setClass(classParam);
      const examType = examTypes.find(t => t.code === domain);
      setCurrentStep(examType?.requires_board ? 2 : 3);
    }
  }, []);

  // Fetch batches when domain/board/class changes
  useEffect(() => {
    if (selectedDomain) {
      fetchBatches();
    }
  }, [selectedDomain, selectedBoard, selectedClass]);

  // Fetch subjects when batch changes
  useEffect(() => {
    if (selectedBatch) {
      fetchSubjects();
    }
  }, [selectedBatch]);

  // Fetch chapters when subject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchChapters();
    }
  }, [selectedSubject]);

  // Fetch topics when chapter changes
  useEffect(() => {
    if (selectedChapter) {
      fetchTopics();
    }
  }, [selectedChapter]);

  const fetchBatches = async () => {
    if (!selectedDomain) return;

    let query = supabase
      .from("batches")
      .select("id, name, exam_type, exam_name, linked_roadmap_id, target_board, target_class, current_strength")
      .eq("is_active", true)
      .eq("exam_type", selectedDomain)
      .not("linked_roadmap_id", "is", null);

    const { data, error } = await query.order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to load batches", variant: "destructive" });
      return;
    }

    // Filter by board and class for school domain
    let filteredData = data || [];
    if (selectedDomain === 'school') {
      filteredData = filteredData.filter(b => 
        (!selectedBoard || b.target_board === selectedBoard) &&
        (!selectedClass || b.target_class === selectedClass)
      );
    }

    setBatches(filteredData);
  };

  const fetchSubjects = async () => {
    const batch = batches.find(b => b.id === selectedBatch);
    if (!batch?.linked_roadmap_id) return;

    const { data, error } = await supabase
      .from('roadmap_chapters')
      .select('subject')
      .eq('roadmap_id', batch.linked_roadmap_id);

    if (error) {
      toast({ title: "Error", description: "Failed to load subjects", variant: "destructive" });
      return;
    }

    const uniqueSubjects = Array.from(new Set(data.map(d => d.subject)));
    setSubjects(uniqueSubjects);
  };

  const fetchChapters = async () => {
    const batch = batches.find(b => b.id === selectedBatch);
    if (!batch?.linked_roadmap_id || !selectedSubject) return;

    const { data, error } = await supabase
      .from("roadmap_chapters")
      .select("id, chapter_name, subject, roadmap_id")
      .eq("roadmap_id", batch.linked_roadmap_id)
      .eq("subject", selectedSubject)
      .order("order_num");

    if (error) {
      toast({ title: "Error", description: "Failed to load chapters", variant: "destructive" });
      return;
    }

    setChapters(data || []);
  };

  const fetchTopics = async () => {
    if (!selectedChapter?.id) return;

    const { data, error } = await supabase
      .from("roadmap_topics")
      .select("id, topic_name, chapter_id, order_num")
      .eq("chapter_id", selectedChapter.id)
      .order("order_num");

    if (error) {
      toast({ title: "Error", description: "Failed to load topics", variant: "destructive" });
      return;
    }

    setTopics(data || []);
  };

  const handleDomainSelect = (domain: string) => {
    setSelectedDomain(domain);
    resetBoardClass();
    setSelectedBatch("");
    setSelectedSubject("");
    setSelectedChapter(null);
    setSelectedTopic(null);
    
    // Update URL - preserve existing params like 'tab'
    const params = new URLSearchParams(searchParams);
    params.set('domain', domain);
    params.delete('board');
    params.delete('class');
    params.delete('batch');
    params.delete('subject');
    params.delete('chapter');
    params.delete('topic');
    setSearchParams(params);
    
    const examType = examTypes.find(t => t.code === domain);
    if (examType?.requires_board) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  };

  const handleBoardClassComplete = () => {
    setCurrentStep(3); // Move to batch selection
  };

  const handleQuestionsComplete = () => {
    toast({ title: "Success", description: "Questions saved to Question Bank" });
    setRefetchKey(prev => prev + 1);
  };

  const renderBreadcrumbs = () => {
    const crumbs = [];
    
    if (selectedDomain) {
      const examType = examTypes.find(t => t.code === selectedDomain);
      crumbs.push(examType?.display_name || selectedDomain);
    }
    if (selectedBoard) crumbs.push(selectedBoard);
    if (selectedClass) crumbs.push(`Class ${selectedClass}`);
    if (selectedBatch) {
      const batch = batches.find(b => b.id === selectedBatch);
      crumbs.push(batch?.name || "Batch");
    }
    if (selectedSubject) crumbs.push(selectedSubject);
    if (selectedChapter) crumbs.push(selectedChapter.chapter_name);
    if (selectedTopic) crumbs.push(selectedTopic.topic_name);
    
    return crumbs.length > 0 ? (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        {crumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-2">
            {crumb}
            {idx < crumbs.length - 1 && <ChevronRight className="h-4 w-4" />}
          </span>
        ))}
      </div>
    ) : null;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold">Question Bank Builder</h2>
        <p className="text-muted-foreground">Extract questions from PDFs/Word docs organized by Domain → Board → Class → Batch → Subject → Chapter → Topic</p>
      </div>

      {renderBreadcrumbs()}

      {/* Step 1: Domain Selection */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Exam Domain</CardTitle>
            <CardDescription>Choose the exam type to organize questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {examTypes.filter(t => t.is_active).map((examType) => {
                const IconComponent = examType.icon_name ? iconMap[examType.icon_name] : LucideIcons.BookOpen;
                return (
                  <Card
                    key={examType.id}
                    className="cursor-pointer hover:border-primary transition-all"
                    onClick={() => handleDomainSelect(examType.code)}
                  >
                    <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                      {IconComponent && <IconComponent className="h-8 w-8 text-primary" />}
                      <div>
                        <div className="font-semibold">{examType.display_name}</div>
                        <div className="text-xs text-muted-foreground">{examType.category}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Board & Class Selection (Only for School) */}
      {currentStep === 2 && selectedDomain === 'school' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Select Board & Class</CardTitle>
            <CardDescription>Choose the educational board and class</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Domain
            </Button>
            
            <BoardClassSelector
              examType={selectedDomain || ''}
              selectedBoard={selectedBoard}
              selectedClass={selectedClass}
              onBoardSelect={handleBoardSelect}
              onClassSelect={handleClassSelect}
              onReset={resetFromBoardURL}
              onResetToBoard={resetToBoardURL}
            />
            
            {selectedBoard && selectedClass && (
              <Button onClick={handleBoardClassComplete} className="mt-4">
                Next: Select Batch
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Batch Selection */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Select Batch</CardTitle>
            <CardDescription>Choose a batch with a linked roadmap</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setCurrentStep(selectedDomain === 'school' ? 2 : 1)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            {batches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No batches found for this selection. Please create a batch with a linked roadmap first.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batches.map((batch) => (
                  <Card
                    key={batch.id}
                    className={`cursor-pointer hover:border-primary transition-all ${
                      selectedBatch === batch.id ? 'border-primary bg-primary/5' : ''
                    }`}
                     onClick={() => {
                       setSelectedBatch(batch.id);
                       const params = new URLSearchParams(searchParams);
                       params.set('domain', selectedDomain || '');
                       if (selectedBoard) params.set('board', selectedBoard);
                       if (selectedClass) params.set('class', selectedClass);
                       params.set('batch', batch.id);
                       params.delete('subject');
                       params.delete('chapter');
                       params.delete('topic');
                       setSearchParams(params);
                       setCurrentStep(4);
                     }}
                  >
                    <CardContent className="p-4">
                      <div className="font-semibold">{batch.name}</div>
                      <div className="text-sm text-muted-foreground">{batch.exam_name}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Strength: {batch.current_strength}
                      </div>
                      <Badge variant="secondary" className="mt-2">Has Roadmap</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Subject Selection */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Select Subject</CardTitle>
            <CardDescription>Choose the subject for questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setCurrentStep(3)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Batch
            </Button>
            
            {subjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No subjects found in the batch roadmap.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {subjects.map((subject) => (
                  <Card
                    key={subject}
                    className={`cursor-pointer hover:border-primary transition-all ${
                      selectedSubject === subject ? 'border-primary bg-primary/5' : ''
                    }`}
                     onClick={() => {
                       setSelectedSubject(subject);
                       const params = new URLSearchParams(searchParams);
                       params.set('domain', selectedDomain || '');
                       if (selectedBoard) params.set('board', selectedBoard);
                       if (selectedClass) params.set('class', selectedClass);
                       params.set('batch', selectedBatch);
                       params.set('subject', subject);
                       params.delete('chapter');
                       params.delete('topic');
                       setSearchParams(params);
                       setCurrentStep(5);
                     }}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="font-semibold">{subject}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Chapter Selection */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5: Select Chapter</CardTitle>
            <CardDescription>Choose the chapter for questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Subject
            </Button>
            
            {chapters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No chapters found for this subject.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chapters.map((chapter) => (
                  <Card
                    key={chapter.id}
                    className={`cursor-pointer hover:border-primary transition-all ${
                      selectedChapter?.id === chapter.id ? 'border-primary bg-primary/5' : ''
                    }`}
                     onClick={() => {
                       setSelectedChapter(chapter);
                       const params = new URLSearchParams(searchParams);
                       params.set('domain', selectedDomain || '');
                       if (selectedBoard) params.set('board', selectedBoard);
                       if (selectedClass) params.set('class', selectedClass);
                       params.set('batch', selectedBatch);
                       params.set('subject', selectedSubject);
                       params.set('chapter', chapter.id);
                       params.delete('topic');
                       setSearchParams(params);
                       setCurrentStep(6);
                     }}
                  >
                    <CardContent className="p-4">
                      <div className="font-semibold">{chapter.chapter_name}</div>
                      <div className="text-sm text-muted-foreground">{chapter.subject}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 6: Topic Selection */}
      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 6: Select Topic</CardTitle>
            <CardDescription>Choose the specific topic for questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setCurrentStep(5)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chapter
            </Button>
            
            {topics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No topics found for this chapter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topics.map((topic) => (
                  <Card
                    key={topic.id}
                    className={`cursor-pointer hover:border-primary transition-all ${
                      selectedTopic?.id === topic.id ? 'border-primary bg-primary/5' : ''
                    }`}
                     onClick={() => {
                       setSelectedTopic(topic);
                       const params = new URLSearchParams(searchParams);
                       params.set('domain', selectedDomain || '');
                       if (selectedBoard) params.set('board', selectedBoard);
                       if (selectedClass) params.set('class', selectedClass);
                       params.set('batch', selectedBatch);
                       params.set('subject', selectedSubject);
                       params.set('chapter', selectedChapter!.id);
                       params.set('topic', topic.id);
                       setSearchParams(params);
                       setCurrentStep(7);
                     }}
                  >
                    <CardContent className="p-4">
                      <div className="font-semibold">{topic.topic_name}</div>
                      <div className="text-sm text-muted-foreground">Order: {topic.order_num}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 7: Manual Entry or Upload */}
      {currentStep === 7 && selectedTopic && selectedChapter && (
        <Card>
          <CardHeader>
            <CardTitle>Step 7: Add Questions</CardTitle>
            <CardDescription>Manually create questions or upload from PDF/Word</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setCurrentStep(6)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Topic
            </Button>
            
            <Tabs defaultValue="view" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="view">View All Questions</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="upload">Upload PDF/Word</TabsTrigger>
              </TabsList>

              <TabsContent value="view">
                <SmartQuestionExtractor
                  key={refetchKey}
                  mode="question-bank"
                  topicId={selectedTopic.id}
                  topicName={selectedTopic.topic_name}
                  chapterId={selectedChapter.id}
                  chapterName={selectedChapter.chapter_name}
                  subjectName={selectedSubject}
                  batchId={selectedBatch}
                  examDomain={selectedDomain || ''}
                  examName={batches.find(b => b.id === selectedBatch)?.exam_name || selectedDomain || ''}
                  onQuestionsAdded={handleQuestionsComplete}
                  onBackClick={() => setCurrentStep(6)}
                />
              </TabsContent>

              <TabsContent value="manual">
                <ManualQuestionEntry
                  selectedTopic={selectedTopic}
                  selectedChapter={selectedChapter}
                  selectedSubject={selectedSubject}
                  selectedBatch={selectedBatch}
                  selectedDomain={selectedDomain}
                  examName={batches.find(b => b.id === selectedBatch)?.exam_name || selectedDomain || ''}
                  onComplete={handleQuestionsComplete}
                />
              </TabsContent>

              <TabsContent value="upload">
                <SmartQuestionExtractor
                  key={refetchKey}
                  mode="question-bank"
                  topicId={selectedTopic.id}
                  topicName={selectedTopic.topic_name}
                  chapterId={selectedChapter.id}
                  chapterName={selectedChapter.chapter_name}
                  subjectName={selectedSubject}
                  batchId={selectedBatch}
                  examDomain={selectedDomain || ''}
                  examName={batches.find(b => b.id === selectedBatch)?.exam_name || selectedDomain || ''}
                  onQuestionsAdded={handleQuestionsComplete}
                  onBackClick={() => setCurrentStep(6)}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
