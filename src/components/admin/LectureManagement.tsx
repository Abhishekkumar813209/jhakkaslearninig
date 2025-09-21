import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, Edit, Trash2, Upload, Youtube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { lecturesAPI, coursesAPI } from "@/services/api";
import YouTubeManagement from "./YouTubeManagement";

interface Lecture {
  id: string;
  title: string;
  description: string;
  video_url: string;
  youtube_video_id?: string;
  duration_seconds: number;
  course_id: string;
  chapter: number;
  order_num: number;
  is_published: boolean;
  processing_status: string;
  thumbnail?: string;
  watch_count: number;
}

interface Course {
  id: string;
  title: string;
  subject: string;
}

const LectureManagement = ({ courseId }: { courseId?: string }) => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(courseId || "");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    course_id: '',
    chapter: 1,
    order_num: 1,
    duration_seconds: 0
  });

  useEffect(() => {
    fetchCourses();
    if (selectedCourse) {
      fetchLectures();
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const params = new URLSearchParams();
      params.set('showAll', 'true');
      const response = await coursesAPI.getCourses(params);
      setCourses(response.courses);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch courses",
        variant: "destructive",
      });
    }
  };

  const fetchLectures = async () => {
    if (!selectedCourse) return;
    
    try {
      setLoading(true);
      const response = await coursesAPI.getCourseLectures(selectedCourse);
      setLectures(response.lectures || []);
    } catch (error) {
      console.error('Failed to fetch lectures:', error);
      toast({
        title: "Error", 
        description: "Failed to fetch lectures",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLecture = async () => {
    try {
      if (!formData.title || !formData.video_url || !selectedCourse) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      await lecturesAPI.createLecture({
        ...formData,
        course_id: selectedCourse,
      });

      toast({
        title: "Success",
        description: "Lecture created successfully",
      });

      setShowAddDialog(false);
      resetForm();
      fetchLectures();
    } catch (error) {
      console.error('Failed to create lecture:', error);
      toast({
        title: "Error",
        description: "Failed to create lecture",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLecture = async (lectureId: string) => {
    if (window.confirm('Are you sure you want to delete this lecture?')) {
      try {
        await lecturesAPI.deleteLecture(lectureId);
        toast({
          title: "Success",
          description: "Lecture deleted successfully",
        });
        fetchLectures();
      } catch (error) {
        console.error('Failed to delete lecture:', error);
        toast({
          title: "Error",
          description: "Failed to delete lecture",
          variant: "destructive",
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      video_url: '',
      course_id: '',
      chapter: 1,
      order_num: 1,
      duration_seconds: 0
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="lectures" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lectures" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Lecture Management
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center gap-2">
            <Youtube className="h-4 w-4" />
            YouTube Integration
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="lectures" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Lecture Management</h2>
              <p className="text-muted-foreground">Manage video lectures and course content</p>
            </div>
            
            <div className="flex gap-2">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2" disabled={!selectedCourse}>
                    <Plus className="h-4 w-4" />
                    Add Lecture
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Lecture</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Lecture Title *</Label>
                      <Input 
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Enter lecture title" 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Enter lecture description" 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="video_url">Video URL *</Label>
                      <Input 
                        id="video_url"
                        value={formData.video_url}
                        onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                        placeholder="https://www.youtube.com/watch?v=..." 
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Supports YouTube URLs, direct video links, and other video platforms
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="chapter">Chapter</Label>
                        <Input 
                          id="chapter"
                          type="number"
                          value={formData.chapter}
                          onChange={(e) => setFormData({...formData, chapter: parseInt(e.target.value) || 1})}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="order_num">Order</Label>
                        <Input 
                          id="order_num"
                          type="number"
                          value={formData.order_num}
                          onChange={(e) => setFormData({...formData, order_num: parseInt(e.target.value) || 1})}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="duration">Duration (seconds)</Label>
                        <Input 
                          id="duration"
                          type="number"
                          value={formData.duration_seconds}
                          onChange={(e) => setFormData({...formData, duration_seconds: parseInt(e.target.value) || 0})}
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={handleCreateLecture}>Create Lecture</Button>
                      <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>Cancel</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Course Selection */}
          <Card className="card-gradient shadow-soft">
            <CardHeader>
              <CardTitle>Select Course</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Select a course to manage lectures" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title} ({course.subject})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Lectures Table */}
          {selectedCourse && (
            <Card className="card-gradient shadow-soft">
              <CardHeader>
                <CardTitle>Course Lectures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lecture</TableHead>
                        <TableHead>Chapter</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading lectures...
                          </TableCell>
                        </TableRow>
                      ) : lectures.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No lectures found. Add your first lecture!
                          </TableCell>
                        </TableRow>
                      ) : (
                        lectures.map((lecture) => (
                          <TableRow key={lecture.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {lecture.thumbnail && (
                                  <img 
                                    src={lecture.thumbnail} 
                                    alt={lecture.title}
                                    className="w-12 h-12 rounded-lg object-cover"
                                  />
                                )}
                                <div>
                                  <div className="font-medium text-foreground">{lecture.title}</div>
                                  <div className="text-sm text-muted-foreground">{lecture.description}</div>
                                  {lecture.youtube_video_id && (
                                    <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                                      <Youtube className="h-3 w-3" />
                                      YouTube
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">Chapter {lecture.chapter}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{lecture.order_num}</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{formatDuration(lecture.duration_seconds)}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Play className="h-4 w-4 text-muted-foreground" />
                                <span>{lecture.watch_count}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={lecture.is_published ? "default" : "secondary"}>
                                {lecture.is_published ? 'Published' : 'Draft'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600"
                                  onClick={() => handleDeleteLecture(lecture.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="youtube">
          <YouTubeManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LectureManagement;