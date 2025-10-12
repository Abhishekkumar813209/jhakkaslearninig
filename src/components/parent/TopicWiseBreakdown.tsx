import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Star, Clock } from "lucide-react";

interface TopicAnalytics {
  topic_name: string;
  times_practiced: number;
  average_score: number;
  total_xp_earned: number;
  time_spent_minutes: number;
  mastery_level: 'beginner' | 'intermediate' | 'advanced' | 'master';
  last_practiced_at: string;
}

interface TopicWiseBreakdownProps {
  topicsBySubject: Record<string, TopicAnalytics[]>;
}

export const TopicWiseBreakdown = ({ topicsBySubject }: TopicWiseBreakdownProps) => {
  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'master': return 'bg-purple-500 text-white';
      case 'advanced': return 'bg-green-500 text-white';
      case 'intermediate': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Topic-wise Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {Object.entries(topicsBySubject).map(([subject, topics]) => (
            <AccordionItem key={subject} value={subject}>
              <AccordionTrigger className="text-lg font-semibold">
                {subject}
                <Badge variant="outline" className="ml-2">
                  {topics.length} topics
                </Badge>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {topics.map((topic, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium">{topic.topic_name}</h4>
                          <div className="flex gap-2 mt-2">
                            <Badge className={getMasteryColor(topic.mastery_level)}>
                              {topic.mastery_level}
                            </Badge>
                            <Badge variant="secondary">
                              <Star className="h-3 w-3 mr-1" />
                              {topic.total_xp_earned} XP
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {topic.time_spent_minutes} mins
                          </div>
                          <div className="mt-1">
                            Last: {new Date(topic.last_practiced_at || Date.now()).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Average Score</span>
                          <span className="font-bold">{Number(topic.average_score ?? 0).toFixed(1)}%</span>
                        </div>
                        <Progress value={topic.average_score} className="h-2" />
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        Practiced {topic.times_practiced} times
                      </div>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};