import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, BookOpen, Play, Users } from "lucide-react";
import { useCourses, Course } from "@/hooks/useCourses";
import { useToast } from "@/hooks/use-toast";

const CourseManagement = () => {
  const { courses, loading, createCourse, updateCourse, deleteCourse, fetchCourses } = useCourses();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    price: '',
    level: '',
    thumbnail: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      subject: '',
      description: '',
      price: '',
      level: '',
      thumbnail: ''
    });
  };

  const handleCreateCourse = async () => {
    try {
      if (!formData.title || !formData.subject || !formData.description) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      await createCourse({
        ...formData,
        price: parseFloat(formData.price) || 0,
        requirements: [],
        whatYouWillLearn: []
      });
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create course:', error);
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      subject: course.subject,
      description: course.description,
      price: course.price.toString(),
      level: course.level,
      thumbnail: course.thumbnail
    });
    setShowEditDialog(true);
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;

    try {
      await updateCourse(editingCourse.id, {
        ...formData,
        price: parseFloat(formData.price) || 0
      });
      setShowEditDialog(false);
      setEditingCourse(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update course:', error);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteCourse(courseId);
      } catch (error) {
        console.error('Failed to delete course:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      draft: "bg-yellow-100 text-yellow-800",
      inactive: "bg-gray-100 text-gray-800"
    };
    return variants[status as keyof typeof variants] || variants.inactive;
  };

  const getSubjectColor = (subject: string) => {
    const colors = {
      Physics: "bg-blue-100 text-blue-800",
      Chemistry: "bg-green-100 text-green-800", 
      Mathematics: "bg-purple-100 text-purple-800",
      Biology: "bg-orange-100 text-orange-800"
    };
    return colors[subject as keyof typeof colors] || colors.Physics;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Course Management</h2>
          <p className="text-muted-foreground">Manage courses and learning content</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Course</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Course Title *</Label>
                <Input 
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter course title" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Select value={formData.subject} onValueChange={(value) => setFormData({...formData, subject: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input 
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0" 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Course Description *</Label>
                <Textarea 
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter course description" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="level">Level</Label>
                  <Select value={formData.level} onValueChange={(value) => setFormData({...formData, level: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="thumbnail">Thumbnail URL</Label>
                  <Input 
                    id="thumbnail"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
                    placeholder="Enter thumbnail URL" 
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleCreateCourse}>Create Course</Button>
                <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Course Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                 <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                 <p className="text-2xl font-bold text-foreground">{loading ? '...' : courses.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                 <p className="text-sm font-medium text-muted-foreground">Total Videos</p>
                 <p className="text-2xl font-bold text-foreground">{loading ? '...' : courses.reduce((sum, course) => sum + (course.total_videos || course.lessons?.length || 0), 0)}</p>
              </div>
              <Play className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                 <p className="text-sm font-medium text-muted-foreground">Total Enrollments</p>
                 <p className="text-2xl font-bold text-foreground">{loading ? '...' : courses.reduce((sum, course) => sum + (course.enrollment_count || course.enrollmentCount || 0), 0)}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                 <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                 <p className="text-2xl font-bold text-foreground">₹{loading ? '...' : (courses.reduce((sum, course) => sum + (course.price * (course.enrollment_count || course.enrollmentCount || 0)), 0) / 100000).toFixed(1)}L</p>
              </div>
              <div className="h-8 w-8 text-orange-600">₹</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses Table */}
      <Card className="card-gradient shadow-soft">
        <CardHeader>
          <CardTitle>All Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Videos</TableHead>
                  <TableHead>Enrollments</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
               <TableBody>
                 {loading ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center py-8">
                       Loading courses...
                     </TableCell>
                   </TableRow>
                 ) : courses.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center py-8">
                       No courses found. Create your first course!
                     </TableCell>
                   </TableRow>
                 ) : (
                   courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">{course.title}</div>
                            <div className="text-sm text-muted-foreground">{course.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Level: {course.level} | Duration: {course.duration_hours || course.totalDuration || 0} hrs
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getSubjectColor(course.subject)}`}>
                            {course.subject}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Play className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{course.total_videos || course.lessons?.length || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{course.enrollment_count || course.enrollmentCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">₹{course.price.toLocaleString()}</div>
                        </TableCell>
                        <TableCell>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge((course.is_published || course.isPublished) ? 'active' : 'draft')}`}>
                            {(course.is_published || course.isPublished) ? 'Published' : 'Draft'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditCourse(course)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600"
                              onClick={() => handleDeleteCourse(course.id)}
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

         {/* Edit Course Dialog */}
         <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
           <DialogContent className="max-w-2xl">
             <DialogHeader>
               <DialogTitle>Edit Course</DialogTitle>
             </DialogHeader>
             <div className="space-y-4">
               <div>
                 <Label htmlFor="edit-title">Course Title *</Label>
                 <Input 
                   id="edit-title"
                   value={formData.title}
                   onChange={(e) => setFormData({...formData, title: e.target.value})}
                   placeholder="Enter course title" 
                 />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="edit-subject">Subject *</Label>
                   <Select value={formData.subject} onValueChange={(value) => setFormData({...formData, subject: value})}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select subject" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="Physics">Physics</SelectItem>
                       <SelectItem value="Chemistry">Chemistry</SelectItem>
                       <SelectItem value="Mathematics">Mathematics</SelectItem>
                       <SelectItem value="Biology">Biology</SelectItem>
                       <SelectItem value="English">English</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div>
                   <Label htmlFor="edit-price">Price (₹)</Label>
                   <Input 
                     id="edit-price"
                     type="number"
                     value={formData.price}
                     onChange={(e) => setFormData({...formData, price: e.target.value})}
                     placeholder="0" 
                   />
                 </div>
               </div>
               
               <div>
                 <Label htmlFor="edit-description">Course Description *</Label>
                 <Textarea 
                   id="edit-description"
                   value={formData.description}
                   onChange={(e) => setFormData({...formData, description: e.target.value})}
                   placeholder="Enter course description" 
                 />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="edit-level">Level</Label>
                   <Select value={formData.level} onValueChange={(value) => setFormData({...formData, level: value})}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select level" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="Beginner">Beginner</SelectItem>
                       <SelectItem value="Intermediate">Intermediate</SelectItem>
                       <SelectItem value="Advanced">Advanced</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div>
                   <Label htmlFor="edit-thumbnail">Thumbnail URL</Label>
                   <Input 
                     id="edit-thumbnail"
                     value={formData.thumbnail}
                     onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
                     placeholder="Enter thumbnail URL" 
                   />
                 </div>
               </div>
               
               <div className="flex gap-2">
                 <Button className="flex-1" onClick={handleUpdateCourse}>Update Course</Button>
                 <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingCourse(null); resetForm(); }}>Cancel</Button>
               </div>
             </div>
           </DialogContent>
         </Dialog>
       </div>
     );
   };
   
   export default CourseManagement;