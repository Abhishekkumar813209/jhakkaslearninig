import { useState } from "react";
import Navbar from "@/components/Navbar";
import CourseCard from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCourses } from "@/hooks/useCourses";
import { 
  Search, 
  Filter, 
  BookOpen,
  Clock,
  Star,
  Users
} from "lucide-react";

const Courses = () => {
  const { courses, loading, error } = useCourses();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");

  const categories = ["All", "Physics", "Mathematics", "Chemistry", "Biology", "Computer Science"];
  const levels = ["All", "Beginner", "Intermediate", "Advanced"];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || course.subject === selectedCategory;
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
          
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse">
                    <div className="bg-muted h-40 rounded mb-4"></div>
                    <div className="bg-muted h-4 rounded mb-2"></div>
                    <div className="bg-muted h-4 rounded w-3/4"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">Error loading courses</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
            </Card>
          ) : filteredCourses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  id={course.id}
                  title={course.title}
                  instructor={course.instructor_id}
                  thumbnail={course.thumbnail || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop'}
                  price={course.price}
                  rating={course.rating || 4.5}
                  studentsEnrolled={course.enrollment_count || 0}
                  duration={`${course.duration_hours || 0} hours`}
                  level={course.level as "Beginner" | "Intermediate" | "Advanced"}
                  category={course.subject}
                />
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