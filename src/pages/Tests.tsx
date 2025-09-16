import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Trophy, Play, CheckCircle } from 'lucide-react';

const Tests = () => {
  const tests = [
    {
      id: 1,
      title: 'JEE Main Mock Test - Physics',
      subject: 'Physics',
      duration: '3 hours',
      questions: 75,
      maxMarks: 300,
      attempts: 1250,
      difficulty: 'Advanced',
      status: 'Available',
    },
    {
      id: 2,
      title: 'NEET Practice Test - Biology',
      subject: 'Biology',
      duration: '2.5 hours',
      questions: 90,
      maxMarks: 360,
      attempts: 980,
      difficulty: 'Intermediate',
      status: 'Available',
    },
    {
      id: 3,
      title: 'Mathematics Chapter Test - Calculus',
      subject: 'Mathematics',
      duration: '2 hours',
      questions: 50,
      maxMarks: 200,
      attempts: 750,
      difficulty: 'Advanced',
      status: 'Completed',
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'secondary';
      case 'Intermediate': return 'secondary'; // Changed from 'warning'
      case 'Advanced': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'secondary';
      case 'Completed': return 'secondary'; // Changed from 'success'
      case 'In Progress': return 'secondary'; // Changed from 'warning'
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Practice Tests</h1>
          <p className="text-muted-foreground">
            Test your knowledge with our comprehensive practice tests
          </p>
        </div>

        <div className="grid gap-6">
          {tests.map((test) => (
            <Card key={test.id} className="shadow-soft hover:shadow-medium transition-smooth">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-2">{test.title}</CardTitle>
                    <div className="flex gap-2 mb-3">
                      <Badge variant="outline">{test.subject}</Badge>
                      <Badge variant={getDifficultyColor(test.difficulty)}>
                        {test.difficulty}
                      </Badge>
                      <Badge variant={getStatusColor(test.status)}>
                        {test.status === 'Completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {test.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{test.maxMarks}</div>
                    <div className="text-sm text-muted-foreground">Max Marks</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{test.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <span>{test.questions} Questions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{test.attempts} Attempts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Play className="h-4 w-4 text-muted-foreground" />
                    <span>Practice Mode</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {test.status === 'Available' ? (
                    <>
                      <Button className="flex-1">
                        <Play className="h-4 w-4 mr-2" />
                        Start Test
                      </Button>
                      <Button variant="outline">
                        View Details
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="flex-1">
                        View Results
                      </Button>
                      <Button>
                        Retake Test
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <Card className="text-center p-8 shadow-soft">
            <CardHeader>
              <CardTitle className="text-2xl mb-4">Need More Practice?</CardTitle>
              <p className="text-muted-foreground">
                Explore our comprehensive test library with over 500+ practice tests
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="hero" size="lg">
                Browse All Tests
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Tests;