import { Button } from "@/components/ui/button";
import { Play, Star, Users, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-education-blue.png";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative bg-background pt-20 pb-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 text-warning fill-current" />
                <span>Trusted by 50,000+ students</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Master New Skills with{" "}
                <span className="text-primary">
                  Expert Teachers
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Join thousands of students learning from India's best educators. 
                Get personalized learning paths, live classes, and comprehensive practice materials.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Expert Teachers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">10,000+</div>
                <div className="text-sm text-muted-foreground">Video Lectures</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">95%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="default" 
                size="lg" 
                className="text-base"
                onClick={() => navigate('/student')}
              >
                <Play className="h-5 w-5 mr-2" />
                Start Learning Free
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-base"
                onClick={() => navigate('/courses')}
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Browse Courses
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>50,000+ active learners</span>
              </div>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 text-warning fill-current" />
                ))}
                <span className="ml-1">4.9/5 rating</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl shadow-large">
              <img
                src={heroImage}
                alt="Students learning with digital education platform"
                className="w-full h-auto object-cover"
              />
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;