import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
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
  PlayCircle,
  Search,
  Youtube,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LecturePlayer from './LecturePlayer';

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
  realLectures?: Lecture[]; // Optional field for storing real YouTube videos
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
  realLectures?: Lecture[]; // Optional field for storing real YouTube videos
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

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoCount: number;
  channelTitle: string;
  channelId: string;
}

interface Lecture {
  id: string;
  title: string;
  youtube_video_id: string;
  duration_seconds: number;
  order_num: number;
  description?: string;
  chapter: string;
}

const StudentRoadmap: React.FC = () => {
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [adminPaths, setAdminPaths] = useState<AdminGuidedPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('custom');
  const [loading, setLoading] = useState(true);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showSearchPlaylists, setShowSearchPlaylists] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubePlaylist[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [playlistLectures, setPlaylistLectures] = useState<Lecture[]>([]);
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

  const searchYouTubePlaylists = async () => {
    if (!teacherName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a teacher name",
        variant: "destructive"
      });
      return;
    }

    setSearchLoading(true);
    try {
      const query = chapterName.trim() 
        ? `${teacherName.trim()} ${chapterName.trim()}`
        : teacherName.trim();

      const { data, error } = await supabase.functions.invoke('youtube-search-playlists', {
        body: { query }
      });

      if (error) throw error;

      setSearchResults(data.playlists || []);
      toast({
        title: "Search Complete",
        description: `Found ${data.playlists?.length || 0} playlists`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search playlists. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const addPlaylistToRoadmap = async (playlist: YouTubePlaylist) => {
    try {
      // Create a new playlist object for the roadmap
      const newPlaylist: Playlist = {
        id: playlist.id,
        title: playlist.title,
        teacher_id: '1', // Use existing teacher ID for now (Alakh Pandey)
        youtube_playlist_id: playlist.id,
        chapter: chapterName.trim() || playlist.title,
        subject: 'Physics', // Default to Physics for now
        video_count: playlist.videoCount,
        total_duration_minutes: playlist.videoCount * 30, // Estimate 30 mins per video
        order_num: 1
      };

      // Find existing Physics learning path
      const existingPathIndex = learningPaths.findIndex(path => 
        path.subject === 'Physics'
      );

      if (existingPathIndex >= 0) {
        // Add to existing Physics path
        const updatedPaths = [...learningPaths];
        const newOrderNum = updatedPaths[existingPathIndex].playlists.length + 1;
        newPlaylist.order_num = newOrderNum;
        updatedPaths[existingPathIndex].playlists.push(newPlaylist);
        setLearningPaths(updatedPaths);
      } else {
        // Create new learning path
        const newLearningPath: LearningPath = {
          id: 'custom-' + Date.now(),
          student_id: 'current-user',
          subject: 'Physics',
          teacher_id: '1',
          playlists: [newPlaylist],
          progress: 0,
          estimated_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_custom: true
        };
        setLearningPaths([...learningPaths, newLearningPath]);
      }

      toast({
        title: "✅ Added to Roadmap",
        description: `"${playlist.title}" added to Physics learning path`,
      });

      // Clear search and close modal
      setSearchResults([]);
      setShowSearchPlaylists(false);
      setTeacherName('');
      setChapterName('');
      
    } catch (error) {
      console.error('Error adding playlist:', error);
      toast({
        title: "Error",
        description: "Failed to add playlist to roadmap",
        variant: "destructive"
      });
    }
  };

  // Fetch real videos from YouTube playlist
  const fetchPlaylistVideos = async (playlistId: string): Promise<Lecture[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('youtube-playlist-videos', {
        body: { playlistId }
      });

      if (error) {
        console.error('Error fetching playlist videos:', error);
        toast({
          title: "Error",
          description: "Failed to load playlist videos",
          variant: "destructive"
        });
        return getSampleLectures(playlistId); // Fallback to sample data
      }

      return data.videos || getSampleLectures(playlistId);
    } catch (error) {
      console.error('Error fetching playlist videos:', error);
      return getSampleLectures(playlistId); // Fallback to sample data
    }
  };

  // Sample lectures data for demonstration (fallback)
  const getSampleLectures = (playlistId: string): Lecture[] => {
    return [
      {
        id: `${playlistId}-1`,
        title: 'Introduction to Motion',
        youtube_video_id: 'dQw4w9WgXcQ',
        duration_seconds: 1800, // 30 minutes
        order_num: 1,
        description: 'Basic concepts of motion and displacement',
        chapter: 'Chapter 1'
      },
      {
        id: `${playlistId}-2`, 
        title: 'Velocity and Acceleration',
        youtube_video_id: 'dQw4w9WgXcQ',
        duration_seconds: 2100, // 35 minutes
        order_num: 2,
        description: 'Understanding velocity and acceleration concepts',
        chapter: 'Chapter 1'
      },
      {
        id: `${playlistId}-3`,
        title: 'Equations of Motion',
        youtube_video_id: 'dQw4w9WgXcQ', 
        duration_seconds: 2400, // 40 minutes
        order_num: 3,
        description: 'Kinematic equations and their applications',
        chapter: 'Chapter 1'
      }
    ];
  };

  const handleWatchLecture = async (playlist: Playlist, lectureId?: string) => {
    // Fetch real videos from YouTube playlist
    const lectures = await fetchPlaylistVideos(playlist.youtube_playlist_id);
    setPlaylistLectures(lectures);
    
    const lecture = lectureId 
      ? lectures.find(l => l.id === lectureId) 
      : lectures[0];
    
    if (lecture) {
      setSelectedLecture(lecture);
      setCurrentPlaylist(playlist);
    }
  };

  const handleLectureChange = async (lectureId: string) => {
    if (currentPlaylist) {
      // Use existing lectures or fetch them
      let lectures = playlistLectures;
      if (lectures.length === 0) {
        lectures = await fetchPlaylistVideos(currentPlaylist.youtube_playlist_id);
        setPlaylistLectures(lectures);
      }
      const lecture = lectures.find((l: Lecture) => l.id === lectureId);
      if (lecture) {
        setSelectedLecture(lecture);
      }
    }
  };

  const closeLecturePlayer = () => {
    setSelectedLecture(null);
    setCurrentPlaylist(null);
    setPlaylistLectures([]);
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
    <div className="space-y-6 px-6">
      {/* Lecture Player Modal */}
      {selectedLecture && currentPlaylist && (
        <LecturePlayer
          lecture={selectedLecture}
          playlistId={currentPlaylist.id}
          playlistTitle={currentPlaylist.title}
          lectures={playlistLectures}
          onClose={closeLecturePlayer}
          onLectureChange={handleLectureChange}
        />
      )}

      {/* Header with enhanced styling */}
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Map className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Roadmap Section
            </span>
          </h2>
          <p className="text-muted-foreground text-lg">Track your progress and discover new content</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showSearchPlaylists} onOpenChange={setShowSearchPlaylists}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg">
                <Search className="h-4 w-4 mr-2" />
                Search Teacher
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Search YouTube Teacher Playlists</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Teacher Name *</label>
                    <Input
                      placeholder="e.g., Alakh Pandey, Physics Wallah"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Chapter/Topic (Optional)</label>
                    <Input
                      placeholder="e.g., Mechanics, Organic Chemistry"
                      value={chapterName}
                      onChange={(e) => setChapterName(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={searchYouTubePlaylists} 
                  disabled={searchLoading}
                  className="w-full"
                >
                  {searchLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Youtube className="h-4 w-4 mr-2" />
                      Search Playlists
                    </>
                  )}
                </Button>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Search Results ({searchResults.length} playlists found)</h3>
                    <div className="grid gap-4 max-h-96 overflow-y-auto">
                      {searchResults.map((playlist) => (
                        <Card key={playlist.id} className="flex">
                          <div className="flex-shrink-0 w-32 h-24">
                            <img 
                              src={playlist.thumbnailUrl} 
                              alt={playlist.title}
                              className="w-full h-full object-cover rounded-l-lg"
                            />
                          </div>
                          <div className="flex-1 p-4 flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1 line-clamp-2">{playlist.title}</h4>
                              <p className="text-xs text-muted-foreground mb-2">{playlist.channelTitle}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{playlist.videoCount} videos</span>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => addPlaylistToRoadmap(playlist)}
                              className="ml-2"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddTeacher} onOpenChange={setShowAddTeacher}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50">
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
      </div>

      {/* Enhanced Progress Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="flex items-center p-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-4">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Videos</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalVideos}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="flex items-center p-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mr-4">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Study Hours</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{Math.round(totalDuration / 60)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="flex items-center p-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mr-4">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Progress</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{Math.round(averageProgress)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardContent className="flex items-center p-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mr-4">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Paths</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{learningPaths.length}</p>
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

        <TabsContent value="custom" className="space-y-4 px-4">
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
            <div className="grid gap-6">
              {learningPaths.map((path) => (
                <Card key={path.id} className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
                  <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              {path.subject} Learning Path
                            </span>
                            <p className="text-sm text-muted-foreground font-normal">
                              with {teachers.find(t => t.id === path.teacher_id)?.name}
                            </p>
                          </div>
                        </CardTitle>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant="secondary" className="bg-gradient-to-r from-green-100 to-blue-100 text-green-700 font-semibold">
                          {path.progress}% Complete
                        </Badge>
                        <p className="text-xs text-muted-foreground">{path.playlists.length} chapters</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Progress Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Overall Progress</span>
                        <span className="text-muted-foreground">{path.progress}%</span>
                      </div>
                      <Progress value={path.progress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Expected completion: {new Date(path.estimated_completion_date).toLocaleDateString('en-IN')}</span>
                        <span>{path.playlists.reduce((sum, p) => sum + p.video_count, 0)} total videos</span>
                      </div>
                    </div>

                    {/* Chapter/Playlist List */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <PlayCircle className="h-4 w-4" />
                        Chapters & Playlists
                      </h4>
                      <div className="space-y-2">
                        {path.playlists.map((playlist, index) => (
                          <div key={playlist.id} className="group hover:bg-muted/50 rounded-lg p-3 transition-all duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{playlist.chapter}</p>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Play className="h-3 w-3" />
                                      {playlist.video_count} videos
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {Math.round(playlist.total_duration_minutes / 60)}h
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                onClick={() => handleWatchLecture(playlist)}
                              >
                                <PlayCircle className="h-3 w-3 mr-1" />
                                Watch
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="guided" className="space-y-4 px-4">
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
            <div className="grid gap-4 px-4">
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
      <Card className="mx-4">
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