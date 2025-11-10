import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Eye, Sparkles, GripVertical, Check, X, Upload, FileText, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useExamTypes } from "@/hooks/useExamTypes";
import { BoardClassSelector } from "./BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";
import { EnhancedLessonWorkflow } from "./EnhancedLessonWorkflow";
import { QuestionToGameConverter } from "./QuestionToGameConverter";
import { SmartQuestionExtractorNew } from "./SmartQuestionExtractorNew";
import { LessonPreviewDialog } from "./LessonPreviewDialog";
import { TheoryCheckpointBuilder } from "./TheoryCheckpointBuilder";
import { LessonBuilderProvider, useLessonBuilder } from "@/contexts/LessonBuilderContext";
import { GameTypePublishTester } from "./GameTypePublishTester";
import * as LucideIcons from "lucide-react";
import { useEffect as useEffectForContext } from "react";

import { 
  normalizeGameTypeForContent, 
  normalizeGameTypeForMapping, 
  getGameTypeErrorMessage 
} from '@/lib/gameTypeMapping';

type LessonType = 'theory' | 'interactive_svg' | 'game' | 'quiz';
type GameType = 'mcq' | 'true_false' | 'assertion_reason' | 'match_pairs' | 'match_column' | 'drag_drop' | 'typing_race' | 'word_puzzle' | 'fill_blanks' | 'sequence_order' | 'subjective';
type SvgType = 'math_graph' | 'physics_motion' | 'chemistry_molecule' | 'algorithm_viz' | 'concept_diagram';

interface Lesson {
  id?: string;
  topic_id: string;
  lesson_type: LessonType;
  content_order: number;
  theory_text?: string;
  theory_html?: string;
  theory_language?: string;
  checkpoint_config?: any;
  svg_type?: SvgType;
  svg_data?: any;
  game_type?: GameType;
  game_data?: any;
  estimated_time_minutes: number;
  xp_reward: number;
  generated_by: string;
  human_reviewed: boolean;
  approved_at?: string;
}

interface Batch {
  id: string;
  name: string;
  exam_type: string;
  exam_name: string;
  linked_roadmap_id: string;
}

interface Subject {
  subject: string;
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
}

