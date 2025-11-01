import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

        {/* Why Choose Us */}
        <Card className="shadow-soft mb-16">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Why Choose Jhakkas?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Expert Faculty",
                  description: "Learn from industry experts and experienced educators",
                  icon: <Users className="h-5 w-5" />
                },
                {
                  title: "Personalized Learning",
                  description: "AI-powered recommendations tailored to your learning style",
                  icon: <Target className="h-5 w-5" />
                },
                {
                  title: "Interactive Content",
                  description: "Engaging videos, quizzes, and hands-on practice sessions",
                  icon: <BookOpen className="h-5 w-5" />
                },
                {
                  title: "24/7 Support",
                  description: "Round-the-clock assistance from our dedicated support team",
                  icon: <Heart className="h-5 w-5" />
                },
                {
                  title: "Progress Tracking",
                  description: "Detailed analytics to monitor your learning progress",
                  icon: <Award className="h-5 w-5" />
                },
                {
                  title: "Global Community",
                  description: "Connect with peers and mentors from around the world",
                  icon: <Globe className="h-5 w-5" />
                }
              ].map((feature, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="w-10 h-10 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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