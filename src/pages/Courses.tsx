import { useState } from "react";
import Navbar from "@/components/Navbar";
import CourseCard from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  BookOpen,
  Clock,
  Star,
  Users
} from "lucide-react";

const Courses = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");

  const categories = ["All", "Physics", "Mathematics", "Chemistry", "Biology", "Computer Science"];
  const levels = ["All", "Beginner", "Intermediate", "Advanced"];

  const courses = [
    {
      id: "1",
      title: "Complete Physics for JEE Main & Advanced",
      instructor: "Dr. Rajesh Kumar",
      thumbnail: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&h=300&fit=crop",
      price: 4999,
      originalPrice: 9999,
      rating: 4.9,
      studentsEnrolled: 15420,
      duration: "120 hours",
      level: "Advanced" as const,
      category: "Physics"
    },
    {
      id: "2",
      title: "Mathematics Foundation for Class 10th",
      instructor: "Prof. Priya Sharma", 
      thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop",
      price: 2999,
      originalPrice: 5999,
      rating: 4.8,
      studentsEnrolled: 23150,
      duration: "80 hours",
      level: "Intermediate" as const,
      category: "Mathematics"
    },
    {
      id: "3",
      title: "Chemistry Organic Reactions Masterclass",
      instructor: "Dr. Amit Verma",
      thumbnail: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=300&fit=crop",
      price: 3999,
      originalPrice: 7999,
      rating: 4.7,
      studentsEnrolled: 8760,
      duration: "95 hours",
      level: "Advanced" as const,
      category: "Chemistry"
    },
    {
      id: "4",
      title: "Biology NEET Complete Course",
      instructor: "Dr. Sunita Rani",
      thumbnail: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop",
      price: 5999,
      originalPrice: 11999,
      rating: 4.9,
      studentsEnrolled: 12340,
      duration: "150 hours",
      level: "Advanced" as const,
      category: "Biology"
    },
    {
      id: "5",
      title: "Programming Fundamentals with Python",
      instructor: "Rohit Singh",
      thumbnail: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&h=300&fit=crop",
      price: 3499,
      originalPrice: 6999,
      rating: 4.6,
      studentsEnrolled: 18750,
      duration: "60 hours",
      level: "Beginner" as const,
      category: "Computer Science"
    },
    {
      id: "6",
      title: "Advanced Calculus and Differential Equations",
      instructor: "Prof. Mukesh Gupta",
      thumbnail: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=300&fit=crop",
      price: 4499,
      originalPrice: 8999,
      rating: 4.8,
      studentsEnrolled: 9650,
      duration: "110 hours",
      level: "Advanced" as const,
      category: "Mathematics"
    }
  ];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || course.category === selectedCategory;
    const matchesLevel = selectedLevel === "All" || course.level === selectedLevel;
    
    return matchesSearch && matchesCategory && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="bg-muted/30 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">All Courses</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover our comprehensive collection of courses designed by expert educators
            </p>
          </div>
          
          {/* Search and Filters */}
          <Card className="max-w-4xl mx-auto shadow-soft">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search courses, instructors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(category => (
                        <Badge
                          key={category}
                          variant={selectedCategory === category ? "default" : "secondary"}
                          className="cursor-pointer transition-smooth"
                          onClick={() => setSelectedCategory(category)}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">Level</label>
                    <div className="flex flex-wrap gap-2">
                      {levels.map(level => (
                        <Badge
                          key={level}
                          variant={selectedLevel === level ? "default" : "secondary"}
                          className="cursor-pointer transition-smooth"
                          onClick={() => setSelectedLevel(level)}
                        >
                          {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold">
                {filteredCourses.length} Course{filteredCourses.length !== 1 ? 's' : ''} Found
              </h2>
              <p className="text-muted-foreground">
                {selectedCategory !== "All" && `Filtered by ${selectedCategory}`}
                {selectedLevel !== "All" && ` • ${selectedLevel} level`}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sort by: Popularity</span>
            </div>
          </div>
          
          {filteredCourses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map(course => (
                <CourseCard key={course.id} {...course} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">No courses found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or browse all courses
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setSelectedLevel("All");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Course Stats */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center p-6 shadow-soft">
              <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{courses.length}+</div>
              <div className="text-sm text-muted-foreground">Total Courses</div>
            </Card>
            <Card className="text-center p-6 shadow-soft">
              <Users className="h-8 w-8 text-success mx-auto mb-2" />
              <div className="text-2xl font-bold">50K+</div>
              <div className="text-sm text-muted-foreground">Students Enrolled</div>
            </Card>
            <Card className="text-center p-6 shadow-soft">
              <Star className="h-8 w-8 text-warning mx-auto mb-2" />
              <div className="text-2xl font-bold">4.8</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </Card>
            <Card className="text-center p-6 shadow-soft">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">1000+</div>
              <div className="text-sm text-muted-foreground">Hours of Content</div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Courses;