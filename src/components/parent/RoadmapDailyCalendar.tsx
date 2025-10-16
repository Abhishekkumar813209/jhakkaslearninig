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
                        {dailyProgress[date][subject].map((topic, idx) => (
                          <div
                            key={`${topic.topic_name}-${idx}`}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card ml-4"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {topic.is_completed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                              ) : (
                                <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{topic.topic_name}</p>
                                <p className="text-sm text-muted-foreground">{topic.chapter}</p>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              {topic.is_completed ? (
                                <Badge variant="default" className="bg-green-600">
                                  ✓ Completed
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  ⏳ Pending
                                </Badge>
                              )}
                              {topic.games_completed > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {topic.games_completed} games done
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
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
