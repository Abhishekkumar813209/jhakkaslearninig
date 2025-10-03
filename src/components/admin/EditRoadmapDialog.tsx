import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
import { RoadmapCalendarView, CalendarChapter } from './RoadmapCalendarView';
import { format, parseISO } from 'date-fns';

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
  video_link?: string;
  topics?: any[];
}

export const EditRoadmapDialog = ({ open, onOpenChange, roadmapId, onSuccess }: EditRoadmapDialogProps) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [calendarChapters, setCalendarChapters] = useState<CalendarChapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    if (roadmapId && open) {
      fetchChapters();
    }
  }, [roadmapId, open]);

  const fetchChapters = async () => {
    if (!roadmapId) return;

    setIsLoading(true);
    try {
      // Fetch roadmap data
      const { data: roadmap, error: roadmapError } = await supabase
        .from('batch_roadmaps')
        .select('*')
        .eq('id', roadmapId)
        .single();

      if (roadmapError) throw roadmapError;
      setRoadmapData(roadmap);

      // Fetch chapters
      const { data, error } = await supabase
        .from('roadmap_chapters')
        .select('*')
        .eq('roadmap_id', roadmapId)
        .order('order_num', { ascending: true });

      if (error) throw error;
      setChapters(data || []);

      // Convert to calendar format
      if (roadmap && data) {
        const calChapters: CalendarChapter[] = data.map(ch => ({
          id: ch.id,
          date: format(parseISO(roadmap.start_date).getTime() + (ch.day_start - 1) * 24 * 60 * 60 * 1000, 'yyyy-MM-dd'),
          subject: ch.subject,
          chapterName: ch.chapter_name,
          videoLink: (ch as any).video_link,
          isBufferTime: false,
          isLive: false
        }));
        setCalendarChapters(calChapters);
      }
    } catch (error: any) {
      console.error('Error fetching chapters:', error);
      toast.error('Failed to load chapters');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarChaptersChange = (updatedChapters: CalendarChapter[]) => {
    setCalendarChapters(updatedChapters);
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
    if (!roadmapData) return;

    setIsLoading(true);
    try {
      // Update chapters based on calendar view
      for (const calChapter of calendarChapters) {
        const chapter = chapters.find(c => c.id === calChapter.id);
        if (!chapter) continue;

        // Calculate day_start from date
        const startDate = parseISO(roadmapData.start_date);
        const chapterDate = parseISO(calChapter.date);
        const daysDiff = Math.floor((chapterDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        await supabase
          .from('roadmap_chapters')
          .update({
            chapter_name: calChapter.chapterName,
            subject: calChapter.subject,
            day_start: daysDiff + 1,
            day_end: daysDiff + chapter.estimated_days,
            video_link: calChapter.videoLink || null
          })
          .eq('id', calChapter.id);
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Roadmap - Calendar View</span>
            <Button
              onClick={handleAutoAdjust}
              disabled={isAdjusting || chapters.length === 0}
              variant="outline"
              size="sm"
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
                  Auto-Adjust
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading roadmap...</p>
          </div>
        ) : !roadmapData || chapters.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No chapters in this roadmap</p>
          </div>
        ) : (
          <div className="space-y-4">
            <RoadmapCalendarView
              roadmapId={roadmapId}
              startDate={parseISO(roadmapData.start_date)}
              totalDays={roadmapData.total_days}
              subjects={[...new Set(chapters.map(c => c.subject))]}
              chapters={calendarChapters}
              isEditable={true}
              onChaptersChange={handleCalendarChaptersChange}
              onSave={handleSave}
            />

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading || isAdjusting}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
