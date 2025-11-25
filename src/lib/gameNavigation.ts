import { supabase } from "@/integrations/supabase/client";
import { extractQuestionText } from "./questionTextHelpers";

/**
 * Option B: Reference-based game navigation (zero duplication)
 * Fetches games from batch_question_assignments with JOINs to question_bank
 * instead of duplicating to gamified_exercises
 */

export interface GameNavigationInfo {
  previousGameId: string | null;
  nextGameId: string | null;
  currentGameNumber: number;
  totalGames: number;
}

export interface GameData {
  id: string;
  question_text: string;
  question_type: string;
  question_data: any;
  answer_data: any;
  difficulty: string;
  xp_reward: number;
  assignment_order: number;
}

/**
 * Fetch all games for a topic from batch_question_assignments
 */
async function fetchGamesForTopic(topicId: string): Promise<GameData[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get student's batch
  const { data: profile } = await supabase
    .from('profiles')
    .select('batch_id')
    .eq('id', user.id)
    .single();

  if (!profile?.batch_id) return [];

  // Fetch assigned questions with JOIN to question_bank (including xp_reward)
  const { data, error } = await supabase
    .from('batch_question_assignments')
    .select(`
      id,
      assignment_order,
      xp_reward,
      question_bank!inner(
        id,
        question_type,
        question_data,
        answer_data,
        difficulty,
        marks
      )
    `)
    .eq('batch_id', profile.batch_id)
    .eq('roadmap_topic_id', topicId)
    .eq('is_active', true)
    .order('assignment_order', { ascending: true });

  if (error) {
    console.error('Error fetching games:', error);
    return [];
  }

  return (data || []).map((assignment: any) => {
    const q = assignment.question_bank;
    
    // ✅ Priority: assignment.xp_reward > difficulty-based fallback
    const xpReward = assignment.xp_reward ?? 
      (q.difficulty === 'hard' ? 50 : q.difficulty === 'medium' ? 40 : 30);
    
    return {
      id: assignment.id, // Use assignment ID as game ID
      question_text: extractQuestionText(q), // ✅ Use helper to extract from JSONB
      question_type: q.question_type,
      question_data: q.question_data,
      answer_data: q.answer_data,
      difficulty: q.difficulty || 'medium',
      xp_reward: xpReward, // ✅ Use distributed XP from assignments
      assignment_order: assignment.assignment_order
    };
  });
}

/**
 * Get navigation info for current game within a topic
 */
export async function getAdjacentGames(
  topicId: string,
  currentGameId: string
): Promise<GameNavigationInfo> {
  const games = await fetchGamesForTopic(topicId);
  
  if (games.length === 0) {
    return {
      previousGameId: null,
      nextGameId: null,
      currentGameNumber: 0,
      totalGames: 0
    };
  }

  const currentIndex = games.findIndex(g => g.id === currentGameId);
  
  if (currentIndex === -1) {
    return {
      previousGameId: games[0]?.id || null,
      nextGameId: games[1]?.id || null,
      currentGameNumber: 1,
      totalGames: games.length
    };
  }

  return {
    previousGameId: currentIndex > 0 ? games[currentIndex - 1].id : null,
    nextGameId: currentIndex < games.length - 1 ? games[currentIndex + 1].id : null,
    currentGameNumber: currentIndex + 1,
    totalGames: games.length
  };
}

/**
 * Load a specific game by assignment ID
 */
export async function loadGameById(assignmentId: string): Promise<GameData | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('batch_question_assignments')
    .select(`
      id,
      assignment_order,
      roadmap_topic_id,
      xp_reward,
      question_bank!inner(
        id,
        question_type,
        question_data,
        answer_data,
        difficulty,
        marks
      )
    `)
    .eq('id', assignmentId)
    .single();

  if (error || !data) {
    console.error('Error loading game:', error);
    return null;
  }

  const q = data.question_bank;
  
  // ✅ Priority: assignment.xp_reward > difficulty-based fallback
  const xpReward = data.xp_reward ?? 
    (q.difficulty === 'hard' ? 50 : q.difficulty === 'medium' ? 40 : 30);
  
  return {
    id: data.id,
    question_text: extractQuestionText(q), // ✅ Use helper to extract from JSONB
    question_type: q.question_type,
    question_data: q.question_data,
    answer_data: q.answer_data,
    difficulty: q.difficulty || 'medium',
    xp_reward: xpReward, // ✅ Use distributed XP from assignments
    assignment_order: data.assignment_order
  };
}

/**
 * Check if a game is unlocked for a student
 */
export async function isGameUnlocked(
  studentId: string,
  topicId: string,
  gameId: string
): Promise<boolean> {
  const games = await fetchGamesForTopic(topicId);
  const gameIndex = games.findIndex(g => g.id === gameId);
  
  if (gameIndex === 0) return true; // First game always unlocked
  
  if (gameIndex === -1) return false;
  
  const previousGameId = games[gameIndex - 1]?.id;
  if (!previousGameId) return true;

  // Check if previous game is completed
  const { data } = await supabase
    .from('student_question_attempts')
    .select('is_correct')
    .eq('student_id', studentId)
    .eq('topic_id', topicId)
    .eq('question_id', previousGameId)
    .eq('is_correct', true)
    .maybeSingle();

  return !!data;
}

/**
 * Get first unlocked game for a student in a topic
 */
export async function getFirstUnlockedGameId(
  studentId: string,
  topicId: string
): Promise<string | null> {
  const games = await fetchGamesForTopic(topicId);
  
  if (games.length === 0) return null;

  for (const game of games) {
    const unlocked = await isGameUnlocked(studentId, topicId, game.id);
    if (unlocked) {
      // Check if already completed
      const { data } = await supabase
        .from('student_question_attempts')
        .select('is_correct')
        .eq('student_id', studentId)
        .eq('topic_id', topicId)
        .eq('question_id', game.id)
        .eq('is_correct', true)
        .maybeSingle();

      if (!data) return game.id; // First incomplete unlocked game
    }
  }

  return games[0]?.id || null; // Fallback to first game
}
