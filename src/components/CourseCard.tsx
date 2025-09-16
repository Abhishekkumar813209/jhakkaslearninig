import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Star, Play } from "lucide-react";

interface CourseCardProps {
  id: string;
  title: string;
  instructor: string;
  thumbnail: string;
  price: number;
  originalPrice?: number;
  rating: number;
  studentsEnrolled: number;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  category: string;
  progress?: number;
}

const CourseCard = ({ 
  title, 
  instructor, 
  thumbnail, 
  price, 
  originalPrice, 
  rating, 
  studentsEnrolled, 
  duration, 
  level, 
  category,
  progress 
}: CourseCardProps) => {
  const isEnrolled = progress !== undefined;
  
  return (
    <Card className="course-card group cursor-pointer">
      <CardHeader className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <img 
            src={thumbnail} 
            alt={title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-smooth"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-smooth"></div>
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-smooth"
          >
            <Play className="h-6 w-6" />
          </Button>
          <Badge className="absolute top-3 left-3 bg-primary text-white">
            {category}
          </Badge>
          {originalPrice && (
            <Badge className="absolute top-3 right-3 bg-success text-white">
              {Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{level}</Badge>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-warning fill-current" />
              <span>{rating}</span>
            </div>
          </div>
          
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-smooth">
            {title}
          </h3>
          
          <p className="text-sm text-muted-foreground">by {instructor}</p>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{studentsEnrolled.toLocaleString()}</span>
            </div>
          </div>
          
          {isEnrolled && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-6 pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="space-x-2">
            <span className="text-2xl font-bold text-primary">₹{price}</span>
            {originalPrice && (
              <span className="text-sm text-muted-foreground line-through">₹{originalPrice}</span>
            )}
          </div>
          <Button variant={isEnrolled ? "success" : "default"} size="sm">
            {isEnrolled ? "Continue" : "Enroll Now"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default CourseCard;