import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { XP_REWARDS } from '@/lib/xpConfig';

interface GameXPRow {
  id: string;
  question_text: string;
  exercise_type: string;
  difficulty: string;
  marks: number;
  xp_reward: number;
  coin_reward: number;
  game_order: number;
}

export const GameXPTable = ({ topicId }: { topicId: string }) => {
  const [games, setGames] = useState<GameXPRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [modified, setModified] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGames();
  }, [topicId]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('gamified_exercises')
        .select(`
          id,
          question_text,
          exercise_type,
          difficulty,
          marks,
          xp_reward,
          coin_reward,
          game_order,
          topic_content_mapping!inner(topic_id)
        `)
        .eq('topic_content_mapping.topic_id', topicId)
        .order('game_order');

      if (error) throw error;

      setGames(data || []);
      setModified(new Set());
    } catch (error: any) {
      console.error('Error fetching games:', error);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const updateGame = (gameId: string, field: keyof GameXPRow, value: any) => {
    setGames(prev => prev.map(game => 
      game.id === gameId ? { ...game, [field]: value } : game
    ));
    setModified(prev => new Set(prev).add(gameId));
  };

  const saveGame = async (gameId: string) => {
    try {
      setSaving(gameId);
      const game = games.find(g => g.id === gameId);
      if (!game) return;

      const { error } = await supabase
        .from('gamified_exercises')
        .update({
          xp_reward: game.xp_reward,
          coin_reward: game.coin_reward,
          marks: game.marks,
          difficulty: game.difficulty,
        })
        .eq('id', gameId);

      if (error) throw error;

      setModified(prev => {
        const next = new Set(prev);
        next.delete(gameId);
        return next;
      });

      toast.success('Game XP updated');
    } catch (error: any) {
      console.error('Error updating game:', error);
      toast.error('Failed to update game XP');
    } finally {
      setSaving(null);
    }
  };

  const saveAllGames = async () => {
    try {
      setSaving('all');
      const updates = Array.from(modified).map(gameId => {
        const game = games.find(g => g.id === gameId);
        if (!game) return null;

        return supabase
          .from('gamified_exercises')
          .update({
            xp_reward: game.xp_reward,
            coin_reward: game.coin_reward,
            marks: game.marks,
            difficulty: game.difficulty,
          })
          .eq('id', gameId);
      });

      await Promise.all(updates.filter(Boolean));

      setModified(new Set());
      toast.success(`${updates.length} games updated successfully`);
    } catch (error: any) {
      console.error('Error updating games:', error);
      toast.error('Failed to update games');
    } finally {
      setSaving(null);
    }
  };

  const resetToDefaults = async () => {
    try {
      setSaving('all');
      
      const updates = games.map(game => {
        const difficulty = game.difficulty as 'easy' | 'medium' | 'hard';
        const defaultXP = XP_REWARDS.game[difficulty] || 10;
        
        return supabase
          .from('gamified_exercises')
          .update({
            xp_reward: defaultXP,
            coin_reward: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 5,
          })
          .eq('id', game.id);
      });

      await Promise.all(updates);
      await fetchGames();
      toast.success('Reset to default XP values');
    } catch (error: any) {
      console.error('Error resetting games:', error);
      toast.error('Failed to reset XP values');
    } finally {
      setSaving(null);
    }
  };

  const exerciseTypeLabels: Record<string, string> = {
    mcq: 'MCQ',
    match_pairs: 'Match Pairs',
    fill_blank: 'Fill Blanks',
    drag_drop: 'Drag & Drop',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalXP = games.reduce((sum, game) => sum + (game.xp_reward || 0), 0);
  const avgXP = games.length > 0 ? (totalXP / games.length).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-[250px]">Question</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="w-24">Marks</TableHead>
              <TableHead className="w-24">XP Reward</TableHead>
              <TableHead className="w-24">Coin Reward</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map((game, index) => (
              <TableRow key={game.id} className={modified.has(game.id) ? 'bg-accent/50' : ''}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="text-sm">
                  {game.question_text?.substring(0, 100)}
                  {(game.question_text?.length || 0) > 100 ? '...' : ''}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {exerciseTypeLabels[game.exercise_type] || game.exercise_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={game.difficulty}
                    onValueChange={(value) => updateGame(game.id, 'difficulty', value)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    value={game.marks}
                    onChange={(e) => updateGame(game.id, 'marks', parseInt(e.target.value))}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={game.xp_reward}
                    onChange={(e) => updateGame(game.id, 'xp_reward', parseInt(e.target.value))}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={game.coin_reward}
                    onChange={(e) => updateGame(game.id, 'coin_reward', parseInt(e.target.value))}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => saveGame(game.id)}
                    disabled={!modified.has(game.id) || saving === game.id}
                  >
                    {saving === game.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Total Games:</span>
            <span className="font-semibold ml-2">{games.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total XP:</span>
            <span className="font-semibold ml-2">{totalXP}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg XP:</span>
            <span className="font-semibold ml-2">{avgXP}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            disabled={saving === 'all'}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button
            size="sm"
            onClick={saveAllGames}
            disabled={modified.size === 0 || saving === 'all'}
          >
            {saving === 'all' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All ({modified.size})
          </Button>
        </div>
      </div>
    </div>
  );
};
