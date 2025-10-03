import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Map, Plus, Calendar, Users, BookOpen, Sparkles, Edit, Trash2, Play, X, Eye, Clock, Award } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBatches } from "@/hooks/useBatches";

const RoadmapManagement = () => {
  const { batches } = useBatches();
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedBoard, setSelectedBoard] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [autoDetect, setAutoDetect] = useState(true);
  const [durationType, setDurationType] = useState<'days' | 'date'>('days');
  const [finishByDate, setFinishByDate] = useState("");
  const [roadmapData, setRoadmapData] = useState({
    title: "",
    description: "",
    total_days: 15,
    start_date: "",
    end_date: ""
  });
  
  // New state for details/edit dialogs
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoadmap, setSelectedRoadmap] = useState<any>(null);
  const [roadmapDetails, setRoadmapDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAIGenerate = async () => {
    // Validation
    const missingFields: string[] = [];
    if (!selectedBatch) missingFields.push("Batch");
    if (!roadmapData.title) missingFields.push("Title");
    if (!selectedClass) missingFields.push("Target Class");
    if (selectedSubjects.length === 0) missingFields.push("Subjects");

    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Calculate total_days based on durationType
    let calculatedDays = roadmapData.total_days;
    if (durationType === 'date' && finishByDate) {
      const start = roadmapData.start_date ? new Date(roadmapData.start_date) : new Date();
      const end = new Date(finishByDate);
      calculatedDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (calculatedDays <= 0) {
        toast.error("Finish date must be after start date");
        return;
      }
    }

    try {
      toast.loading("AI is generating your roadmap...");
      
      const { data, error } = await supabase.functions.invoke('ai-roadmap-generator', {
        body: {
          batch_id: selectedBatch,
          total_days: calculatedDays,
          subjects: selectedSubjects,
          target_class: selectedClass,
          target_board: selectedBoard || undefined,
          existing_syllabus: roadmapData.description || undefined,
          auto_detect: autoDetect
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast.dismiss();
        if (data.error.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (data.error.includes('Payment required')) {
          toast.error('Payment required. Please add credits to your workspace.');
        } else if (data.error.includes('Unauthorized')) {
          toast.error('Unauthorized. Please check your permissions.');
        } else {
          toast.error(data.error);
        }
        return;
      }
      
      toast.dismiss();
      toast.success("AI Roadmap generated successfully!");
      setIsCreating(false);
      
      // Reset form
      setSelectedBatch("");
      setSelectedClass("");
      setSelectedBoard("");
      setSelectedSubjects([]);
      setSubjectInput("");
      setRoadmapData({ title: "", description: "", total_days: 15, start_date: "", end_date: "" });
      setFinishByDate("");
      
      // Refresh roadmaps list
      fetchRoadmaps();
    } catch (error: any) {
      toast.dismiss();
      console.error('Error generating roadmap:', error);
      
      if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to generate roadmap');
      }
    }
  };

  const handleCreateManual = async () => {
    if (!selectedBatch || !roadmapData.title || !roadmapData.start_date || !roadmapData.end_date) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('batch_roadmaps')
        .insert({
          batch_id: selectedBatch,
          title: roadmapData.title,
          description: roadmapData.description,
          total_days: roadmapData.total_days,
          start_date: roadmapData.start_date,
          end_date: roadmapData.end_date,
          created_by: user?.id,
          status: 'draft'
        });

      if (error) throw error;
      
      toast.success("Roadmap created successfully!");
      setIsCreating(false);
      fetchRoadmaps();
    } catch (error: any) {
      console.error('Error creating roadmap:', error);
      toast.error('Failed to create roadmap');
    }
  };

  const fetchRoadmaps = async () => {
    try {
      const { data, error } = await supabase
        .from('batch_roadmaps')
        .select(`
          *,
          batches(name, level)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoadmaps(data || []);
    } catch (error: any) {
      console.error('Error fetching roadmaps:', error);
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
        .order('order_num', { ascending: true });

      if (chaptersError) throw chaptersError;

      const chapterIds = chapters.map(c => c.id);
      const { data: topics, error: topicsError } = await supabase
        .from('roadmap_topics')
        .select('*')
        .in('chapter_id', chapterIds)
        .order('order_num', { ascending: true });

      if (topicsError) throw topicsError;

      const chaptersWithTopics = chapters.map(chapter => ({
        ...chapter,
        topics: topics.filter(t => t.chapter_id === chapter.id)
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

  const handleEdit = async (roadmap: any) => {
    setSelectedRoadmap(roadmap);
    setRoadmapData({
      title: roadmap.title,
      description: roadmap.description || "",
      total_days: roadmap.total_days,
      start_date: roadmap.start_date,
      end_date: roadmap.end_date
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRoadmap) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('batch_roadmaps')
        .update({
          title: roadmapData.title,
          description: roadmapData.description,
          total_days: roadmapData.total_days,
          start_date: roadmapData.start_date,
          end_date: roadmapData.end_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRoadmap.id);

      if (error) throw error;

      toast.success('Roadmap updated successfully!');
      setEditDialogOpen(false);
      fetchRoadmaps();
    } catch (error: any) {
      console.error('Error updating roadmap:', error);
      toast.error('Failed to update roadmap');
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
    fetchRoadmaps();
  }, []);

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
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Roadmap
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Create New Roadmap</DialogTitle>
              <DialogDescription>
                Generate a structured learning roadmap for a batch using AI
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Auto-detect toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="auto-detect" className="cursor-pointer">Auto-detect from description</Label>
                  <span className="text-xs text-muted-foreground">(Recommended)</span>
                </div>
                <Switch
                  id="auto-detect"
                  checked={autoDetect}
                  onCheckedChange={setAutoDetect}
                />
              </div>

              {/* Batch Selection */}
              <div>
                <Label className="text-base">Select Batch *</Label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choose a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name} - {batch.level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title and Description */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-base">Roadmap Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., JEE Advanced Physics Mastery"
                    value={roadmapData.title}
                    onChange={(e) => setRoadmapData({...roadmapData, title: e.target.value})}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-base">
                    Description {autoDetect && <span className="text-xs text-muted-foreground">(AI will extract class & subjects)</span>}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the roadmap goals, syllabus, or specific requirements (e.g., 'Complete CBSE Class 12 Physics and Chemistry for JEE preparation')..."
                    value={roadmapData.description}
                    onChange={(e) => setRoadmapData({...roadmapData, description: e.target.value})}
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Target Class, Board, and Subjects */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-base">Target Class *</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">Class 6</SelectItem>
                      <SelectItem value="7">Class 7</SelectItem>
                      <SelectItem value="8">Class 8</SelectItem>
                      <SelectItem value="9">Class 9</SelectItem>
                      <SelectItem value="10">Class 10</SelectItem>
                      <SelectItem value="11">Class 11</SelectItem>
                      <SelectItem value="12">Class 12</SelectItem>
                    </SelectContent>
                  </Select>
                  {!selectedClass && <p className="text-xs text-destructive mt-1">Required field</p>}
                </div>

                <div>
                  <Label className="text-base">Board (optional)</Label>
                  <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select board" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CBSE">CBSE</SelectItem>
                      <SelectItem value="ICSE">ICSE</SelectItem>
                      <SelectItem value="State Board">State Board</SelectItem>
                      <SelectItem value="IB">IB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base">
                    Subjects * {selectedSubjects.length > 0 && <span className="text-xs text-muted-foreground">({selectedSubjects.length} added)</span>}
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      value={subjectInput}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      placeholder="Add subject"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && subjectInput.trim()) {
                          e.preventDefault();
                          if (!selectedSubjects.includes(subjectInput.trim())) {
                            setSelectedSubjects([...selectedSubjects, subjectInput.trim()]);
                          }
                          setSubjectInput('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (subjectInput.trim() && !selectedSubjects.includes(subjectInput.trim())) {
                          setSelectedSubjects([...selectedSubjects, subjectInput.trim()]);
                          setSubjectInput('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {selectedSubjects.length === 0 && <p className="text-xs text-destructive mt-1">At least one subject required</p>}
                  {selectedSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedSubjects.map((subject, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-1">
                          {subject}
                          <button
                            onClick={() => setSelectedSubjects(selectedSubjects.filter((_, i) => i !== idx))}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Duration Selection */}
              <div>
                <Label className="text-base">Completion Time *</Label>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="duration-days"
                      checked={durationType === 'days'}
                      onChange={() => setDurationType('days')}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="duration-days" className="cursor-pointer">Duration (days)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="duration-date"
                      checked={durationType === 'date'}
                      onChange={() => setDurationType('date')}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="duration-date" className="cursor-pointer">Finish by Date</Label>
                  </div>
                </div>

                {durationType === 'days' ? (
                  <div className="mt-3">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={roadmapData.total_days}
                      onChange={(e) => setRoadmapData({...roadmapData, total_days: parseInt(e.target.value) || 15})}
                      placeholder="Number of days"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label htmlFor="start-date" className="text-sm">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={roadmapData.start_date}
                        onChange={(e) => setRoadmapData({...roadmapData, start_date: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="finish-date" className="text-sm">Finish By *</Label>
                      <Input
                        id="finish-date"
                        type="date"
                        value={finishByDate}
                        onChange={(e) => setFinishByDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAIGenerate} variant="outline" className="gap-2 flex-1">
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </Button>
              <Button onClick={handleCreateManual} className="flex-1">
                Create Manually
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roadmaps.map((roadmap) => (
          <Card 
            key={roadmap.id} 
            className="card-gradient shadow-soft hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleViewDetails(roadmap)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{roadmap.title}</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Badge 
                      variant={roadmap.status === 'active' ? 'default' : 'secondary'}
                      className={roadmap.status === 'active' ? 'bg-green-600' : ''}
                    >
                      {roadmap.status}
                    </Badge>
                    {roadmap.ai_generated_plan?.metadata?.subjects && (
                      roadmap.ai_generated_plan.metadata.subjects.slice(0, 2).map((subject: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {roadmap.description || "No description"}
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{roadmap.batches?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{roadmap.total_days} days</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>{new Date(roadmap.start_date).toLocaleDateString()} - {new Date(roadmap.end_date).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 flex-wrap">
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(roadmap);
                  }}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(roadmap);
                  }}
                  className="flex-1"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivate(roadmap);
                  }}
                  disabled={roadmap.status === 'active'}
                >
                  <Play className="h-3 w-3 mr-1" />
                  {roadmap.status === 'active' ? 'Active' : 'Activate'}
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRoadmap(roadmap);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{roadmapDetails?.title}</DialogTitle>
            <DialogDescription>
              Complete roadmap structure with chapters and topics
            </DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : roadmapDetails && (
            <div className="space-y-6">
              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Batch</p>
                  <p className="font-medium">{roadmapDetails.batches?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{roadmapDetails.total_days} days</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={roadmapDetails.status === 'active' ? 'default' : 'secondary'}>
                    {roadmapDetails.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chapters</p>
                  <p className="font-medium">{roadmapDetails.chapters?.length || 0}</p>
                </div>
              </div>

              {/* Subjects */}
              {roadmapDetails.ai_generated_plan?.metadata?.subjects && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Subjects</h3>
                  <div className="flex flex-wrap gap-2">
                    {roadmapDetails.ai_generated_plan.metadata.subjects.map((subject: string, idx: number) => (
                      <Badge key={idx} variant="secondary">{subject}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapters with Topics */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Chapters & Topics</h3>
                <Accordion type="multiple" className="space-y-2">
                  {roadmapDetails.chapters?.map((chapter: any, idx: number) => (
                    <AccordionItem key={chapter.id} value={chapter.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">
                              {idx + 1}
                            </Badge>
                            <div className="text-left">
                              <p className="font-semibold">{chapter.chapter_name}</p>
                              <p className="text-sm text-muted-foreground">{chapter.subject}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Day {chapter.day_start}-{chapter.day_end}
                            </span>
                            <span className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {chapter.xp_reward} XP
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {chapter.topics?.map((topic: any, topicIdx: number) => (
                            <div key={topic.id} className="p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-start justify-between">
                                <div className="flex gap-3 flex-1">
                                  <Badge variant="secondary" className="font-mono h-6">
                                    {topicIdx + 1}
                                  </Badge>
                                  <div>
                                    <p className="font-medium">{topic.topic_name}</p>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {topic.estimated_hours}h
                                      </span>
                                      <span>Day {topic.day_number}</span>
                                      <span className="flex items-center gap-1">
                                        <Award className="h-3 w-3" />
                                        {topic.xp_reward} XP • {topic.coin_reward} coins
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <div className="flex gap-2 pt-4">
                {roadmapDetails.status !== 'active' && (
                  <Button 
                    onClick={() => {
                      handleActivate(roadmapDetails);
                      setViewDetailsOpen(false);
                    }}
                    className="gap-2"
                    disabled={isLoading}
                  >
                    <Play className="h-4 w-4" />
                    Activate Roadmap
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setViewDetailsOpen(false);
                    handleEdit(roadmapDetails);
                  }}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setViewDetailsOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Roadmap</DialogTitle>
            <DialogDescription>
              Update roadmap details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={roadmapData.title}
                onChange={(e) => setRoadmapData({...roadmapData, title: e.target.value})}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={roadmapData.description}
                onChange={(e) => setRoadmapData({...roadmapData, description: e.target.value})}
                rows={3}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={roadmapData.start_date}
                  onChange={(e) => setRoadmapData({...roadmapData, start_date: e.target.value})}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-end-date">End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={roadmapData.end_date}
                  onChange={(e) => setRoadmapData({...roadmapData, end_date: e.target.value})}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-total-days">Total Days</Label>
              <Input
                id="edit-total-days"
                type="number"
                value={roadmapData.total_days}
                onChange={(e) => setRoadmapData({...roadmapData, total_days: parseInt(e.target.value) || 0})}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveEdit} disabled={isLoading}>
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the roadmap "{selectedRoadmap?.title}" and all its chapters and topics.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RoadmapManagement;
