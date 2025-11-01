import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import CourseCard from "@/components/CourseCard";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Users, 
  Award, 
  Target, 
  PlayCircle, 
  Clock,
  Star,
  TrendingUp,
  CheckCircle,
  Zap.
} from "lucide-react";

const Index = () => {
  const featuredCourses = [
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
    }
  ];

  const features = [
    {
      icon: <PlayCircle className="h-8 w-8" />,
      title: "Live Interactive Classes",
      description: "Attend live sessions with expert teachers and get your doubts cleared instantly"
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Personalized Learning",
      description: "AI-powered recommendations based on your performance and learning goals"
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "Practice & Assessment",
      description: "Comprehensive quizzes and mock tests to track your progress"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Expert Teachers",
      description: "Learn from India's top educators with proven track records"
    }
  ];

  const stats = [
    { icon: <Users className="h-6 w-6" />, value: "50,000+", label: "Active Students" },
    { icon: <BookOpen className="h-6 w-6" />, value: "500+", label: "Expert Teachers" },
    { icon: <PlayCircle className="h-6 w-6" />, value: "10,000+", label: "Video Lectures" },
    { icon: <Award className="h-6 w-6" />, value: "95%", label: "Success Rate" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      
      
      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose Jhakkas?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience the future of learning with our cutting-edge platform designed for student success
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center card-hover-blue shadow-soft">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">Featured Courses</h2>
              <p className="text-muted-foreground">
                Hand-picked courses from our best instructors
              </p>
            </div>
            <Button variant="outline">View All Courses</Button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCourses.map((course) => (
              <CourseCard key={course.id} {...course} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 hero-gradient text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Trusted by Thousands</h2>
            <p className="text-white/80 max-w-2xl mx-auto">
              Join the growing community of successful learners
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-12 text-center shadow-large card-hover-blue">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                  <Zap className="h-8 w-8 text-success" />
                </div>
              </div>
              <h2 className="text-3xl font-bold">Ready to Start Learning?</h2>
              <p className="text-muted-foreground text-lg">
                Join thousands of students who have transformed their careers with our expert-led courses
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg">
                  Start Free Trial
                </Button>
                <Button variant="outline" size="lg">
                  Talk to Counselor
                </Button>
              </div>
              <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>7-day free trial</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Jhakkas</span>
              </div>
              <p className="text-muted-foreground">
                Empowering students with quality education and expert guidance.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Courses</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="hover:text-primary transition-colors cursor-pointer">JEE Preparation</div>
                <div className="hover:text-primary transition-colors cursor-pointer">NEET Preparation</div>
                <div className="hover:text-primary transition-colors cursor-pointer">Class 10 & 12</div>
                <div className="hover:text-primary transition-colors cursor-pointer">Competitive Exams</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="hover:text-primary transition-colors cursor-pointer">About Us</div>
                <div className="hover:text-primary transition-colors cursor-pointer">Careers</div>
                <div className="hover:text-primary transition-colors cursor-pointer">Contact</div>
                <div className="hover:text-primary transition-colors cursor-pointer">Support</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</div>
                <div className="hover:text-primary transition-colors cursor-pointer">Terms of Service</div>
                <div className="hover:text-primary transition-colors cursor-pointer">Refund Policy</div>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2025 Jhakkas. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
