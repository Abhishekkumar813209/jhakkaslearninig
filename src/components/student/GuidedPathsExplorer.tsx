import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Target, Users, Play, CheckCircle } from 'lucide-react';
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
  objectives: string[] | null;
  guided_path_chapters: Chapter[] | null;
  is_active: boolean;
  progress?: number;
  enrolled_at?: string;
}

interface Chapter {
  id: string;
  title: string;
  description: string;
  order_num: number;
  estimated_hours: number;
  topics: string[];
  playlist_id?: string;
}

const GuidedPathsExplorer = () => {
  const [enrolledPaths, setEnrolledPaths] = useState<GuidedPath[]>([]);
  const [availablePaths, setAvailablePaths] = useState<GuidedPath[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchGuidedPaths();
  }, []);

  const fetchGuidedPaths = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('guided-paths-api', {
        body: { action: 'get_student_guided_paths' }
      });

      if (error) throw error;
      
      setEnrolledPaths(data.enrolled_paths || []);
      setAvailablePaths(data.available_paths || []);
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

  const handleEnroll = async (pathId: string) => {
    try {
      const { error } = await supabase.functions.invoke('guided-paths-api', {
        body: { 
          action: 'enroll_in_guided_path',
          guided_path_id: pathId
        }
      });

      if (error) throw error;
      
      // Refresh the paths
      fetchGuidedPaths();
      
      toast({
        title: "Success",
        description: "Successfully enrolled in the guided path!",
      });
    } catch (error) {
      console.error('Error enrolling in path:', error);
      toast({
        title: "Error",
        description: "Failed to enroll in guided path",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* My Learning Paths */}
      {enrolledPaths.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">My Learning Paths</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledPaths.map((path) => (
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
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {path.description}
                  </p>

                  {path.progress !== undefined && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{path.progress}%</span>
                      </div>
                      <Progress value={path.progress} className="h-2" />
                    </div>
                  )}
                  
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
                      <span>{path.guided_path_chapters?.length || 0} chapters</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Badge variant="default">Enrolled</Badge>
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      Continue Learning
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Learning Paths */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          {enrolledPaths.length > 0 ? 'More Learning Paths' : 'Available Learning Paths'}
        </h2>
        
        {availablePaths.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Guided Paths Available</h3>
              <p className="text-muted-foreground">
                Check back later for new guided learning paths from your instructors.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availablePaths.map((path) => (
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
                      <span>{path.guided_path_chapters?.length || 0} chapters</span>
                    </div>
                  </div>

                  {path.objectives && path.objectives.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">What you'll learn:</h4>
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
                    <Badge variant="outline">Available</Badge>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleEnroll(path.id)}
                    >
                      Enroll Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuidedPathsExplorer;