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
import { Map, Plus, Calendar, Users, BookOpen, Sparkles, Edit, Trash2, Play, X } from "lucide-react";
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
          <Card key={roadmap.id} className="card-gradient shadow-soft">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{roadmap.title}</CardTitle>
                  <Badge variant={roadmap.status === 'active' ? 'default' : 'secondary'}>
                    {roadmap.status}
                  </Badge>
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

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Play className="h-3 w-3 mr-1" />
                  Activate
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RoadmapManagement;
