import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      
      // Fetch all questions for this topic
      const { data: mappings, error: mappingError } = await supabase
        .from('topic_content_mapping')
        .select('question_id')
        .eq('topic_id', topicId);

      if (mappingError) throw mappingError;

      if (!mappings || mappings.length === 0) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      const questionIds = mappings.map(m => m.question_id);

      // Fetch gamified exercises for these questions
      const { data: exercises, error: exercisesError } = await supabase
        .from('gamified_exercises')
        .select('*')
        .in('topic_content_id', questionIds);

      if (exercisesError) throw exercisesError;

      setQuestions(exercises || []);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive"
      });
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
