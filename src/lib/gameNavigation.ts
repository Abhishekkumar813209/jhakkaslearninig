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
  // Get mapping for this topic
  const { data: mapping } = await supabase
    .from('topic_content_mapping')
    .select('id')
    .eq('topic_id', topicId)
    .maybeSingle();
  
  if (!mapping) {
    console.error("No content mapping found for topic:", topicId);
    return {
      prevGameId: null,
      nextGameId: null,
      currentGameNum: 1,
      totalGames: 0
    };
  }
  
  // Get games for this mapping, ordered by game_order
  const { data: games, error } = await supabase
    .from('gamified_exercises')
    .select('id, game_order')
    .eq('topic_content_id', mapping.id)
    .order('game_order', { ascending: true });
  
  if (error || !games) {
    console.error("Error fetching games:", error);
    return {
      prevGameId: null,
      nextGameId: null,
      currentGameNum: 1,
      totalGames: 0
    };
  }
  
  // Verify current game still exists
  const currentGameExists = games.some(g => g.id === currentGameId);
  if (!currentGameExists) {
    console.warn(`Game ${currentGameId} no longer exists. Returning first game.`);
    return {
      prevGameId: null,
      nextGameId: games.length > 1 ? games[1].id : null,
      currentGameNum: 1,
      totalGames: games.length
    };
  }
  
  // Find current game index in all games
  const currentIndex = games.findIndex(g => g.id === currentGameId);
  
  return {
    prevGameId: currentIndex > 0 ? games[currentIndex - 1].id : null,
    nextGameId: currentIndex < games.length - 1 ? games[currentIndex + 1].id : null,
    currentGameNum: currentIndex + 1,
    totalGames: games.length
  };
}

export async function loadGameById(gameId: string) {
  const { data, error } = await supabase
    .from('gamified_exercises')
    .select('*')
    .eq('id', gameId)
    .maybeSingle();
  
  if (error) {
    console.error("Error loading game:", error);
    return null;
  }
  
  return data;
}

export async function isGameUnlocked(
  studentId: string,
  topicId: string, 
  gameId: string
): Promise<boolean> {
  // Get mapping for this topic
  const { data: mapping } = await supabase
    .from('topic_content_mapping')
    .select('id')
    .eq('topic_id', topicId)
    .maybeSingle();
  
  if (!mapping) return false;
  
  // Get all games for this topic
  const { data: games } = await supabase
    .from('gamified_exercises')
    .select('id, game_order')
    .eq('topic_content_id', mapping.id)
    .order('game_order', { ascending: true });
  
  if (!games || games.length === 0) return false;
  
  const gameIndex = games.findIndex(g => g.id === gameId);
  if (gameIndex === -1) return false;
  
  // First game is always unlocked
  if (gameIndex === 0) return true;
  
  // Check if previous game is completed
  const previousGameId = games[gameIndex - 1].id;
  
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
  // Get mapping for this topic
  const { data: mapping } = await supabase
    .from('topic_content_mapping')
    .select('id')
    .eq('topic_id', topicId)
    .maybeSingle();
  
  if (!mapping) {
    console.log("No mapping found for topic:", topicId);
    return null;
  }
  
  // Get all games for this topic
  const { data: games } = await supabase
    .from('gamified_exercises')
    .select('id, game_order')
    .eq('topic_content_id', mapping.id)
    .order('game_order', { ascending: true });
  
  if (!games || games.length === 0) {
    console.log("No games found for topic mapping:", mapping.id);
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
  for (const game of games) {
    if (!completedIds.includes(game.id)) {
      return game.id;
    }
  }
  
  // All completed? Return last game (for review)
  return games[games.length - 1].id;
}
