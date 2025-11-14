import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTopicColor } from "@/lib/progressColors";

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
                          const color = getTopicColor(completionRate);
                          
                          const getBackgroundColor = () => {
                            if (color.key === 'green') return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
                            if (color.key === 'red') return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
                            return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800';
                          };

                          return (
                            <TooltipProvider key={`${topic.topic_name}-${idx}`}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`flex items-center justify-between p-3 rounded-lg border ml-4 transition-colors cursor-pointer ${getBackgroundColor()}`}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      {color.key === 'green' ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                      ) : (
                                        <Clock className={`h-5 w-5 flex-shrink-0 ${color.key === 'red' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium">{topic.topic_name}</p>
                                        <p className="text-sm text-muted-foreground">{topic.chapter}</p>
                                      </div>
                                    </div>
                                    <div className="text-right ml-4">
                                      <Badge className={`${color.key === 'green' ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800' : color.key === 'red' ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800' : 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-800'}`}>
                                        {color.icon} {color.label}
                                      </Badge>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {topic.games_completed}/{topic.total_games} games ({completionRate.toFixed(0)}%)
                                      </p>
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-popover text-popover-foreground">
                                  <div className="space-y-1 text-sm">
                                    <p className="font-semibold">Progress Details</p>
                                    <p>Completion Rate: {completionRate.toFixed(1)}%</p>
                                    <p>Games: {topic.games_completed}/{topic.total_games}</p>
                                    <p>Chapter: {topic.chapter}</p>
                                    <p>Status: {color.label}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
