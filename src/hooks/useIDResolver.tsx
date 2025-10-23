import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResolvedID {
  table: string;
  id: string;
  displayName: string;
  metadata: Record<string, any>;
  relatedIDs: Array<{
    table: string;
    id: string;
    name: string;
    value: string;
  }>;
}

export const useIDResolver = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolvedID | null>(null);

  const resolveID = async (uuid: string) => {
    if (!uuid || uuid.length !== 36) {
      toast.error('Invalid UUID format');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Try topic_content_mapping
      const { data: topicContent } = await supabase
        .from('topic_content_mapping')
        .select(`
          id,
          content_type,
          roadmap_topics!inner(
            id,
            topic_name,
            day_number,
            roadmap_chapters!inner(
              id,
              chapter_name,
              batch_roadmaps!inner(
                id,
                title
              )
            )
          )
        `)
        .eq('id', uuid)
        .maybeSingle();

      if (topicContent) {
        const topic = topicContent.roadmap_topics;
        const chapter = topic.roadmap_chapters;
        const roadmap = chapter.batch_roadmaps;

        const { count: gamesCount } = await supabase
          .from('gamified_exercises')
          .select('*', { count: 'exact', head: true })
          .eq('topic_content_id', uuid);

        setResult({
          table: 'topic_content_mapping',
          id: uuid,
          displayName: topic.topic_name,
          metadata: {
            content_type: topicContent.content_type,
            chapter: chapter.chapter_name,
            roadmap: roadmap.title,
            day: topic.day_number,
            games_count: gamesCount || 0,
          },
          relatedIDs: [
            { table: 'roadmap_topics', id: topic.id, name: 'Topic ID', value: topic.topic_name },
            { table: 'roadmap_chapters', id: chapter.id, name: 'Chapter ID', value: chapter.chapter_name },
            { table: 'batch_roadmaps', id: roadmap.id, name: 'Roadmap ID', value: roadmap.title },
          ],
        });
        setLoading(false);
        return;
      }

      // Try profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          batches(id, name)
        `)
        .eq('id', uuid)
        .maybeSingle();

      if (profile) {
        setResult({
          table: 'profiles',
          id: uuid,
          displayName: profile.full_name || profile.email,
          metadata: {
            email: profile.email,
            batch: profile.batches?.name || 'No batch',
          },
          relatedIDs: profile.batches
            ? [{ table: 'batches', id: profile.batches.id, name: 'Batch ID', value: profile.batches.name }]
            : [],
        });
        setLoading(false);
        return;
      }

      // Try tests
      const { data: test } = await supabase
        .from('tests')
        .select(`
          id,
          title,
          subject,
          created_by
        `)
        .eq('id', uuid)
        .maybeSingle();

      if (test) {
        const { data: creator } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', test.created_by)
          .maybeSingle();

        setResult({
          table: 'tests',
          id: uuid,
          displayName: test.title,
          metadata: {
            subject: test.subject,
            created_by: creator?.full_name || 'Unknown',
          },
          relatedIDs: creator
            ? [{ table: 'profiles', id: creator.id, name: 'Creator ID', value: creator.full_name || 'Unknown' }]
            : [],
        });
        setLoading(false);
        return;
      }

      // Try roadmap_topics
      const { data: topic } = await supabase
        .from('roadmap_topics')
        .select(`
          id,
          topic_name,
          day_number,
          roadmap_chapters!inner(
            id,
            chapter_name,
            batch_roadmaps!inner(id, title)
          )
        `)
        .eq('id', uuid)
        .maybeSingle();

      if (topic) {
        const chapter = topic.roadmap_chapters;
        const roadmap = chapter.batch_roadmaps;

        setResult({
          table: 'roadmap_topics',
          id: uuid,
          displayName: topic.topic_name,
          metadata: {
            day: topic.day_number,
            chapter: chapter.chapter_name,
            roadmap: roadmap.title,
          },
          relatedIDs: [
            { table: 'roadmap_chapters', id: chapter.id, name: 'Chapter ID', value: chapter.chapter_name },
            { table: 'batch_roadmaps', id: roadmap.id, name: 'Roadmap ID', value: roadmap.title },
          ],
        });
        setLoading(false);
        return;
      }

      // Try batches
      const { data: batch } = await supabase
        .from('batches')
        .select('id, name, level, exam_type')
        .eq('id', uuid)
        .maybeSingle();

      if (batch) {
        setResult({
          table: 'batches',
          id: uuid,
          displayName: batch.name,
          metadata: {
            level: batch.level,
            exam_type: batch.exam_type,
          },
          relatedIDs: [],
        });
        setLoading(false);
        return;
      }

      // Try gamified_exercises
      const { data: exercise } = await supabase
        .from('gamified_exercises')
        .select(`
          id,
          exercise_type,
          question_text,
          topic_content_mapping!inner(
            id,
            roadmap_topics!inner(id, topic_name)
          )
        `)
        .eq('id', uuid)
        .maybeSingle();

      if (exercise) {
        const topicMapping = exercise.topic_content_mapping;
        const topicData = topicMapping.roadmap_topics;

        setResult({
          table: 'gamified_exercises',
          id: uuid,
          displayName: exercise.question_text?.substring(0, 50) + '...' || 'Game Exercise',
          metadata: {
            type: exercise.exercise_type,
            topic: topicData.topic_name,
          },
          relatedIDs: [
            { table: 'topic_content_mapping', id: topicMapping.id, name: 'Content ID', value: topicData.topic_name },
            { table: 'roadmap_topics', id: topicData.id, name: 'Topic ID', value: topicData.topic_name },
          ],
        });
        setLoading(false);
        return;
      }

      toast.error('ID not found in any table');
      setLoading(false);
    } catch (error) {
      console.error('Error resolving ID:', error);
      toast.error('Failed to resolve ID');
      setLoading(false);
    }
  };

  return { resolveID, loading, result };
};
