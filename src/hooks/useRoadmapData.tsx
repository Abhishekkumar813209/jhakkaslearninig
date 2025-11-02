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
      const { data, error } = await supabase
        .from('roadmap_chapters')
        .select('id, chapter_name')
        .eq('roadmap_id', roadmapId!)
        .eq('subject', subject!);

      if (error) throw error;

      // Get topic and game counts for each chapter
      const chaptersWithCounts = await Promise.all(
        (data || []).map(async (chapter) => {
          const { count: topicCount } = await supabase
            .from('roadmap_topics')
            .select('*', { count: 'exact', head: true })
            .eq('chapter_id', chapter.id);

          const { count: gameCount } = await supabase
            .from('gamified_exercises')
            .select('*, topic_content_mapping!inner(topic_id, roadmap_topics!inner(chapter_id))', { count: 'exact', head: true })
            .eq('topic_content_mapping.roadmap_topics.chapter_id', chapter.id);

          return {
            id: chapter.id,
            chapter_name: chapter.chapter_name,
            topic_count: topicCount || 0,
            game_count: gameCount || 0,
          };
        })
      );

      return chaptersWithCounts;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!roadmapId && !!subject,
  });
};
