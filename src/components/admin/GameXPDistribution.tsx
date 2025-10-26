import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DistributionResult {
  topic_id: string;
  topic_name: string;
  total_games: number;
  xp_budget: number;
  total_allocated: number;
  distribution: Array<{
    id: string;
    old_xp: number;
    new_xp: number;
    game_order: number;
  }>;
  applied: boolean;
  error?: string;
}

export const GameXPDistribution = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DistributionResult[]>([]);
  const [batchId, setBatchId] = useState<string>("");
  const { toast } = useToast();

  const applyDistribution = async (topicId?: string) => {
    try {
      setLoading(true);
      const body = topicId 
        ? { topic_id: topicId, dry_run: false }
        : { batch_id: batchId, dry_run: false };

      const { data, error } = await supabase.functions.invoke('auto-distribute-xp', {
        body
      });

      if (error) throw error;

      if (data?.success) {
        setResults(data.results);
        toast({
          title: "XP Distribution Applied",
          description: `Successfully distributed XP across ${data.topics_processed} topic(s)`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Distribution Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Game XP Auto-Distribution
          </CardTitle>
          <CardDescription>
            Automatically distribute XP budgets (30/40/50 XP) across games in topics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Batch ID"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button
              onClick={() => applyDistribution()}
              disabled={loading || !batchId}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Distribute All"}
            </Button>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold">How it works:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Each topic has an XP budget from `roadmap_topics.xp_reward`</li>
              <li>XP is distributed evenly across all games in the topic</li>
              <li>Remainder XP is given to the first N games</li>
              <li>Example: 30 XP budget ÷ 13 games = 4 games get 3 XP, 9 games get 2 XP</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Distribution Results</h3>
          {results.map((result) => (
            <Card key={result.topic_id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{result.topic_name}</span>
                  {result.applied && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Applied
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {result.error ? (
                    <span className="text-destructive">{result.error}</span>
                  ) : (
                    <>
                      {result.total_games} games | Budget: {result.xp_budget} XP | 
                      Allocated: {result.total_allocated} XP
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              {!result.error && result.distribution && (
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {result.distribution.slice(0, 12).map((game) => (
                      <div
                        key={game.id}
                        className="p-2 border rounded text-sm"
                      >
                        Game {game.game_order}: 
                        <span className="ml-2 font-semibold">
                          {game.old_xp} → {game.new_xp} XP
                        </span>
                      </div>
                    ))}
                  </div>
                  {result.distribution.length > 12 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      ...and {result.distribution.length - 12} more games
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
