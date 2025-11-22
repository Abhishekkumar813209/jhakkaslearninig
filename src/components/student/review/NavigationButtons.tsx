import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface NavigationButtonsProps {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
}

export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  onFinish
}) => {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <Button
        onClick={onPrevious}
        disabled={isFirst}
        variant="outline"
        size="lg"
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Previous
      </Button>
      
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground font-medium">
          {currentIndex + 1} / {totalQuestions}
        </span>
        
        <Button
          onClick={onFinish}
          variant="secondary"
          size="lg"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Finish Review
        </Button>
      </div>
      
      <Button
        onClick={onNext}
        disabled={isLast}
        size="lg"
      >
        Next
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
};
