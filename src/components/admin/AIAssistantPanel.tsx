import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAssistantPanelProps {
  context?: {
    tableName?: string;
    selectedRow?: any;
    tableCount?: number;
  };
}

const databaseStarters = [
  "Show me orphaned questions in question_bank",
  "Why do students have null batch_id?",
  "Explain the relationship between topics and games",
  "Find students with incomplete roadmaps",
  "Check for fee records with low battery"
];

export function AIAssistantPanel({ context }: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Add context message when table changes
    if (context?.tableName && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `I can see you're viewing the **${context.tableName}** table${context.tableCount ? ` with ${context.tableCount} rows` : ''}. What would you like to know about it?`,
        timestamp: new Date()
      }]);
    }
  }, [context?.tableName]);

  const streamChat = async (userMessage: string) => {
    const contextInfo = context?.tableName 
      ? `\n\n[Context: User is viewing ${context.tableName} table${context.selectedRow ? ' with a selected row' : ''}${context.tableCount ? `, total ${context.tableCount} rows` : ''}]`
      : '';

    const newMessages = [...messages, { 
      role: "user" as const, 
      content: userMessage + contextInfo, 
      timestamp: new Date() 
    }];
    setMessages(prev => [...prev, { role: "user", content: userMessage, timestamp: new Date() }]);
    setIsStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/admin-ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFham10ZmNwaHBuY3F3Y3J6cGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMDM3MTEsImV4cCI6MjA3MzU3OTcxMX0.VzMpGU85jw4OQZmKVYfH3M5NquhV5YMuFGzlzOU6v6s'
          },
          body: JSON.stringify({ 
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            context
          })
        }
      );

      if (!response.ok) {
        if (response.status === 429 || response.status === 402) {
          toast({
            title: response.status === 429 ? "Rate Limit" : "Usage Limit",
            description: response.status === 429 
              ? "Please wait 30 seconds" 
              : "Add credits to Lovable workspace",
            variant: "destructive",
          });
          setIsStreaming(false);
          return;
        }
        throw new Error('Failed to get AI response');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent, timestamp: new Date() }];
              });
            }
          } catch {
            continue;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    
    streamChat(input.trim());
    setInput("");
  };

  const handleStarterClick = (starter: string) => {
    if (isStreaming) return;
    streamChat(starter);
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Database Assistant</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Ask about tables, relationships, or data issues
        </p>
      </div>

      {messages.length === 0 && (
        <div className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Quick questions:
          </p>
          <div className="space-y-1">
            {databaseStarters.map((starter, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => handleStarterClick(starter)}
                disabled={isStreaming}
                className="w-full justify-start text-left text-xs h-auto py-2"
              >
                {starter}
              </Button>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-2.5 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-2.5">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about database..."
            disabled={isStreaming}
            className="text-sm"
          />
          <Button type="submit" size="sm" disabled={isStreaming || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}