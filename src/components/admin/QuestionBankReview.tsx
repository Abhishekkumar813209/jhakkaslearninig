import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { renderWithImages } from "@/lib/mathRendering";

interface UnansweredQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  subject: string | null;
  chapter_name: string | null;
  topic_id: string | null;
  created_at: string;
}

export const QuestionBankReview = () => {
  const [unansweredQuestions, setUnansweredQuestions] = useState<UnansweredQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadUnanswered();
  }, []);

  const loadUnanswered = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .eq('question_type', 'mcq')
        .is('correct_answer', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUnansweredQuestions((data || []).map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: Array.isArray(q.options) ? q.options.map(opt => String(opt)) : [],
        subject: q.subject || null,
        chapter_name: q.chapter_id || q.subject || null,
        topic_id: q.topic_id || null,
        created_at: q.created_at
      })));
    } catch (error) {
      console.error('Failed to load unanswered questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const setCorrectAnswer = async (questionId: string, optionIndex: number) => {
    try {
      setProcessing(questionId);

      const { error } = await supabase
        .from('question_bank')
        .update({
          correct_answer: optionIndex.toString(), // 0-based index
          admin_reviewed: true,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', questionId);

      if (error) throw error;

      toast.success('Answer set successfully');
      await loadUnanswered();
    } catch (error) {
      console.error('Failed to set answer:', error);
      toast.error('Failed to set answer');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Questions Needing Answers</span>
            <Badge variant={unansweredQuestions.length > 0 ? "destructive" : "default"}>
              {unansweredQuestions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {unansweredQuestions.length === 0 ? (
        <Alert className="border-green-600 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">All Done!</AlertTitle>
          <AlertDescription className="text-green-600">
            All questions in the question bank have correct answers set.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            Review and set correct answers for the questions below. 
            Click on the correct option to save it.
          </AlertDescription>
        </Alert>
      )}

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {unansweredQuestions.map((q) => (
            <Card key={q.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="outline">{q.subject}</Badge>
                      <Badge variant="secondary">{q.chapter_name}</Badge>
                    </div>
                    <div 
                      className="font-semibold text-lg"
                      dangerouslySetInnerHTML={{ __html: renderWithImages(q.question_text) }}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">Select correct answer:</p>
                    {(q.options || []).map((opt, idx) => (
                      <Button
                        key={idx}
                        onClick={() => setCorrectAnswer(q.id, idx)}
                        disabled={processing === q.id}
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-green-50 hover:border-green-500"
                      >
                        <span className="font-semibold mr-2">{idx + 1}.</span>
                        <span dangerouslySetInnerHTML={{ __html: renderWithImages(opt) }} />
                        {processing === q.id && (
                          <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                        )}
                      </Button>
                    ))}
                  </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Created: {new Date(q.created_at).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
