import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Map, 
  BookOpen, 
  Clock, 
  Play,
  CheckCircle,
  Users,
  Plus,
  Calendar,
  Target,
  TrendingUp,
  Settings,
  BarChart3,
  PlayCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Teacher {
  id: string;
  name: string;
  subject: string;
  youtube_channel: string;
  avatar?: string;
}

interface Playlist {
  id: string;
  title: string;
  teacher_id: string;
  youtube_playlist_id: string;
  chapter: string;
  subject: string;
  video_count: number;
  total_duration_minutes: number;
  order_num: number;
}

interface LearningPath {
  id: string;
  student_id: string;
  subject: string;
  teacher_id: string;
  playlists: Playlist[];
  progress: number;
  estimated_completion_date: string;
  is_custom: boolean;
}

interface AdminGuidedPath {
  id: string;
  name: string;
  description: string;
  subjects: {
    subject: string;
    teacher_id: string;
    playlists: string[];
  }[];
  estimated_duration_weeks: number;
}

const StudentRoadmap: React.FC = () => {
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [adminPaths, setAdminPaths] = useState<AdminGuidedPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('custom');
  const [loading, setLoading] = useState(true);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const { toast } = useToast();

  // Sample data for demonstration
  const sampleTeachers: Teacher[] = [
    {
      id: '1',
      name: 'Alakh Pandey',
      subject: 'Physics',
      youtube_channel: 'Physics Wallah',
      avatar: 'https://example.com/alakh.jpg'
    },
    {
      id: '2', 
      name: 'Paaras Thakur',
      subject: 'Chemistry',
      youtube_channel: 'Unacademy',
      avatar: 'https://example.com/paaras.jpg'
    },
    {
      id: '3',
      name: 'Mohit Tyagi',
      subject: 'Mathematics',
      youtube_channel: 'Mohit Tyagi',
      avatar: 'https://example.com/mohit.jpg'
    }
  ];

  const sampleLearningPaths: LearningPath[] = [
    {
      id: '1',
      student_id: 'user123',
      subject: 'Physics',
      teacher_id: '1',
      playlists: [
        {
          id: '1',
          title: 'Mechanics - Class 11',
          teacher_id: '1',
          youtube_playlist_id: 'PLdH7xdqgrmzwPyg7QVmjQNFqA4MqVo7IH',
          chapter: 'Chapter 1: Motion in a Straight Line',
          subject: 'Physics',
          video_count: 15,
          total_duration_minutes: 450,
          order_num: 1
        },
        {
          id: '2',
          title: 'Laws of Motion',
          teacher_id: '1',
          youtube_playlist_id: 'PLdH7xdqgrmzwPyg7QVmjQNFqA4MqVo7IH',
          chapter: 'Chapter 2: Laws of Motion',
          subject: 'Physics',
          video_count: 12,
          total_duration_minutes: 360,
          order_num: 2
        }
      ],
      progress: 35,
      estimated_completion_date: '2024-06-15',
      is_custom: true
    }
  ];

  const sampleAdminPaths: AdminGuidedPath[] = [
    {
      id: '1',
      name: 'JEE Main 2024 Complete',
      description: 'Complete JEE Main preparation with best teachers',
      subjects: [
        {
          subject: 'Physics',
          teacher_id: '1',
          playlists: ['playlist1', 'playlist2']
        },
        {
          subject: 'Chemistry', 
          teacher_id: '2',
          playlists: ['playlist3', 'playlist4']
        },
        {
          subject: 'Mathematics',
          teacher_id: '3', 
          playlists: ['playlist5', 'playlist6']
        }
      ],
      estimated_duration_weeks: 52
    }
  ];

  useEffect(() => {
    // Initialize with sample data
    setTeachers(sampleTeachers);
    setLearningPaths(sampleLearningPaths);
    setAdminPaths(sampleAdminPaths);
    setLoading(false);
  }, []);

  const handleAddTeacher = async (subject: string, teacherId: string) => {
    try {
      // In real implementation, this would fetch playlists from YouTube API
      toast({
        title: "Teacher Added",
        description: `Added teacher for ${subject}. Fetching playlists...`,
      });
      setShowAddTeacher(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add teacher",
        variant: "destructive"
      });
    }
  };

  const getTimelineData = () => {
    const totalVideos = learningPaths.reduce((sum, path) => 
      sum + path.playlists.reduce((pSum, playlist) => pSum + playlist.video_count, 0), 0
    );
    const totalDuration = learningPaths.reduce((sum, path) =>
      sum + path.playlists.reduce((pSum, playlist) => pSum + playlist.total_duration_minutes, 0), 0
    );
    const averageProgress = learningPaths.length > 0 
      ? learningPaths.reduce((sum, path) => sum + path.progress, 0) / learningPaths.length 
      : 0;

    return { totalVideos, totalDuration, averageProgress };
  };

  const { totalVideos, totalDuration, averageProgress } = getTimelineData();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading roadmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Map className="h-6 w-6" />
            Learning Roadmap
          </h2>
          <p className="text-muted-foreground">Track your progress and plan your studies</p>
        </div>
        <Dialog open={showAddTeacher} onOpenChange={setShowAddTeacher}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Teacher for Subject</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name} - {teacher.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => handleAddTeacher('physics', '1')} className="w-full">
                Add & Fetch Playlists
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <BookOpen className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Videos</p>
              <p className="text-2xl font-bold">{totalVideos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <Clock className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Study Hours</p>
              <p className="text-2xl font-bold">{Math.round(totalDuration / 60)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <TrendingUp className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Progress</p>
              <p className="text-2xl font-bold">{Math.round(averageProgress)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <Target className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Paths</p>
              <p className="text-2xl font-bold">{learningPaths.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Path Selection */}
      <Tabs value={selectedPath} onValueChange={setSelectedPath}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="custom">Custom Learning Path</TabsTrigger>
          <TabsTrigger value="guided">Admin Guided Path</TabsTrigger>
        </TabsList>

        <TabsContent value="custom" className="space-y-4">
          {/* Custom Learning Paths */}
          {learningPaths.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Learning Paths Yet</h3>
                <p className="text-muted-foreground mb-4">Start by adding teachers for your subjects</p>
                <Button onClick={() => setShowAddTeacher(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Path
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {learningPaths.map((path) => (
                <Card key={path.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          {path.subject} Learning Path
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Teacher: {teachers.find(t => t.id === path.teacher_id)?.name}
                        </p>
                      </div>
                      <Badge variant="outline">{path.progress}% Complete</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{path.progress}%</span>
                    </div>
                    <Progress value={path.progress} className="w-full" />
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Expected completion: {new Date(path.estimated_completion_date).toLocaleDateString()}</span>
                      <span>{path.playlists.length} playlists</span>
                    </div>

                    {/* Chapter/Playlist List */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Chapters:</h4>
                      {path.playlists.map((playlist, index) => (
                        <div key={playlist.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{playlist.chapter}</p>
                              <p className="text-xs text-muted-foreground">
                                {playlist.video_count} videos • {Math.round(playlist.total_duration_minutes / 60)}h
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Watch
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="guided" className="space-y-4">
          {/* Admin Guided Paths */}
          {adminPaths.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Guided Paths Available</h3>
                <p className="text-muted-foreground">Check back later for admin-curated learning paths</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {adminPaths.map((path) => (
                <Card key={path.id} className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          {path.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{path.description}</p>
                      </div>
                      <Badge variant="secondary">Guided</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {path.estimated_duration_weeks} weeks
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {path.subjects.length} subjects
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Subjects & Teachers:</h4>
                      {path.subjects.map((subject, index) => {
                        const teacher = teachers.find(t => t.id === subject.teacher_id);
                        return (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{subject.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                {teacher?.name} • {subject.playlists.length} playlists
                              </p>
                            </div>
                            <Badge variant="outline">{subject.subject}</Badge>
                          </div>
                        );
                      })}
                    </div>

                    <Button className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Follow This Path
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Timeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Study Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center text-muted-foreground">
              <p>Timeline visualization will show your study schedule and milestones</p>
              <p className="text-sm mt-2">Coming soon: Gantt chart view and deadline tracking</p>
            </div>
            
            {/* Placeholder for timeline */}
            <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Interactive timeline coming soon</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentRoadmap;