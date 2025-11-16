import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Calendar as CalendarIcon, BookOpen, Target, RotateCcw, List, LayoutGrid, PlayCircle } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { ChapterTopicListView } from "./ChapterTopicListView";
import { StudentRoadmapCalendar } from "./StudentRoadmapCalendar";
import { RoadmapCardView } from "../RoadmapCardView";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  index: number;
  onChapterClick: (chapterId: string, chapterName: string, topics: any[]) => void;
  onSerialNumberChange: (chapterId: string, newPosition: number) => void;
  lectureCount?: number;
  onViewLectures: (chapterId: string) => void;
}

const SortableChapter = ({ chapter, index, onChapterClick, onSerialNumberChange, lectureCount = 0, onViewLectures }: SortableChapterProps) => {
  const [serialNumber, setSerialNumber] = useState(index + 1);
  const [isEditing, setIsEditing] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    setSerialNumber(index + 1);
  }, [index]);

  const handleSerialChange = (newSerial: number) => {
    if (newSerial >= 1) {
      onSerialNumberChange(chapter.id, newSerial);
    }
    setIsEditing(false);
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={cn(
        "border rounded-lg p-2 md:p-3 space-y-2 cursor-grab active:cursor-grabbing hover:bg-muted/30 transition-all",
        isDragging && "ring-2 ring-primary shadow-lg"
      )}
    >
      {/* Mobile: Vertical Stack, Desktop: Horizontal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        {/* TOP ROW (Mobile) / LEFT SIDE (Desktop) */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
          {/* Serial Number Badge */}
          {isEditing ? (
            <Input
              type="number"
              min="1"
              value={serialNumber}
              onChange={(e) => setSerialNumber(parseInt(e.target.value) || 1)}
              onBlur={() => handleSerialChange(serialNumber)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSerialChange(serialNumber);
                }
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setSerialNumber(index + 1);
                }
              }}
              className="w-10 h-7 text-center text-xs md:text-sm p-0"
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <Badge 
              variant="outline" 
              className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center cursor-pointer hover:bg-primary hover:text-primary-foreground flex-shrink-0 text-xs md:text-sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {index + 1}
            </Badge>
          )}
          
          {/* Desktop-only icons */}
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 hidden md:block" />
          <BookOpen className="h-4 w-4 text-primary flex-shrink-0 hidden md:block" />
          
          {/* Chapter Name - Full Width on Mobile */}
          <span 
            className="font-medium text-sm md:text-base flex-1 min-w-0 cursor-pointer hover:underline text-primary line-clamp-2 md:line-clamp-1"
            onClick={(e) => {
              e.stopPropagation();
              onChapterClick(chapter.id, chapter.chapter_name, chapter.topics);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {chapter.chapter_name}
          </span>
        </div>

        {/* BOTTOM ROW (Mobile) / RIGHT SIDE (Desktop) */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap md:flex-nowrap ml-8 md:ml-0">
          {/* Topics Badge */}
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {chapter.topics.length} topics
          </Badge>
          
          {/* Lecture Badge */}
          {lectureCount > 0 && (
            <Badge variant="outline" className="text-xs h-5 px-1.5 flex items-center gap-1">
              <PlayCircle className="h-3 w-3" />
              {lectureCount}
            </Badge>
          )}
          
          {/* Day Range - Compact */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarIcon className="h-3 w-3 hidden md:inline" />
            <span className="whitespace-nowrap">Day {chapter.day_start}-{chapter.day_end}</span>
          </div>
          
          {/* Watch Button - Compact */}
          {lectureCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                onViewLectures(chapter.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <PlayCircle className="h-3 w-3 md:mr-1" />
              <span className="hidden md:inline">Watch</span>
            </Button>
          )}
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
  chapterLectureCounts: Record<string, number>;
  onViewLectures: (chapterId: string) => void;
}

const SortableSubjectCard = ({ subject, onChapterClick, onChapterReorder, chapterLectureCounts, onViewLectures }: SortableSubjectCardProps) => {
  const [localChapters, setLocalChapters] = useState(subject.chapters);
  const [isDraggingChapter, setIsDraggingChapter] = useState(false);

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
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
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
    
    // Optimistic UI: Recalculate day_start and day_end based on estimated_days
    let currentDay = 1;
    const updated = reordered.map(ch => {
      const days = Math.max(1, (ch.day_end - ch.day_start + 1));
      const newChapter = {
        ...ch,
        day_start: currentDay,
        day_end: currentDay + days - 1
      };
      currentDay += days;
      return newChapter;
    });
    
    setLocalChapters(updated);
    onChapterReorder(subject.name, reordered.map(ch => ch.id));
  };

  const handleSerialNumberChange = (chapterId: string, newPosition: number) => {
    const currentIndex = localChapters.findIndex(ch => ch.id === chapterId);
    if (currentIndex === -1) return;
    
    // Clamp position to valid range (1 to total chapters)
    const targetIndex = Math.max(0, Math.min(newPosition - 1, localChapters.length - 1));
    
    if (currentIndex === targetIndex) return;
    
    // Reorder chapters
    const reordered = arrayMove(localChapters, currentIndex, targetIndex);
    
    // Recalculate day_start and day_end
    let currentDay = 1;
    const updated = reordered.map(ch => {
      const days = Math.max(1, (ch.day_end - ch.day_start + 1));
      const newChapter = {
        ...ch,
        day_start: currentDay,
        day_end: currentDay + days - 1
      };
      currentDay += days;
      return newChapter;
    });
    
    setLocalChapters(updated);
    onChapterReorder(subject.name, reordered.map(ch => ch.id));
    
    toast.success(`Chapter moved to position ${newPosition}`);
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
            💡 Long-press a chapter to drag on mobile • Tap the number to jump to position • Tap the name to view topics
          </div>

          <DndContext 
            sensors={chapterSensors} 
            collisionDetection={closestCenter} 
            onDragStart={() => setIsDraggingChapter(true)}
            onDragEnd={(e) => {
              handleChapterDragEnd(e);
              setIsDraggingChapter(false);
            }}
            onDragCancel={() => setIsDraggingChapter(false)}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={localChapters.map(ch => ch.id)} strategy={verticalListSortingStrategy}>
              <div className={cn("space-y-2 select-none", isDraggingChapter && "touch-none")}>
                {localChapters.map((chapter, index) => (
                  <SortableChapter 
                    key={chapter.id} 
                    chapter={chapter}
                    index={index}
                    onChapterClick={onChapterClick}
                    onSerialNumberChange={handleSerialNumberChange}
                    lectureCount={chapterLectureCounts[chapter.id] || 0}
                    onViewLectures={onViewLectures}
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

// Helper to format dates as dd/mm/yyyy
const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const StudentBatchRoadmap = () => {
  const navigate = useNavigate();
  const { roadmapId } = useParams();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<{ id: string; name: string; topics: any[] } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'cards'>('list');
  const [chapterLectureCounts, setChapterLectureCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchRoadmap();
    fetchLectureCounts();
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

  // Real-time sync for topic progress updates
  useEffect(() => {
    const syncTopicProgress = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const channel = supabase
        .channel('topic-progress-sync')
        .on('postgres_changes', 
          { 
            event: '*',
            schema: 'public', 
            table: 'student_topic_progress',
            filter: `student_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('Topic progress updated:', payload);
            fetchRoadmap(); // Auto-refresh when topic status changes
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    };

    syncTopicProgress();
  }, []);

  const fetchRoadmap = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { data, error } = await supabase.functions.invoke("student-roadmap-api", {
        body: { action: "get" },
        headers
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

  const fetchLectureCounts = async () => {
    try {
      // Fetch all chapters to get their IDs
      const { data: chapters, error: chaptersError } = await supabase
        .from('roadmap_chapters')
        .select('id');
      
      if (chaptersError || !chapters) return;
      
      const chapterIds = chapters.map((c: any) => c.id);
      
      // Use RPC or aggregate query to count lectures per chapter
      const countsMap: Record<string, number> = {};
      
      for (const chapterId of chapterIds) {
        const { count } = await supabase
          .from('chapter_lectures' as any)
          .select('*', { count: 'exact', head: true })
          .eq('chapter_id', chapterId)
          .eq('is_published', true);
        
        if (count && count > 0) {
          countsMap[chapterId] = count;
        }
      }
      
      setChapterLectureCounts(countsMap);
    } catch (error) {
      console.error('Error fetching lecture counts:', error);
    }
  };

  const handleViewLectures = (chapterId: string) => {
    navigate(`/student/roadmap/${roadmapId}/chapter/${chapterId}/lectures`);
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
        const { data: { session } } = await supabase.auth.getSession();
        const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
        
        const { error } = await supabase.functions.invoke("student-roadmap-api", {
          body: { action: "update_subject_order", subject_order: newOrder },
          headers
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
    if (!roadmap) return;
    
    try {
      // Optimistic update - update state immediately for smooth UX
      const updatedSubjects = roadmap.subjects.map(subject => {
        if (subject.name === subjectName) {
          const reorderedChapters = reorderedChapterIds.map(id => 
            subject.chapters.find(ch => ch.id === id)
          ).filter(Boolean) as any[];
          
          return { ...subject, chapters: reorderedChapters };
        }
        return subject;
      });
      
      setRoadmap({ ...roadmap, subjects: updatedSubjects });
      
      // API call in background
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { error } = await supabase.functions.invoke("student-roadmap-api", {
        body: { 
          action: "update_chapter_order", 
          subject_name: subjectName,
          chapter_order: reorderedChapterIds
        },
        headers
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
      // Only refetch on error to restore correct state
      fetchRoadmap();
    }
  };

  const handleChapterEdit = async (chapterId: string, newDays: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { error } = await supabase.functions.invoke("student-roadmap-api", {
        body: {
          action: "update_chapter_days",
          chapter_id: chapterId,
          custom_days: newDays
        },
        headers
      });

      if (error) throw error;

      toast({
        title: "Duration Updated",
        description: "Chapter duration updated successfully"
      });

      // Refresh all views
      await fetchRoadmap();
    } catch (error) {
      console.error("Error updating chapter days:", error);
      toast({
        title: "Error",
        description: "Failed to update chapter duration",
        variant: "destructive"
      });
    }
  };

  const handleResetOrder = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { error } = await supabase.functions.invoke("student-roadmap-api", {
        body: { action: "update_subject_order", subject_order: null },
        headers
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

  if (selectedChapter) {
    return (
      <ChapterTopicListView
        chapterId={selectedChapter.id}
        chapterName={selectedChapter.name}
        topics={selectedChapter.topics}
        onTopicClick={(topicId, topicName) => {
          navigate(`/student/roadmap/${roadmap?.id}/topic/${topicId}`);
        }}
        onBack={() => {
          setSelectedChapter(null);
          fetchRoadmap();
        }}
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
      <div className="space-y-4">
        {/* Title Section - Full Width on All Screens */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{roadmap.title}</h2>
          <p className="text-sm text-muted-foreground">{roadmap.description}</p>
        </div>

        {/* View Mode Buttons - Responsive Layout */}
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('list')}
            className="flex-1 sm:flex-none"
          >
            <List className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">List</span>
          </Button>
          <Button 
            variant={viewMode === 'calendar' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="flex-1 sm:flex-none"
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Calendar</span>
          </Button>
          <Button 
            variant={viewMode === 'cards' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('cards')}
            className="flex-1 sm:flex-none"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Card</span>
          </Button>
        </div>

        {/* Date Info Section - Formatted as dd/mm/yyyy */}
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(new Date(roadmap.start_date))} - {formatDate(new Date(roadmap.end_date))}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>{roadmap.total_days} days total</span>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <StudentRoadmapCalendar
          startDate={new Date(roadmap.start_date)}
          totalDays={roadmap.total_days}
          subjectsData={roadmap.subjects}
          onTopicClick={(topicId, chapterName) => {
            navigate(`/student/roadmap/${roadmap.id}/topic/${topicId}`);
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
          onChapterEdit={(chapterId) => {
            // Find the chapter to get custom days
            let chapter: any = null;
            for (const subject of roadmap.subjects) {
              const found = subject.chapters.find((ch: any) => ch.id === chapterId);
              if (found) {
                chapter = found;
                break;
              }
            }
            
            if (chapter) {
              const currentDays = chapter.custom_days || chapter.estimated_days || 3;
              const newDays = prompt(`Enter new duration for "${chapter.chapter_name}" (current: ${currentDays} days):`, currentDays.toString());
              
              if (newDays && parseInt(newDays) > 0) {
                handleChapterEdit(chapterId, parseInt(newDays));
              }
            }
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
                    chapterLectureCounts={chapterLectureCounts}
                    onViewLectures={handleViewLectures}
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