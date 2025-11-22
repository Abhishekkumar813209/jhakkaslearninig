import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ReviewHeaderProps {
  testTitle: string;
  testSubject: string;
  score: number;
  totalMarks: number;
  percentage: number;
  currentIndex: number;
  totalQuestions: number;
}

export const ReviewHeader: React.FC<ReviewHeaderProps> = ({
  testTitle,
  testSubject,
  score,
  totalMarks,
  percentage,
  currentIndex,
  totalQuestions
}) => {
  const navigate = useNavigate();
  const progressValue = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="mb-6">
      <Button 
        onClick={() => navigate('/student/dashboard')}
        variant="ghost"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>
      
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <h1 className="text-2xl font-bold mb-2">{testTitle}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
          <span className="font-medium">{testSubject}</span>
          <span>•</span>
          <span>Your Score: <span className="font-semibold text-foreground">{score}/{totalMarks}</span> ({percentage.toFixed(1)}%)</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Question {currentIndex + 1} of {totalQuestions}</span>
            <Badge variant="outline">{progressValue.toFixed(0)}% Complete</Badge>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>
      </div>
    </div>
  );
};
