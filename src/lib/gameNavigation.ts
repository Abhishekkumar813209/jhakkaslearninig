import { supabase } from "@/integrations/supabase/client";

export interface GameNavigationInfo {
  prevGameId: string | null;
  nextGameId: string | null;
  currentGameNum: number;
  totalGames: number;
}

export async function getAdjacentGames(
  topicId: string,
  currentGameId: string
): Promise<GameNavigationInfo> {
  // Fetch games from BOTH sources and merge
  const allGames = await fetchMergedGamesForTopic(topicId);
  
  if (allGames.length === 0) {
    return {
      prevGameId: null,
      nextGameId: null,
      currentGameNum: 1,
      totalGames: 0
    };
  }
  
  // Verify current game still exists
  const currentGameExists = allGames.some(g => g.id === currentGameId);
  if (!currentGameExists) {
    console.warn(`Game ${currentGameId} no longer exists. Returning first game.`);
    return {
      prevGameId: null,
      nextGameId: allGames.length > 1 ? allGames[1].id : null,
      currentGameNum: 1,
      totalGames: allGames.length
    };
  }
  
  // Find current game index in all games
  const currentIndex = allGames.findIndex(g => g.id === currentGameId);
  
  return {
    prevGameId: currentIndex > 0 ? allGames[currentIndex - 1].id : null,
    nextGameId: currentIndex < allGames.length - 1 ? allGames[currentIndex + 1].id : null,
    currentGameNum: currentIndex + 1,
    totalGames: allGames.length
  };
}

export async function loadGameById(gameId: string) {
  // Try gamified_exercises first (lesson library games)
  const { data: lessonGame, error: lessonError } = await supabase
    .from('gamified_exercises')
    .select('*')
    .eq('id', gameId)
    .maybeSingle();
  
  if (lessonGame) return lessonGame;
  
  // Fallback to batch_question_assignments (centralized questions)
  const { data: assignedQuestion, error: assignedError } = await supabase
    .from('batch_question_assignments')
    .select(`
      question_id,
      question_bank!inner(
        id,
        question_text,
        question_type,
        question_data,
        answer_data,
        difficulty,
        created_at
      )
    `)
    .eq('question_bank.id', gameId)
    .maybeSingle();
  
  if (assignedError || !assignedQuestion) {
    console.error("Error loading game:", lessonError || assignedError);
    return null;
  }
  
  // Transform question_bank format to gamified_exercises format
  const qb = assignedQuestion.question_bank;
  return {
    id: qb.id,
    exercise_type: qb.question_type,
    exercise_data: qb.question_data,
    correct_answer: qb.answer_data,
    difficulty: qb.difficulty,
    xp_reward: 10, // default XP
    created_at: qb.created_at
  };
}

export async function isGameUnlocked(
  studentId: string,
  topicId: string, 
  gameId: string
): Promise<boolean> {
  // Fetch merged games from both sources
  const allGames = await fetchMergedGamesForTopic(topicId);
  
  if (allGames.length === 0) return false;
  
  const gameIndex = allGames.findIndex(g => g.id === gameId);
  if (gameIndex === -1) return false;
  
  // First game is always unlocked
  if (gameIndex === 0) return true;
  
  // Check if previous game is completed
  const previousGameId = allGames[gameIndex - 1].id;
  
  const { data: progress } = await supabase
    .from('student_topic_game_progress')
    .select('completed_game_ids')
    .eq('student_id', studentId)
    .eq('topic_id', topicId)
    .maybeSingle();
  
  if (!progress) return false;
  
  return progress.completed_game_ids?.includes(previousGameId) ?? false;
}

export async function getFirstUnlockedGameId(
  studentId: string,
  topicId: string
): Promise<string | null> {
  // Fetch merged games from both sources
  const allGames = await fetchMergedGamesForTopic(topicId);
  
  if (allGames.length === 0) {
    console.log("No games found for topic:", topicId);
    return null;
  }
  
  // Get progress
  const { data: progress } = await supabase
    .from('student_topic_game_progress')
    .select('completed_game_ids')
    .eq('student_id', studentId)
    .eq('topic_id', topicId)
    .maybeSingle();
  
  const completedIds = progress?.completed_game_ids || [];
  
  // Find first incomplete game
  for (const game of allGames) {
    if (!completedIds.includes(game.id)) {
      return game.id;
    }
  }
  
  // All completed? Return last game (for review)
  return allGames[allGames.length - 1].id;
}

// Helper function to fetch and merge games from both sources
async function fetchMergedGamesForTopic(topicId: string): Promise<Array<{id: string, order: number}>> {
  // SOURCE 1: Legacy lesson library games (gamified_exercises)
  const { data: mapping } = await supabase
    .from('topic_content_mapping')
    .select('id')
    .eq('topic_id', topicId)
    .maybeSingle();
  
  let lessonGames: Array<{id: string, order: number}> = [];
  if (mapping) {
    const { data: games } = await supabase
      .from('gamified_exercises')
      .select('id, game_order')
      .eq('topic_content_id', mapping.id)
      .order('game_order', { ascending: true });
    
    lessonGames = (games || []).map(g => ({ id: g.id, order: g.game_order || 0 }));
  }
  
  // SOURCE 2: Centralized assigned questions (batch_question_assignments)
  const { data: assignments } = await supabase
    .from('batch_question_assignments')
    .select('question_id, assignment_order')
    .eq('roadmap_topic_id', topicId)
    .eq('is_active', true)
    .order('assignment_order', { ascending: true });
  
  const assignedGames = (assignments || []).map(a => ({ 
    id: a.question_id, 
    order: 1000 + (a.assignment_order || 0) // Offset to place after lesson games
  }));
  
  // Merge and deduplicate (lesson games take priority)
  const gameMap = new Map<string, number>();
  lessonGames.forEach(g => gameMap.set(g.id, g.order));
  assignedGames.forEach(g => {
    if (!gameMap.has(g.id)) {
      gameMap.set(g.id, g.order);
    }
  });
  
  // Sort by order
  return Array.from(gameMap.entries())
    .map(([id, order]) => ({ id, order }))
    .sort((a, b) => a.order - b.order);
}
