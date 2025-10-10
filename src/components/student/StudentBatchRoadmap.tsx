import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { GripVertical, Calendar as CalendarIcon, BookOpen, Target, RotateCcw, List, LayoutGrid } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { TopicStudyView } from "./TopicStudyView";
import { ChapterTopicListView } from "./ChapterTopicListView";
import { StudentRoadmapCalendar } from "./StudentRoadmapCalendar";
import { RoadmapCardView } from "../RoadmapCardView";

interface RoadmapData {
  id: string;
  batch_id: string;
  roadmap_id: string;
  title: string;
  description: string;
  total_days: number;
  start_date: string;
  end_date: string;
  subjects: {
    name: string;
    chapters: Array<{
      id: string;
      chapter_name: string;
      day_start: number;
      day_end: number;
      progress: number;
      topics: Array<{
        id: string;
        topic_name: string;
        status: string;
        progress_percentage: number;
      }>;
    }>;
  }[];
  subject_order?: string[];
}

interface SortableChapterProps {
  chapter: any;
  onChapterClick: (chapterId: string, chapterName: string, topics: any[]) => void;
}

const SortableChapter = ({ chapter, onChapterClick }: SortableChapterProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-3 space-y-2">
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -m-3 p-3 rounded-lg transition-colors"
        onClick={() => onChapterClick(chapter.id, chapter.chapter_name, chapter.topics)}
      >
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{chapter.chapter_name}</span>
          <Badge variant="secondary" className="text-xs">
            {chapter.topics.length} topics
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarIcon className="h-3 w-3" />
          <span>Day {chapter.day_start}-{chapter.day_end}</span>
        </div>
      </div>
      
      <Progress value={chapter.progress} className="h-1" />
    </div>
  );
};

interface SortableSubjectCardProps {
  subject: RoadmapData['subjects'][0];
  onChapterClick: (chapterId: string, chapterName: string, topics: any[]) => void;
  onChapterReorder: (subjectName: string, reorderedChapterIds: string[]) => void;
}

