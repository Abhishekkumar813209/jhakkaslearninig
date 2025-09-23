import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  BookOpen, 
  Clock, 
  Users, 
  Play,
  Edit3,
  Trash2,
  Search
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import GuidedPathsExplorer from './GuidedPathsExplorer';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  subject: string;
  duration: string;
  chapters: number;
  isCreatedByUser: boolean;
  createdAt: string;
}

const StudentLearningPaths: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPath, setNewPath] = useState({
    title: '',
    description: '',
    subject: '',
    estimatedDuration: ''
  });
  const { toast } = useToast();

  // Mock data for user-created paths
  const [userPaths, setUserPaths] = useState<LearningPath[]>([
    {
      id: '1',
      title: 'My Physics Revision',
      description: 'Personal revision plan for JEE Physics topics',
      subject: 'Physics',
      duration: '4 weeks',
      chapters: 8,
      isCreatedByUser: true,
      createdAt: '2024-03-15'
    }
  ]);

  const handleCreatePath = () => {
    if (!newPath.title || !newPath.subject) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const createdPath: LearningPath = {
      id: Date.now().toString(),
      title: newPath.title,
      description: newPath.description,
      subject: newPath.subject,
      duration: newPath.estimatedDuration || 'Not specified',
      chapters: 0,
      isCreatedByUser: true,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setUserPaths(prev => [createdPath, ...prev]);
    setNewPath({ title: '', description: '', subject: '', estimatedDuration: '' });
    setIsCreateDialogOpen(false);

    toast({
      title: "Learning Path Created",
      description: "Your learning path has been created successfully!",
    });
  };

  const handleDeletePath = (pathId: string) => {
    setUserPaths(prev => prev.filter(path => path.id !== pathId));
    toast({
      title: "Path Deleted",
      description: "Learning path has been removed.",
    });
  };

  const filteredUserPaths = userPaths.filter(path =>
    path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    path.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Learning Paths</h2>
          <p className="text-muted-foreground">Create your own study plans or explore guided paths</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Create Path
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Learning Path</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    placeholder="Enter path title"
                    value={newPath.title}
                    onChange={(e) => setNewPath(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Subject *</label>
                  <Input
                    placeholder="e.g., Physics, Chemistry, Mathematics"
                    value={newPath.subject}
                    onChange={(e) => setNewPath(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Describe your learning goals"
                    value={newPath.description}
                    onChange={(e) => setNewPath(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Estimated Duration</label>
                  <Input
                    placeholder="e.g., 2 weeks, 1 month"
                    value={newPath.estimatedDuration}
                    onChange={(e) => setNewPath(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
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
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your paths..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* My Learning Paths */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">My Learning Paths</h3>
        
        {filteredUserPaths.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent>
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">No Paths Created Yet</h4>
              <p className="text-muted-foreground mb-4">
                Create your first learning path to organize your study plan
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Path
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUserPaths.map((path) => (
              <Card key={path.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{path.title}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeletePath(path.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {path.subject}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{path.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{path.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                      <span>{path.chapters} chapters</span>
                    </div>
                  </div>

                  <Button className="w-full" variant="outline">
                    <Play className="h-4 w-4 mr-2" />
                    Continue Learning
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Guided Paths Section */}
      <div className="space-y-4">
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Guided Learning Paths</h3>
          <GuidedPathsExplorer />
        </div>
      </div>
    </div>
  );
};

export default StudentLearningPaths;