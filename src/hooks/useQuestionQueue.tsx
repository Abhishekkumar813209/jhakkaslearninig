import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { invokeWithAuth } from "@/lib/invokeWithAuth";

interface Question {
  id: string;
  question_type: string;
  question_data: any;
  answer_data: any;
  explanation?: string;
  xp_reward: number;
  difficulty?: string;
  // Legacy fields for backward compatibility
  exercise_type?: string;
  exercise_data?: any;
  correct_answer?: any;
}

export const useQuestionQueue = (topicId: string) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progressId, setProgressId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProgressAndQuestions();
  }, [topicId]);

  const loadProgressAndQuestions = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch questions first
      const data = await invokeWithAuth<any, { success: boolean; questions: Question[] }>({
        name: 'topic-questions-api',
        body: {
          action: 'get_by_topic',
          topic_id: topicId
        }
      });

      const loadedQuestions = data.questions || [];
      console.log('[QQ] Loaded questions:', loadedQuestions.length);
      setQuestions(loadedQuestions);

      if (loadedQuestions.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Load or create progress record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: existingProgress, error: progressError } = await supabase
        .from('student_topic_game_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('topic_id', topicId)
        .maybeSingle();

      if (progressError) {
        console.error('Error loading progress:', progressError);
      }

      if (existingProgress && !existingProgress.is_completed) {
        // Resume from saved progress
        setCurrentIndex(existingProgress.current_question_index);
        setProgressId(existingProgress.id);
        console.log('[QQ] Resuming from index:', existingProgress.current_question_index);
      } else if (!existingProgress) {
        // Create new progress record
        const { data: newProgress, error: createError } = await supabase
          .from('student_topic_game_progress')
          .insert({
            student_id: user.id,
            topic_id: topicId,
            total_questions: loadedQuestions.length,
            current_question_index: 0,
            questions_completed: 0,
            questions_correct: 0,
            session_state: {}
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating progress:', createError);
        } else {
          setProgressId(newProgress.id);
          console.log('[QQ] Created new progress record');
        }
      }
    } catch (error: any) {
      console.error('Error loading progress:', error);
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

  const saveProgress = async (index: number, completed?: number, correct?: number) => {
    if (!progressId) return;

    try {
      await supabase
        .from('student_topic_game_progress')
        .update({
          current_question_index: index,
          questions_completed: completed !== undefined ? completed : undefined,
          questions_correct: correct !== undefined ? correct : undefined,
          last_active_at: new Date().toISOString()
        })
        .eq('id', progressId);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const nextQuestion = async () => {
    console.log('[QQ] nextQuestion called: from index', currentIndex, 'of', questions.length);
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      await saveProgress(newIndex);
      return true;
    }
    return false;
  };

  const previousQuestion = async () => {
    console.log('[QQ] previousQuestion called: from index', currentIndex);
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      await saveProgress(newIndex);
      return true;
    }
    return false;
  };

  const goToQuestion = async (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      await saveProgress(index);
      return true;
    }
    return false;
  };

  const getCurrentQuestion = () => {
    return questions[currentIndex] || null;
  };

  const hasMoreQuestions = () => {
    return currentIndex < questions.length - 1;
  };

  const hasPreviousQuestions = () => {
    return currentIndex > 0;
  };

  const markComplete = async () => {
    if (!progressId) return;

    try {
      await supabase
        .from('student_topic_game_progress')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', progressId);
    } catch (error) {
      console.error('Error marking complete:', error);
    }
  };

  const reset = async () => {
    setCurrentIndex(0);
    await saveProgress(0, 0, 0);
  };

  return {
    questions,
    currentQuestion: getCurrentQuestion(),
    currentIndex,
    totalQuestions: questions.length,
    loading,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    hasMoreQuestions: hasMoreQuestions(),
    hasPreviousQuestions: hasPreviousQuestions(),
    reset,
    saveProgress,
    markComplete,
    refetch: loadProgressAndQuestions
  };
};