function SortableLesson({ 
  lesson, 
  onEdit, 
  onDelete, 
  onApprove,
  isSelected,
  onToggleSelection 
}: { 
  lesson: Lesson; 
  onEdit: () => void; 
  onDelete: () => void; 
  onApprove: () => void;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id || '' });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`transition-all hover:shadow-lg ${isSelected ? 'ring-2 ring-primary shadow-md' : ''}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Top Controls */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(lesson.id!)}
              className="h-4 w-4"
            />
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          {lesson.human_reviewed ? (
          <Badge variant="default" className="bg-green-500">
            <Check className="h-3 w-3 mr-1" /> Published
          </Badge>
          ) : (
            <Badge variant="secondary">
              <X className="h-3 w-3 mr-1" /> Pending
            </Badge>
          )}
        </div>

        {/* Content Type Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-medium">{lesson.lesson_type}</Badge>
          {(lesson.game_data?.original_type || lesson.game_type) && (
            <Badge variant="secondary">{lesson.game_data?.original_type || lesson.game_type}</Badge>
          )}
          {lesson.svg_type && <Badge variant="secondary">{lesson.svg_type}</Badge>}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-foreground">{lesson.xp_reward}</span> XP
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold text-foreground">{lesson.estimated_time_minutes}</span> min
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onEdit} className="w-full justify-start">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <div className="flex gap-2">
            {!lesson.human_reviewed && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={onApprove}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}
            
            <Button variant="destructive" size="sm" onClick={onDelete} className={lesson.human_reviewed ? 'flex-1' : ''}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LessonContentBuilderInner() {
  const { toast } = useToast();
  const { examTypes } = useExamTypes();
  const { selectedBoard, selectedClass, setBoard, setClass, resetFromBoard, resetToBoard } = useBoardClassHierarchy();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Hydration guard - prevents clearing selections during initial URL → state sync
  const isHydrating = useRef(true);
  
  // Get context setters to share state with other tabs
  const {
    setSelectedDomain: setContextDomain,
    setSelectedBatch: setContextBatch,
    setSelectedSubject: setContextSubject,
    setSelectedChapter: setContextChapter,
    setSelectedTopic: setContextTopic,
    setSelectedBoard: setContextBoard,
    setSelectedClass: setContextClass,
  } = useLessonBuilder();

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
  
  // Read active tab from URL
  const activeTab = searchParams.get('lessonTab') || 'lesson-library';

  // Update URL when tab changes
  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('lessonTab', tab);
    setSearchParams(params);
  };
  
  // Domain selection - read from URL
  const selectedDomain = searchParams.get('domain') || null;
  
  const setSelectedDomain = (domain: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (domain) {
      params.set('domain', domain);
    } else {
      params.delete('domain');
      params.delete('batch');
      params.delete('subject');
      params.delete('chapter');
      params.delete('topic');
    }
    setSearchParams(params);
  };
  
  // Hierarchical filtering state - read from URL
  const [batches, setBatches] = useState<Batch[]>([]);
  const selectedBatch = searchParams.get('batch') || "";
  
  const setSelectedBatch = (batch: string) => {
    const params = new URLSearchParams(searchParams);
    if (batch) {
      params.set('batch', batch);
      params.delete('subject');
      params.delete('chapter');
      params.delete('topic');
    } else {
      params.delete('batch');
      params.delete('subject');
      params.delete('chapter');
      params.delete('topic');
    }
    setSearchParams(params);
  };
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const selectedSubject = searchParams.get('subject') || "";
  
  const setSelectedSubject = (subject: string) => {
    const params = new URLSearchParams(searchParams);
    if (subject) {
      params.set('subject', subject);
      params.delete('chapter');
      params.delete('topic');
    } else {
      params.delete('subject');
      params.delete('chapter');
      params.delete('topic');
    }
    setSearchParams(params);
  };
  
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const selectedChapter = searchParams.get('chapter') || "";
  
  const setSelectedChapter = (chapter: string) => {
    const params = new URLSearchParams(searchParams);
    if (chapter) {
      params.set('chapter', chapter);
      params.delete('topic');
    } else {
      params.delete('chapter');
      params.delete('topic');
    }
    setSearchParams(params);
  };
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const selectedTopic = searchParams.get('topic') || "";
  
  const setSelectedTopic = (topic: string) => {
    const params = new URLSearchParams(searchParams);
    if (topic) {
      params.set('topic', topic);
    } else {
      params.delete('topic');
    }
    setSearchParams(params);
  };
  
  const [topicQuestionCounts, setTopicQuestionCounts] = useState<Record<string, number>>({});
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [roadmapCounts, setRoadmapCounts] = useState<any>({ byBoard: {}, byClass: {} });
  
  // Bulk operations state
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  
  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
    lesson_type: 'theory',
    estimated_time_minutes: 5,
    xp_reward: 10,
    generated_by: 'manual',
    human_reviewed: false,
    theory_language: 'english',
  });

  // Multi-file upload and flexible content states
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [additionalText, setAdditionalText] = useState('');
  const [useJsonFormat, setUseJsonFormat] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [generatedGames, setGeneratedGames] = useState<any>(null);
  
  // Preview and checkpoint states
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [theorySections, setTheorySections] = useState<any[]>([{
    section_order: 0,
    section_text: '',
    has_checkpoint: false
  }]);
  const [extractedQuestionsForCheckpoints, setExtractedQuestionsForCheckpoints] = useState<any[]>([]);


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  // Turn off hydration guard after initial render
  useEffect(() => {
    isHydrating.current = false;
  }, []);

  // Hydrate board/class from URL continuously
  useEffect(() => {
    const boardParam = searchParams.get('board');
    const classParam = searchParams.get('class');
    if (boardParam && boardParam !== selectedBoard) {
      setBoard(boardParam);
    }
    if (classParam && classParam !== selectedClass) {
      setClass(classParam);
    }
  }, [searchParams, selectedBoard, selectedClass, setBoard, setClass]);

  // Sync local state to context
  useEffectForContext(() => {
    setContextDomain(selectedDomain);
    setContextBoard(selectedBoard);
    setContextClass(selectedClass);
  }, [selectedDomain, selectedBoard, selectedClass]);

  useEffectForContext(() => {
    setContextBatch(selectedBatch);
  }, [selectedBatch]);

  useEffectForContext(() => {
    setContextSubject(selectedSubject);
  }, [selectedSubject]);

  useEffectForContext(() => {
    setContextChapter(selectedChapter);
  }, [selectedChapter]);

  useEffectForContext(() => {
    setContextTopic(selectedTopic);
  }, [selectedTopic]);

  useEffect(() => {
    if (selectedDomain) {
      fetchBatches();
      fetchRoadmapCounts();
      // Only clear child selections if not hydrating from URL
      if (!isHydrating.current) {
        setSelectedBatch("");
        setSelectedSubject("");
        setSelectedChapter("");
        setSelectedTopic("");
      }
    }
  }, [selectedDomain, selectedBoard, selectedClass]);

  useEffect(() => {
    // Wait for batches to load before fetching subjects
    if (!selectedBatch || !batches.length) return;
    
    fetchSubjects();
    // Only clear child selections if not hydrating from URL
    if (!isHydrating.current) {
      setSelectedSubject("");
      setSelectedChapter("");
      setSelectedTopic("");
    }
  }, [selectedBatch, batches]);

  useEffect(() => {
    // Wait for batches to load before fetching chapters
    if (!selectedSubject || !batches.length) return;
    
    fetchChapters();
    // Only clear child selections if not hydrating from URL
    if (!isHydrating.current) {
      setSelectedChapter("");
      setSelectedTopic("");
    }
  }, [selectedSubject, batches]);

  useEffect(() => {
    if (!selectedChapter) return;
    
    fetchTopics(selectedChapter);
    // Only clear topic if not hydrating from URL
    if (!isHydrating.current) {
      setSelectedTopic("");
    }
  }, [selectedChapter]);

  useEffect(() => {
    if (selectedTopic) {
      fetchLessons();
    }
  }, [selectedTopic]);

  // Form persistence to prevent data loss
  useEffect(() => {
    if (!isAddDialogOpen) return;
    
    const storageKey = `lesson-builder-form-${selectedBatch}-${selectedSubject}-${selectedChapter}-${selectedTopic}`;
    const formData = {
      newLesson,
      uploadedFiles: uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
      additionalText,
      useJsonFormat,
      timestamp: Date.now()
    };
    localStorage.setItem(storageKey, JSON.stringify(formData));
  }, [newLesson, uploadedFiles, additionalText, useJsonFormat, isAddDialogOpen, selectedBatch, selectedSubject, selectedChapter, selectedTopic]);

  // Restore form data on dialog open
  useEffect(() => {
    if (isAddDialogOpen) {
      const storageKey = `lesson-builder-form-${selectedBatch}-${selectedSubject}-${selectedChapter}-${selectedTopic}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only restore if saved within last 24 hours
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            setNewLesson(parsed.newLesson);
            setAdditionalText(parsed.additionalText || '');
            setUseJsonFormat(parsed.useJsonFormat || false);
            toast({
              title: "Form data restored",
              description: "Your previous work was recovered"
            });
          }
        } catch (e) {
          console.error('Failed to restore form:', e);
        }
      }
    }
  }, [isAddDialogOpen]);

  const fetchBatches = async () => {
    if (!selectedDomain) return;

    let query = supabase
      .from("batches")
      .select("id, name, exam_type, exam_name, linked_roadmap_id, target_board, target_class, current_strength")
      .eq("is_active", true)
      .eq("exam_type", selectedDomain);

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

  const fetchRoadmapCounts = async () => {
    if (!selectedDomain) return;
    
    const { data, error } = await supabase
      .from('batches')
      .select('id, exam_type, target_board, target_class, linked_roadmap_id')
      .eq('exam_type', selectedDomain)
      .eq('is_active', true)
      .not('linked_roadmap_id', 'is', null);
    
    if (error) {
      console.error('Error fetching roadmap counts:', error);
      return;
    }
    
    const byBoard: Record<string, number> = {};
    const byClass: Record<string, Record<string, number>> = {};
    
    data?.forEach((batch: any) => {
      const board = batch.target_board || 'General';
      const cls = batch.target_class;
      
      byBoard[board] = (byBoard[board] || 0) + 1;
      
      if (cls) {
        if (!byClass[board]) byClass[board] = {};
        byClass[board][cls] = (byClass[board][cls] || 0) + 1;
      }
    });
    
    setRoadmapCounts({ byBoard, byClass });
  };

  const fetchSubjects = async () => {
    if (!selectedBatch) return;

    const batch = batches.find(b => b.id === selectedBatch);
    if (!batch?.linked_roadmap_id) {
      toast({ title: 'Warning', description: 'This batch has no linked roadmap', variant: 'destructive' });
      return;
    }

    const { data, error } = await supabase
      .from('roadmap_chapters')
      .select('subject')
      .eq('roadmap_id', batch.linked_roadmap_id);

    if (error) {
      toast({ title: "Error", description: "Failed to load subjects", variant: "destructive" });
      return;
    }

    const uniqueSubjects = Array.from(new Set(data.map(d => d.subject)))
      .map(subject => ({ subject }));
    setSubjects(uniqueSubjects);
  };

  const fetchChapters = async () => {
    if (!selectedBatch || !selectedSubject) return;

    const batch = batches.find(b => b.id === selectedBatch);
    if (!batch?.linked_roadmap_id) return;

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

  const fetchTopics = async (chapterId: string) => {
    const { data, error } = await supabase
      .from('roadmap_topics')
      .select('id, topic_name, chapter_id')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTopics(data || []);
      // Fetch question counts for these topics
      if (data && data.length > 0) {
        fetchTopicQuestionCounts(data.map(t => t.id));
      }
    }
  };

  const fetchTopicQuestionCounts = async (topicIds: string[]) => {
    const { data, error } = await supabase
      .from('question_bank')
      .select('topic_id')
      .in('topic_id', topicIds)
      .not('topic_id', 'is', null);
    
    if (!error && data) {
      const counts: Record<string, number> = {};
      topicIds.forEach(id => counts[id] = 0); // Initialize all to 0
      data.forEach(q => {
        counts[q.topic_id] = (counts[q.topic_id] || 0) + 1;
      });
      setTopicQuestionCounts(counts);
    }
  };

  const fetchLessons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('topic_learning_content')
      .select('*')
      .eq('topic_id', selectedTopic)
      .order('content_order', { ascending: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setLessons((data || []) as Lesson[]);
    }
    setLoading(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(lessons, oldIndex, newIndex);
    
    setLessons(reordered);

    const updates = reordered.map((lesson, idx) => ({
      id: lesson.id,
      content_order: idx + 1,
    }));

    for (const update of updates) {
      await supabase.from('topic_learning_content').update({ content_order: update.content_order }).eq('id', update.id);
    }

    toast({ title: "Success", description: "Lessons reordered" });
  };

  const resetForm = () => {
    setNewLesson({
      lesson_type: 'theory',
      estimated_time_minutes: 5,
      xp_reward: 10,
      generated_by: 'manual',
      human_reviewed: false,
      theory_language: 'english',
      game_type: undefined,
      game_data: undefined,
      svg_type: undefined,
      svg_data: undefined,
    });
    setUploadedFiles([]);
    setAdditionalText('');
    setUseJsonFormat(false);
    setAiSuggestions(null);
    setGeneratedGames(null);
    setTheorySections([{
      section_order: 0,
      section_text: '',
      has_checkpoint: false
    }]);
    
    // Clear localStorage
    if (selectedBatch && selectedSubject && selectedChapter && selectedTopic) {
      const storageKey = `lesson-builder-form-${selectedBatch}-${selectedSubject}-${selectedChapter}-${selectedTopic}`;
      localStorage.removeItem(storageKey);
    }
  };

  const handleMultipleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + uploadedFiles.length > 20) {
      toast({ title: "Maximum 20 files allowed", variant: "destructive" });
      return;
    }
    setUploadedFiles([...uploadedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleProcessContent = async () => {
    setAiProcessing(true);
    try {
      const data = await invokeWithAuth<any, any>({
        name: 'ai-question-to-game',
        body: {
          mode: 'bulk_mixed',
          files: uploadedFiles,
          text: additionalText,
          useJson: useJsonFormat,
          lessonType: newLesson.lesson_type,
          context: {
            subject: selectedSubject,
            chapter: chapters.find(c => c.id === selectedChapter)?.chapter_name,
            topic: topics.find(t => t.id === selectedTopic)?.topic_name
          }
        }
      });

      if (newLesson.lesson_type === 'theory') {
        setNewLesson({ ...newLesson, theory_text: data.content || additionalText });
        toast({ title: "Success", description: "Theory content processed" });
      } else if (newLesson.lesson_type === 'game') {
        setAiSuggestions(data.suggestions);
        setGeneratedGames(data.games);
        
        // AUTO-SELECT BEST GAME
        const bestGameType = data.suggestions.bestGameType;
        const bestGameData = data.games[bestGameType];
        
        if (bestGameType && bestGameData) {
          setNewLesson({
            ...newLesson,
            game_type: bestGameType as GameType,
            game_data: bestGameData
          });
          
          toast({ 
            title: "Game Auto-Selected", 
            description: `${bestGameType.replace(/_/g, ' ')} game ready to save`
          });
        } else {
          toast({ title: "Success", description: "Content processed - select a game type" });
        }
      }
    } catch (error: any) {
      console.error('Process content error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to process content with AI", 
        variant: "destructive" 
      });
    } finally {
      setAiProcessing(false);
    }
  };

  const handleAddLesson = async () => {
    if (!selectedTopic) {
      toast({ title: "Error", description: "Please select a topic first", variant: "destructive" });
      return;
    }

    // VALIDATION: Game lessons must have game_type and game_data
    if (newLesson.lesson_type === 'game') {
      if (!newLesson.game_type || !newLesson.game_data) {
        toast({ 
          title: "Game Data Required", 
          description: "Please process content with AI to generate game data",
          variant: "destructive" 
        });
        return;
      }
    }

    // VALIDATION: Interactive SVG must have svg_type and svg_data
    if (newLesson.lesson_type === 'interactive_svg') {
      if (!newLesson.svg_type || !newLesson.svg_data) {
        toast({ 
          title: "SVG Configuration Required", 
          description: "Please configure SVG type and settings",
          variant: "destructive" 
        });
        return;
      }
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    // Build base lesson data
    let lessonData: any = {
      topic_id: selectedTopic,
      lesson_type: newLesson.lesson_type,
      content_order: lessons.length + 1,
      estimated_time_minutes: newLesson.estimated_time_minutes || 5,
      xp_reward: newLesson.xp_reward || 10,
      generated_by: newLesson.generated_by || 'manual',
      human_reviewed: newLesson.human_reviewed || false,
      created_by: user.user.id,
    };

    // Handle theory with checkpoints
    if (lessonData.lesson_type === 'theory' && theorySections.length > 0) {
      lessonData.theory_text = theorySections.map(s => s.section_text).join('\n\n');
      lessonData.theory_html = theorySections.map(s => `<p>${s.section_text}</p>`).join('');
      lessonData.theory_language = newLesson.theory_language || 'english';
      lessonData.checkpoint_config = {
        sections: theorySections.map(s => ({
          section_order: s.section_order,
          section_text: s.section_text,
          ...(s.has_checkpoint && s.checkpoint ? { checkpoint: s.checkpoint } : {})
        }))
      };
    } else if (lessonData.lesson_type === 'theory') {
      lessonData.theory_text = newLesson.theory_text;
      lessonData.theory_html = newLesson.theory_html;
      lessonData.theory_language = newLesson.theory_language || 'english';
    }

    // Handle game lessons
    if (lessonData.lesson_type === 'game') {
      if (!newLesson.game_type || !newLesson.game_data) {
        toast({ 
          title: "Error", 
          description: "Game lessons require game_type and game_data", 
          variant: "destructive" 
        });
        return;
      }
      
      const normalizedForContent = normalizeGameTypeForContent(newLesson.game_type);
      
      if (!normalizedForContent) {
        console.error('❌ Invalid game_type for topic_learning_content:', newLesson.game_type);
        toast({
          title: "Unsupported game type",
          description: getGameTypeErrorMessage(newLesson.game_type, false),
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ Game type normalized for content:', {
        raw: newLesson.game_type,
        normalized: normalizedForContent
      });
      
      lessonData.game_type = normalizedForContent;
      lessonData.game_data = newLesson.game_data;
    }

    // Handle interactive SVG
    if (lessonData.lesson_type === 'interactive_svg') {
      lessonData.svg_type = newLesson.svg_type;
      lessonData.svg_data = newLesson.svg_data;
    }

    // Whitelist: Only send valid columns to avoid 400 errors
    const allowedFields = [
      'topic_id', 'lesson_type', 'content_order', 
      'theory_text', 'theory_html', 'theory_language', 
      'checkpoint_config', 'svg_type', 'svg_data', 
      'game_type', 'game_data', 
      'estimated_time_minutes', 'xp_reward', 
      'generated_by', 'human_reviewed', 
      'created_by', 'approved_by', 'approved_at'
    ];
    
    const safePayload = Object.keys(lessonData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = lessonData[key];
        return obj;
      }, {});

    try {
      const { error } = await supabase.from('topic_learning_content').insert([safePayload]);

      if (error) {
        console.error('❌ Insert failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        toast({ 
          title: "Insert Failed", 
          description: `${error.message}${error.code ? ` (${error.code})` : ''}`, 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Success", description: "Lesson added successfully" });
        setIsAddDialogOpen(false);
        fetchLessons();
        resetForm();
      }
    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      toast({ 
        title: "Error", 
        description: err.message || "Failed to add lesson", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    // Delete from gamified_exercises first (child table)
    const { error: gameError } = await supabase
      .from('gamified_exercises')
      .delete()
      .eq('topic_content_id', lessonId);

    if (gameError) {
      console.error('Error deleting gamified_exercises:', gameError);
    }

    // Delete from topic_content_mapping
    const { error: mappingError } = await supabase
      .from('topic_content_mapping')
      .delete()
      .eq('content_id', lessonId);

    if (mappingError) {
      console.error('Error deleting topic_content_mapping:', mappingError);
    }

    // Finally delete from topic_learning_content (parent table)
    const { error } = await supabase
      .from('topic_learning_content')
      .delete()
      .eq('id', lessonId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Lesson and associated game data deleted" });
      fetchLessons();
    }
  };

  const handleApproveLesson = async (lessonId: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase
      .from('topic_learning_content')
      .update({
        human_reviewed: true,
        approved_by: user.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: "Success", 
        description: "Game approved and published to students! They can now see and play it." 
      });
      fetchLessons();
    }
  };

  // Bulk operations functions
  const toggleLessonSelection = (id: string) => {
    setSelectedLessonIds(prev => 
      prev.includes(id) ? prev.filter(lessonId => lessonId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLessonIds.length === lessons.length) {
      setSelectedLessonIds([]);
    } else {
      setSelectedLessonIds(lessons.map(l => l.id!).filter(Boolean));
    }
  };

  const clearSelection = () => {
    setSelectedLessonIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedLessonIds.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedLessonIds.length} lesson(s)? This cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    
    const { error } = await supabase
      .from('topic_learning_content')
      .delete()
      .in('id', selectedLessonIds);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: "Success", 
        description: `Deleted ${selectedLessonIds.length} lesson(s)` 
      });
      clearSelection();
      fetchLessons();
    }
    
    setLoading(false);
  };

  const handleBulkApprove = async () => {
    if (selectedLessonIds.length === 0) return;
    
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    
    setLoading(true);
    
    const { error } = await supabase
      .from('topic_learning_content')
      .update({
        human_reviewed: true,
        approved_by: user.user.id,
        approved_at: new Date().toISOString(),
      })
      .in('id', selectedLessonIds);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: "Success", 
        description: `Approved and published ${selectedLessonIds.length} game(s)! Students can now play them.` 
      });
      clearSelection();
      fetchLessons();
    }
    
    setLoading(false);
  };

  const isAllSelected = selectedLessonIds.length === lessons.length && lessons.length > 0;
  const pendingSelectedCount = lessons.filter(l => 
    selectedLessonIds.includes(l.id!) && !l.human_reviewed
  ).length;

  const handleBulkGenerateLessons = async () => {
    if (!selectedTopic) {
      toast({ title: "Error", description: "Please select a topic first", variant: "destructive" });
      return;
    }

    setLoading(true);
    toast({ title: "Generating...", description: "AI is creating lesson content for this topic" });

    try {
      const selectedTopicData = topics.find(t => t.id === selectedTopic);
      const selectedChapterData = chapters.find(c => c.id === selectedChapter);
      
      const { data, error } = await supabase.functions.invoke('ai-lesson-generator', {
        body: {
          topic_id: selectedTopic,
          topic_name: selectedTopicData?.topic_name || 'Unknown Topic',
          chapter_name: selectedChapterData?.chapter_name || 'Unknown Chapter',
          lesson_types: ['theory', 'game', 'interactive_svg'],
          difficulty: 'medium',
        }
      });

      if (error) throw error;

      if (data?.lessons && data.lessons.length > 0) {
        const { data: user } = await supabase.auth.getUser();
        const lessonsToInsert = [];
        let skippedCount = 0;

        for (const lesson of data.lessons) {
          const isGame = lesson.lesson_type === 'game';
          const isSvg = lesson.lesson_type === 'interactive_svg';
          
          // Normalize game_type for game lessons
          let normalizedGameType = null;
          if (isGame) {
            normalizedGameType = normalizeGameTypeForContent(lesson.game_type);
            if (!normalizedGameType) {
              console.warn(`⚠️ Skipping AI lesson with unsupported game type: ${lesson.game_type}`);
              skippedCount++;
              continue;
            }
          }

          // Build clean payload based on lesson type
          const cleanLesson: any = {
            topic_id: selectedTopic,
            lesson_type: lesson.lesson_type,
            content_order: lessons.length + lessonsToInsert.length + 1,
            estimated_time_minutes: lesson.estimated_time_minutes || 5,
            xp_reward: lesson.xp_reward || 20,
            generated_by: 'ai',
            created_by: user?.user?.id,
            human_reviewed: false,
          };

          // Add type-specific fields
          if (isGame) {
            cleanLesson.game_type = normalizedGameType;
            cleanLesson.game_data = lesson.game_data;
          } else if (isSvg) {
            cleanLesson.svg_type = lesson.svg_type;
            cleanLesson.svg_data = lesson.svg_data;
          } else {
            // Theory
            cleanLesson.theory_text = lesson.theory_text;
            cleanLesson.theory_html = lesson.theory_html;
          }

          lessonsToInsert.push(cleanLesson);
        }

        if (lessonsToInsert.length === 0) {
          toast({ 
            title: "No Valid Lessons", 
            description: `All ${data.lessons.length} AI-generated lessons were invalid or unsupported.`,
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }

        const { error: insertError } = await supabase
          .from('topic_learning_content')
          .insert(lessonsToInsert);

        if (insertError) {
          console.error('❌ Bulk AI insert error:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            sample: lessonsToInsert[0]
          });
          throw insertError;
        }

        const summary = skippedCount > 0 
          ? `Generated ${lessonsToInsert.length} lessons (${skippedCount} skipped due to invalid types)`
          : `Generated ${lessonsToInsert.length} AI-powered lessons`;
        
        toast({ 
          title: "Success!", 
          description: `${summary}. Review and approve them.`
        });
        fetchLessons();
      } else {
        toast({ 
          title: "No Content", 
          description: "AI didn't generate any lessons. Try again.", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast({ 
        title: "Generation Failed", 
        description: error.message || "Failed to generate lessons. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper: Map correct_answer from question to game index
  const mapCorrectAnswerToGameIndex = (q: any): number | null => {
    const ans = q.correct_answer;
    
    switch (q.question_type) {
      case 'mcq':
      case 'assertion_reason':
        // Handle object with index
        if (typeof ans?.index === 'number') return ans.index;
        // Handle legacy number
        if (typeof ans === 'number') return ans;
        // Handle string - find matching option
        if (typeof ans === 'string' && q.options) {
          const idx = q.options.findIndex((opt: string) => 
            opt.trim().toLowerCase() === ans.trim().toLowerCase()
          );
          return idx >= 0 ? idx : null;
        }
        return null;
      
      case 'true_false':
        // Handle object with value
        if (typeof ans?.value === 'boolean') return ans.value ? 0 : 1;
        // Handle legacy boolean: true -> 0 (True), false -> 1 (False)
        if (typeof ans === 'boolean') return ans ? 0 : 1;
        return null;
      
      default:
        return null;
    }
  };

  // Validation helper for game data
  const validateGameData = (gameData: any, questionType: string, questionNumber: string): boolean => {
    console.log('🎮 validateGameData called:', { questionNumber, questionType, gameData });
    
    // Match column validation (leftColumn/rightColumn/correctPairs structure)
    if (questionType === 'match_column') {
      const leftCol = gameData.leftColumn;
      const rightCol = gameData.rightColumn;
      const pairs = Array.isArray(gameData.correctPairs) && gameData.correctPairs.length > 0
        ? gameData.correctPairs
        : (Array.isArray(leftCol) && Array.isArray(rightCol)
            ? Array.from({ length: Math.min(leftCol.length, rightCol.length) }, (_, i) => ({ left: i, right: i }))
            : []);

      // Check leftColumn exists and has items (allow single pair)
      if (!Array.isArray(leftCol) || leftCol.length < 1) {
        toast({
          title: "Validation Error",
          description: `Question ${questionNumber}: Left column me kam se kam 1 item chahiye!`,
          variant: "destructive",
        });
        return false;
      }

      // Check rightColumn exists and has items (allow single pair)
      if (!Array.isArray(rightCol) || rightCol.length < 1) {
        toast({
          title: "Validation Error",
          description: `Question ${questionNumber}: Right column me kam se kam 1 item chahiye!`,
          variant: "destructive",
        });
        return false;
      }

      // Check pairs array exists with {left: number, right: number} (allow single pair)
      if (!Array.isArray(pairs) || pairs.length < 1) {
        toast({
          title: "Validation Error",
          description: `Question ${questionNumber}: Kam se kam 1 correct pair chahiye!`,
          variant: "destructive",
        });
        return false;
      }

      // Validate each pair has valid indices
      const invalidPairs = pairs.filter(
        (p: any) => 
          typeof p.left !== 'number' || 
          typeof p.right !== 'number' ||
          p.left < 0 || p.left >= leftCol.length ||
          p.right < 0 || p.right >= rightCol.length
      );

      if (invalidPairs.length > 0) {
        toast({
          title: "Validation Error",
          description: `Question ${questionNumber}: Kuch pairs ki indices invalid hain!`,
          variant: "destructive",
        });
        return false;
      }

      // Validate all items are non-empty strings
      const emptyLeftItems = leftCol.filter((item: any) => !item || String(item).trim() === '');
      const emptyRightItems = rightCol.filter((item: any) => !item || String(item).trim() === '');

      if (emptyLeftItems.length > 0 || emptyRightItems.length > 0) {
        toast({
          title: "Validation Error",
          description: `Question ${questionNumber}: Columns me empty items nahi hone chahiye!`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    }

    // Fill blank specific validation for answer data
    if (questionType === 'fill_blank') {
      console.log('🔍 Fill blank validation check:', { 
        hasBlanks: !!gameData.blanks, 
        hasSubQuestions: !!gameData.sub_questions,
        hasText: !!gameData.text,
        blanksData: gameData.blanks
      });
      
      // Check for either traditional format (text) OR sub-questions format
      const isTraditionalFormat = gameData.text && gameData.text.trim() !== '';
      const isSubQuestionsFormat = Array.isArray(gameData.sub_questions) && gameData.sub_questions.length > 0;
      
      if (!isTraditionalFormat && !isSubQuestionsFormat) {
        toast({
          title: "Validation Error",
          description: `Question ${questionNumber}: Fill blank needs either 'text' field or 'sub_questions' array!`,
          variant: "destructive",
        });
        return false;
      }
      
      // Validate blanks array exists
      if (!gameData.blanks || !Array.isArray(gameData.blanks) || gameData.blanks.length === 0) {
        toast({
          title: "Validation Error",
          description: `Question ${questionNumber}: Fill blank ko answer data chahiye (blanks array)!`,
          variant: "destructive",
        });
        return false;
      }
      
      // For sub-questions format, validate blanks count matches sub-questions count
      if (isSubQuestionsFormat) {
        if (gameData.blanks.length !== gameData.sub_questions.length) {
          toast({
            title: "Validation Error",
            description: `Question ${questionNumber}: Blanks count (${gameData.blanks.length}) should match sub-questions count (${gameData.sub_questions.length})!`,
            variant: "destructive",
          });
          return false;
        }
      }
      
      // Validate each blank has correctAnswer and 3 distractors
      const invalidBlanks = gameData.blanks.filter((b: any) => 
        !b.correctAnswer?.trim() || 
        !Array.isArray(b.distractors) || 
        b.distractors.length !== 3 ||
        b.distractors.some((d: string) => !d?.trim())
      );
      
      if (invalidBlanks.length > 0) {
        toast({
          title: "Validation Error",
          description: `Question ${questionNumber}: Har blank me 1 correct answer + 3 distractors chahiye!`,
          variant: "destructive",
        });
        return false;
      }
      
      return true; // Passed validation
    }

    // Baaki question types ke liye generic checks
    const questionText = gameData.question;
      
    if (!questionText || questionText.trim() === '') {
      toast({
        title: "Validation Error",
        description: `Question ${questionNumber}: Question text is empty!`,
        variant: "destructive",
      });
      return false;
    }

    // MCQ-type options check
    if (['mcq', 'true_false', 'assertion_reason'].includes(questionType)) {
      if (!gameData.options || gameData.options.length < 2) {
        toast({
          title: "Validation Error",
          description: `Question ${questionNumber}: Need at least 2 options! Found: ${gameData.options?.length || 0}`,
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleExtractedQuestions = async (questions: any[]) => {
    if (!selectedTopic) {
      toast({ title: "Error", description: "Please select a topic first", variant: "destructive" });
      return;
    }

    // Store questions for checkpoint builder
    setExtractedQuestionsForCheckpoints(questions);

    setLoading(true);
    toast({ title: "Adding Questions", description: `Converting ${questions.length} questions to games...` });

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Step 1: Get all content_ids already mapped to this topic
      const { data: existingMappings } = await supabase
        .from('topic_content_mapping')
        .select('content_id')
        .eq('topic_id', selectedTopic);

      const existingContentIds = new Set(
        existingMappings?.map(m => m.content_id).filter(Boolean) || []
      );

      // Step 2: Filter out questions already added (by checking their id against content_ids)
      const questionsToAdd = questions.filter(q => 
        q.id && !existingContentIds.has(q.id)
      );

      if (questionsToAdd.length === 0) {
        toast({ 
          title: "Already Added", 
          description: "All selected questions are already in this lesson",
          variant: "default"
        });
        setLoading(false);
        return;
      }

      if (questionsToAdd.length < questions.length) {
        toast({ 
          title: "Filtering Duplicates", 
          description: `${questions.length - questionsToAdd.length} question(s) already added, adding ${questionsToAdd.length} new ones`
        });
      }

      const lessonsToInsert = [];

      for (const q of questionsToAdd) {
        let gameType: GameType;
        let gameData: any;
        let lessonType: LessonType = 'game';

        try {
          switch(q.question_type) {
            case 'mcq':
              gameType = 'mcq';
              gameData = {
                question: q.question_text?.trim() || '',
                options: q.options || [],
                correct_answer: mapCorrectAnswerToGameIndex(q) ?? 0,
                explanation: q.explanation || "Review your textbook for detailed explanation",
                difficulty: q.difficulty || 'medium',
                marks: q.marks || 1,
                question_number: q.question_number
              };
              break;
            
              case 'fill_blank':
                gameType = 'fill_blanks';
                {
                  const subQs = Array.isArray((q as any).correct_answer?.sub_questions)
                    ? (q as any).correct_answer.sub_questions
                    : null;
                  const blanksFromCA = Array.isArray((q as any).correct_answer?.blanks)
                    ? (q as any).correct_answer.blanks
                    : null;

                  const blanks = blanksFromCA || (subQs
                    ? subQs.map((sq: any) => ({
                        correctAnswer: (sq?.correctAnswer || '').toString().trim(),
                        distractors: Array.isArray(sq?.distractors) ? sq.distractors : []
                      }))
                    : []);

                  const text = (q as any).question_text?.trim() || (subQs && subQs.length
                    ? `Fill Blanks (${subQs.length} sub-questions)`
                    : '');

                  gameData = {
                    original_type: 'fill_blank',
                    text,
                    sub_questions: subQs || undefined,
                    blanks,
                    blanks_count: (q as any).blanks_count || blanks.length || (subQs ? subQs.length : 1),
                    difficulty: (q as any).difficulty || 'medium',
                    marks: (q as any).marks || 1,
                    question_number: (q as any).question_number
                  };
                }
                break;
            
            case 'match_column':
              gameType = 'match_column';
              {
                const leftRaw: string[] = Array.isArray(q.left_column) ? q.left_column : [];
                const rightRaw: string[] = Array.isArray(q.right_column) ? q.right_column : [];

                // Correct pairs derive from correct_answer
                const ans = (q as any).correct_answer as any;
                const correctPairs = Array.isArray(ans?.pairs) && ans.pairs.length > 0
                  ? ans.pairs.map((p: any) => ({ 
                      left: Number(p.left), 
                      right: Number(p.right) 
                    }))
                  : leftRaw.map((_, idx) => ({ left: idx, right: idx })); // Default 1-to-1 mapping

                gameData = {
                  question: q.question_text?.trim() || 'Match the Columns',
                  leftColumn: leftRaw.map(s => (s ?? '').toString().trim()).filter(Boolean),
                  rightColumn: rightRaw.map(s => (s ?? '').toString().trim()).filter(Boolean),
                  correctPairs,
                  explanation: q.explanation || '',
                  difficulty: q.difficulty || 'medium',
                  marks: q.marks || 1,
                  question_number: q.question_number
                };
              }
              break;
            
            case 'true_false':
              gameType = 'true_false';
              gameData = {
                question: q.question_text?.trim() || '',
                statements: q.correct_answer?.statements || q.statements || [],
                options: ['True', 'False'],
                correct_answer: mapCorrectAnswerToGameIndex(q) ?? 0,
                explanation: q.explanation || "Review the concept to understand why",
                difficulty: q.difficulty || 'easy',
                marks: q.marks || 1,
                question_number: q.question_number
              };
              break;
            
            case 'assertion_reason':
              gameType = 'assertion_reason';
              gameData = {
                question: `Assertion (A): ${q.assertion?.trim() || ''}\n\nReason (R): ${q.reason?.trim() || ''}`,
                assertion: q.assertion?.trim() || '',
                reason: q.reason?.trim() || '',
                options: [
                  'Both A and R are true, R is correct explanation of A',
                  'Both A and R are true, R is not correct explanation of A',
                  'A is true, R is false',
                  'A is false, R is true'
                ],
                correct_answer: mapCorrectAnswerToGameIndex(q) ?? 0,
                explanation: q.explanation || "Analyze both statements carefully",
                difficulty: q.difficulty || 'medium',
                marks: q.marks || 1,
                question_number: q.question_number
              };
              break;

            case 'short_answer':
              lessonType = 'theory';
              gameData = null;
              break;

            default:
              gameType = 'mcq';
              gameData = {
                question: q.question_text?.trim() || '',
                options: ['Option A', 'Option B'],
                correct_answer: mapCorrectAnswerToGameIndex(q) ?? 0,
                explanation: q.explanation || "Review this topic",
                difficulty: q.difficulty || 'medium',
                marks: q.marks || 1,
                question_number: q.question_number
              };
          }

          // Normalize game_type after setting it
          let normalizedGameType = null;
          if (lessonType === 'game') {
            console.log(`🔍 [Q${q.question_number}] Pre-normalization gameType:`, gameType);
            normalizedGameType = normalizeGameTypeForContent(gameType);
            console.log(`🔍 [Q${q.question_number}] Post-normalization normalizedGameType:`, normalizedGameType);
            
            if (!normalizedGameType) {
              console.warn(`⚠️ Skipping question ${q.question_number} with unsupported game type: ${gameType}`);
              continue;
            }

            // Validate before inserting (CRITICAL)
            if (!validateGameData(gameData, q.question_type, q.question_number)) {
              console.warn(`Skipping invalid question ${q.question_number}`);
              continue;
            }
          }

          lessonsToInsert.push({
            topic_id: selectedTopic,
            lesson_type: lessonType,
            game_type: lessonType === 'game' ? normalizedGameType : null,
            game_data: lessonType === 'game' ? gameData : null,
            theory_text: lessonType === 'theory' ? q.question_text : null,
            content_order: lessons.length + lessonsToInsert.length + 1,
            estimated_time_minutes: 3,
            xp_reward: q.marks || 1,
            generated_by: 'ai',
            human_reviewed: false
          });

        } catch (error: any) {
          console.error(`Error converting question ${q.question_number}:`, error);
          toast({ 
            title: "Conversion Error", 
            description: `Question ${q.question_number} failed: ${error.message}`,
            variant: "destructive" 
          });
          continue; // Skip failed questions
        }
      }

      // Final check before insert
      if (lessonsToInsert.length === 0) {
        toast({ 
          title: "No Valid Questions", 
          description: "All questions failed validation. Please check the extracted data.",
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      toast({ 
        title: "Validation Complete", 
        description: `${lessonsToInsert.length} of ${questions.length} questions are valid and ready to insert`
      });

      // CRITICAL: Pre-insert validation to prevent database errors
      const validGameTypes = ['match_columns', 'drag_drop', 'sequence_order', 'word_puzzle', 'fill_blanks', 'match_pairs', 'typing_race', 'mcq', 'true_false', 'assertion_reason'];
      
      console.log('🔍 Starting pre-insert validation for', lessonsToInsert.length, 'lessons');
      
      for (let i = 0; i < lessonsToInsert.length; i++) {
        const lesson = lessonsToInsert[i];
        if (lesson.lesson_type === 'game' && lesson.game_type) {
          console.log(`🔍 [Lesson ${i+1}/${lessonsToInsert.length}] Validating game_type: "${lesson.game_type}" (type: ${typeof lesson.game_type})`);
          
          if (!validGameTypes.includes(lesson.game_type)) {
            console.error(`❌ BLOCKING INSERT: Invalid game_type "${lesson.game_type}" at index ${i}`);
            console.error(`❌ Full lesson object:`, JSON.stringify(lesson, null, 2));
            console.error(`❌ Valid types:`, validGameTypes);
            
            toast({ 
              title: "Invalid Game Type", 
              description: `Cannot save: game_type "${lesson.game_type}" is invalid.\n\nValid types: ${validGameTypes.join(', ')}\n\nPlease hard refresh (Ctrl+Shift+R) and try again.`,
              variant: "destructive"
            });
            setLoading(false);
            return; // STOP the insert completely
          }
          
          console.log(`✅ [Lesson ${i+1}] Validation passed for game_type: "${lesson.game_type}"`);
        }
      }
      
      console.log('✅ All lessons passed validation');
      console.log('🔍 Final lessonsToInsert array:', JSON.stringify(lessonsToInsert.slice(0, 2), null, 2), '...'); // Log first 2 for brevity

      const { error } = await supabase
        .from('topic_learning_content')
        .insert(lessonsToInsert);

      if (error) {
        console.error('❌ DATABASE INSERT ERROR:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Failed lessons sample (first 2):', JSON.stringify(lessonsToInsert.slice(0, 2), null, 2));
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
        
        // Enhanced error message with actionable steps
        const errorMsg = error.message || 'Unknown database error';
        const isGameTypeError = errorMsg.toLowerCase().includes('game_type');
        
        toast({ 
          title: "Database Error", 
          description: isGameTypeError 
            ? `Game type validation failed: ${errorMsg}\n\nPlease:\n1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)\n2. Clear browser cache\n3. Try again`
            : `Failed to save questions: ${errorMsg}`,
          variant: "destructive"
        });
        
        setLoading(false);
        throw error;
      }

      toast({ 
        title: "Success!", 
        description: `Added ${questions.length} questions to lesson builder`
      });
      
      fetchLessons();

    } catch (error: any) {
      console.error('Error adding questions:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add questions",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Lesson Builder</h2>
          <p className="text-muted-foreground mt-1">
            {selectedDomain 
              ? `Building lessons for ${examTypes.find(t => t.code === selectedDomain)?.display_name}` 
              : "Select an exam domain to build lessons"}
          </p>
        </div>
        {selectedDomain && (
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={() => { 
              setSelectedDomain(null); 
              resetFromBoard();
              setSelectedBatch("");
              setSelectedSubject("");
              setSelectedChapter("");
              setSelectedTopic("");
            }} variant="outline">
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

      {/* Domain Selection Cards */}
      {!selectedDomain ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Select Exam Domain</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {examTypes.map((examType, index) => {
              const IconComponent = examType.icon_name ? iconMap[examType.icon_name] || LucideIcons.BookOpen : LucideIcons.BookOpen;
              return (
                <Card 
                  key={examType.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 animate-fade-in hover:scale-105 border-2 hover:border-primary"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => {
                    setSelectedDomain(examType.code);
                    resetFromBoard();
                  }}
                >
                  <CardContent className="p-6">
                    <div className={`w-full h-24 ${examType.color_class || 'bg-gradient-to-br from-gray-500 to-gray-600'} rounded-lg mb-4 flex items-center justify-center`}>
                      <IconComponent className="h-12 w-12 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{examType.display_name}</h4>
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
          studentCounts={roadmapCounts}
          countLabel="roadmaps"
        />
      ) : (
        <>
          {/* Selected Domain Badge */}
          <Card className="animate-fade-in bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const examType = examTypes.find(t => t.code === selectedDomain);
                  const IconComponent = examType?.icon_name ? iconMap[examType.icon_name] || LucideIcons.BookOpen : LucideIcons.BookOpen;
                  return (
                    <div className={`p-3 rounded-lg ${examType?.color_class || 'bg-gray-500'}`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                  );
                })()}
                <div>
                  <p className="text-sm text-muted-foreground">Selected Domain</p>
                  <p className="text-xl font-bold">{examTypes.find(t => t.code === selectedDomain)?.display_name}</p>
                </div>
              </div>
              <Badge className="text-lg px-4 py-2">{batches.length} batches</Badge>
            </CardContent>
          </Card>

          {/* Tabs for different builder modes */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="lesson-library">📚 Lesson Library</TabsTrigger>
              <TabsTrigger value="ai-workflow">🤖 AI Workflow</TabsTrigger>
              <TabsTrigger value="game-builder">🎮 Game Builder</TabsTrigger>
              <TabsTrigger value="question-extractor">📄 Question Extractor</TabsTrigger>
              <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
            </TabsList>

            {/* Lesson Library Tab */}
            <TabsContent value="lesson-library" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Build Lesson Content</CardTitle>
                  <CardDescription>Create and manage lesson content for topics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Simplified Filtering: Batch → Subject → Chapter → Topic */}
                  <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Batch</Label>
                  <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          <div className="flex flex-col">
                            <span>{batch.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {batch.exam_name}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select 
                    value={selectedSubject} 
                    onValueChange={setSelectedSubject}
                    disabled={!selectedBatch}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subj, idx) => (
                        <SelectItem key={idx} value={subj.subject}>
                          {subj.subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Chapter</Label>
                  <Select 
                    value={selectedChapter} 
                    onValueChange={setSelectedChapter}
                    disabled={!selectedSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.chapter_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  </div>

                  {selectedChapter && (
                    <div className="space-y-2">
                      <Label>Topic</Label>
                      <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {topics.map((topic) => (
                            <SelectItem key={topic.id} value={topic.id}>
                              {topic.topic_name} ({topicQuestionCounts[topic.id] || 0} questions)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedTopic && (
                    <>
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Lessons ({lessons.length})</h3>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleBulkGenerateLessons} disabled={loading}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            AI Generate All
                          </Button>
                          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                              <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Lesson
                              </Button>
                            </DialogTrigger>
                            
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Add New Lesson</DialogTitle>
                                <DialogDescription>
                                  Creating lesson for: {topics.find(t => t.id === selectedTopic)?.topic_name || 'Selected Topic'}
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-6">
                                {/* Lesson Type Selector */}
                                <div>
                                  <Label>Lesson Type</Label>
                                  <Select
                                    value={newLesson.lesson_type}
                                    onValueChange={(v) => setNewLesson({ ...newLesson, lesson_type: v as LessonType })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select lesson type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="theory">📚 Theory</SelectItem>
                                      <SelectItem value="interactive_svg">🎨 Interactive SVG</SelectItem>
                                      <SelectItem value="game">🎮 Game</SelectItem>
                                      <SelectItem value="quiz">❓ Quiz</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Language Selector for Theory */}
                                {newLesson.lesson_type === 'theory' && (
                                  <div className="space-y-2">
                                    <Label>Theory Language</Label>
                                    <Select
                                      value={newLesson.theory_language || 'english'}
                                      onValueChange={(val) => setNewLesson({...newLesson, theory_language: val})}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="english">English</SelectItem>
                                        <SelectItem value="hinglish">Hinglish (Hindi + English)</SelectItem>
                                        <SelectItem value="hindi">Hindi</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {/* Theory with Checkpoints Builder */}
                                {newLesson.lesson_type === 'theory' && (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-base font-semibold">Theory Content with Learning Checkpoints</Label>
                                      <Badge variant="secondary">
                                        {theorySections.length} Section{theorySections.length !== 1 ? 's' : ''}
                                      </Badge>
                                    </div>
                                    <TheoryCheckpointBuilder
                                      sections={theorySections}
                                      onChange={setTheorySections}
                                      extractedQuestions={extractedQuestionsForCheckpoints}
                                      language={newLesson.theory_language || 'english'}
                                    />
                                  </div>
                                )}

                                {/* Multi-File Upload Zone */}
                                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                                  <input
                                    type="file"
                                    multiple
                                    accept=".jpg,.jpeg,.png,.txt,.csv,.pdf"
                                    onChange={handleMultipleFileUpload}
                                    className="hidden"
                                    id="bulk-upload"
                                  />
                                  <label htmlFor="bulk-upload" className="cursor-pointer block">
                                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <p className="mt-2 text-sm font-medium">Drop multiple files here or click to browse</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Supports: Images, PDFs, Text, CSV (max 20 files)
                                    </p>
                                  </label>
                                  
                                  {/* File Preview Grid */}
                                  {uploadedFiles.length > 0 && (
                                    <div className="mt-4 grid grid-cols-4 gap-2">
                                      {uploadedFiles.map((file, idx) => (
                                        <div key={idx} className="relative border rounded p-2 bg-background">
                                          {file.type.startsWith('image/') ? (
                                            <img 
                                              src={URL.createObjectURL(file)} 
                                              alt={file.name}
                                              className="w-full h-20 object-cover rounded" 
                                            />
                                          ) : (
                                            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                                          )}
                                          <p className="text-xs truncate mt-1">{file.name}</p>
                                          <button
                                            type="button"
                                            onClick={() => removeFile(idx)}
                                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Text Input with JSON Toggle */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>Additional Questions / Context</Label>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-muted-foreground">JSON Mode</Label>
                                      <Switch
                                        checked={useJsonFormat}
                                        onCheckedChange={setUseJsonFormat}
                                      />
                                    </div>
                                  </div>
                                  
                                  <Textarea
                                    placeholder={useJsonFormat 
                                      ? '{"questions": [{"text": "What is photosynthesis?", "options": ["A", "B", "C", "D"], "correct": "A"}]}'
                                      : 'Paste questions here or add context for uploaded images...\n\nExample:\n1. What is photosynthesis?\nA) Process of...\nB) Process of...\n\nCorrect: A'
                                    }
                                    value={additionalText}
                                    onChange={(e) => setAdditionalText(e.target.value)}
                                    rows={8}
                                    className={useJsonFormat ? "font-mono text-xs" : ""}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {uploadedFiles.length > 0 
                                      ? "✓ Files uploaded. Add extra context or questions that aren't in the files"
                                      : "Paste questions directly or upload files above"
                                    }
                                  </p>
                                </div>

                                {/* AI Processing Button */}
                                {(uploadedFiles.length > 0 || additionalText.trim()) && (
                                  <Button 
                                    onClick={handleProcessContent} 
                                    disabled={aiProcessing}
                                    className="w-full"
                                    variant="secondary"
                                  >
                                    {aiProcessing ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing with AI...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Process Content with AI
                                      </>
                                    )}
                                  </Button>
                                )}

                                {/* AI Recommendations (for Games) */}
                                {newLesson.lesson_type === 'game' && aiSuggestions && (
                                  <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
                                    <CardHeader>
                                      <CardTitle className="text-sm flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-yellow-600" />
                                        AI Recommendations
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="text-sm">
                                          <span className="text-muted-foreground">Questions:</span>
                                          <Badge variant="secondary" className="ml-2">{aiSuggestions.questionCount}</Badge>
                                        </div>
                                        <div className="text-sm">
                                          <span className="text-muted-foreground">Best Game:</span>
                                          <Badge className="ml-2 bg-yellow-600">{aiSuggestions.bestGameType?.replace(/_/g, ' ')}</Badge>
                                        </div>
                                      </div>
                                      
                                      {/* Difficulty Distribution */}
                                      {aiSuggestions.difficultyDistribution && (
                                        <div className="space-y-1">
                                          <p className="text-xs font-medium text-muted-foreground">Progressive Difficulty:</p>
                                          <div className="flex gap-2 flex-wrap">
                                            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                                              🟢 Easy: {aiSuggestions.difficultyDistribution.easy}
                                            </Badge>
                                            <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
                                              🟡 Medium: {aiSuggestions.difficultyDistribution.medium}
                                            </Badge>
                                            <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                                              🔴 Hard: {aiSuggestions.difficultyDistribution.hard}
                                            </Badge>
                                          </div>
                                        </div>
                                      )}
                                      
                                      <p className="text-xs text-muted-foreground italic">{aiSuggestions.reasoning}</p>
                                      
                                      {/* Auto-selected indicator */}
                                      {newLesson.game_type && (
                                        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 p-2 rounded">
                                          <Check className="h-3 w-3" />
                                          <span className="font-medium">{newLesson.game_type.replace(/_/g, ' ').toUpperCase()} auto-selected and ready to save</span>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Manual Game Type Override (Optional) */}
                                {newLesson.lesson_type === 'game' && generatedGames && Object.keys(generatedGames).length > 1 && (
                                  <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                                      Override Game Type (Optional)
                                      {newLesson.game_type && (
                                        <Badge variant="outline" className="text-xs">
                                          Current: {newLesson.game_type.replace(/_/g, ' ')}
                                        </Badge>
                                      )}
                                    </Label>
                                    <Select 
                                      value={newLesson.game_type || ''}
                                      onValueChange={(gameType) => {
                                        const gameData = generatedGames[gameType];
                                        setNewLesson({ 
                                          ...newLesson, 
                                          game_type: gameType as GameType,
                                          game_data: gameData 
                                        });
                                        toast({ 
                                          title: "Game type changed", 
                                          description: `Switched to ${gameType.replace(/_/g, ' ')}`
                                        });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choose different game type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.keys(generatedGames).map(gameType => (
                                          <SelectItem key={gameType} value={gameType}>
                                            {gameType.replace(/_/g, ' ').toUpperCase()}
                                            {gameType === aiSuggestions?.bestGameType && " ⭐ (AI Recommended)"}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {/* Interactive SVG Config */}
                                {newLesson.lesson_type === 'interactive_svg' && (
                                  <div className="space-y-2">
                                    <Label>SVG Type</Label>
                                    <Select
                                      value={newLesson.svg_type}
                                      onValueChange={(v) => setNewLesson({ ...newLesson, svg_type: v as SvgType })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select SVG type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="physics_motion">Physics Motion</SelectItem>
                                        <SelectItem value="chemistry_molecule">Chemistry Molecule</SelectItem>
                                        <SelectItem value="math_graph">Math Graph</SelectItem>
                                        <SelectItem value="algorithm_viz">Algorithm Visualization</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    <Label className="mt-3">Configuration (JSON)</Label>
                                    <Textarea
                                      placeholder='{"title": "Projectile Motion", "config": {...}}'
                                      value={typeof newLesson.svg_data === 'object' ? JSON.stringify(newLesson.svg_data, null, 2) : newLesson.svg_data || ''}
                                      onChange={(e) => {
                                        try {
                                          const parsed = JSON.parse(e.target.value);
                                          setNewLesson({ ...newLesson, svg_data: parsed });
                                        } catch {
                                          setNewLesson({ ...newLesson, svg_data: e.target.value });
                                        }
                                      }}
                                      rows={6}
                                      className="font-mono text-xs"
                                    />
                                  </div>
                                )}

                                {/* Metadata Section */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                  <div>
                                    <Label>Time (minutes)</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="120"
                                      value={newLesson.estimated_time_minutes || 10}
                                      onChange={(e) => setNewLesson({ ...newLesson, estimated_time_minutes: parseInt(e.target.value) || 10 })}
                                    />
                                  </div>
                                  <div>
                                    <Label>XP Reward</Label>
                                    <Input
                                      type="number"
                                      min="5"
                                      max="100"
                                      value={newLesson.xp_reward || 10}
                                      onChange={(e) => setNewLesson({ ...newLesson, xp_reward: parseInt(e.target.value) || 10 })}
                                    />
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setIsAddDialogOpen(false);
                                      resetForm();
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={handleAddLesson} 
                                    disabled={loading || !selectedTopic}
                                  >
                                    {loading ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                      </>
                                    ) : (
                                      <>Create Lesson</>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading lessons...</div>
                  ) : lessons.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No lessons yet. Click "Add Lesson" or "AI Generate All" to create content.
                    </div>
                  ) : (
                    <>
                      {/* Bulk Action Bar */}
                      {selectedLessonIds.length > 0 && (
                        <div className="bg-muted/50 border rounded-lg p-4 mb-4 flex items-center justify-between animate-fade-in">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={isAllSelected}
                              onCheckedChange={toggleSelectAll}
                              className="h-5 w-5"
                            />
                            <span className="text-sm font-medium">
                              {selectedLessonIds.length} lesson(s) selected
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            {pendingSelectedCount > 0 && (
                              <Button 
                                variant="default"
                                onClick={handleBulkApprove}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve & Publish {pendingSelectedCount}
                              </Button>
                            )}
                            
                            <Button
                              variant="destructive"
                              onClick={handleBulkDelete}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Selected
                            </Button>
                            
                            <Button 
                              variant="ghost"
                              onClick={clearSelection}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                      )}

                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={lessons.map((l) => l.id || '')} strategy={verticalListSortingStrategy}>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {lessons.map((lesson) => (
                              <SortableLesson
                                key={lesson.id}
                                lesson={lesson}
                                onEdit={() => {
                                  setPreviewLesson(lesson);
                                  setShowPreview(true);
                                }}
                                onDelete={() => handleDeleteLesson(lesson.id!)}
                                onApprove={() => handleApproveLesson(lesson.id!)}
                                isSelected={selectedLessonIds.includes(lesson.id!)}
                                onToggleSelection={toggleLessonSelection}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </>
                  )}
                  </>
                )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Workflow Tab */}
            <TabsContent value="ai-workflow" className="space-y-4">
              {selectedChapter && selectedSubject ? (
                <EnhancedLessonWorkflow 
                  chapterId={selectedChapter}
                  chapterName={chapters.find(c => c.id === selectedChapter)?.chapter_name || ""}
                  subject={selectedSubject}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>AI Workflow</CardTitle>
                    <CardDescription>Select a chapter to use AI workflow</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Please select a batch, subject, and chapter from the filters above to start the AI workflow.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Game Builder Tab */}
            <TabsContent value="game-builder" className="space-y-4">
              <QuestionToGameConverter />
            </TabsContent>

            {/* Question Extractor Tab */}
            <TabsContent value="question-extractor" className="space-y-4">
              {selectedTopic ? (
                <SmartQuestionExtractorNew
                  selectedTopic={selectedTopic}
                  selectedTopicName={topics.find(t => t.id === selectedTopic)?.topic_name}
                  selectedChapter={selectedChapter}
                  selectedSubject={selectedSubject}
                  selectedBatch={selectedBatch}
                  selectedRoadmap={batches.find(b => b.id === selectedBatch)?.linked_roadmap_id || null}
                  selectedExamDomain={batches.find(b => b.id === selectedBatch)?.exam_type || null}
                  selectedExamName={batches.find(b => b.id === selectedBatch)?.exam_name || null}
                  onQuestionsAdded={handleExtractedQuestions}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Select Topic First</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Please select a topic from the lesson library to use the question extractor.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <GameTypePublishTester />
              
              <Card>
                <CardHeader>
                  <CardTitle>Content Analytics</CardTitle>
                  <CardDescription>Track lesson performance and student engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Coming soon - Analytics for lesson completion rates and content effectiveness.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Preview Dialog */}
      <LessonPreviewDialog
        lesson={previewLesson}
        open={showPreview}
        onOpenChange={setShowPreview}
      />
    </div>
  );
}

export function LessonContentBuilder() {
  return (
    <LessonBuilderProvider>
      <LessonContentBuilderInner />
    </LessonBuilderProvider>
  );
}
