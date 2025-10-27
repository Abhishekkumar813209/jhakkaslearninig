import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DailyTopicProgress {
  date: string;
  day_number: number;
  subject: string;
  chapter: string;
  topic_name: string;
  is_completed: boolean;
  completed_at: string | null;
  games_completed: number;
  total_games: number;
  game_completion_rate: number;
}

interface RoadmapDailyCalendarProps {
  dailyProgress: Record<string, Record<string, DailyTopicProgress[]>>;
}

export function RoadmapDailyCalendar({ dailyProgress }: RoadmapDailyCalendarProps) {
  const dates = Object.keys(dailyProgress).sort();

  if (dates.length === 0) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Roadmap Progress</CardTitle>
        <CardDescription>Topic-wise completion status from student's roadmap</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {dates.map((date) => {
            const isToday = date === today;
            const subjects = Object.keys(dailyProgress[date]);
            const totalTopics = subjects.reduce((sum, subj) => sum + dailyProgress[date][subj].length, 0);
            const completedTopics = subjects.reduce(
              (sum, subj) => sum + dailyProgress[date][subj].filter(t => t.is_completed).length,
              0
            );

            return (
              <AccordionItem key={date} value={date}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${isToday ? 'text-primary' : ''}`}>
                        📅 {formatDate(date)}
                      </span>
                      {isToday && (
                        <Badge variant="default" className="text-xs">Today</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={completedTopics === totalTopics ? "default" : "secondary"}>
                        {completedTopics}/{totalTopics} topics
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {subjects.map((subject) => (
                      <div key={subject} className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground">{subject}</h4>
                        {dailyProgress[date][subject].map((topic, idx) => {
                          const completionRate = topic.total_games > 0 ? (topic.games_completed / topic.total_games) * 100 : 0;
                          
                          const getBackgroundColor = () => {
                            if (completionRate > 70) return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
                            if (completionRate >= 50) return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800';
                            if (completionRate > 0) return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
                            return 'bg-muted/30 border-muted';
                          };

                          return (
                            <div
                              key={`${topic.topic_name}-${idx}`}
                              className={`flex items-center justify-between p-3 rounded-lg border ml-4 transition-colors ${getBackgroundColor()}`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {completionRate > 70 ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                ) : completionRate >= 50 ? (
                                  <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                                ) : completionRate > 0 ? (
                                  <Clock className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                ) : (
                                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium">{topic.topic_name}</p>
                                  <p className="text-sm text-muted-foreground">{topic.chapter}</p>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                {completionRate > 70 ? (
                                  <Badge className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
                                    ✓ Excellent
                                  </Badge>
                                ) : completionRate >= 50 ? (
                                  <Badge className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-800">
                                    ⏳ In Progress
                                  </Badge>
                                ) : completionRate > 0 ? (
                                  <Badge className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">
                                    🔴 Needs Attention
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    ⚪ Not Started
                                  </Badge>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {topic.games_completed}/{topic.total_games} games ({completionRate.toFixed(0)}%)
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
