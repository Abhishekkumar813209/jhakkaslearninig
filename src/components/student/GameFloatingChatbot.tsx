import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { invokeWithAuth } from '@/lib/invokeWithAuth';

interface GameFloatingChatbotProps {
  gameId: string;
  questionText: string;
  gameType: string;
  subject?: string;
  topic?: string;
  correctAnswer?: string;
  explanation?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const GameFloatingChatbot: React.FC<GameFloatingChatbotProps> = ({
  gameId,
  questionText,
  gameType,
  subject,
  topic,
  correctAnswer,
  explanation
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check attempt count on mount
  useEffect(() => {
    checkAttemptCount();
  }, [gameId]);

  const checkAttemptCount = async () => {
    try {
      const result = await invokeWithAuth<
        { game_id: string; action: string },
        { attempt_count: number }
      >({
        name: 'game-xp-award',
        body: { game_id: gameId, action: 'get_attempts' }
      });

      if (result) {
        setAttemptCount(result.attempt_count);
        // Show chatbot only if attempts > 2
        setIsVisible(result.attempt_count > 2);
      }
    } catch (error) {
      console.error('Error checking attempt count:', error);
    }
  };

  const fetchAIHelp = async (userMessage?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-question-explainer', {
        body: {
          questionText,
          correctAnswer: correctAnswer || 'Not available',
          studentAnswer: null,
          subject: subject || 'General',
          topic: topic || gameType,
          userMessage: userMessage || "Please help me understand this question step by step. I've attempted it multiple times but still struggling.",
          explanation: explanation || `This is a ${gameType} type game question.`
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
      console.error('Error fetching AI help:', error);
      toast({
        title: 'Error',
        description: 'Failed to get AI help. Please try again.',
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

    await fetchAIHelp(inputMessage);
  };

  const handleOpen = () => {
    setIsOpen(true);
    // Load initial AI help if no messages yet
    if (messages.length === 0) {
      fetchAIHelp();
    }
  };

  // Don't render if not visible (attempts <= 2)
  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Game Helper
            </SheetTitle>
            <SheetDescription>
              Need help? Ask AI to explain this question - you've attempted it {attemptCount} times
            </SheetDescription>
          </SheetHeader>

          {/* Question Display */}
          <div className="bg-muted p-4 rounded-lg mb-4">
            <p className="font-medium mb-2">Question:</p>
            <p className="text-sm">{questionText}</p>
            <p className="text-xs text-muted-foreground mt-2">Type: {gameType}</p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <Bot className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  )}
                  <div
                    className={`rounded-lg p-3 max-w-[80%] ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <Bot className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Ask a follow-up question..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={loading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !inputMessage.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
