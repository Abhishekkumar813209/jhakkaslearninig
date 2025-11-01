import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import {
  Users,
  Target,
  Award,
  BookOpen,
  Globe,
  Heart,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import gamifiedLearning from "@/assets/features/gamified-learning.png";
import aiPowered from "@/assets/features/ai-powered.png";
import interactiveGames from "@/assets/features/interactive-games.png";
import analytics from "@/assets/features/analytics.png";
import roadmap from "@/assets/features/roadmap.png";
import parentPortal from "@/assets/features/parent-portal.png";
import rewards from "@/assets/features/rewards.png";
import multiFormat from "@/assets/features/multi-format.png";

const About = () => {
  const teamMembers = [
    {
      name: "Dr. Rajesh Kumar",
      role: "Founder & CEO",
      expertise: "Physics & Mathematics",
      experience: "15+ years",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"
    },
    {
      name: "Prof. Priya Sharma",
      role: "Head of Academics",
      expertise: "Chemistry & Biology",
      experience: "12+ years",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&crop=face"
    },
    {
      name: "Amit Verma",
      role: "Lead Developer",
      expertise: "Platform Technology",
      experience: "8+ years",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face"
    }
  ];

  const stats = [
    { label: "Students Enrolled", value: "50,000+", icon: <Users className="h-6 w-6" /> },
    { label: "Courses Available", value: "200+", icon: <BookOpen className="h-6 w-6" /> },
    { label: "Success Rate", value: "95%", icon: <Target className="h-6 w-6" /> },
    { label: "Awards Won", value: "25+", icon: <Award className="h-6 w-6" /> }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-success/10 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              About <span className="text-primary">Jhakkas</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Empowering students to achieve their dreams through innovative learning solutions 
              and personalized education experiences.
            </p>
            <Badge variant="secondary" className="text-lg px-6 py-2">
              <Globe className="h-4 w-4 mr-2" />
              Serving students globally since 2020
            </Badge>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Mission & Vision */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Target className="h-6 w-6 mr-3 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                To democratize quality education by making world-class learning accessible to every student, 
                regardless of their geographical location or economic background. We believe education is the 
                key to unlocking human potential and creating a better future for all.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Heart className="h-6 w-6 mr-3 text-success" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                To become the world's most trusted and innovative online learning platform, where every 
                student can discover their passion, develop their skills, and achieve their academic goals 
                through personalized, engaging, and effective learning experiences.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <Card key={index} className="shadow-soft text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Team */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet Our Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our passionate team of educators, technologists, and innovators work tirelessly to 
              create the best learning experience for our students.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index} className="shadow-soft text-center">
                <CardContent className="pt-6">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-bold text-lg mb-1">{member.name}</h3>
                  <p className="text-primary font-medium mb-2">{member.role}</p>
                  <div className="space-y-1">
                    <Badge variant="secondary" className="text-xs">
                      {member.expertise}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{member.experience}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Why Choose Jhakkas */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why <span className="text-primary">Jhakkas</span> is Different
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
              Experience the future of education with our gamified, AI-powered learning platform 
              designed to make studying engaging, effective, and rewarding.
            </p>
          </div>

          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full max-w-6xl mx-auto mb-12"
          >
            <CarouselContent className="-ml-4">
              <CarouselItem className="pl-4 md:basis-1/2 lg:basis-1/3">
                <FeatureShowcase
                  icon={gamifiedLearning}
                  title="Learn Through Gaming"
                  description="Transform studying into an exciting adventure with XP points, hearts, streaks, and leaderboards that keep you motivated every step of the way."
                  highlights={["XP Points", "Hearts System", "Daily Streaks", "Leaderboards"]}
                />
              </CarouselItem>
              
              <CarouselItem className="pl-4 md:basis-1/2 lg:basis-1/3">
                <FeatureShowcase
                  icon={aiPowered}
                  title="Smart AI Assistant"
                  description="Your personal tutor that understands your learning style, generates personalized questions, and provides instant explanations."
                  highlights={["AI Question Gen", "Smart Paths", "Instant Help", "Adaptive Learning"]}
                />
              </CarouselItem>
              
              <CarouselItem className="pl-4 md:basis-1/2 lg:basis-1/3">
                <FeatureShowcase
                  icon={interactiveGames}
                  title="8+ Game Types"
                  description="Practice with engaging game-based questions including MCQ challenges, drag-drop, line matching, and typing races."
                  highlights={["MCQ Games", "Drag & Drop", "Line Match", "Typing Race"]}
                />
              </CarouselItem>
              
              <CarouselItem className="pl-4 md:basis-1/2 lg:basis-1/3">
                <FeatureShowcase
                  icon={analytics}
                  title="Track Every Milestone"
                  description="Know exactly where you stand with zone analysis, chapter-wise breakdowns, and performance trends."
                  highlights={["Zone Analysis", "Chapter Stats", "Performance Trends", "Reports"]}
                />
              </CarouselItem>
              
              <CarouselItem className="pl-4 md:basis-1/2 lg:basis-1/3">
                <FeatureShowcase
                  icon={roadmap}
                  title="Guided Learning Path"
                  description="Never wonder what to study next with our organized roadmaps, daily schedules, and topic progression tracking."
                  highlights={["Daily Schedule", "Batch Roadmaps", "Topic Progress", "Calendar View"]}
                />
              </CarouselItem>
              
              <CarouselItem className="pl-4 md:basis-1/2 lg:basis-1/3">
                <FeatureShowcase
                  icon={parentPortal}
                  title="Parents Stay Connected"
                  description="Keep parents in the loop with detailed insights into student progress, performance analytics, and daily activity tracking."
                  highlights={["Progress Monitor", "Analytics", "Activity Tracking", "Reports"]}
                />
              </CarouselItem>
              
              <CarouselItem className="pl-4 md:basis-1/2 lg:basis-1/3">
                <FeatureShowcase
                  icon={rewards}
                  title="Earn While Learning"
                  description="Get rewarded for bringing your friends to learn. Earn Jhakkas points and withdraw your earnings."
                  highlights={["Referral Rewards", "Jhakkas Points", "Withdrawals", "Bonus XP"]}
                />
              </CarouselItem>
              
              <CarouselItem className="pl-4 md:basis-1/2 lg:basis-1/3">
                <FeatureShowcase
                  icon={multiFormat}
                  title="Learn Your Way"
                  description="Access content in your preferred format - from YouTube videos and PDFs to interactive simulations."
                  highlights={["Video Lessons", "PDF Content", "Simulations", "Math Support"]}
                />
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious className="left-0 -translate-x-12" />
            <CarouselNext className="right-0 translate-x-12" />
          </Carousel>

          {/* Statistics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 rounded-xl bg-gradient-to-br from-primary/10 via-accent/5 to-success/10 border border-primary/20">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">50,000+</div>
              <div className="text-sm text-muted-foreground">Active Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-success mb-2">1M+</div>
              <div className="text-sm text-muted-foreground">Questions Attempted</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">85%</div>
              <div className="text-sm text-muted-foreground">Average Improvement</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-success mb-2">4.8/5</div>
              <div className="text-sm text-muted-foreground">Student Satisfaction</div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Get in Touch</CardTitle>
            <p className="text-center text-muted-foreground">
              Have questions? We'd love to hear from you.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">Email Us</h3>
                <p className="text-sm text-muted-foreground">support@jhakkas.com</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">Call Us</h3>
                <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">Visit Us</h3>
                <p className="text-sm text-muted-foreground">123 Education Street, Learning City</p>
              </div>
            </div>
            <div className="text-center mt-8">
              <Button size="lg">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;