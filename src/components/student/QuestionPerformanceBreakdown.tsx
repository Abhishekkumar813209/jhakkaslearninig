import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Bot, BarChart3, Users } from 'lucide-react';
import { QuestionAIAnalysis } from './QuestionAIAnalysis';

interface QuestionStats {
  questionId: string;
  questionNumber: number;
  questionText: string;
  marks: number;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  correctPercentage: number;
  difficultyLevel: 'Easy' | 'Medium' | 'Hard';
  yourAnswer: 'correct' | 'wrong' | 'skipped';
  tags: string[];
}

interface QuestionPerformanceBreakdownProps {
  questions: QuestionStats[];
  testTitle: string;
}

export const QuestionPerformanceBreakdown: React.FC<QuestionPerformanceBreakdownProps> = ({ 
  questions,
  testTitle 
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionStats | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'Easy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Hard':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleAskAI = (question: QuestionStats) => {
    setSelectedQuestion(question);
    setShowAIAnalysis(true);
  };

  return (
    <>
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Question-wise Performance Analysis</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Dekho kitne students ne har question ko correct/wrong kiya
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {questions.map((q) => (
                <div 
                  key={q.questionId} 
                  className={`p-4 rounded-lg border-2 transition-all ${
                    q.yourAnswer === 'correct' ? 'bg-green-50 border-green-200' :
                    q.yourAnswer === 'wrong' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Question Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-semibold">
                          Q{q.questionNumber}
                        </Badge>
                        <Badge variant="outline" className="font-medium">
                          {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                        </Badge>
                        <Badge className={getDifficultyColor(q.difficultyLevel)}>
                          {q.difficultyLevel}
                        </Badge>
                        {q.yourAnswer === 'correct' && (
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            <Check className="h-3 w-3 mr-1" /> Tumne sahi kiya! ✓
                          </Badge>
                        )}
                        {q.yourAnswer === 'wrong' && (
                          <Badge className="bg-red-100 text-red-800 border-red-300">
                            <X className="h-3 w-3 mr-1" /> Tumne galat kiya
                          </Badge>
                        )}
                        {q.yourAnswer === 'skipped' && (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                            Chhod diya
                          </Badge>
                        )}
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-medium leading-relaxed">
                        {q.questionText.length > 150 
                          ? `${q.questionText.substring(0, 150)}...` 
                          : q.questionText}
                      </p>

                      {/* Student Statistics */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Users className="h-3 w-3" />
                          <span>{q.totalAttempts} students ne attempt kiya</span>
                        </div>

                        {/* Correct Answers Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-green-700 font-medium">
                              <Check className="h-3 w-3" />
                              <span>Correct</span>
                            </div>
                            <span className="font-semibold text-green-700">
                              {q.correctCount} students ({q.correctPercentage}%)
                            </span>
                          </div>
                          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="absolute h-full bg-green-500 transition-all"
                              style={{ width: `${q.correctPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Wrong Answers Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-red-700 font-medium">
                              <X className="h-3 w-3" />
                              <span>Wrong</span>
                            </div>
                            <span className="font-semibold text-red-700">
                              {q.wrongCount} students ({100 - q.correctPercentage}%)
                            </span>
                          </div>
                          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="absolute h-full bg-red-500 transition-all"
                              style={{ width: `${100 - q.correctPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      {q.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {q.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ask AI Button */}
                    {q.yourAnswer !== 'correct' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAskAI(q)}
                        className="shrink-0"
                      >
                        <Bot className="h-4 w-4 mr-1" />
                        Ask AI
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* AI Analysis Dialog */}
      {selectedQuestion && (
        <QuestionAIAnalysis
          isOpen={showAIAnalysis}
          onClose={() => {
            setShowAIAnalysis(false);
            setSelectedQuestion(null);
          }}
          question={{
            questionText: selectedQuestion.questionText,
            correctAnswer: '',
            studentAnswer: '',
            subject: selectedQuestion.tags[0] || 'General',
            topic: selectedQuestion.tags[0] || 'General'
          }}
        />
      )}
    </>
  );
};
