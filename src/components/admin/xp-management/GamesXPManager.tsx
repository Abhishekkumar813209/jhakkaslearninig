import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GameXPTable } from './GameXPTable';
import { Badge } from '@/components/ui/badge';

interface Topic {
  id: string;
  topic_name: string;
  day_number: number;
  game_count: number;
}

export const GamesXPManager = ({ chapterId }: { chapterId: string }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTopics();
  }, [chapterId]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      
      const { data: topicsData, error } = await supabase
        .from('roadmap_topics')
        .select('id, topic_name, day_number')
        .eq('chapter_id', chapterId)
        .order('day_number');

      if (error) throw error;

      // Get game counts for each topic
      const topicsWithCounts = await Promise.all(
        (topicsData || []).map(async (topic) => {
          const { count } = await supabase
            .from('gamified_exercises')
            .select('*, topic_content_mapping!inner(topic_id)', { count: 'exact', head: true })
            .eq('topic_content_mapping.topic_id', topic.id);

          return {
            ...topic,
            game_count: count || 0,
          };
        })
      );

      setTopics(topicsWithCounts);
    } catch (error: any) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setOpenTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <p>No topics found in this chapter</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Topics with Games</h3>
        <Badge variant="secondary">{topics.length} topics</Badge>
      </div>

      {topics.map((topic) => (
        <Collapsible
          key={topic.id}
          open={openTopics.has(topic.id)}
          onOpenChange={() => toggleTopic(topic.id)}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-3">
                    {openTopics.has(topic.id) ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span>Day {topic.day_number}: {topic.topic_name}</span>
                  </div>
                  <Badge variant={topic.game_count > 0 ? "default" : "secondary"}>
                    {topic.game_count} game{topic.game_count !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                {topic.game_count > 0 ? (
                  <GameXPTable topicId={topic.id} />
                ) : (
                  <p className="text-muted-foreground text-sm py-4">No games in this topic</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};
