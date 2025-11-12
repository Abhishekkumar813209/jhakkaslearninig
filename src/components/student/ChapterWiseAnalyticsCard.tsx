import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Calendar, Zap, BookOpen, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Topic {
  topic_id: string;
  topic_name: string;
  average_score: number;
  games_completed: number;
  total_games: number;
  game_completion_rate: number;
  xp_from_games: number;
  xp_from_tests: number;
  total_xp: number;
  is_weak: boolean;
  status: 'green' | 'yellow' | 'red' | 'grey';
  last_practiced: string | null;
}

interface Chapter {
  chapter_id: string;
  chapter_name: string;
  subject: string;
  order_num: number;
  total_xp: number;
  completion_percentage: number;
  total_games: number;
  completed_games: number;
  topics: Topic[];
}

export function ChapterWiseAnalyticsCard({ studentId }: { studentId: string }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchChapterAnalytics();
  }, [studentId]);

  const fetchChapterAnalytics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('student-chapter-analytics', {
        body: { student_id: studentId }
      });

      if (error) throw error;
      setChapters(data.chapters || []);
    } catch (error: any) {
      console.error('Error fetching chapter analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load chapter analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-100 text-green-800 border-green-300';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'red': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 60) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const subjects = [...new Set(chapters.map(c => c.subject))];
  const filteredChapters = selectedSubject 
    ? chapters.filter(c => c.subject === selectedSubject)
    : chapters;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subject Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedSubject === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedSubject(null)}
        >
          All Subjects
        </Button>
        {subjects.map(subject => (
          <Button
            key={subject}
            variant={selectedSubject === subject ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSubject(subject)}
          >
            {subject}
          </Button>
        ))}
      </div>

      {/* Chapters Accordion */}
      <Accordion type="multiple" className="space-y-4">
        {filteredChapters.map((chapter) => (
          <AccordionItem 
            key={chapter.chapter_id} 
            value={chapter.chapter_id}
            className="border rounded-lg"
          >
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-start justify-between w-full pr-4">
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4" />
                    <h3 className="font-semibold">{chapter.chapter_name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {chapter.subject}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {chapter.completion_percentage}% Complete
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-yellow-500" />
                      {Number(chapter.total_xp).toFixed(2)} XP
                    </span>
                    <span>
                      {chapter.completed_games}/{chapter.total_games} Games
                    </span>
                  </div>
                </div>
                <Progress value={chapter.completion_percentage} className="w-24" />
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3 mt-4">
                {chapter.topics.map((topic) => (
                  <Card 
                    key={topic.topic_id}
                    className={`${topic.is_weak ? 'border-red-300 bg-red-50/50' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{topic.topic_name}</h4>
                            <Badge className={getStatusColor(topic.status)}>
                              {topic.status.toUpperCase()}
                            </Badge>
                            {topic.is_weak && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Weak Topic
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Test Score</div>
                              <div className={`font-semibold ${getScoreColor(topic.average_score)}`}>
                                {topic.average_score.toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Games</div>
                              <div className="font-semibold">
                                {topic.games_completed}/{topic.total_games}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground flex items-center gap-1">
                                <Zap className="h-3 w-3 text-yellow-500" />
                                Games XP
                              </div>
                              <div className="font-semibold">{topic.xp_from_games}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground flex items-center gap-1">
                                <Zap className="h-3 w-3 text-blue-500" />
                                Tests XP
                              </div>
                              <div className="font-semibold">{topic.xp_from_tests}</div>
                            </div>
                          </div>

                          {topic.last_practiced && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                              <Calendar className="h-3 w-3" />
                              Last practiced: {new Date(topic.last_practiced).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <Button 
                          size="sm" 
                          variant={topic.is_weak ? "destructive" : "default"}
                          onClick={() => navigate(`/student/topic/${topic.topic_id}`)}
                        >
                          {topic.is_weak ? 'Practice Now' : 'Continue'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {filteredChapters.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No chapters found for {selectedSubject || 'any subject'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
