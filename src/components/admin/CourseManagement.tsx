import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, BookOpen, Play, Users } from "lucide-react";

// Mock course data
const mockCourses = [
  {
    id: "1",
    title: "Physics Complete Course",
    subject: "Physics",
    description: "Complete physics course for JEE preparation",
    videos: 45,
    enrollments: 320,
    status: "active",
    createdDate: "2024-01-15",
    price: 2999,
    duration: "6 months"
  },
  {
    id: "2",
    title: "Organic Chemistry Mastery", 
    subject: "Chemistry",
    description: "Master organic chemistry concepts",
    videos: 38,
    enrollments: 285,
    status: "active",
    createdDate: "2024-02-01",
    price: 2499,
    duration: "4 months"
  },
  {
    id: "3",
    title: "Mathematics Foundation",
    subject: "Mathematics", 
    description: "Strong foundation in mathematics",
    videos: 52,
    enrollments: 410,
    status: "active",
    createdDate: "2024-01-01",
    price: 3499,
    duration: "8 months"
  }
];

const CourseManagement = () => {
  const [courses, setCourses] = useState(mockCourses);
  const [showAddDialog, setShowAddDialog] = useState(false);

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
              <Input placeholder="Course Title" />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Subject" />
                <Input placeholder="Price (₹)" type="number" />
              </div>
              <Textarea placeholder="Course Description" />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Duration" />
                <Input placeholder="Level" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">Create Course</Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
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
                <p className="text-2xl font-bold text-foreground">{courses.length}</p>
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
                <p className="text-2xl font-bold text-foreground">{courses.reduce((sum, course) => sum + course.videos, 0)}</p>
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
                <p className="text-2xl font-bold text-foreground">{courses.reduce((sum, course) => sum + course.enrollments, 0)}</p>
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
                <p className="text-2xl font-bold text-foreground">₹{(courses.reduce((sum, course) => sum + (course.price * course.enrollments), 0) / 100000).toFixed(1)}L</p>
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
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-foreground">{course.title}</div>
                        <div className="text-sm text-muted-foreground">{course.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">Duration: {course.duration}</div>
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
                        <span className="font-medium">{course.videos}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{course.enrollments}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">₹{course.price.toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(course.status)}`}>
                        {course.status}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseManagement;