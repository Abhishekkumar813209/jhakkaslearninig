import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Map, Plus, Calendar, Users, BookOpen, Sparkles, Edit, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBatches } from "@/hooks/useBatches";

const RoadmapManagement = () => {
  const { batches } = useBatches();
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [roadmapData, setRoadmapData] = useState({
    title: "",
    description: "",
    total_days: 15,
    start_date: "",
    end_date: ""
  });

  const handleAIGenerate = async () => {
    if (!selectedBatch) {
      toast.error("Please select a batch first");
      return;
    }

    try {
      toast.loading("AI is generating your roadmap...");
      
      const { data, error } = await supabase.functions.invoke('ai-roadmap-generator', {
        body: {
          batch_id: selectedBatch,
          duration_days: roadmapData.total_days,
          subjects: ["Physics", "Chemistry", "Mathematics"] // Can be dynamic
        }
      });

      if (error) throw error;
      
      toast.dismiss();
      toast.success("AI Roadmap generated successfully!");
      
      // Refresh roadmaps list
      fetchRoadmaps();
    } catch (error: any) {
      toast.dismiss();
      console.error('Error generating roadmap:', error);
      toast.error('Failed to generate roadmap');
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

  useState(() => {
    fetchRoadmaps();
  });

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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Roadmap</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Batch</Label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger>
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

              <div>
                <Label>Roadmap Title</Label>
                <Input
                  placeholder="e.g., JEE Advanced Physics Mastery"
                  value={roadmapData.title}
                  onChange={(e) => setRoadmapData({...roadmapData, title: e.target.value})}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the roadmap goals and objectives"
                  value={roadmapData.description}
                  onChange={(e) => setRoadmapData({...roadmapData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Duration (Days)</Label>
                  <Input
                    type="number"
                    value={roadmapData.total_days}
                    onChange={(e) => setRoadmapData({...roadmapData, total_days: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={roadmapData.start_date}
                    onChange={(e) => setRoadmapData({...roadmapData, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={roadmapData.end_date}
                    onChange={(e) => setRoadmapData({...roadmapData, end_date: e.target.value})}
                  />
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
