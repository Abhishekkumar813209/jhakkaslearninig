import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, BookOpen, Users, Clock, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GuidedPath {
  id: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  duration_weeks: number;
  target_students: string;
  objectives: string[];
  chapters: Chapter[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Chapter {
  id: string;
  title: string;
  description: string;
  order_num: number;
  estimated_hours: number;
  topics: string[];
  resources: Resource[];
}

interface Resource {
  type: 'video' | 'reading' | 'practice' | 'assessment';
  title: string;
  url?: string;
  description?: string;
}

const GuidedPathsManagement = () => {
  const [guidedPaths, setGuidedPaths] = useState<GuidedPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<GuidedPath | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    level: '',
    duration_weeks: 0,
    target_students: '',
    objectives: [''],
    chapters: []
  });

  useEffect(() => {
    fetchGuidedPaths();
  }, []);

  const fetchGuidedPaths = async () => {
    try {
      setLoading(true);
      // For now, using mock data since we need to create the guided_paths table
      const mockPaths: GuidedPath[] = [
        {
          id: '1',
          title: 'JEE Main Physics Mastery',
          description: 'Complete physics preparation for JEE Main with conceptual clarity and problem-solving techniques',
          subject: 'Physics',
          level: 'Intermediate',
          duration_weeks: 16,
          target_students: 'JEE Main aspirants',
          objectives: ['Master core physics concepts', 'Solve complex numerical problems', 'Build exam strategy'],
          chapters: [
            {
              id: '1',
              title: 'Mechanics',
              description: 'Newton\'s laws, motion, forces',
              order_num: 1,
              estimated_hours: 24,
              topics: ['Kinematics', 'Dynamics', 'Work Energy Power'],
              resources: []
            }
          ],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'NEET Biology Foundation',
          description: 'Comprehensive biology preparation for NEET with focus on NCERT and beyond',
          subject: 'Biology',
          level: 'Foundation',
          duration_weeks: 20,
          target_students: 'NEET aspirants',
          objectives: ['Complete NCERT coverage', 'Diagram mastery', 'Fact retention techniques'],
          chapters: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setGuidedPaths(mockPaths);
    } catch (error) {
      console.error('Error fetching guided paths:', error);
      toast({
        title: "Error",
        description: "Failed to fetch guided paths",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePath = async () => {
    try {
      // TODO: Implement actual database creation
      const newPath: GuidedPath = {
        id: Date.now().toString(),
        ...formData,
        chapters: [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setGuidedPaths([...guidedPaths, newPath]);
      setIsCreateDialogOpen(false);
      resetForm();
      
      toast({
        title: "Success",
        description: "Guided path created successfully",
      });
    } catch (error) {
      console.error('Error creating guided path:', error);
      toast({
        title: "Error",
        description: "Failed to create guided path",
        variant: "destructive",
      });
    }
  };

  const handleDeletePath = async (pathId: string) => {
    try {
      setGuidedPaths(guidedPaths.filter(path => path.id !== pathId));
      toast({
        title: "Success",
        description: "Guided path deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting guided path:', error);
      toast({
        title: "Error",
        description: "Failed to delete guided path",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      subject: '',
      level: '',
      duration_weeks: 0,
      target_students: '',
      objectives: [''],
      chapters: []
    });
    setEditingPath(null);
  };

  const addObjective = () => {
    setFormData({
      ...formData,
      objectives: [...formData.objectives, '']
    });
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...formData.objectives];
    newObjectives[index] = value;
    setFormData({
      ...formData,
      objectives: newObjectives
    });
  };

  const removeObjective = (index: number) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Guided Learning Paths</h2>
          <p className="text-muted-foreground">Create and manage structured learning paths for students</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Path
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Guided Learning Path</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g., JEE Main Physics Mastery"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Select value={formData.subject} onValueChange={(value) => setFormData({...formData, subject: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the learning path and its goals"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Level</label>
                  <Select value={formData.level} onValueChange={(value) => setFormData({...formData, level: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Foundation">Foundation</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (Weeks)</label>
                  <Input
                    type="number"
                    value={formData.duration_weeks}
                    onChange={(e) => setFormData({...formData, duration_weeks: parseInt(e.target.value) || 0})}
                    placeholder="16"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Target Students</label>
                  <Input
                    value={formData.target_students}
                    onChange={(e) => setFormData({...formData, target_students: e.target.value})}
                    placeholder="e.g., JEE aspirants"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Learning Objectives</label>
                {formData.objectives.map((objective, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={objective}
                      onChange={(e) => updateObjective(index, e.target.value)}
                      placeholder="Enter learning objective"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeObjective(index)}
                      disabled={formData.objectives.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addObjective}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Objective
                </Button>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreatePath}>
                  Create Path
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Guided Paths Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guidedPaths.map((path) => (
          <Card key={path.id} className="card-gradient shadow-soft hover:shadow-medium transition-smooth">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-foreground mb-2">
                    {path.title}
                  </CardTitle>
                  <div className="flex gap-2 mb-2">
                    <Badge variant="secondary">{path.subject}</Badge>
                    <Badge variant="outline">{path.level}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPath(path)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePath(path.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {path.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{path.duration_weeks} weeks</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{path.target_students}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{path.chapters.length} chapters</span>
                </div>
              </div>

              {path.objectives.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Objectives:</h4>
                  <ul className="space-y-1">
                    {path.objectives.slice(0, 2).map((objective, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                        <Target className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{objective}</span>
                      </li>
                    ))}
                    {path.objectives.length > 2 && (
                      <li className="text-xs text-muted-foreground">
                        +{path.objectives.length - 2} more objectives
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <Badge variant={path.is_active ? "default" : "secondary"}>
                  {path.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button variant="outline" size="sm">
                  Manage Chapters
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {guidedPaths.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Guided Paths Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first guided learning path to help students follow structured learning journeys.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Path
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GuidedPathsManagement;