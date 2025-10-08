import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Map, Plus, Edit, Trash2, Play, Eye, GraduationCap, BookOpen, Building2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreateRoadmapWizard } from "./CreateRoadmapWizard";
import { EditRoadmapDialog } from "./EditRoadmapDialog";
import { ManualRoadmapBuilder } from "./ManualRoadmapBuilder";
import { RoadmapCalendarView, CalendarChapter } from "./RoadmapCalendarView";
import { BoardClassSelector } from "./BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from 'date-fns';
import { useExamTypes } from "@/hooks/useExamTypes";
import * as LucideIcons from "lucide-react";

const RoadmapManagement = () => {
  const { loading: authLoading } = useAuth();
  const { examTypes, loading: examTypesLoading } = useExamTypes();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isManualBuilding, setIsManualBuilding] = useState(false);
  const [manualBuilderPrefillData, setManualBuilderPrefillData] = useState<any>(null);
  
  const { 
    selectedBoard, 
    selectedClass, 
    setBoard, 
    setClass, 
    resetFromBoard, 
    resetToBoard 
  } = useBoardClassHierarchy();
  
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

      // Fetch chapters for each roadmap
      const roadmapsWithChapters = await Promise.all(
        (data || []).map(async (r: any) => {
          const { data: chapters } = await supabase
            .from('roadmap_chapters')
            .select('id, chapter_name, subject, estimated_days, order_num')
            .eq('roadmap_id', r.id)
            .order('order_num', { ascending: true });

          return {
            ...r,
            batches: { name: r.batch_name, level: r.batch_level },
            chapters: chapters || []
          };
        })
      );
      
      console.log('✅ RoadmapManagement: Setting roadmaps:', roadmapsWithChapters.length, 'items');
      setRoadmaps(roadmapsWithChapters);
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

  const fetchBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, target_board, target_class, exam_type')
        .eq('is_active', true);
      
      if (error) throw error;
      setBatches(data || []);
    } catch (error: any) {
      console.error('Error fetching batches:', error);
    }
  };

  useEffect(() => {
    // Wait for auth to load before fetching roadmaps
    if (!authLoading) {
      fetchRoadmaps();
      fetchBatches();
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

  const iconMap: Record<string, any> = {
    'school': BookOpen,
    'engineering': GraduationCap,
    'medical': Building2,
    'government': Briefcase,
  };

  const getDomainRoadmapCount = (examType: string) => {
    return roadmaps.filter(r => {
      // Get batch for this roadmap
      const roadmapBatch = batches.find(b => b.id === r.batch_id);
      
      // Use roadmap's exam_type, or fallback to batch's exam_type
      const roadmapExamType = (r.exam_type || roadmapBatch?.exam_type || '').toLowerCase();
      
      return roadmapExamType === examType.toLowerCase();
    }).length;
  };

  const filteredRoadmaps = roadmaps.filter(r => {
    // Get batch details for this roadmap
    const roadmapBatch = batches.find(b => b.id === r.batch_id);
    
    // Helper: normalize exam type (use batch if roadmap is null)
    const normalizeExamType = (examType: string | null) => {
      if (!examType && roadmapBatch?.exam_type) return roadmapBatch.exam_type.toLowerCase();
      return examType?.toLowerCase() || '';
    };
    
    // Filter by selected domain (tolerant: case-insensitive, fallback to batch)
    if (selectedDomain) {
      const roadmapExamType = normalizeExamType(r.exam_type);
      if (roadmapExamType !== selectedDomain.toLowerCase()) {
        console.log(`🔍 Filtering out roadmap ${r.title}: exam_type mismatch (${roadmapExamType} !== ${selectedDomain})`);
        return false;
      }
    }
    
    // For school domain, filter by board and class (tolerant)
    if (selectedDomain === 'school') {
      // Show roadmaps even if only board OR class is selected
      if (selectedBoard) {
        const roadmapBoard = (roadmapBatch?.target_board || '').toLowerCase();
        if (roadmapBoard !== selectedBoard.toLowerCase()) {
          console.log(`🔍 Filtering out roadmap ${r.title}: board mismatch (${roadmapBoard} !== ${selectedBoard})`);
          return false;
        }
      }
      
      if (selectedClass) {
        // Normalize class: extract digits from "Class 10", "10", "10th" etc.
        const normalizeClass = (cls: string | undefined) => {
          if (!cls) return '';
          return cls.match(/\d+/)?.[0] || '';
        };
        
        const roadmapClass = normalizeClass(roadmapBatch?.target_class);
        const filterClass = normalizeClass(selectedClass);
        
        if (roadmapClass !== filterClass) {
          console.log(`🔍 Filtering out roadmap ${r.title}: class mismatch (${roadmapClass} !== ${filterClass})`);
          return false;
        }
      }
    }
    
    return true;
  });
  
  // Log filtering results
  console.log('🔍 RoadmapManagement: Filtered roadmaps:', {
    selectedDomain,
    selectedBoard,
    selectedClass,
    totalRoadmaps: roadmaps.length,
    filteredRoadmaps: filteredRoadmaps.length,
  });
  
  const getRoadmapCounts = () => {
    const domainRoadmaps = roadmaps.filter(r => {
      // Get batch for roadmap
      const roadmapBatch = batches.find(b => b.id === r.batch_id);
      
      // Use roadmap's exam_type, or fallback to batch's exam_type
      const roadmapExamType = (r.exam_type || roadmapBatch?.exam_type || '').toLowerCase();
      
      return roadmapExamType === selectedDomain?.toLowerCase();
    });
    
    const byBoard: Record<string, number> = {};
    const byClass: Record<string, Record<string, number>> = {};

    domainRoadmaps.forEach(roadmap => {
      // Find the batch to get board/class info
      const batch = batches.find(b => b.id === roadmap.batch_id);
      if (!batch) return;
      
      const board = batch.target_board || 'CBSE';
      const cls = batch.target_class;
      
      byBoard[board] = (byBoard[board] || 0) + 1;
      
      if (!byClass[board]) byClass[board] = {};
      if (cls) {
        byClass[board][cls] = (byClass[board][cls] || 0) + 1;
      }
    });

    return { byBoard, byClass };
  };

  const activeRoadmaps = filteredRoadmaps.filter(r => r.status === 'active').length;
  const totalChapters = filteredRoadmaps.reduce((sum, r) => sum + (r.chapters?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Map className="h-6 w-6" />
          Roadmap Management
        </h2>
        <p className="text-muted-foreground">Create and manage learning roadmaps for batches</p>
      </div>

      {!selectedDomain ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select Exam Domain</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {examTypes.map((examType, idx) => {
              const Icon = iconMap[examType.category.toLowerCase()] || GraduationCap;
              const count = getDomainRoadmapCount(examType.code);
              
              return (
                <Card
                  key={examType.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover-scale animate-fade-in border-2 hover:border-primary"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                  onClick={() => {
                    setSelectedDomain(examType.code);
                    resetFromBoard();
                  }}
                >
                  <CardContent className="p-6">
                    <div className={`w-full h-24 ${examType.color_class || 'bg-gradient-to-br from-gray-500 to-gray-600'} rounded-lg mb-4 flex items-center justify-center`}>
                      <Icon className="h-12 w-12 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{examType.display_name}</h4>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{count} roadmaps</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Show BoardClassSelector for school if not both selected */}
          {selectedDomain === 'school' && (!selectedBoard || !selectedClass) && (
            <BoardClassSelector
              examType={selectedDomain}
              selectedBoard={selectedBoard}
              selectedClass={selectedClass}
              onBoardSelect={setBoard}
              onClassSelect={setClass}
              onReset={resetFromBoard}
              onResetToBoard={resetToBoard}
              studentCounts={getRoadmapCounts()}
              countLabel="roadmaps"
            />
          )}
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="default" className="text-base px-4 py-2">
                Selected: {examTypes.find(e => e.code === selectedDomain)?.display_name}
                {selectedDomain === 'school' && selectedBoard && (
                  <> • {selectedBoard}</>
                )}
                {selectedDomain === 'school' && selectedClass && (
                  <> • Class {selectedClass}</>
                )}
              </Badge>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSelectedDomain(null);
                  resetFromBoard();
                }}
              >
                Change Domain
              </Button>
              
              {selectedDomain === 'school' && selectedBoard && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetFromBoard}
                >
                  Change Board
                </Button>
              )}
              
              {selectedDomain === 'school' && selectedBoard && selectedClass && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetToBoard}
                >
                  Change Class
                </Button>
              )}
            </div>
            
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create AI Roadmap
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Domain Roadmaps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{filteredRoadmaps.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Roadmaps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{activeRoadmaps}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Chapters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{totalChapters}</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <CreateRoadmapWizard
        open={isCreating}
        onOpenChange={setIsCreating}
        initialDomain={selectedDomain || undefined}
        initialBoard={selectedBoard || undefined}
        initialClass={selectedClass || undefined}
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
        prefillData={{
          ...manualBuilderPrefillData,
          selectedBoard: selectedBoard || undefined,
          selectedClass: selectedClass || undefined,
        }}
      />

      {selectedDomain && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoadmaps.map((roadmap, idx) => (
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

              {roadmap.chapters && roadmap.chapters.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Chapters:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                    {roadmap.chapters.slice(0, 5).map((ch: any) => (
                      <div key={ch.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate flex-1" title={ch.chapter_name}>
                          {ch.chapter_name}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {ch.estimated_days}d
                        </Badge>
                      </div>
                    ))}
                    {roadmap.chapters.length > 5 && (
                      <p className="text-xs text-muted-foreground italic pt-1">
                        +{roadmap.chapters.length - 5} more chapters...
                      </p>
                    )}
                  </div>
                </div>
              )}

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
      )}

      {selectedDomain && filteredRoadmaps.length === 0 && (
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedRoadmap?.title}</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <div className="text-center py-8 animate-fade-in">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading roadmap details...</p>
            </div>
          ) : roadmapDetails && roadmapDetails.chapters && roadmapDetails.chapters.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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

              <RoadmapCalendarView
                mode={(roadmapDetails.mode as 'sequential' | 'parallel') || 'parallel'}
                startDate={parseISO(roadmapDetails.start_date)}
                totalDays={roadmapDetails.total_days}
                subjects={[...new Set(roadmapDetails.chapters.map((c: any) => c.subject))] as string[]}
                chapters={roadmapDetails.chapters.map((ch: any) => ({
                  id: ch.id,
                  date: format(parseISO(roadmapDetails.start_date).getTime() + (ch.day_start - 1) * 24 * 60 * 60 * 1000, 'yyyy-MM-dd'),
                  subject: ch.subject,
                  chapterName: ch.chapter_name,
                  videoLink: (ch as any).video_link,
                  isBufferTime: false,
                  isLive: false
                }))}
                isEditable={false}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No chapters in this roadmap</p>
          )}
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
