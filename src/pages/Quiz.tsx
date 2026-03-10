import { useState } from "react";
import { StudentAppLayout } from "@/components/student/StudentAppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trophy,
  Target,
  BookOpen,
  ChevronRight,
  Star,
  Timer
} from "lucide-react";

const Quiz = () => {
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  const quizzes = [
    {
      id: "physics-mechanics",
      title: "Physics: Mechanics Fundamentals",
      subject: "Physics",
      questions: 20,
      duration: "30 min",
      difficulty: "Intermediate",
      attempts: 3,
      bestScore: 85
    },
    {
      id: "math-calculus",
      title: "Mathematics: Differential Calculus",
      subject: "Mathematics", 
      questions: 15,
      duration: "25 min",
      difficulty: "Advanced",
      attempts: 2,
      bestScore: 92
    },
    {
      id: "chemistry-organic",
      title: "Chemistry: Organic Reactions",
      subject: "Chemistry",
      questions: 25,
      duration: "40 min",
      difficulty: "Advanced",
      attempts: 1,
      bestScore: 78
    },
    {
      id: "biology-cell",
      title: "Biology: Cell Structure & Function",
      subject: "Biology",
      questions: 18,
      duration: "35 min",
      difficulty: "Beginner",
      attempts: 0,
      bestScore: null
    }
  ];

  const sampleQuestions = [
    {
      id: 1,
      question: "What is Newton's Second Law of Motion?",
      options: [
        "F = ma",
        "F = mv",
        "F = m/a",
        "F = a/m"
      ],
      correctAnswer: 0,
      explanation: "Newton's Second Law states that the force applied to an object is equal to the mass of the object multiplied by its acceleration (F = ma)."
    },
    {
      id: 2,
      question: "Which of the following is a vector quantity?",
      options: [
        "Speed",
        "Mass",
        "Temperature",
        "Velocity"
      ],
      correctAnswer: 3,
      explanation: "Velocity is a vector quantity because it has both magnitude and direction, unlike speed which only has magnitude."
    },
    {
      id: 3,
      question: "What is the unit of force in the SI system?",
      options: [
        "Joule",
        "Newton",
        "Watt",
        "Pascal"
      ],
      correctAnswer: 1,
      explanation: "The Newton (N) is the SI unit of force, named after Sir Isaac Newton."
    }
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQuizSelect = (quizId: string) => {
    setSelectedQuiz(quizId);
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(600);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer !== null) {
      const newAnswers = [...answers];
      newAnswers[currentQuestion] = selectedAnswer;
      setAnswers(newAnswers);
      
      if (currentQuestion < sampleQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        setShowResult(true);
      }
    }
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, index) => {
      if (answer === sampleQuestions[index].correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / sampleQuestions.length) * 100);
  };

  const resetQuiz = () => {
    setSelectedQuiz(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  if (showResult) {
    const score = calculateScore();
    const correctAnswers = answers.filter((answer, index) => 
      answer === sampleQuestions[index].correctAnswer
    ).length;

    return (
      <StudentAppLayout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-2xl mx-auto shadow-large">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">{score}%</div>
                <p className="text-muted-foreground">
                  You got {correctAnswers} out of {sampleQuestions.length} questions correct
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-success">{correctAnswers}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">{sampleQuestions.length - correctAnswers}</div>
                  <div className="text-sm text-muted-foreground">Wrong</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{score}%</div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </div>
              </div>

              <div className="space-y-3">
                {sampleQuestions.map((question, index) => (
                  <div key={question.id} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                    {answers[index] === question.correctAnswer ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <span className="text-sm">Question {index + 1}</span>
                  </div>
                ))}
              </div>

              <div className="flex space-x-4">
                <Button variant="outline" onClick={resetQuiz} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => setSelectedQuiz(null)} className="flex-1">
                  <BookOpen className="h-4 w-4 mr-2" />
                  More Quizzes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </StudentAppLayout>
    );
  }

  if (selectedQuiz) {
    const question = sampleQuestions[currentQuestion];
    const progress = ((currentQuestion + 1) / sampleQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Quiz Header */}
            <Card className="mb-6 shadow-soft">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h1 className="text-xl font-bold">Physics: Mechanics Fundamentals</h1>
                    <p className="text-muted-foreground">Question {currentQuestion + 1} of {sampleQuestions.length}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      <span className="font-mono">{formatTime(timeLeft)}</span>
                    </div>
                    <Badge variant="secondary">{Math.round(progress)}% Complete</Badge>
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>

            {/* Question */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-lg">{question.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {question.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={selectedAnswer === index ? "default" : "quiz"}
                    className="w-full text-left justify-start p-4 h-auto"
                    onClick={() => handleAnswerSelect(index)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        selectedAnswer === index 
                          ? 'border-primary bg-primary text-white' 
                          : 'border-muted-foreground'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span>{option}</span>
                    </div>
                  </Button>
                ))}
                
                <div className="flex justify-between pt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (currentQuestion > 0) {
                        setCurrentQuestion(currentQuestion - 1);
                        setSelectedAnswer(answers[currentQuestion - 1] || null);
                      }
                    }}
                    disabled={currentQuestion === 0}
                  >
                    Previous
                  </Button>
                  <Button 
                    onClick={handleNextQuestion}
                    disabled={selectedAnswer === null}
                  >
                    {currentQuestion === sampleQuestions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="bg-muted/30 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Practice Quizzes</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Test your knowledge with our comprehensive quizzes and track your progress
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Quiz List */}
          <div className="lg:col-span-3">
            <div className="grid md:grid-cols-2 gap-6">
              {quizzes.map(quiz => (
                <Card key={quiz.id} className="quiz-card cursor-pointer" onClick={() => handleQuizSelect(quiz.id)}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Badge variant="secondary">{quiz.subject}</Badge>
                      <Badge variant={quiz.difficulty === 'Beginner' ? 'default' : quiz.difficulty === 'Intermediate' ? 'secondary' : 'destructive'}>
                        {quiz.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4" />
                          <span>{quiz.questions} Questions</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>{quiz.duration}</span>
                        </div>
                      </div>
                      
                      {quiz.bestScore && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Best Score:</span>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-warning" />
                            <span className="font-medium">{quiz.bestScore}%</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Attempts: {quiz.attempts}</span>
                        <Button size="sm">
                          {quiz.attempts === 0 ? 'Start Quiz' : 'Retake'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quiz Stats */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">87%</div>
                  <div className="text-sm text-muted-foreground">Average Score</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold">24</div>
                    <div className="text-xs text-muted-foreground">Quizzes Taken</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">18</div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Recent Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Physics Quiz #1</span>
                    <Badge variant="secondary">92%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Math Calculus</span>
                    <Badge variant="secondary">85%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Chemistry Organic</span>
                    <Badge variant="secondary">78%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Study Recommendations */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Recommended
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-warning/10 rounded-lg">
                    <h4 className="text-sm font-medium">Review Needed</h4>
                    <p className="text-xs text-muted-foreground">Thermodynamics concepts</p>
                  </div>
                  <div className="p-3 bg-success/10 rounded-lg">
                    <h4 className="text-sm font-medium">Strong Area</h4>
                    <p className="text-xs text-muted-foreground">Mechanics problems</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;