const SortableSubjectCard = ({ subject, onChapterClick, onChapterReorder }: SortableSubjectCardProps) => {
  const [localChapters, setLocalChapters] = useState(subject.chapters);

  useEffect(() => {
    setLocalChapters(subject.chapters);
  }, [subject.chapters]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const chapterSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleChapterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localChapters.findIndex(ch => ch.id === active.id);
    const newIndex = localChapters.findIndex(ch => ch.id === over.id);

    const reordered = arrayMove(localChapters, oldIndex, newIndex);
    setLocalChapters(reordered);
    onChapterReorder(subject.name, reordered.map(ch => ch.id));
  };

  const totalChapters = localChapters.length;
  const avgProgress = totalChapters > 0 
    ? localChapters.reduce((sum, ch) => sum + ch.progress, 0) / totalChapters 
    : 0;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">{subject.name}</CardTitle>
                <CardDescription>{totalChapters} chapters</CardDescription>
              </div>
            </div>
            <Badge variant={avgProgress === 100 ? "default" : "secondary"}>
              {Math.round(avgProgress)}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={avgProgress} className="h-2" />
          
          <div className="bg-muted/50 border rounded-lg p-2 text-xs text-muted-foreground">
            💡 Click on a chapter to see all topics • Drag to reorder
          </div>

          <DndContext 
            sensors={chapterSensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleChapterDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={localChapters.map(ch => ch.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {localChapters.map((chapter) => (
                  <SortableChapter 
                    key={chapter.id} 
                    chapter={chapter}
                    onChapterClick={onChapterClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
};

export const StudentBatchRoadmap = () => {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<{ id: string; name: string; topics: any[] } | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<{ id: string; chapterName: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'cards'>('list');
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchRoadmap();
  }, []);

  // Realtime sync for chapter reordering
  useEffect(() => {
    if (!roadmap?.id) return;

    const channel = supabase
      .channel('chapter-reorder-sync')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'roadmap_chapters',
          filter: `roadmap_id=eq.${roadmap.id}`
        },
        () => {
          console.log('Chapter order updated, refetching roadmap');
          fetchRoadmap();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roadmap?.id]);

  const fetchRoadmap = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("student-roadmap-api", {
        body: { action: "get" }
      });

      if (error) throw error;
      if (data?.success && data?.roadmap) {
        setRoadmap(data.roadmap);
      }
    } catch (error: any) {
      console.error("Error fetching roadmap:", error);
      toast({
        title: "Error",
        description: "Failed to load your roadmap",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !roadmap) return;

    if (active.id !== over.id) {
      const oldIndex = roadmap.subjects.findIndex(s => s.name === active.id);
      const newIndex = roadmap.subjects.findIndex(s => s.name === over.id);

      const newSubjects = arrayMove(roadmap.subjects, oldIndex, newIndex);
      const newOrder = newSubjects.map(s => s.name);

      setRoadmap({ ...roadmap, subjects: newSubjects, subject_order: newOrder });

      try {
        const { error } = await supabase.functions.invoke("student-roadmap-api", {
          body: { action: "update_subject_order", subject_order: newOrder }
        });

        if (error) throw error;
        
        toast({
          title: "Order Updated",
          description: "Subject priority saved successfully"
        });
      } catch (error) {
        console.error("Error updating order:", error);
        toast({
          title: "Error",
          description: "Failed to save subject order",
          variant: "destructive"
        });
        fetchRoadmap();
      }
    }
  };

  const handleChapterReorder = async (subjectName: string, reorderedChapterIds: string[]) => {
    try {
      const { error } = await supabase.functions.invoke("student-roadmap-api", {
        body: { 
          action: "update_chapter_order", 
          subject_name: subjectName,
          chapter_order: reorderedChapterIds
        }
      });

      if (error) throw error;
      
      toast({
        title: "Chapter Order Updated",
        description: `Chapters reordered for ${subjectName}`
      });
    } catch (error) {
      console.error("Error updating chapter order:", error);
      toast({
        title: "Error",
        description: "Failed to save chapter order",
        variant: "destructive"
      });
      fetchRoadmap();
    }
  };

  const handleResetOrder = async () => {
    try {
      const { error } = await supabase.functions.invoke("student-roadmap-api", {
        body: { action: "update_subject_order", subject_order: null }
      });

      if (error) throw error;
      
      toast({
        title: "Order Reset",
        description: "Subject order reset to default"
      });
      fetchRoadmap();
    } catch (error) {
      console.error("Error resetting order:", error);
      toast({
        title: "Error",
        description: "Failed to reset subject order",
        variant: "destructive"
      });
    }
  };

  if (selectedTopic) {
    return (
      <TopicStudyView 
        topicId={selectedTopic.id} 
        topicName={selectedTopic.name}
        onBack={() => setSelectedTopic(null)}
      />
    );
  }

  if (selectedChapter) {
    return (
      <ChapterTopicListView
        chapterId={selectedChapter.id}
        chapterName={selectedChapter.name}
        topics={selectedChapter.topics}
        onTopicClick={(topicId, topicName) => {
          setSelectedTopic({ id: topicId, chapterName: selectedChapter.name, name: topicName });
        }}
        onBack={() => setSelectedChapter(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading your roadmap...</p>
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-2">
            <Target className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No roadmap assigned to your batch yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{roadmap.title}</h2>
          <p className="text-muted-foreground">{roadmap.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {roadmap.subject_order && (
            <Button variant="outline" size="sm" onClick={handleResetOrder}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Order
            </Button>
          )}
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-2" />
              List View
            </Button>
            <Button 
              variant={viewMode === 'calendar' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar View
            </Button>
            <Button 
              variant={viewMode === 'cards' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Card View
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>{new Date(roadmap.start_date).toLocaleDateString()} - {new Date(roadmap.end_date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span>{roadmap.total_days} days total</span>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <StudentRoadmapCalendar
          roadmapId={roadmap.id}
          batchId={roadmap.batch_id || ''}
          startDate={new Date(roadmap.start_date)}
          totalDays={roadmap.total_days}
          subjects={roadmap.subjects.map(s => s.name)}
          onTopicClick={(topicId, chapterName) => {
            setSelectedTopic({ id: topicId, chapterName, name: '' });
          }}
        />
      ) : viewMode === 'cards' ? (
        <RoadmapCardView
          roadmapId={roadmap.id}
          subjects={roadmap.subjects}
          isEditable={true}
          onChapterClick={(chapterId, chapterName, topics) => {
            setSelectedChapter({ id: chapterId, name: chapterName, topics });
          }}
          onChapterReorder={handleChapterReorder}
        />
      ) : (
        <>
          <div className="bg-muted/50 border rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium">💡 Tips:</p>
            <p className="text-muted-foreground">• Drag subjects to prioritize what you want to study first</p>
            <p className="text-muted-foreground">• Drag chapters within each subject to reorder them</p>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={roadmap.subjects.map(s => s.name)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {roadmap.subjects.map((subject) => (
                  <SortableSubjectCard 
                    key={subject.name} 
                    subject={subject}
                    onChapterClick={(chapterId, chapterName, topics) => {
                      setSelectedChapter({ id: chapterId, name: chapterName, topics });
                    }}
                    onChapterReorder={handleChapterReorder}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
};