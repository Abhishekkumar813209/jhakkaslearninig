import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, LayoutGrid, GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StudentRoadmapCalendar } from "@/components/student/StudentRoadmapCalendar";
import { RoadmapCardView } from "@/components/RoadmapCardView";
import { DuolingoLessonPath } from "@/components/student/DuolingoLessonPath";
import { toast } from "sonner";
import { parseISO } from "date-fns";

interface AdminRoadmapViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roadmapId: string | null;
}

export const AdminRoadmapViewDialog = ({ open, onOpenChange, roadmapId }: AdminRoadmapViewDialogProps) => {
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'cards' | 'path'>('calendar');

  useEffect(() => {
    if (roadmapId && open) {
      fetchRoadmapData();
    }
  }, [roadmapId, open]);

  const fetchRoadmapData = async () => {
    if (!roadmapId) return;
    
    setLoading(true);
    try {
      // Fetch roadmap
      const { data: roadmap, error: roadmapError } = await supabase
        .from('batch_roadmaps')
        .select('*')
        .eq('id', roadmapId)
        .single();

      if (roadmapError) throw roadmapError;

      // Fetch chapters
      const { data: chapters, error: chaptersError } = await supabase
        .from('roadmap_chapters')
        .select('*')
        .eq('roadmap_id', roadmapId)
        .order('order_num', { ascending: true });

      if (chaptersError) throw chaptersError;

      // Fetch topics for each chapter
      const chapterIds = chapters?.map(c => c.id) || [];
      const { data: topics, error: topicsError } = chapterIds.length > 0 ? await supabase
        .from('roadmap_topics')
        .select('*')
        .in('chapter_id', chapterIds)
        .order('order_num', { ascending: true }) : { data: [], error: null };

      if (topicsError) throw topicsError;

      // Transform to student view format
      const subjectsData = transformToSubjectsData(chapters || [], topics || []);

      setRoadmapData({
        ...roadmap,
        chapters: chapters || [],
        topics: topics || [],
        subjectsData
      });
    } catch (error: any) {
      console.error('Error fetching roadmap:', error);
      toast.error('Failed to load roadmap data');
    } finally {
      setLoading(false);
    }
  };

  const transformToSubjectsData = (chapters: any[], topics: any[]) => {
    // Group chapters by subject
    const subjectMap: Record<string, any> = {};

    chapters.forEach(chapter => {
      if (!subjectMap[chapter.subject]) {
        subjectMap[chapter.subject] = {
          name: chapter.subject,
          chapters: []
        };
      }

      const chapterTopics = topics
        .filter(t => t.chapter_id === chapter.id)
        .map(t => ({
          id: t.id,
          topic_name: t.topic_name,
          status: 'locked',
          progress_percentage: 0
        }));

      subjectMap[chapter.subject].chapters.push({
        id: chapter.id,
        chapter_name: chapter.chapter_name,
        day_start: chapter.day_start,
        day_end: chapter.day_end,
        progress: 0,
        topics: chapterTopics
      });
    });

    return Object.values(subjectMap);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!roadmapData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Roadmap Preview: {roadmapData.title}</DialogTitle>
        </DialogHeader>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Card View
            </TabsTrigger>
            <TabsTrigger value="path" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Path View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            <StudentRoadmapCalendar
              startDate={parseISO(roadmapData.start_date)}
              totalDays={roadmapData.total_days}
              subjectsData={roadmapData.subjectsData}
            />
          </TabsContent>

          <TabsContent value="cards" className="mt-4">
            <RoadmapCardView
              roadmapId={roadmapId!}
              subjects={roadmapData.subjectsData}
              isEditable={false}
              onChapterReorder={() => {}}
            />
          </TabsContent>

          <TabsContent value="path" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Path view shows student's personalized learning journey</p>
              <p className="text-sm mt-2">This preview requires student enrollment data</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
