import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronDown, ChevronRight, Sparkles, RefreshCw, Zap, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GameXPTable } from './GameXPTable';
import { BatchQuestionXPTable } from './BatchQuestionXPTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Topic {
  id: string;
  topic_name: string;
  day_number: number;
  difficulty?: 'easy' | 'medium' | 'hard'; // Topic difficulty for XP budget calculation
  published_count: number; // Live games in gamified_exercises (legacy)
  assigned_count?: number; // Assigned questions from batch_question_assignments (new)
  ready_to_publish_count?: number; // Approved games in topic_learning_content
  missing_data_count?: number;
  sync_status?: 'synced' | 'pending' | 'incomplete';
}

// Helper function to calculate total XP from both sources
const calculateTotalXP = (topic: Topic): number => {
  // Topic budget based on difficulty (fixed per topic)
  const topicBudget = topic.difficulty === 'hard' ? 50 
                    : topic.difficulty === 'medium' ? 40 
                    : 30;
  
  // Legacy games still use old calculation (if any)
  const legacyXP = (topic.published_count || 0) * 40;
  
  return topicBudget + legacyXP; // Topic budget + legacy
};

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
      
      // Fetch from both systems (dual-source)
      const { data: statsData, error: statsError } = await supabase.rpc('get_batch_assignment_stats', {
        chapter_uuid: chapterId,
      });

      if (statsError) throw statsError;

      // Fetch topic difficulty for each topic
      const topicIds = statsData?.map((t: any) => t.id) || [];
      const { data: topicDetails } = await supabase
        .from('roadmap_topics')
        .select('id, difficulty')
        .in('id', topicIds);

      const difficultyMap = new Map(
        topicDetails?.map(t => [t.id, t.difficulty]) || []
      );

      const topicsWithCounts = (statsData || []).map((topic: any) => ({
        id: topic.id,
        topic_name: topic.topic_name,
        day_number: topic.day_number,
        difficulty: (difficultyMap.get(topic.id) || 'medium') as 'easy' | 'medium' | 'hard', // Add difficulty from roadmap_topics
        assigned_count: Number(topic.assigned_count) || 0, // New architecture
        published_count: Number(topic.legacy_count) || 0, // Legacy architecture
        ready_to_publish_count: 0, // Not needed for XP manager
        missing_data_count: 0,
        sync_status: 'synced' as const,
      }));

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
                    {topic.assigned_count !== undefined && topic.assigned_count > 0 && (
                      <Badge variant="default">
                        🎯 {topic.assigned_count} assigned
                      </Badge>
                    )}
                    {topic.published_count > 0 && (
                      <Badge variant="secondary">
                        📚 {topic.published_count} legacy
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {/* Status Overview - Dual Source Architecture */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="text-muted-foreground">Assigned Questions</p>
                    <p className="text-lg font-semibold text-blue-700">🎯 {topic.assigned_count || 0}</p>
                    <p className="text-[10px] text-muted-foreground">From centralized bank</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-2">
                    <p className="text-muted-foreground">Legacy Games</p>
                    <p className="text-lg font-semibold text-gray-600">📚 {topic.published_count || 0}</p>
                    <p className="text-[10px] text-muted-foreground">From lesson library</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <p className="text-muted-foreground">Total XP Available</p>
                    <p className="text-lg font-semibold text-green-700">⚡ {calculateTotalXP(topic)}</p>
                    <p className="text-[10px] text-muted-foreground">Combined from both</p>
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
                {(topic.assigned_count && topic.assigned_count > 0) || (topic.published_count > 0) ? (
                  <Tabs defaultValue="assigned" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="assigned" className="flex items-center gap-2">
                        <span>🎯 Assigned Questions</span>
                        <Badge variant="secondary" className="ml-auto">{topic.assigned_count || 0}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="legacy" className="flex items-center gap-2">
                        <span>📚 Legacy Games</span>
                        <Badge variant="secondary" className="ml-auto">{topic.published_count || 0}</Badge>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="assigned" className="mt-4">
                      <BatchQuestionXPTable topicId={topic.id} />
                    </TabsContent>
                    
                    <TabsContent value="legacy" className="mt-4">
                      <GameXPTable topicId={topic.id} mode="legacy-only" />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm font-medium">No games in this topic</p>
                    <p className="text-xs mt-1">
                      Assign questions from the centralized question bank or add from lesson library
                    </p>
                  </div>
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
