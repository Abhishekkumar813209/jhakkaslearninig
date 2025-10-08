import { useState } from "react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GripVertical, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Chapter {
  id: string;
  chapter_name: string;
  subject: string;
  order_num: number;
  estimated_days: number;
  day_start?: number;
  day_end?: number;
}

interface RoadmapEditorProps {
  roadmapId: string;
  chapters: Chapter[];
  onSave: () => void;
}

interface SortableChapterProps {
  chapter: Chapter;
}

function SortableChapter({ chapter }: SortableChapterProps) {
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

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="p-3 mb-2 flex items-center gap-3 hover:bg-muted/50 transition-colors">
        <div {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="font-medium">{chapter.chapter_name}</div>
          <div className="text-sm text-muted-foreground">
            {chapter.estimated_days} days • Subject: {chapter.subject}
          </div>
        </div>
        {chapter.day_start && chapter.day_end && (
          <div className="text-sm text-muted-foreground">
            Day {chapter.day_start}-{chapter.day_end}
          </div>
        )}
      </Card>
    </div>
  );
}

export function RoadmapEditor({ roadmapId, chapters: initialChapters, onSave }: RoadmapEditorProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Group chapters by subject
  const subjectGroups = chapters.reduce((acc, chapter) => {
    if (!acc[chapter.subject]) {
      acc[chapter.subject] = [];
    }
    acc[chapter.subject].push(chapter);
    return acc;
  }, {} as Record<string, Chapter[]>);

  const handleDragEnd = (event: DragEndEvent, subject: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const subjectChapters = subjectGroups[subject];
    const oldIndex = subjectChapters.findIndex((ch) => ch.id === active.id);
    const newIndex = subjectChapters.findIndex((ch) => ch.id === over.id);

    const reorderedSubjectChapters = arrayMove(subjectChapters, oldIndex, newIndex).map(
      (ch, idx) => ({ ...ch, order_num: idx + 1 })
    );

    // Update the main chapters array
    const updatedChapters = chapters.map((ch) => {
      const reordered = reorderedSubjectChapters.find((rch) => rch.id === ch.id);
      return reordered || ch;
    });

    setChapters(updatedChapters);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      const reorderedChapters = chapters.map((ch) => ({
        chapter_id: ch.id,
        subject: ch.subject,
        order_num: ch.order_num,
        day_start: ch.day_start,
        day_end: ch.day_end,
      }));

      const response = await fetch(
        `https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/roadmap-reorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            roadmap_id: roadmapId,
            reordered_chapters: reorderedChapters,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save changes");
      }

      toast({
        title: "Success",
        description: "Roadmap chapters reordered successfully!",
      });

      onSave();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setChapters(initialChapters);
    toast({
      title: "Reset",
      description: "Changes discarded",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Drag & Drop to Reorder Chapters</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(subjectGroups).map(([subject, subjectChapters]) => (
          <div key={subject} className="space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {subject}
            </h4>
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, subject)}
            >
              <SortableContext
                items={subjectChapters.map((ch) => ch.id)}
                strategy={verticalListSortingStrategy}
              >
                {subjectChapters.map((chapter) => (
                  <SortableChapter key={chapter.id} chapter={chapter} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        ))}
      </div>
    </div>
  );
}
