import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook to fetch roadmaps based on exam type, board, and class
export const useRoadmaps = (examType: string, board: string | null, targetClass: string | null) => {
  return useQuery({
    queryKey: ['roadmaps', examType, board, targetClass],
    queryFn: async () => {
      let query = supabase
        .from('batch_roadmaps')
        .select('id, title, description, total_days, start_date, end_date, status')
        .eq('exam_type', examType)
        .order('created_at', { ascending: false });

      if (board) {
        query = query.eq('target_board', board);
      }
      if (targetClass) {
        query = query.eq('target_class', targetClass);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!examType,
  });
};

// Hook to fetch subjects for a roadmap
export const useRoadmapSubjects = (roadmapId: string | null) => {
  return useQuery({
    queryKey: ['roadmap-subjects', roadmapId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roadmap_chapters')
        .select('subject')
        .eq('roadmap_id', roadmapId!);

      if (error) throw error;
      const uniqueSubjects = [...new Set(data?.map(d => d.subject).filter(Boolean))];
      return uniqueSubjects as string[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!roadmapId,
  });
};

// Hook to fetch chapters for a roadmap and subject with counts
export const useRoadmapChapters = (roadmapId: string | null, subject: string | null) => {
  return useQuery({
    queryKey: ['roadmap-chapters', roadmapId, subject],
    queryFn: async () => {
      // Use optimized database function for single-query fetch
      const { data, error } = await supabase.rpc('get_chapter_stats', {
        roadmap_uuid: roadmapId!,
        subject_text: subject!,
      });

      if (error) throw error;

      return (data || []).map((chapter: any) => ({
        id: chapter.id,
        chapter_name: chapter.chapter_name,
        topic_count: Number(chapter.topic_count) || 0,
        game_count: Number(chapter.game_count) || 0,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!roadmapId && !!subject,
  });
};
