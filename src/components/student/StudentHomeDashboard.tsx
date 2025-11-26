import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Card } from '@/components/ui/card';
import {
  Users,
  BookOpen,
  FileText,
  Book,
  FileDown,
  Trophy,
  ClipboardList,
  PenTool,
  Brain,
} from 'lucide-react';

export const StudentHomeDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const featureCards = [
    {
      id: 'paid-classes',
      title: 'Paid Classes',
      icon: Users,
      color: 'bg-blue-500',
      path: '/student',
      available: true,
    },
    {
      id: 'free-courses',
      title: 'Free Courses',
      icon: BookOpen,
      color: 'bg-green-500',
      path: '/courses',
      available: true,
    },
    {
      id: 'free-test',
      title: 'Free Test',
      icon: FileText,
      color: 'bg-purple-500',
      path: '/tests',
      available: true,
    },
    {
      id: 'books',
      title: 'Books',
      icon: Book,
      color: 'bg-yellow-500',
      path: '#',
      available: false,
    },
    {
      id: 'pdf-notes',
      title: 'PDF Class Notes',
      icon: FileDown,
      color: 'bg-orange-500',
      path: '#',
      available: false,
    },
    {
      id: 'paid-test-series',
      title: 'Paid Test Series',
      icon: Trophy,
      color: 'bg-red-500',
      path: '/tests',
      available: true,
    },
    {
      id: 'syllabus-pyq',
      title: 'Syllabus + PYQs',
      icon: ClipboardList,
      color: 'bg-indigo-500',
      path: '#',
      available: false,
    },
    {
      id: 'create-test',
      title: 'Create Test',
      icon: PenTool,
      color: 'bg-pink-500',
      path: '#',
      available: false,
    },
    {
      id: 'daily-quiz',
      title: 'Daily Quiz',
      icon: Brain,
      color: 'bg-teal-500',
      path: '/racing',
      available: true,
    },
  ];

  const handleCardClick = (path: string, available: boolean) => {
    if (available && path !== '#') {
      navigate(path);
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Greeting Section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Hello, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back! Continue your learning journey
        </p>
      </div>

      {/* Banner Section */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
          <h2 className="text-xl font-bold mb-2">Start Learning Today!</h2>
          <p className="text-sm opacity-90">
            Access unlimited courses, tests, and study materials
          </p>
        </div>
      </Card>

      {/* Feature Grid */}
      <div className="grid grid-cols-3 gap-4">
        {featureCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                card.available
                  ? 'cursor-pointer hover:-translate-y-1'
                  : 'opacity-60 cursor-not-allowed'
              }`}
              onClick={() => handleCardClick(card.path, card.available)}
            >
              <div className="flex flex-col items-center justify-center p-4 space-y-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${card.color} text-white`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-center text-xs font-medium text-foreground leading-tight">
                  {card.title}
                </p>
              </div>
              {!card.available && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Coming Soon
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
