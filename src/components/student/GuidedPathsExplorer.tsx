import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Clock, Users, Target, BookOpen, Play, Star, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  rating: number;
  enrolled_count: number;
}

interface Chapter {
  id: string;
  title: string;
  description: string;
  order_num: number;
  estimated_hours: number;
  topics: string[];
}

interface StudentProgress {
  path_id: string;
  progress_percentage: number;
  current_chapter: number;
  is_enrolled: boolean;
}

const GuidedPathsExplorer = () => {
  const [guidedPaths, setGuidedPaths] = useState<GuidedPath[]>([]);
  const [userProgress, setUserProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [selectedPath, setSelectedPath] = useState<GuidedPath | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchGuidedPaths();
    if (user) {
      fetchUserProgress();
    }
  }, [user]);

  const fetchGuidedPaths = async () => {
    try {
      setLoading(true);
      // Mock data for now - will be replaced with actual Supabase query
      const mockPaths: GuidedPath[] = [
        {
          id: '1',
          title: 'JEE Main Physics Mastery',
          description: 'Complete physics preparation for JEE Main with conceptual clarity and problem-solving techniques. Master all important topics from mechanics to modern physics.',
          subject: 'Physics',
          level: 'Intermediate',
          duration_weeks: 16,
          target_students: 'JEE Main aspirants',
          objectives: [
            'Master core physics concepts',
            'Solve complex numerical problems',
            'Build exam strategy',
            'Practice with previous year questions'
          ],
          chapters: [
            {
              id: '1',
              title: 'Mechanics',
              description: 'Newton\'s laws, motion, forces',
              order_num: 1,
              estimated_hours: 24,
              topics: ['Kinematics', 'Dynamics', 'Work Energy Power', 'Rotational Motion']
            },
            {
              id: '2',
              title: 'Thermodynamics',
              description: 'Heat, temperature, laws of thermodynamics',
              order_num: 2,
              estimated_hours: 18,
              topics: ['Heat Transfer', 'Gas Laws', 'Entropy', 'Engines']
            },
            {
              id: '3',
              title: 'Waves & Optics',
              description: 'Wave motion, sound, light',
              order_num: 3,
              estimated_hours: 20,
              topics: ['Wave Motion', 'Sound Waves', 'Optics', 'Interference']
            }
          ],
          is_active: true,
          rating: 4.8,
          enrolled_count: 1247
        },
        {
          id: '2',
          title: 'NEET Biology Foundation',
          description: 'Comprehensive biology preparation for NEET with focus on NCERT and beyond. Complete coverage of botany and zoology.',
          subject: 'Biology',
          level: 'Foundation',
          duration_weeks: 20,
          target_students: 'NEET aspirants',
          objectives: [
            'Complete NCERT coverage',
            'Diagram mastery',
            'Fact retention techniques',
            'Previous year question practice'
          ],
          chapters: [
            {
              id: '1',
              title: 'Cell Biology',
              description: 'Cell structure and functions',
              order_num: 1,
              estimated_hours: 16,
              topics: ['Cell Structure', 'Cell Division', 'Biomolecules']
            },
            {
              id: '2',
              title: 'Plant Biology',
              description: 'Plant anatomy and physiology',
              order_num: 2,
              estimated_hours: 22,
              topics: ['Plant Anatomy', 'Photosynthesis', 'Plant Hormones']
            }
          ],
          is_active: true,
          rating: 4.6,
          enrolled_count: 892
        },
        {
          id: '3',
          title: 'JEE Advanced Mathematics',
          description: 'Advanced mathematical concepts for JEE Advanced. Covers calculus, algebra, coordinate geometry, and more.',
          subject: 'Mathematics',
          level: 'Advanced',
          duration_weeks: 18,
          target_students: 'JEE Advanced aspirants',
          objectives: [
            'Master advanced calculus',
            'Solve complex algebraic problems',
            'Coordinate geometry mastery',
            'Trigonometry and complex numbers'
          ],
          chapters: [
            {
              id: '1',
              title: 'Calculus',
              description: 'Differential and integral calculus',
              order_num: 1,
              estimated_hours: 28,
              topics: ['Limits', 'Derivatives', 'Integration', 'Applications']
            }
          ],
          is_active: true,
          rating: 4.9,
          enrolled_count: 654
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

  const fetchUserProgress = async () => {
    try {
      // Mock progress data
      const mockProgress: StudentProgress[] = [
        {
          path_id: '1',
          progress_percentage: 35,
          current_chapter: 2,
          is_enrolled: true
        }
      ];
      setUserProgress(mockProgress);
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  const enrollInPath = async (pathId: string) => {
    try {
      // TODO: Implement actual enrollment
      const newProgress: StudentProgress = {
        path_id: pathId,
        progress_percentage: 0,
        current_chapter: 1,
        is_enrolled: true
      };
      
      setUserProgress([...userProgress, newProgress]);
      
      toast({
        title: "Success",
        description: "Successfully enrolled in the guided path!",
      });
    } catch (error) {
      console.error('Error enrolling in path:', error);
      toast({
        title: "Error",
        description: "Failed to enroll in the guided path",
        variant: "destructive",
      });
    }
  };

  const getProgressForPath = (pathId: string) => {
    return userProgress.find(p => p.path_id === pathId);
  };

  const filteredPaths = guidedPaths.filter(path => {
    const matchesSearch = path.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         path.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === 'all' || path.subject === subjectFilter;
    const matchesLevel = levelFilter === 'all' || path.level === levelFilter;
    
    return matchesSearch && matchesSubject && matchesLevel && path.is_active;
  });

  const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
  const levels = ['Foundation', 'Intermediate', 'Advanced'];

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
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Guided Learning Paths</h2>
          <p className="text-muted-foreground">Follow structured learning journeys designed by experts</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search learning paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {levels.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Guided Paths Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPaths.map((path) => {
          const progress = getProgressForPath(path.id);
          const isEnrolled = progress?.is_enrolled || false;
          
          return (
            <Card key={path.id} className="card-gradient shadow-soft hover:shadow-medium transition-smooth">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2">
                    <Badge variant="secondary">{path.subject}</Badge>
                    <Badge variant="outline">{path.level}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{path.rating}</span>
                  </div>
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  {path.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {path.description}
                </p>
                
                {isEnrolled && progress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress.progress_percentage}%</span>
                    </div>
                    <Progress value={progress.progress_percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Chapter {progress.current_chapter} of {path.chapters.length}
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{path.duration_weeks} weeks</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{path.chapters.length} chapters</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{path.enrolled_count} students enrolled</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setSelectedPath(path)}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{selectedPath?.title}</DialogTitle>
                      </DialogHeader>
                      {selectedPath && (
                        <div className="space-y-4">
                          <p className="text-muted-foreground">{selectedPath.description}</p>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">{selectedPath.duration_weeks}</div>
                              <div className="text-sm text-muted-foreground">Weeks</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">{selectedPath.chapters.length}</div>
                              <div className="text-sm text-muted-foreground">Chapters</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">{selectedPath.rating}</div>
                              <div className="text-sm text-muted-foreground">Rating</div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Learning Objectives:</h4>
                            <ul className="space-y-1">
                              {selectedPath.objectives.map((objective, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                  <Target className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                                  <span>{objective}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Chapters:</h4>
                            <div className="space-y-2">
                              {selectedPath.chapters.map((chapter, index) => (
                                <div key={chapter.id} className="p-3 border rounded-lg">
                                  <div className="flex justify-between items-start mb-1">
                                    <h5 className="font-medium">{chapter.title}</h5>
                                    <span className="text-xs text-muted-foreground">{chapter.estimated_hours}h</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{chapter.description}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {chapter.topics.map((topic, topicIndex) => (
                                      <Badge key={topicIndex} variant="outline" className="text-xs">
                                        {topic}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  {isEnrolled ? (
                    <Button size="sm" className="flex-1">
                      <Play className="h-4 w-4 mr-2" />
                      Continue
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => enrollInPath(path.id)}
                    >
                      Enroll Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPaths.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Guided Paths Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || subjectFilter !== 'all' || levelFilter !== 'all'
                ? 'Try adjusting your search filters to find more paths.'
                : 'No guided learning paths are available at the moment.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GuidedPathsExplorer;