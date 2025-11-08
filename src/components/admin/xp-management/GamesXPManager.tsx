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
  approved_games_count?: number;
  sync_status?: 'synced' | 'pending' | 'issue';
}

export const GamesXPManager = ({ chapterId }: { chapterId: string }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());
  const [distributing, setDistributing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [distributionPreview, setDistributionPreview] = useState<any>(null);
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);

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

      // Get game counts and sync status for each topic
      const topicsWithCounts = await Promise.all(
        (topicsData || []).map(async (topic) => {
          // Count published games
          const { count: publishedCount } = await supabase
            .from('gamified_exercises')
            .select('*, topic_content_mapping!inner(topic_id)', { count: 'exact', head: true })
            .eq('topic_content_mapping.topic_id', topic.id);

          // Count approved games in topic_learning_content
          const { count: approvedCount } = await supabase
            .from('topic_learning_content')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id)
            .eq('lesson_type', 'game')
            .eq('human_reviewed', true);

          // Determine sync status
          let syncStatus: 'synced' | 'pending' | 'issue' = 'synced';
          if ((approvedCount || 0) > (publishedCount || 0)) {
            syncStatus = 'pending'; // Approved but not yet synced
          } else if ((approvedCount || 0) < (publishedCount || 0)) {
            syncStatus = 'issue'; // More published than approved (shouldn't happen)
          }

          return {
            ...topic,
            game_count: publishedCount || 0,
            approved_games_count: approvedCount || 0,
            sync_status: syncStatus
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

  const handleAutoDistribute = async (topicId: string) => {
    try {
      setDistributing(true);
      setCurrentTopicId(topicId);
      
      // First, do a dry run to preview changes
    const { data, error } = await supabase.functions.invoke('auto-distribute-xp', {
      body: { topic_id: topicId, dry_run: true }
    });

    if (error) {
      console.error('Edge function error:', error);
      toast.error(`Failed to preview XP distribution: ${error.message}`);
      throw error;
    }

      if (data?.results && data.results.length > 0) {
        setDistributionPreview(data.results[0]); // Only one topic now
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
    if (!currentTopicId) return;

    try {
      setDistributing(true);
      setShowConfirmDialog(false);

      const { data, error } = await supabase.functions.invoke('auto-distribute-xp', {
        body: { topic_id: currentTopicId, dry_run: false }
      });

      if (error) throw error;

      if (data?.results?.[0] && !data.results[0].error) {
        toast.success(`Successfully redistributed XP for this topic`);
        await fetchTopics(); // Refresh the data
      } else {
        toast.error('Failed to redistribute XP');
      }
    } catch (error: any) {
      console.error('Error applying XP distribution:', error);
      toast.error('Failed to apply XP distribution');
    } finally {
      setDistributing(false);
      setDistributionPreview(null);
      setCurrentTopicId(null);
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
          <p className="text-sm text-muted-foreground">Manage XP distribution for each topic</p>
        </div>
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
                    <div className="flex items-center gap-2">
                      <span>Day {topic.day_number}: {topic.topic_name}</span>
                      {topic.sync_status === 'pending' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                          ⚠️ {topic.approved_games_count! - topic.game_count} pending
                        </Badge>
                      )}
                      {topic.sync_status === 'issue' && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs">
                          ⚠️ Sync issue
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={topic.game_count > 0 ? "default" : "secondary"}>
                      {topic.game_count} published
                    </Badge>
                    {topic.approved_games_count !== undefined && topic.approved_games_count !== topic.game_count && (
                      <Badge variant="outline" className="text-xs">
                        {topic.approved_games_count} approved
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {topic.sync_status === 'pending' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                    <p className="text-yellow-800 font-medium">⚠️ Sync Pending</p>
                    <p className="text-yellow-700 text-xs mt-1">
                      {topic.approved_games_count! - topic.game_count} approved game(s) are waiting to be published. 
                      The database trigger should sync them automatically. If this persists, check the logs.
                    </p>
                  </div>
                )}
                {topic.game_count > 0 ? (
                  <>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleAutoDistribute(topic.id)}
                        disabled={distributing}
                        variant="secondary"
                        size="sm"
                      >
                        {distributing && currentTopicId === topic.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-1.5" />
                            Distribute XP
                          </>
                        )}
                      </Button>
                    </div>
                    <GameXPTable topicId={topic.id} />
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm py-4">
                    {topic.approved_games_count && topic.approved_games_count > 0 
                      ? `${topic.approved_games_count} game(s) approved but not yet published to gamified_exercises table`
                      : 'No games in this topic'}
                  </p>
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
              Review the proposed XP distribution changes below. This will update all games in this topic based on its XP budget.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {distributionPreview && (
            <div className="py-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {distributionPreview.topic_name}
                  </CardTitle>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Budget: {distributionPreview.xp_budget} XP</span>
                    <span>Games: {distributionPreview.total_games}</span>
                    <span>Per Game: {distributionPreview.xp_per_game || Math.floor(distributionPreview.xp_budget / distributionPreview.total_games)} XP</span>
                  </div>
                </CardHeader>
                {distributionPreview.distribution && distributionPreview.distribution.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="text-xs space-y-1">
                      <p className="font-medium">Sample changes (first 5):</p>
                      {distributionPreview.distribution.slice(0, 5).map((change: any, i: number) => (
                        <p key={i} className="text-muted-foreground">
                          Game {change.game_order}: {change.old_xp} XP → {change.new_xp} XP
                        </p>
                      ))}
                      {distributionPreview.distribution.length > 5 && (
                        <p className="text-muted-foreground italic">
                          ...and {distributionPreview.distribution.length - 5} more games
                        </p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          )}

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
