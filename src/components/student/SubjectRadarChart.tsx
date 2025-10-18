import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SubjectScore {
  subject: string;
  overall_score: number;
  test_score: number;
  topic_mastery: number;
  game_completion: number;
}

export function SubjectRadarChart({ studentId }: { studentId: string }) {
  const [subjectScores, setSubjectScores] = useState<SubjectScore[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubjectScores();
  }, [studentId]);

  const fetchSubjectScores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('calculate_subject_scores', {
        p_student_id: studentId
      });

      if (error) throw error;
      setSubjectScores(data || []);
    } catch (error: any) {
      console.error('Error fetching subject scores:', error);
      toast({
        title: "Error",
        description: "Failed to load subject analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading subject analysis...</div>
        </CardContent>
      </Card>
    );
  }

  const radarData = subjectScores.map(score => ({
    subject: score.subject,
    'Overall': Number(score.overall_score),
    'Tests': Number(score.test_score),
    'Mastery': Number(score.topic_mastery),
    'Games': Number(score.game_completion)
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Subject Performance Analysis
              <Badge variant="outline" className="text-xs">Backend Controlled</Badge>
            </CardTitle>
            <CardDescription>
              Comprehensive view of your performance across all subjects
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground max-w-xs">
            <div className="flex items-start gap-1">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Overall Score</strong> = 50% Tests + 30% Topic Mastery + 20% Game Completion
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {radarData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar 
                  name="Overall Score" 
                  dataKey="Overall" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6} 
                />
                <Radar 
                  name="Test Performance" 
                  dataKey="Tests" 
                  stroke="hsl(var(--chart-1))" 
                  fill="hsl(var(--chart-1))" 
                  fillOpacity={0.3} 
                />
                <Radar 
                  name="Topic Mastery" 
                  dataKey="Mastery" 
                  stroke="hsl(var(--chart-2))" 
                  fill="hsl(var(--chart-2))" 
                  fillOpacity={0.3} 
                />
                <Radar 
                  name="Game Completion" 
                  dataKey="Games" 
                  stroke="hsl(var(--chart-3))" 
                  fill="hsl(var(--chart-3))" 
                  fillOpacity={0.3} 
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>

            {/* Detailed Breakdown */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectScores.map((score) => (
                <Card key={score.subject}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">{score.subject}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Overall:</span>
                        <span className="font-semibold">{Number(score.overall_score).toFixed(1)}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tests:</span>
                        <span>{Number(score.test_score).toFixed(1)}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mastery:</span>
                        <span>{Number(score.topic_mastery).toFixed(1)}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Games:</span>
                        <span>{Number(score.game_completion).toFixed(1)}/100</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No subject data available yet. Start completing tests and games to see your analysis.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
