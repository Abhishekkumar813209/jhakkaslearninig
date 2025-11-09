import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronDown, ChevronRight, Sparkles, RefreshCw, Zap, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GameXPTable } from './GameXPTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Topic {
  id: string;
  topic_name: string;
  day_number: number;
  published_count: number; // Live games in gamified_exercises
  ready_to_publish_count?: number; // Approved games in topic_learning_content
  missing_data_count?: number;
  sync_status?: 'synced' | 'pending' | 'incomplete';
}

export const GamesXPManager = ({ chapterId }: { chapterId: string }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());
  const [distributing, setDistributing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [distributionPreview, setDistributionPreview] = useState<any>(null);
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);

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
          // Step 1: Get mapping IDs for this topic
          const { data: mappings } = await supabase
            .from('topic_content_mapping')
            .select('id')
            .eq('topic_id', topic.id);

          const mappingIds = (mappings || []).map(m => m.id);
          console.debug(`[GamesXPManager] Topic ${topic.topic_name}: mappingIds.length=${mappingIds.length}`);

          // Step 2: Count PUBLISHED games (live games students can play)
          const { count: publishedCount, error: publishedError } = await supabase
            .from('gamified_exercises')
            .select('*', { count: 'exact', head: true })
            .in('topic_content_id', mappingIds);

          if (publishedError) {
            console.error('Error counting published games for topic', topic.id, ':', publishedError);
          }
          console.debug(`[GamesXPManager] Topic ${topic.topic_name}: PUBLISHED=${publishedCount}`);

          // Step 3: Count READY-TO-PUBLISH games (approved in lesson library with data)
          const { count: readyToPublishCount } = await supabase
            .from('topic_learning_content')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id)
            .eq('lesson_type', 'game')
            .eq('human_reviewed', true)
            .not('game_data', 'is', null);
          console.debug(`[GamesXPManager] Topic ${topic.topic_name}: READY=${readyToPublishCount}`);

          // Step 4: Count INCOMPLETE games (approved but missing game_data)
          const { count: missingDataCount } = await supabase
            .from('topic_learning_content')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id)
            .eq('lesson_type', 'game')
            .eq('human_reviewed', true)
            .is('game_data', null);
          console.debug(`[GamesXPManager] Topic ${topic.topic_name}: INCOMPLETE=${missingDataCount}`);

          // Determine sync status
          let syncStatus: 'synced' | 'pending' | 'incomplete' = 'synced';
          if ((readyToPublishCount || 0) > (publishedCount || 0)) {
            syncStatus = 'pending'; // Has approved games ready to publish
          } else if ((missingDataCount || 0) > 0) {
            syncStatus = 'incomplete'; // Has approved games missing data
          }

          return {
            ...topic,
            published_count: publishedCount || 0,
            ready_to_publish_count: readyToPublishCount || 0,
            missing_data_count: missingDataCount || 0,
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

  const handleSyncTopic = async (topicId: string) => {
    try {
      setSyncing(topicId);
      const { data, error } = await supabase.functions.invoke('resync-topic-games', {
        body: { topic_id: topicId }
      });

      if (error) {
        console.error('Sync error:', error);
        // Check if error message indicates duplicate
        if (error.message?.includes('Duplicate question detected')) {
          toast.info('Games already synced (duplicates detected)');
        } else {
          toast.error(`Sync failed: ${error.message}`);
        }
        setSyncing(null);
        return;
      }

      toast.success(data?.message || 'Games resynced successfully');
      
      // Wait a moment for DB trigger to complete, then refresh
      setTimeout(() => {
        fetchTopics();
        setSyncing(null);
      }, 1000);
    } catch (error: any) {
      console.error('Error syncing topic games:', error);
      toast.error('Failed to sync games');
      setSyncing(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTopics();
    setRefreshing(false);
    toast.success('Topics refreshed');
  };

  const handlePublishGames = async (topicId: string) => {
    try {
      setPublishing(topicId);
      const { data, error } = await supabase.functions.invoke('publish-approved-games', {
        body: { topic_id: topicId }
      });

      if (error) {
        console.error('Publish error:', error);
        toast.error(`Failed to publish: ${error.message}`);
        setPublishing(null);
        return;
      }

      // Handle response based on counts
      if (data?.inserted > 0) {
        toast.success(data.message);
      } else if (data?.skipped > 0 && (!data.errors || data.errors.length === 0)) {
        toast.info(data.message);
      } else if (data?.errors && data.errors.length > 0) {
        console.error('Publish errors:', data.errors);
        toast.error(`${data.message}\nFirst error: ${data.errors[0].error}`);
      } else {
        toast.info(data?.message || 'Nothing to publish');
      }
      
      // Refresh to show updated counts
      setTimeout(() => {
        fetchTopics();
        setPublishing(null);
      }, 800);
    } catch (error: any) {
      console.error('Error publishing games:', error);
      toast.error('Failed to publish games');
      setPublishing(null);
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
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="secondary">{topics.length} topics</Badge>
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
                    <div className="flex items-center gap-2">
                      <span>Day {topic.day_number}: {topic.topic_name}</span>
                      {topic.sync_status === 'pending' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                          ⚠️ {topic.ready_to_publish_count! - topic.published_count} pending
                        </Badge>
                      )}
                      {topic.sync_status === 'incomplete' && topic.missing_data_count && topic.missing_data_count > 0 && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {topic.missing_data_count} missing data
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={topic.published_count > 0 ? "default" : "secondary"}>
                      🎮 {topic.published_count} live
                    </Badge>
                    {topic.ready_to_publish_count !== undefined && topic.ready_to_publish_count > 0 && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                        📦 {topic.ready_to_publish_count} ready
                      </Badge>
                    )}
                    {topic.missing_data_count !== undefined && topic.missing_data_count > 0 && (
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                        ⚠️ {topic.missing_data_count} incomplete
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {/* Status Overview */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-primary/5 border border-primary/20 rounded p-2">
                    <p className="text-muted-foreground">Live Games</p>
                    <p className="text-lg font-semibold text-primary">🎮 {topic.published_count}</p>
                    <p className="text-[10px] text-muted-foreground">In gamified_exercises</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <p className="text-muted-foreground">Ready to Publish</p>
                    <p className="text-lg font-semibold text-green-700">📦 {topic.ready_to_publish_count || 0}</p>
                    <p className="text-[10px] text-muted-foreground">In lesson library (approved)</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded p-2">
                    <p className="text-muted-foreground">Incomplete</p>
                    <p className="text-lg font-semibold text-orange-700">⚠️ {topic.missing_data_count || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Missing game_data</p>
                  </div>
                </div>

                {topic.sync_status === 'pending' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-yellow-800 font-medium">⚠️ Ready to Publish</p>
                        <p className="text-yellow-700 text-xs mt-1">
                          {topic.ready_to_publish_count! - topic.published_count} approved game(s) ready in lesson library. Publish them to make them live for students.
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            disabled={syncing === topic.id || publishing === topic.id}
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                          >
                            {syncing === topic.id || publishing === topic.id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Package className="h-3 w-3 mr-1.5" />
                                Publish ▾
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleSyncTopic(topic.id)}>
                            <Zap className="h-3 w-3 mr-2" />
                            Sync (trigger)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePublishGames(topic.id)}>
                            <Package className="h-3 w-3 mr-2" />
                            Publish now (backfill)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}

                {topic.sync_status === 'incomplete' && topic.missing_data_count && topic.missing_data_count > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-orange-800 font-medium">Incomplete Games</p>
                        <p className="text-orange-700 text-xs mt-1">
                          {topic.missing_data_count} approved game(s) are missing game_data. Generate data in Lesson Builder before publishing.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {topic.published_count > 0 ? (
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
                    {topic.ready_to_publish_count && topic.ready_to_publish_count > 0 
                      ? `${topic.ready_to_publish_count} game(s) ready to publish (in lesson library)`
                      : topic.missing_data_count && topic.missing_data_count > 0
                      ? `${topic.missing_data_count} game(s) approved but missing data`
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
