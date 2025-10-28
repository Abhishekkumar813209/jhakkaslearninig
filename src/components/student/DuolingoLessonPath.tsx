import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Lock, Play, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  lesson_type: string;
  content_order: number;
  estimated_time_minutes: number;
  xp_reward: number;
  game_type?: string;
  svg_type?: string;
}

interface LessonProgress {
  id: string;
  lesson_content_id: string;
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  current_step: number;
  total_steps: number;
  steps_completed: number;
}

interface DuolingoLessonPathProps {
  topicId: string;
  onLessonClick: (lesson: Lesson) => void;
}

export function DuolingoLessonPath({ topicId, onLessonClick }: DuolingoLessonPathProps) {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [loading, setLoading] = useState(true);
  const [refetchTimeout, setRefetchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchLessons();

    // Realtime subscription for game changes
    const channel = supabase
      .channel('game-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gamified_exercises'
        },
        (payload) => {
          console.log('Game change detected:', payload.eventType, payload);
          
          // Immediately clear lessons on DELETE to prevent showing stale nodes
          if (payload.eventType === 'DELETE') {
            setLessons([]);
            setLoading(true);
            
            toast({
              title: "Content Updated",
              description: "A lesson was removed. Refreshing...",
              variant: "default"
            });
          }
          
          // Debounce refetch with shorter delay
          if (refetchTimeout) {
            clearTimeout(refetchTimeout);
          }
          const timeout = setTimeout(() => {
            fetchLessons();
          }, 200); // Reduced from 500ms to 200ms
          setRefetchTimeout(timeout);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topic_content_mapping'
        },
        (payload) => {
          console.log('Content mapping change:', payload.eventType);
          
          // Debounce refetch
          if (refetchTimeout) {
            clearTimeout(refetchTimeout);
          }
          const timeout = setTimeout(() => {
            fetchLessons();
          }, 500);
          setRefetchTimeout(timeout);
        }
      )
      .subscribe();

    return () => {
      if (refetchTimeout) {
        clearTimeout(refetchTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [topicId, refetchTimeout]);

  const fetchLessons = async () => {
    setLoading(true);
    
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setLoading(false);
      return;
    }

    // First, try to load games dynamically from gamified_exercises
    const { data: mappings, error: mappingError } = await supabase
      .from('topic_content_mapping')
      .select('id')
      .eq('topic_id', topicId);

    if (mappingError) {
      console.error("Error fetching topic_content_mapping:", mappingError);
    }

    let lessonsData: Lesson[] = [];
    const progressMap: Record<string, LessonProgress> = {};

    // If we have mappings, load games
    if (mappings && mappings.length > 0) {
      const mappingIds = mappings.map(m => m.id);
      
      const { data: games, error: gamesError } = await supabase
        .from('gamified_exercises')
        .select('*')
        .in('topic_content_id', mappingIds)
        .order('game_order', { ascending: true });

      if (gamesError) {
        console.error("Error fetching games:", gamesError);
      }

      // Filter out any null/undefined games (defensive check)
      const validGames = (games || []).filter(g => g && g.id);

      // If we have games, build lessons from them
      if (validGames.length > 0) {
        // Load student game progress
        const { data: gameProgress } = await supabase
          .from('student_topic_game_progress')
          .select('completed_game_ids')
          .eq('student_id', user.user.id)
          .eq('topic_id', topicId)
          .single();

        const completedGameIds = gameProgress?.completed_game_ids || [];

        // Fetch attempted games (any games with question attempts)
        const { data: attemptedGames } = await supabase
          .from('student_question_attempts')
          .select('question_id')
          .eq('student_id', user.user.id)
          .eq('topic_id', topicId);

        const attemptedGameIds = [...new Set(attemptedGames?.map(a => a.question_id) || [])];

        // Build lessons array from all valid games
        lessonsData = validGames.map((game, index) => ({
          id: game.id,
          lesson_type: 'game',
          content_order: game.game_order || (index + 1),
          game_type: game.exercise_type || 'mcq',
          xp_reward: 10, // Default XP for games
          estimated_time_minutes: 3, // Default time estimate
        }));

        // Build progress map from completed and attempted games
        lessonsData.forEach((lesson, index) => {
          const isCompleted = completedGameIds.includes(lesson.id);
          const isAttempted = attemptedGameIds.includes(lesson.id);
          
          // Sequential unlocking logic
          let isPreviousAttemptedOrCompleted = false;
          if (index === 0) {
            isPreviousAttemptedOrCompleted = true; // First game always unlocked
          } else {
            // Check if the IMMEDIATELY previous game is completed OR attempted
            const prevGameId = lessonsData[index - 1]?.id;
            isPreviousAttemptedOrCompleted = 
              completedGameIds.includes(prevGameId) || attemptedGameIds.includes(prevGameId);
          }
          
          // Determine status based on completion and attempt state
          let status: 'completed' | 'in_progress' | 'unlocked' | 'locked';
          if (isCompleted) {
            status = 'completed'; // Green - answered correctly
          } else if (isAttempted) {
            status = 'in_progress'; // Blue/Yellow - attempted but not correct
          } else if (isPreviousAttemptedOrCompleted) {
            status = 'unlocked'; // Blue - unlocked but not attempted
          } else {
            status = 'locked'; // Grey - locked
          }
          
          progressMap[lesson.id] = {
            id: `progress_${lesson.id}`,
            lesson_content_id: lesson.id,
            status: status,
            current_step: 0,
            total_steps: 1,
            steps_completed: isCompleted ? 1 : 0,
          };
        });
      }
    }

    // Fallback to topic_learning_content if no games found
    if (lessonsData.length === 0) {
      const { data: contentLessons, error: lessonsError } = await supabase
        .from('topic_learning_content')
        .select('*')
        .eq('topic_id', topicId)
        .eq('human_reviewed', true)
        .order('content_order', { ascending: true });

      if (lessonsError) {
        toast({ title: "Error", description: lessonsError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      lessonsData = contentLessons as Lesson[];

      // Load traditional lesson progress
      const { data: progressData } = await supabase
        .from('student_lesson_progress')
        .select('*')
        .eq('student_id', user.user.id)
        .eq('topic_id', topicId);

      progressData?.forEach((p) => {
        progressMap[p.lesson_content_id] = p as LessonProgress;
      });

      // Auto-unlock first lesson if no progress exists
      if (lessonsData.length > 0 && !progressMap[lessonsData[0].id]) {
        await supabase.from('student_lesson_progress').insert({
          student_id: user.user.id,
          topic_id: topicId,
          lesson_content_id: lessonsData[0].id,
          status: 'unlocked',
          total_steps: 1,
        });
        
        const { data: newProgress } = await supabase
          .from('student_lesson_progress')
          .select('*')
          .eq('lesson_content_id', lessonsData[0].id)
          .single();
        
        if (newProgress) {
          progressMap[lessonsData[0].id] = newProgress as LessonProgress;
        }
      }
    }

    setLessons(lessonsData);
    setProgress(progressMap);
    setLoading(false);
  };

  const getNodeColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 border-green-600';
      case 'in_progress': return 'bg-yellow-500 border-yellow-600';
      case 'unlocked': return 'bg-blue-500 border-blue-600';
      default: return 'bg-gray-400 border-gray-500';
    }
  };

  const getNodeIcon = (status?: string, lessonType?: string) => {
    if (status === 'completed') return <CheckCircle2 className="h-6 w-6 text-white" />;
    if (status === 'locked') return <Lock className="h-6 w-6 text-white" />;
    return <Play className="h-6 w-6 text-white" />;
  };

  const handleNodeClick = (lesson: Lesson) => {
    const lessonProgress = progress[lesson.id];
    if (!lessonProgress || lessonProgress.status === 'locked') {
      toast({ 
        title: "Locked", 
        description: "Complete previous lessons to unlock this one", 
        variant: "destructive" 
      });
      return;
    }
    onLessonClick(lesson);
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex flex-col items-center gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="w-[280px] h-[120px] bg-muted rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!lessons || lessons.length === 0) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto mt-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Play className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">No Lessons Yet</h3>
            <p className="text-muted-foreground">
              This topic doesn't have any lessons created yet. 
              Please check back later or contact your instructor.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative max-w-md mx-auto py-8 px-4">
      {/* Path line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20 -translate-x-1/2" />

      {/* Lesson nodes */}
      <div className="space-y-12 relative">
        {lessons.map((lesson, index) => {
          const lessonProgress = progress[lesson.id];
          const status = lessonProgress?.status || 'locked';
          const progressPercent = lessonProgress 
            ? (lessonProgress.steps_completed / (lessonProgress.total_steps || 1)) * 100 
            : 0;

          const isLeft = index % 2 === 0;

          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative",
                isLeft ? "mr-auto pr-8" : "ml-auto pl-8"
              )}
              style={{ width: '70%' }}
            >
              {/* Connector line to center */}
              <div 
                className={cn(
                  "absolute top-1/2 w-8 h-0.5 bg-gradient-to-r",
                  isLeft 
                    ? "right-0 from-transparent to-primary/40" 
                    : "left-0 from-primary/40 to-transparent"
                )}
              />

              {/* Lesson node card */}
              <motion.div
                whileHover={status !== 'locked' ? { scale: 1.05 } : {}}
                whileTap={status !== 'locked' ? { scale: 0.95 } : {}}
                onClick={() => handleNodeClick(lesson)}
                className={cn(
                  "relative cursor-pointer rounded-2xl border-4 p-4 shadow-lg transition-all",
                  getNodeColor(status),
                  status === 'locked' && "opacity-60 cursor-not-allowed"
                )}
              >
                {/* Node icon circle */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shadow-md",
                    getNodeColor(status)
                  )}>
                    {getNodeIcon(status, lesson.lesson_type)}
                  </div>
                </div>

                {/* Content */}
                <div className="mt-6 text-center text-white">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {lesson.lesson_type.replace('_', ' ')}
                    </span>
                    {lesson.game_type && (
                      <span className="text-xs opacity-80">• {lesson.game_type}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4" /> {lesson.xp_reward} XP
                    </span>
                    <span>• {lesson.estimated_time_minutes} min</span>
                  </div>

                  {/* Progress bar for in-progress lessons */}
                  {status === 'in_progress' && (
                    <div className="mt-3">
                      <Progress value={progressPercent} className="h-2 bg-white/30" />
                      <p className="text-xs mt-1 opacity-90">
                        {lessonProgress.steps_completed}/{lessonProgress.total_steps} steps
                      </p>
                    </div>
                  )}

                  {status === 'completed' && (
                    <p className="text-xs mt-2 opacity-90">✓ Completed</p>
                  )}

                  {status === 'locked' && (
                    <p className="text-xs mt-2 opacity-90">🔒 Complete previous lesson</p>
                  )}
                </div>

                {/* Sparkle effects for completed */}
                {status === 'completed' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2"
                  >
                    <Star className="h-6 w-6 text-yellow-300 fill-yellow-300" />
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Completion message */}
      {lessons.length > 0 && lessons.every((l) => progress[l.id]?.status === 'completed') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-12 text-center"
        >
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl p-6 shadow-xl">
            <h3 className="text-2xl font-bold mb-2">🎉 Topic Complete!</h3>
            <p className="opacity-90">You've mastered all lessons in this topic!</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
