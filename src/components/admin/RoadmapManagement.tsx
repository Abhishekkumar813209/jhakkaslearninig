import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Map, Plus, Edit, Trash2, Play, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreateRoadmapWizard } from "./CreateRoadmapWizard";
import { EditRoadmapDialog } from "./EditRoadmapDialog";
import { ManualRoadmapBuilder } from "./ManualRoadmapBuilder";
import { useAuth } from "@/hooks/useAuth";

const RoadmapManagement = () => {
  const { loading: authLoading } = useAuth();
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isManualBuilding, setIsManualBuilding] = useState(false);
  const [manualBuilderPrefillData, setManualBuilderPrefillData] = useState<any>(null);
  
  // State for details/edit/delete dialogs
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoadmap, setSelectedRoadmap] = useState<any>(null);
  const [roadmapDetails, setRoadmapDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRoadmaps = async () => {
    try {
      console.log('🔍 RoadmapManagement: Starting fetchRoadmaps...');
      
      // Use RPC to bypass RLS correctly (admins see all, students see their batch)
      const { data, error } = await supabase.rpc('get_accessible_roadmaps');
      
      console.log('🔍 RoadmapManagement: RPC response:', { 
        dataCount: data?.length, 
        error: error?.message,
        rawData: data 
      });
      
      if (error) {
        console.error('❌ RoadmapManagement: RPC error:', error);
        toast.error(`Failed to fetch roadmaps: ${error.message}`);
        throw error;
      }

      const normalized = (data || []).map((r: any) => ({
        ...r,
        batches: { name: r.batch_name, level: r.batch_level },
      }));
      
      console.log('✅ RoadmapManagement: Setting roadmaps:', normalized.length, 'items');
      setRoadmaps(normalized);
    } catch (error: any) {
      console.error('❌ RoadmapManagement: Error fetching roadmaps:', error);
      toast.error('Failed to load roadmaps. Check console for details.');
    }
  };

  const fetchRoadmapDetails = async (roadmapId: string) => {
    setIsLoading(true);
    try {
      const { data: roadmap, error: roadmapError } = await supabase
        .from('batch_roadmaps')
        .select('*, batches(name, level)')
        .eq('id', roadmapId)
        .single();

      if (roadmapError) throw roadmapError;

      const { data: chapters, error: chaptersError } = await supabase
        .from('roadmap_chapters')
        .select('*')
        .eq('roadmap_id', roadmapId)
        .order('order_num', { ascending: true});

      if (chaptersError) throw chaptersError;

      const chapterIds = chapters?.map(c => c.id) || [];
      const { data: topics, error: topicsError } = chapterIds.length > 0 ? await supabase
        .from('roadmap_topics')
        .select('*')
        .in('chapter_id', chapterIds)
        .order('order_num', { ascending: true }) : { data: [], error: null };

      if (topicsError) throw topicsError;

      const chaptersWithTopics = (chapters || []).map(chapter => ({
        ...chapter,
        topics: (topics || []).filter(t => t.chapter_id === chapter.id)
      }));

      setRoadmapDetails({
        ...roadmap,
        chapters: chaptersWithTopics
      });
    } catch (error: any) {
      console.error('Error fetching roadmap details:', error);
      toast.error('Failed to load roadmap details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (roadmap: any) => {
    setSelectedRoadmap(roadmap);
    await fetchRoadmapDetails(roadmap.id);
    setViewDetailsOpen(true);
  };

  const handleActivate = async (roadmap: any) => {
    try {
      setIsLoading(true);
      
      // First, deactivate all other roadmaps for this batch
      const { error: deactivateError } = await supabase
        .from('batch_roadmaps')
        .update({ status: 'draft' })
        .eq('batch_id', roadmap.batch_id)
        .neq('id', roadmap.id);

      if (deactivateError) throw deactivateError;

      // Then activate the selected roadmap
      const { error: activateError } = await supabase
        .from('batch_roadmaps')
        .update({ status: 'active' })
        .eq('id', roadmap.id);

      if (activateError) throw activateError;

      toast.success('Roadmap activated successfully!');
      fetchRoadmaps();
    } catch (error: any) {
      console.error('Error activating roadmap:', error);
      toast.error('Failed to activate roadmap');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRoadmap) return;

    try {
      setIsLoading(true);
      
      // Delete topics first
      const { data: chapters } = await supabase
        .from('roadmap_chapters')
        .select('id')
        .eq('roadmap_id', selectedRoadmap.id);

      if (chapters && chapters.length > 0) {
        const chapterIds = chapters.map(c => c.id);
        await supabase
          .from('roadmap_topics')
          .delete()
          .in('chapter_id', chapterIds);
      }

      // Delete chapters
      await supabase
        .from('roadmap_chapters')
        .delete()
        .eq('roadmap_id', selectedRoadmap.id);

      // Delete roadmap
      const { error } = await supabase
        .from('batch_roadmaps')
        .delete()
        .eq('id', selectedRoadmap.id);

      if (error) throw error;

      toast.success('Roadmap deleted successfully!');
      setDeleteDialogOpen(false);
      setSelectedRoadmap(null);
      fetchRoadmaps();
    } catch (error: any) {
      console.error('Error deleting roadmap:', error);
      toast.error('Failed to delete roadmap');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to load before fetching roadmaps
    if (!authLoading) {
      fetchRoadmaps();
    }
  }, [authLoading]);

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Map className="h-6 w-6" />
            Roadmap Management
          </h2>
          <p className="text-muted-foreground">Create and manage learning roadmaps for batches</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4" />
          Create AI Roadmap
        </Button>
      </div>

      <CreateRoadmapWizard
        open={isCreating}
        onOpenChange={setIsCreating}
        onSuccess={fetchRoadmaps}
        onSwitchToManual={(prefillData) => {
          setManualBuilderPrefillData(prefillData);
          setIsManualBuilding(true);
        }}
      />

      <ManualRoadmapBuilder
        open={isManualBuilding}
        onOpenChange={(open) => {
          setIsManualBuilding(open);
          if (!open) setManualBuilderPrefillData(null);
        }}
        onSuccess={fetchRoadmaps}
        prefillData={manualBuilderPrefillData}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roadmaps.map((roadmap, idx) => (
          <Card 
            key={roadmap.id} 
            className="hover:shadow-lg transition-all hover-scale cursor-pointer animate-fade-in"
            style={{ animationDelay: `${idx * 0.1}s` }}
            onClick={() => handleViewDetails(roadmap)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{roadmap.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {roadmap.batches?.name} - {roadmap.batches?.level}
                  </p>
                </div>
                <Badge variant={roadmap.status === 'active' ? 'default' : 'secondary'}>
                  {roadmap.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{roadmap.total_days} days</span>
                </div>
                {roadmap.exam_type && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exam Type:</span>
                    <span className="font-medium">{roadmap.exam_type}</span>
                  </div>
                )}
                {roadmap.exam_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exam:</span>
                    <span className="font-medium text-xs">{roadmap.exam_name}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(roadmap);
                  }}
                >
                  <Eye className="h-3 w-3" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRoadmap(roadmap);
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
                {roadmap.status !== 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivate(roadmap);
                    }}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRoadmap(roadmap);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roadmaps.length === 0 && (
        <Card className="text-center p-12 animate-scale-in">
          <Map className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No roadmaps created yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first AI-powered learning roadmap to get started
          </p>
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Roadmap
          </Button>
        </Card>
      )}

      {/* Edit Roadmap Dialog */}
      <EditRoadmapDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        roadmapId={selectedRoadmap?.id}
        onSuccess={fetchRoadmaps}
      />

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedRoadmap?.title}</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <div className="text-center py-8 animate-fade-in">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading roadmap details...</p>
            </div>
          ) : roadmapDetails ? (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Batch:</span>
                  <p className="font-medium">{roadmapDetails.batches?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-medium">{roadmapDetails.total_days} days</p>
                </div>
                {roadmapDetails.exam_type && (
                  <div>
                    <span className="text-muted-foreground">Exam Type:</span>
                    <p className="font-medium">{roadmapDetails.exam_type}</p>
                  </div>
                )}
                {roadmapDetails.exam_name && (
                  <div>
                    <span className="text-muted-foreground">Exam:</span>
                    <p className="font-medium">{roadmapDetails.exam_name}</p>
                  </div>
                )}
              </div>

              {roadmapDetails.chapters && roadmapDetails.chapters.length > 0 ? (
                <Accordion type="multiple" className="space-y-2">
                  {roadmapDetails.chapters.map((chapter: any, idx: number) => (
                    <AccordionItem key={chapter.id} value={chapter.id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="font-semibold">
                            {idx + 1}. {chapter.chapter_name} ({chapter.subject})
                          </span>
                          <Badge variant="secondary">
                            Day {chapter.day_start}-{chapter.day_end}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {chapter.topics && chapter.topics.length > 0 ? (
                            chapter.topics.map((topic: any, topicIdx: number) => (
                              <div key={topic.id} className="flex items-center gap-2 text-sm pl-4">
                                <span className="text-muted-foreground">{topicIdx + 1}.</span>
                                <span>{topic.topic_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({topic.estimated_hours}h)
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground pl-4">No topics</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-muted-foreground text-center py-8">No chapters in this roadmap</p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Roadmap?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRoadmap?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RoadmapManagement;
