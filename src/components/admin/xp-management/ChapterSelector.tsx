import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, BookOpen, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface ChapterSelectorProps {
  domain: string;
  board: string | null;
  targetClass: string | null;
  subject: string;
  onChapterSelect: (chapter: { id: string; name: string }) => void;
}

interface Chapter {
  id: string;
  chapter_name: string;
  topic_count: number;
  game_count: number;
}

export const ChapterSelector = ({ domain, board, targetClass, subject, onChapterSelect }: ChapterSelectorProps) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChapters();
  }, [domain, board, targetClass, subject]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('roadmap_chapters')
        .select(`
          id,
          chapter_name,
          batch_roadmaps!inner(exam_type, target_board, target_class)
        `)
        .eq('subject', subject);

      if (domain === 'school') {
        query = query
          .eq('batch_roadmaps.exam_type', domain)
          .eq('batch_roadmaps.target_board', board)
          .eq('batch_roadmaps.target_class', targetClass);
      } else {
        query = query.eq('batch_roadmaps.exam_type', domain);
      }

      const { data, error } = await query;

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

      setChapters(chaptersWithCounts);
    } catch (error: any) {
      console.error('Error fetching chapters:', error);
      toast.error('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No chapters found for {subject}</p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Select Chapter</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {chapters.map((chapter) => (
          <Card
            key={chapter.id}
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
            onClick={() => onChapterSelect({ id: chapter.id, name: chapter.chapter_name })}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-base">{chapter.chapter_name}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {chapter.topic_count} topic{chapter.topic_count !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline">
                  {chapter.game_count} game{chapter.game_count !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
