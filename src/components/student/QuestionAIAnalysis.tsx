import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuestionAIAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  question: {
    questionText: string;
    correctAnswer: string;
    studentAnswer?: string;
    subject: string;
    topic?: string;
    explanation?: string;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const QuestionAIAnalysis: React.FC<QuestionAIAnalysisProps> = ({
  isOpen,
  onClose,
  question
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAIExplanation = async (userMessage?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-question-explainer', {
        body: {
          questionText: question.questionText,
          correctAnswer: question.correctAnswer,
          studentAnswer: question.studentAnswer,
          subject: question.subject,
          topic: question.topic,
          explanation: question.explanation,
          userMessage
        }
      });

      if (error) throw error;

      if (data.success) {
        const aiMessage: Message = {
          role: 'assistant',
          content: data.explanation
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error fetching AI explanation:', error);
      toast({
        title: 'Error',
        description: 'Failed to get AI explanation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg: Message = {
      role: 'user',
      content: inputMessage
    };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');

    await fetchAIExplanation(inputMessage);
  };

  const handleInitialExplanation = () => {
    if (messages.length === 0) {
      fetchAIExplanation();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      handleInitialExplanation();
    } else {
      setMessages([]);
    }
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Question Analysis (Hinglish)
          </SheetTitle>
          <SheetDescription>
            Ask AI to explain this question in multiple ways
          </SheetDescription>
        </SheetHeader>

        {/* Question Display */}
        <div className="bg-muted p-4 rounded-lg mb-4">
          <p className="font-medium mb-2">Question:</p>
          <p className="text-sm mb-3">{question.questionText}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Correct:</span>
              <span className="ml-2 text-green-600 font-medium">{question.correctAnswer}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Your Answer:</span>
              <span className={`ml-2 font-medium ${question.studentAnswer === question.correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
                {question.studentAnswer || 'Not answered'}
              </span>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-12' 
                    : 'bg-muted mr-12'
                }`}
              >
                <div className="flex items-start gap-2">
                  {msg.role === 'assistant' && <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1 whitespace-pre-wrap text-sm">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI soch raha hai...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask follow-up question in Hinglish..."
            disabled={loading}
          />
          <Button onClick={handleSendMessage} disabled={loading || !inputMessage.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};