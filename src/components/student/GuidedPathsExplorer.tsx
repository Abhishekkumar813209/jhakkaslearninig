import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, Clock, Target, Users, Play, CheckCircle, User, Calendar, Star, Video, Eye, ChevronRight } from 'lucide-react';
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
  exam_category?: string;
  created_by?: string;
  total_hours?: number;
  total_videos?: number;
}

interface Chapter {
  id: string;
  title: string;
  description: string;
  order_num: number;
  estimated_hours: number;
  topics: string[];
  playlist_id?: string;
  video_count?: number;
}

const GuidedPathsExplorer = () => {
  const [enrolledPaths, setEnrolledPaths] = useState<GuidedPath[]>([]);
  const [availablePaths, setAvailablePaths] = useState<GuidedPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<GuidedPath | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGuidedPaths();
  }, []);

  const fetchGuidedPaths = async () => {
    try {
      setLoading(true);
      console.log('Fetching guided paths...');
      
      const { data, error } = await supabase.functions.invoke('guided-paths-api', {
        body: { action: 'get_student_guided_paths' }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      console.log('Received guided paths data:', data);
      
      // If we have real data, use it
      if (data?.enrolled_paths || data?.available_paths) {
        setEnrolledPaths(data?.enrolled_paths || []);
        setAvailablePaths(data?.available_paths || []);
        console.log('Using real data from database');
      } else {
        // Only use fallback if no real data exists
        console.log('No real data found, using fallback');
        setAvailablePaths([]);
        setEnrolledPaths([]);
        
        toast({
          title: "No Guided Paths",
          description: "No guided paths are currently available. Ask your admin to create some.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error fetching guided paths:', error);
      
      // Show error and empty state
      setAvailablePaths([]);
      setEnrolledPaths([]);
      
      toast({
        title: "Error Loading Paths",
        description: "Failed to load guided paths. Please try again later.",
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

  const openPathDetails = (path: GuidedPath) => {
    setSelectedPath(path);
    setDetailsOpen(true);
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
                    {path.exam_category && (
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>{path.exam_category}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {path.guided_path_chapters?.reduce((total, chapter) => total + (chapter.estimated_hours || 0), 0) || 0} hours total
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Badge variant="default">Enrolled</Badge>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openPathDetails(path)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4 mr-2" />
                        Continue Learning
                      </Button>
                    </div>
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
                    {path.exam_category && (
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>{path.exam_category}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {path.guided_path_chapters?.reduce((total, chapter) => total + (chapter.estimated_hours || 0), 0) || 0} hours total
                      </span>
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
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openPathDetails(path)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleEnroll(path.id)}
                      >
                        Enroll Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Path Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedPath && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-bold">{selectedPath.title}</DialogTitle>
                    <DialogDescription className="mt-2">
                      {selectedPath.description}
                    </DialogDescription>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="secondary">{selectedPath.subject}</Badge>
                      <Badge variant="outline">{selectedPath.level}</Badge>
                      {selectedPath.exam_category && (
                        <Badge variant="default">{selectedPath.exam_category}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold">{selectedPath.duration_weeks} weeks</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <BookOpen className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p className="text-sm text-muted-foreground">Chapters</p>
                    <p className="font-semibold">{selectedPath.guided_path_chapters?.length || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Video className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="font-semibold">{selectedPath.total_hours || 0}h</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Users className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                    <p className="text-sm text-muted-foreground">Target</p>
                    <p className="font-semibold text-xs">{selectedPath.target_students}</p>
                  </div>
                </div>

                {/* Learning Objectives */}
                {selectedPath.objectives && selectedPath.objectives.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Learning Objectives</h3>
                    <div className="grid gap-2">
                      {selectedPath.objectives.map((objective, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Target className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                          <span className="text-sm">{objective}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chapters */}
                {selectedPath.guided_path_chapters && selectedPath.guided_path_chapters.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Course Chapters</h3>
                    <div className="space-y-3">
                      {selectedPath.guided_path_chapters
                        .sort((a, b) => a.order_num - b.order_num)
                        .map((chapter, index) => (
                        <Card key={chapter.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  Chapter {chapter.order_num}
                                </Badge>
                                <h4 className="font-medium">{chapter.title}</h4>
                              </div>
                              {chapter.description && (
                                <p className="text-sm text-muted-foreground mb-2">{chapter.description}</p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {chapter.estimated_hours || 0}h
                                </div>
                                {chapter.video_count > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Video className="h-3 w-3" />
                                    {chapter.video_count} videos
                                  </div>
                                )}
                                {chapter.playlist_id && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="h-6 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.open(`https://www.youtube.com/playlist?list=${chapter.playlist_id}`, '_blank')
                                    }}
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Watch Playlist
                                  </Button>
                                )}
                              </div>

                              {chapter.topics && chapter.topics.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {chapter.topics.slice(0, 3).map((topic, topicIndex) => (
                                    <Badge key={topicIndex} variant="secondary" className="text-xs">
                                      {topic}
                                    </Badge>
                                  ))}
                                  {chapter.topics.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{chapter.topics.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                    Close
                  </Button>
                  {!enrolledPaths.find(p => p.id === selectedPath.id) ? (
                    <Button 
                      onClick={() => {
                        handleEnroll(selectedPath.id);
                        setDetailsOpen(false);
                      }}
                    >
                      Enroll in This Path
                    </Button>
                  ) : (
                    <Button>
                      <Play className="h-4 w-4 mr-2" />
                      Continue Learning
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuidedPathsExplorer;