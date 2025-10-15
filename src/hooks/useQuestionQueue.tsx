import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { invokeWithAuth } from "@/lib/invokeWithAuth";

interface Question {
  id: string;
  exercise_type: string;
  exercise_data: any;
  correct_answer: any;
  explanation: string;
  xp_reward: number;
  difficulty?: string;
}

export const useQuestionQueue = (topicId: string) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuestions();
  }, [topicId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      
      // Fetch questions via authenticated Edge Function
      const data = await invokeWithAuth<any, { success: boolean; questions: Question[] }>({
        name: 'topic-questions-api',
        body: {
          action: 'get_by_topic',
          topic_id: topicId
        }
      });

      setQuestions(data.questions || []);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      if (error.code === 401) {
        toast({
          title: "Authentication Required",
          description: error.message || "Please log in to load questions",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load questions",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return true; // Has more questions
    }
    return false; // No more questions
  };

  const getCurrentQuestion = () => {
    return questions[currentIndex] || null;
  };

  const hasMoreQuestions = () => {
    return currentIndex < questions.length - 1;
  };

  const reset = () => {
    setCurrentIndex(0);
  };

  return {
    questions,
    currentQuestion: getCurrentQuestion(),
    currentIndex,
    totalQuestions: questions.length,
    loading,
    nextQuestion,
    hasMoreQuestions: hasMoreQuestions(),
    reset,
    refetch: fetchQuestions
  };
};
