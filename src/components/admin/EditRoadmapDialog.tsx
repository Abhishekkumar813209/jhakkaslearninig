import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Trash2, GripVertical, Loader2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface EditRoadmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roadmapId: string | null;
  onSuccess: () => void;
}

interface Chapter {
  id: string;
  chapter_name: string;
  subject: string;
  day_start: number;
  day_end: number;
  order_num: number;
  estimated_days: number;
  topics?: any[];
}

const SortableChapter = ({ chapter, onDelete }: { chapter: Chapter; onDelete: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="animate-fade-in">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">{chapter.chapter_name}</p>
            <p className="text-sm text-muted-foreground">
              {chapter.subject} • Day {chapter.day_start}-{chapter.day_end}
            </p>
          </div>
          <Badge variant="secondary">{chapter.estimated_days} days</Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(chapter.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export const EditRoadmapDialog = ({ open, onOpenChange, roadmapId, onSuccess }: EditRoadmapDialogProps) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (roadmapId && open) {
      fetchChapters();
    }
  }, [roadmapId, open]);

  const fetchChapters = async () => {
    if (!roadmapId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('roadmap_chapters')
        .select('*')
        .eq('roadmap_id', roadmapId)
        .order('order_num', { ascending: true });

      if (error) throw error;
      setChapters(data || []);
    } catch (error: any) {
      console.error('Error fetching chapters:', error);
      toast.error('Failed to load chapters');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setChapters((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    try {
      setIsLoading(true);

      // Delete topics first
      await supabase
        .from('roadmap_topics')
        .delete()
        .eq('chapter_id', chapterId);

      // Delete chapter
      const { error } = await supabase
        .from('roadmap_chapters')
        .delete()
        .eq('id', chapterId);

      if (error) throw error;

      setChapters(prev => prev.filter(c => c.id !== chapterId));
      toast.success('Chapter deleted');
    } catch (error: any) {
      console.error('Error deleting chapter:', error);
      toast.error('Failed to delete chapter');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoAdjust = async () => {
    if (!roadmapId) return;

    setIsAdjusting(true);
    toast.loading("AI is adjusting your roadmap...");

    try {
      // Prepare data for auto-adjust
      const remainingChapters = chapters.map((chapter, index) => ({
        chapter_id: chapter.id,
        chapter_name: chapter.chapter_name,
        subject: chapter.subject,
        suggested_days: chapter.estimated_days,
        order_num: index + 1
      }));

      const { data, error } = await supabase.functions.invoke('auto-adjust-roadmap', {
        body: {
          roadmap_id: roadmapId,
          remaining_chapters: remainingChapters
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.dismiss();
        toast.error(data.error);
        return;
      }

      toast.dismiss();
      toast.success("Roadmap adjusted successfully!");
      fetchChapters();
      onSuccess();
    } catch (error: any) {
      toast.dismiss();
      console.error('Error adjusting roadmap:', error);
      toast.error('Failed to adjust roadmap');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Update order numbers
      const updates = chapters.map((chapter, index) => ({
        id: chapter.id,
        order_num: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('roadmap_chapters')
          .update({ order_num: update.order_num })
          .eq('id', update.id);
      }

      toast.success('Roadmap updated successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving roadmap:', error);
      toast.error('Failed to save roadmap');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Roadmap</span>
            <div className="flex gap-2">
              <Button
                onClick={handleAutoAdjust}
                disabled={isAdjusting || chapters.length === 0}
                variant="outline"
                className="gap-2"
              >
                {isAdjusting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adjusting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Auto-Adjust Schedule
                  </>
                )}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading chapters...</p>
          </div>
        ) : chapters.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No chapters in this roadmap</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Drag chapters to reorder, delete unwanted chapters, then click "Auto-Adjust Schedule" to reschedule remaining chapters.
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={chapters.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {chapters.map((chapter) => (
                    <SortableChapter
                      key={chapter.id}
                      chapter={chapter}
                      onDelete={handleDeleteChapter}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
