import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Eye, Sparkles, GripVertical, Check, X } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useExamTypes } from "@/hooks/useExamTypes";
import { BoardClassSelector } from "./BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";
import { YouTubeContentFetcher } from "./YouTubeContentFetcher";
import { MultilingualSummarizer } from "./MultilingualSummarizer";
import * as LucideIcons from "lucide-react";

type LessonType = 'theory' | 'interactive_svg' | 'game' | 'quiz';
type GameType = 'match_pairs' | 'drag_drop' | 'typing_race' | 'word_puzzle' | 'fill_blanks' | 'sequence_order';
type SvgType = 'math_graph' | 'physics_motion' | 'chemistry_molecule' | 'algorithm_viz' | 'concept_diagram';

interface Lesson {
  id?: string;
  topic_id: string;
  lesson_type: LessonType;
  content_order: number;
  theory_text?: string;
  theory_html?: string;
  svg_type?: SvgType;
  svg_data?: any;
  game_type?: GameType;
  game_data?: any;
  estimated_time_minutes: number;
  xp_reward: number;
  coin_reward: number;
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

function SortableLesson({ lesson, onEdit, onDelete }: { lesson: Lesson; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id || '' });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="bg-card border rounded-lg p-4 mb-2">
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{lesson.lesson_type}</Badge>
            {lesson.game_type && <Badge variant="secondary">{lesson.game_type}</Badge>}
            {lesson.svg_type && <Badge variant="secondary">{lesson.svg_type}</Badge>}
            <span className="text-sm text-muted-foreground ml-auto">{lesson.estimated_time_minutes} min</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{lesson.xp_reward} XP</span>
            <span>{lesson.coin_reward} Coins</span>
            {lesson.human_reviewed ? (
              <Badge variant="default" className="bg-green-500">
                <Check className="h-3 w-3 mr-1" /> Approved
              </Badge>
            ) : (
              <Badge variant="secondary">
                <X className="h-3 w-3 mr-1" /> Pending
              </Badge>
            )}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onEdit}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function LessonContentBuilder() {
  const { toast } = useToast();
  const { examTypes } = useExamTypes();
  const { selectedBoard, selectedClass, setBoard, setClass, resetFromBoard, resetToBoard } = useBoardClassHierarchy();
  
  // Domain selection
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  // Hierarchical filtering state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
    lesson_type: 'theory',
    estimated_time_minutes: 5,
    xp_reward: 10,
    coin_reward: 2,
    generated_by: 'manual',
    human_reviewed: false,
  });

  // YouTube integration state
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showSummarizer, setShowSummarizer] = useState(false);

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

  useEffect(() => {
    if (selectedDomain) {
      fetchBatches();
      setSelectedBatch("");
      setSelectedSubject("");
      setSelectedChapter("");
      setSelectedTopic("");
    }
  }, [selectedDomain, selectedBoard, selectedClass]);

  useEffect(() => {
    if (selectedBatch) {
      fetchSubjects();
      setSelectedSubject("");
      setSelectedChapter("");
      setSelectedTopic("");
    }
  }, [selectedBatch]);

  useEffect(() => {
    if (selectedSubject) {
      fetchChapters();
      setSelectedChapter("");
      setSelectedTopic("");
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedChapter) {
      fetchTopics(selectedChapter);
      setSelectedTopic("");
    }
  }, [selectedChapter]);

  useEffect(() => {
    if (selectedTopic) {
      fetchLessons();
    }
  }, [selectedTopic]);

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

  const getStudentCounts = () => {
    const domainBatches = batches.filter((b: any) => b.exam_type === selectedDomain);
    const byBoard: Record<string, number> = {};
    const byClass: Record<string, Record<string, number>> = {};

    domainBatches.forEach((batch: any) => {
      const board = batch.target_board || 'CBSE';
      const cls = batch.target_class;
      
      byBoard[board] = (byBoard[board] || 0) + (batch.current_strength || 0);
      
      if (!byClass[board]) byClass[board] = {};
      if (cls) {
        byClass[board][cls] = (byClass[board][cls] || 0) + (batch.current_strength || 0);
      }
    });

    return { byBoard, byClass };
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

  const handleAddLesson = async () => {
    if (!selectedTopic) {
      toast({ title: "Error", description: "Please select a topic first", variant: "destructive" });
      return;
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const lessonData = {
      ...newLesson,
      topic_id: selectedTopic,
      content_order: lessons.length + 1,
      created_by: user.user.id,
    } as any;

    const { error } = await supabase.from('topic_learning_content').insert([lessonData]);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Lesson added successfully" });
      setIsAddDialogOpen(false);
      fetchLessons();
      setNewLesson({
        lesson_type: 'theory',
        estimated_time_minutes: 5,
        xp_reward: 10,
        coin_reward: 2,
        generated_by: 'manual',
        human_reviewed: false,
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const { error } = await supabase.from('topic_learning_content').delete().eq('id', lessonId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Lesson deleted" });
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
      toast({ title: "Success", description: "Lesson approved" });
      fetchLessons();
    }
  };

  const handleVideoSelect = (video: any) => {
    setSelectedVideo(video);
    setShowSummarizer(true);
  };

  const handleLessonGenerateFromYouTube = async (summary: any, language: string) => {
    if (!selectedTopic) {
      toast({ title: "Error", description: "Please select a topic first", variant: "destructive" });
      return;
    }

    setLoading(true);
    toast({ title: "Generating...", description: "Creating AI-enhanced lessons from YouTube content" });

    try {
      const selectedTopicData = topics.find(t => t.id === selectedTopic);
      const selectedSubjectData = selectedSubject;
      
      const { data, error } = await supabase.functions.invoke('ai-lesson-from-youtube', {
        body: {
          summary,
          language,
          videoTitle: selectedVideo?.title || 'YouTube Video',
          topicName: selectedTopicData?.topic_name || 'Unknown Topic',
          subject: selectedSubjectData || 'General',
        }
      });

      if (error) throw error;

      if (data?.lessons && data.lessons.length > 0) {
        const { data: user } = await supabase.auth.getUser();
        const lessonsToInsert = data.lessons.map((lesson: any, idx: number) => ({
          topic_id: selectedTopic,
          lesson_type: lesson.lesson_type,
          content_order: lessons.length + idx + 1,
          theory_text: lesson.theory_text,
          theory_html: lesson.theory_html,
          svg_type: lesson.svg_type,
          svg_data: lesson.svg_data,
          game_type: lesson.game_type,
          game_data: lesson.game_data,
          estimated_time_minutes: lesson.estimated_time_minutes || 5,
          xp_reward: lesson.xp_reward || 20,
          coin_reward: lesson.coin_reward || 5,
          generated_by: 'youtube_ai',
          created_by: user?.user?.id,
          human_reviewed: false,
        }));

        const { error: insertError } = await supabase
          .from('topic_learning_content')
          .insert(lessonsToInsert);

        if (insertError) throw insertError;

        toast({ 
          title: "Success!", 
          description: `Generated ${data.lessons.length} lessons from YouTube content in ${language}!`
        });
        fetchLessons();
        setShowSummarizer(false);
        setSelectedVideo(null);
      } else {
        toast({ 
          title: "No Content", 
          description: "AI didn't generate any lessons. Try again.", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      console.error('YouTube lesson generation error:', error);
      toast({ 
        title: "Generation Failed", 
        description: error.message || "Failed to generate lessons from YouTube.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

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
        const lessonsToInsert = data.lessons.map((lesson: any, idx: number) => ({
          topic_id: selectedTopic,
          lesson_type: lesson.lesson_type,
          content_order: lessons.length + idx + 1,
          theory_text: lesson.theory_text,
          theory_html: lesson.theory_html,
          svg_type: lesson.svg_type,
          svg_data: lesson.svg_data,
          game_type: lesson.game_type,
          game_data: lesson.game_data,
          estimated_time_minutes: lesson.estimated_time_minutes || 5,
          xp_reward: lesson.xp_reward || 20,
          coin_reward: lesson.coin_reward || 5,
          generated_by: 'ai',
          created_by: user?.user?.id,
          human_reviewed: false,
        }));

        const { error: insertError } = await supabase
          .from('topic_learning_content')
          .insert(lessonsToInsert);

        if (insertError) throw insertError;

        toast({ 
          title: "Success!", 
          description: `Generated ${data.lessons.length} AI-powered lessons. Review and approve them.`
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
          onBoardSelect={setBoard}
          onClassSelect={setClass}
          onReset={resetFromBoard}
          onResetToBoard={resetToBoard}
          studentCounts={getStudentCounts()}
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
                          {topic.topic_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedTopic && (
                <>
                  {/* YouTube Integration Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <YouTubeContentFetcher onVideoSelect={handleVideoSelect} />
                    {showSummarizer && selectedVideo && (
                      <MultilingualSummarizer
                        videoId={selectedVideo.id}
                        videoTitle={selectedVideo.title}
                        onLessonGenerate={handleLessonGenerateFromYouTube}
                      />
                    )}
                  </div>

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
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Lesson</DialogTitle>
                        <DialogDescription>Create a new lesson for this topic</DialogDescription>
                      </DialogHeader>

                      <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="basic">Basic</TabsTrigger>
                          <TabsTrigger value="content">Content</TabsTrigger>
                          <TabsTrigger value="rewards">Rewards</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4">
                          <div>
                            <Label>Lesson Type</Label>
                            <Select
                              value={newLesson.lesson_type}
                              onValueChange={(v) => setNewLesson({ ...newLesson, lesson_type: v as LessonType })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="theory">Theory</SelectItem>
                                <SelectItem value="interactive_svg">Interactive SVG</SelectItem>
                                <SelectItem value="game">Game</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Estimated Time (minutes)</Label>
                            <Input
                              type="number"
                              value={newLesson.estimated_time_minutes}
                              onChange={(e) => setNewLesson({ ...newLesson, estimated_time_minutes: parseInt(e.target.value) })}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="content" className="space-y-4">
                          {newLesson.lesson_type === 'theory' && (
                            <div>
                              <Label>Theory Content</Label>
                              <Textarea
                                placeholder="Enter theory content..."
                                value={newLesson.theory_text || ''}
                                onChange={(e) => setNewLesson({ ...newLesson, theory_text: e.target.value })}
                                rows={8}
                              />
                            </div>
                          )}

                          {newLesson.lesson_type === 'interactive_svg' && (
                            <div className="space-y-4">
                              <div>
                                <Label>SVG Type</Label>
                                <Select
                                  value={newLesson.svg_type}
                                  onValueChange={(v) => setNewLesson({ ...newLesson, svg_type: v as SvgType })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select SVG type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="math_graph">Math Graph</SelectItem>
                                    <SelectItem value="physics_motion">Physics Motion</SelectItem>
                                    <SelectItem value="chemistry_molecule">Chemistry Molecule</SelectItem>
                                    <SelectItem value="algorithm_viz">Algorithm Visualization</SelectItem>
                                    <SelectItem value="concept_diagram">Concept Diagram</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>SVG Data (JSON)</Label>
                                <Textarea
                                  placeholder='{"equation": "y = 2x + 3", "x_range": [-10, 10], ...}'
                                  value={typeof newLesson.svg_data === 'object' ? JSON.stringify(newLesson.svg_data, null, 2) : newLesson.svg_data || ''}
                                  onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      setNewLesson({ ...newLesson, svg_data: parsed });
                                    } catch {
                                      setNewLesson({ ...newLesson, svg_data: e.target.value });
                                    }
                                  }}
                                  rows={10}
                                  className="font-mono text-xs"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Enter valid JSON data for the selected SVG type
                                </p>
                              </div>
                            </div>
                          )}

                          {newLesson.lesson_type === 'game' && (
                            <div className="space-y-4">
                              <div>
                                <Label>Game Type</Label>
                                <Select
                                  value={newLesson.game_type}
                                  onValueChange={(v) => setNewLesson({ ...newLesson, game_type: v as GameType })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select game type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="match_pairs">Match Pairs</SelectItem>
                                    <SelectItem value="drag_drop">Drag & Drop</SelectItem>
                                    <SelectItem value="typing_race">Typing Race</SelectItem>
                                    <SelectItem value="word_puzzle">Word Puzzle</SelectItem>
                                    <SelectItem value="fill_blanks">Fill in Blanks</SelectItem>
                                    <SelectItem value="physics_simulator">Physics Simulator</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Game Data (JSON)</Label>
                                <Textarea
                                  placeholder={'{"pairs": [{"id": "1", "left": "F = ma", "right": "Newtons Law"}], ...}'}
                                  value={typeof newLesson.game_data === 'object' ? JSON.stringify(newLesson.game_data, null, 2) : newLesson.game_data || ''}
                                  onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      setNewLesson({ ...newLesson, game_data: parsed });
                                    } catch {
                                      setNewLesson({ ...newLesson, game_data: e.target.value });
                                    }
                                  }}
                                  rows={10}
                                  className="font-mono text-xs"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Enter valid JSON data for the selected game type
                                </p>
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="rewards" className="space-y-4">
                          <div>
                            <Label>XP Reward</Label>
                            <Input
                              type="number"
                              value={newLesson.xp_reward}
                              onChange={(e) => setNewLesson({ ...newLesson, xp_reward: parseInt(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label>Coin Reward</Label>
                            <Input
                              type="number"
                              value={newLesson.coin_reward}
                              onChange={(e) => setNewLesson({ ...newLesson, coin_reward: parseInt(e.target.value) })}
                            />
                          </div>
                        </TabsContent>
                      </Tabs>

                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddLesson}>Create Lesson</Button>
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
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={lessons.map((l) => l.id || '')} strategy={verticalListSortingStrategy}>
                    {lessons.map((lesson) => (
                      <SortableLesson
                        key={lesson.id}
                        lesson={lesson}
                        onEdit={() => handleApproveLesson(lesson.id!)}
                        onDelete={() => handleDeleteLesson(lesson.id!)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
              </>
            )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
