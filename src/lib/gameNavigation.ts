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
  const { data: games, error } = await supabase
    .from('gamified_exercises')
    .select('id, game_order')
    .eq('topic_content_id', topicId)
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
    .single();
  
  if (error) {
    console.error("Error loading game:", error);
    return null;
  }
  
  return data;
}
