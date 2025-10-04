import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { GripVertical, Calendar, BookOpen, Target, RotateCcw } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TopicStudyView } from "./TopicStudyView";

interface RoadmapData {
  id: string;
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

interface SortableSubjectCardProps {
  subject: {
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
  };
  onTopicClick: (topicId: string, topicName: string) => void;
}

const SortableSubjectCard = ({ subject, onTopicClick }: SortableSubjectCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subject.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const totalChapters = subject.chapters.length;
  const avgProgress = totalChapters > 0 
    ? subject.chapters.reduce((sum, ch) => sum + ch.progress, 0) / totalChapters 
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
          
          <div className="space-y-2">
            {subject.chapters.map((chapter) => (
              <div key={chapter.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{chapter.chapter_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Day {chapter.day_start}-{chapter.day_end}</span>
                  </div>
                </div>
                
                <Progress value={chapter.progress} className="h-1" />
                
                <div className="flex flex-wrap gap-1.5">
                  {chapter.topics.map((topic) => (
                    <Button
                      key={topic.id}
                      variant={topic.status === "completed" ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => onTopicClick(topic.id, topic.topic_name)}
                    >
                      {topic.topic_name}
                      {topic.status === "completed" && " ✓"}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const StudentBatchRoadmap = () => {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchRoadmap();
  }, []);

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
        {roadmap.subject_order && (
          <Button variant="outline" size="sm" onClick={handleResetOrder}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Order
          </Button>
        )}
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{new Date(roadmap.start_date).toLocaleDateString()} - {new Date(roadmap.end_date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span>{roadmap.total_days} days total</span>
        </div>
      </div>

      <div className="bg-muted/50 border rounded-lg p-3 text-sm">
        <p className="font-medium mb-1">💡 Tip: Drag to prioritize subjects</p>
        <p className="text-muted-foreground">Reorder subjects based on what you want to study first</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={roadmap.subjects.map(s => s.name)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {roadmap.subjects.map((subject) => (
              <SortableSubjectCard 
                key={subject.name} 
                subject={subject}
                onTopicClick={(topicId, topicName) => setSelectedTopic({ id: topicId, name: topicName })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
