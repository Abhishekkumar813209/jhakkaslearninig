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
  // First get mapping IDs for this topic
  const { data: mappings } = await supabase
    .from('topic_content_mapping')
    .select('id')
    .eq('topic_id', topicId);
  
  const mappingIds = mappings?.map(m => m.id) || [];
  
  if (mappingIds.length === 0) {
    console.error("No content mappings found for topic:", topicId);
    return {
      prevGameId: null,
      nextGameId: null,
      currentGameNum: 1,
      totalGames: 0
    };
  }
  
  // Then get games using those mapping IDs
  const { data: games, error } = await supabase
    .from('gamified_exercises')
    .select('id, game_order')
    .in('topic_content_id', mappingIds)
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
  
  // Remove duplicates by game ID (in case same game is mapped multiple times)
  const uniqueGames = Array.from(
    new Map(games.map(g => [g.id, g])).values()
  );
  
  const currentIndex = uniqueGames.findIndex(g => g.id === currentGameId);
  
  return {
    prevGameId: currentIndex > 0 ? uniqueGames[currentIndex - 1].id : null,
    nextGameId: currentIndex < uniqueGames.length - 1 ? uniqueGames[currentIndex + 1].id : null,
    currentGameNum: currentIndex + 1,
    totalGames: uniqueGames.length
  };
}

export async function loadGameById(gameId: string) {
  const { data, error } = await supabase
    .from('gamified_exercises')
    .select('*')
    .eq('id', gameId)
    .single();
  
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
  // First get mapping IDs for this topic
  const { data: mappings } = await supabase
    .from('topic_content_mapping')
    .select('id')
    .eq('topic_id', topicId);
  
  const mappingIds = mappings?.map(m => m.id) || [];
  
  if (mappingIds.length === 0) return false;
  
  // Get all games for this topic in order
  const { data: games } = await supabase
    .from('gamified_exercises')
    .select('id, game_order')
    .in('topic_content_id', mappingIds)
    .order('game_order', { ascending: true });
  
  if (!games || games.length === 0) return false;
  
  // Remove duplicates
  const uniqueGames = Array.from(
    new Map(games.map(g => [g.id, g])).values()
  );
  
  const gameIndex = uniqueGames.findIndex(g => g.id === gameId);
  if (gameIndex === -1) return false;
  
  // First game is always unlocked
  if (gameIndex === 0) return true;
  
  // Check if previous game is completed
  const previousGameId = uniqueGames[gameIndex - 1].id;
  
  const { data: progress } = await supabase
    .from('student_topic_game_progress')
    .select('completed_game_ids')
    .eq('student_id', studentId)
    .eq('topic_id', topicId)
    .maybeSingle();
  
  if (!progress) return false;
  
  // Check if previous game is in completed list
  return progress.completed_game_ids?.includes(previousGameId) ?? false;
}

export async function getFirstUnlockedGameId(
  studentId: string,
  topicId: string
): Promise<string | null> {
  // First get mapping IDs for this topic
  const { data: mappings } = await supabase
    .from('topic_content_mapping')
    .select('id')
    .eq('topic_id', topicId);
  
  const mappingIds = mappings?.map(m => m.id) || [];
  
  if (mappingIds.length === 0) {
    console.error("No content mappings found for topic:", topicId);
    return null;
  }
  
  const { data: games } = await supabase
    .from('gamified_exercises')
    .select('id, game_order')
    .in('topic_content_id', mappingIds)
    .order('game_order', { ascending: true });
  
  if (!games || games.length === 0) {
    console.log("No games found for topic mappings:", mappingIds);
    return null;
  }
  
  // Remove duplicates
  const uniqueGames = Array.from(
    new Map(games.map(g => [g.id, g])).values()
  );
  
  // Get progress
  const { data: progress } = await supabase
    .from('student_topic_game_progress')
    .select('completed_game_ids')
    .eq('student_id', studentId)
    .eq('topic_id', topicId)
    .maybeSingle();
  
  const completedIds = progress?.completed_game_ids || [];
  
  // Find first incomplete game
  for (const game of uniqueGames) {
    if (!completedIds.includes(game.id)) {
      return game.id;
    }
  }
  
  // All completed? Return last game (for review)
  return uniqueGames[uniqueGames.length - 1].id;
}
