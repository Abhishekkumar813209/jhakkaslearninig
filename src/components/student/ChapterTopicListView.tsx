import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Lock, Unlock, CheckCircle2, Clock, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";

interface Topic {
  id: string;
  topic_name: string;
  estimated_hours: number;
  day_number: number;
  status: string;
  progress_percentage: number;
  book_page_reference?: string;
  xp_reward?: number;
  coin_reward?: number;
}

interface ChapterTopicListViewProps {
  chapterId: string;
  chapterName: string;
  topics: Topic[];
  onTopicClick: (topicId: string, topicName: string) => void;
  onBack: () => void;
}

export const ChapterTopicListView = ({ 
  chapterId, 
  chapterName, 
  topics, 
  onTopicClick, 
  onBack 
}: ChapterTopicListViewProps) => {
  const [sortedTopics, setSortedTopics] = useState<Topic[]>([]);

  useEffect(() => {
    // Sort topics by day_number
    const sorted = [...topics].sort((a, b) => a.day_number - b.day_number);
    setSortedTopics(sorted);
  }, [topics]);

  const getTopicStatus = (index: number, topic: Topic) => {
    if (topic.status === "completed") return "completed";
    if (index === 0) return "unlocked"; // First topic is always unlocked
    
    // Check if previous topic is completed
    const prevTopic = sortedTopics[index - 1];
    if (prevTopic && prevTopic.status === "completed") return "unlocked";
    
    return "locked";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "unlocked":
        return <Unlock className="h-5 w-5 text-primary" />;
      default:
        return <Lock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-success bg-success/5 hover:bg-success/10";
      case "unlocked":
        return "border-primary bg-primary/5 hover:bg-primary/10 cursor-pointer";
      default:
        return "border-muted bg-muted/5 cursor-not-allowed opacity-60";
    }
  };

  const completedCount = sortedTopics.filter(t => t.status === "completed").length;
  const totalProgress = sortedTopics.length > 0 
    ? (completedCount / sortedTopics.length) * 100 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Roadmap
        </Button>

        <Card className="card-gradient shadow-medium">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl">{chapterName}</CardTitle>
                <CardDescription className="text-base">
                  {sortedTopics.length} Topics • {completedCount} Completed
                </CardDescription>
              </div>
              <Badge variant={totalProgress === 100 ? "default" : "secondary"} className="text-lg px-4 py-2">
                {Math.round(totalProgress)}%
              </Badge>
            </div>
            <Progress value={totalProgress} className="h-2 mt-4" />
          </CardHeader>
        </Card>
      </div>

      {/* Info Box */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
        <p className="font-medium text-primary flex items-center gap-2">
          <BookMarked className="h-4 w-4" />
          W3Schools Style Learning Path
        </p>
        <p className="text-sm text-muted-foreground">
          Complete each topic to unlock the next one. Topics are presented in a sequential order for optimal learning.
        </p>
      </div>

      {/* Topics List */}
      <div className="space-y-3">
        {sortedTopics.map((topic, index) => {
          const status = getTopicStatus(index, topic);
          const isClickable = status === "unlocked" || status === "completed";

          return (
            <Card
              key={topic.id}
              className={cn(
                "transition-all duration-200 border-2",
                getStatusColor(status),
                isClickable && "card-interactive"
              )}
              onClick={() => isClickable && onTopicClick(topic.id, topic.topic_name)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(status)}
                  </div>

                  {/* Topic Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg leading-tight">
                          {index + 1}. {topic.topic_name}
                        </h3>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {topic.estimated_hours && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {topic.estimated_hours}h
                            </span>
                          )}
                          {topic.book_page_reference && (
                            <span className="flex items-center gap-1">
                              <BookMarked className="h-3 w-3" />
                              Page {topic.book_page_reference}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rewards */}
                      {(topic.xp_reward || topic.coin_reward) && (
                        <div className="flex gap-2 flex-shrink-0">
                          {topic.xp_reward && (
                            <Badge variant="outline" className="bg-primary/5">
                              +{topic.xp_reward} XP
                            </Badge>
                          )}
                          {topic.coin_reward && (
                            <Badge variant="outline" className="bg-warning/5">
                              +{topic.coin_reward} 🪙
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar (for unlocked topics) */}
                    {status === "unlocked" && topic.progress_percentage > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>In Progress</span>
                          <span>{topic.progress_percentage}%</span>
                        </div>
                        <Progress value={topic.progress_percentage} className="h-1.5" />
                      </div>
                    )}

                    {/* Status Message */}
                    {status === "locked" && (
                      <p className="text-xs text-muted-foreground italic">
                        🔒 Complete the previous topic to unlock
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion Message */}
      {totalProgress === 100 && (
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-6 text-center space-y-2">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <h3 className="text-xl font-bold text-success">Chapter Completed! 🎉</h3>
            <p className="text-muted-foreground">
              Congratulations! You've completed all topics in {chapterName}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};