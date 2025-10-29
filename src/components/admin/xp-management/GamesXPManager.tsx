import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GameXPTable } from './GameXPTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
  const [distributing, setDistributing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [distributionPreview, setDistributionPreview] = useState<any>(null);

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

  const handleAutoDistribute = async () => {
    try {
      setDistributing(true);
      
      // First, do a dry run to preview changes
      const { data, error } = await supabase.functions.invoke('auto-distribute-xp', {
        body: { chapter_id: chapterId, dry_run: true }
      });

      if (error) throw error;

      if (data?.results && data.results.length > 0) {
        setDistributionPreview(data.results);
        setShowConfirmDialog(true);
      } else {
        toast.info('No games found to distribute XP');
      }
    } catch (error: any) {
      console.error('Error previewing XP distribution:', error);
      toast.error('Failed to preview XP distribution');
    } finally {
      setDistributing(false);
    }
  };

  const applyDistribution = async () => {
    try {
      setDistributing(true);
      setShowConfirmDialog(false);

      const { data, error } = await supabase.functions.invoke('auto-distribute-xp', {
        body: { chapter_id: chapterId, dry_run: false }
      });

      if (error) throw error;

      const successCount = data?.results?.filter((r: any) => !r.error).length || 0;
      const errorCount = data?.results?.filter((r: any) => r.error).length || 0;

      if (successCount > 0) {
        toast.success(`Successfully redistributed XP for ${successCount} topic(s)`);
        await fetchTopics(); // Refresh the data
      }

      if (errorCount > 0) {
        toast.error(`Failed to redistribute XP for ${errorCount} topic(s)`);
      }
    } catch (error: any) {
      console.error('Error applying XP distribution:', error);
      toast.error('Failed to apply XP distribution');
    } finally {
      setDistributing(false);
      setDistributionPreview(null);
    }
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
        <div>
          <h3 className="text-lg font-semibold">Topics with Games</h3>
          <p className="text-sm text-muted-foreground">Manage XP distribution across all games</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{topics.length} topics</Badge>
          <Button
            onClick={handleAutoDistribute}
            disabled={distributing || topics.length === 0}
            variant="default"
            size="sm"
          >
            {distributing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Auto-Distribute XP
              </>
            )}
          </Button>
        </div>
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm XP Distribution</AlertDialogTitle>
            <AlertDialogDescription>
              Review the proposed XP distribution changes below. This will update all games based on their topic's XP budget.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            {distributionPreview?.map((result: any, idx: number) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {result.topic_name}
                  </CardTitle>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Budget: {result.xp_budget} XP</span>
                    <span>Games: {result.total_games}</span>
                    <span>Per Game: {result.xp_per_game} XP</span>
                  </div>
                </CardHeader>
                {result.changes && result.changes.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="text-xs space-y-1">
                      <p className="font-medium">Sample changes (first 3):</p>
                      {result.changes.slice(0, 3).map((change: any, i: number) => (
                        <p key={i} className="text-muted-foreground">
                          Game {i + 1}: {change.old_xp} XP → {change.new_xp} XP
                        </p>
                      ))}
                      {result.changes.length > 3 && (
                        <p className="text-muted-foreground italic">
                          ...and {result.changes.length - 3} more games
                        </p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={distributing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applyDistribution} disabled={distributing}>
              {distributing ? 'Applying...' : 'Apply Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
