import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen } from "lucide-react";
import { SmartQuestionExtractorNew } from "./SmartQuestionExtractorNew";

interface CentralizedQuestionBrowserProps {
  examDomain: string;
  board?: string;
  classLevel?: string;
  subject: string;
  chapterName: string;
  batchId: string;
  roadmapTopicId: string;
  roadmapTopicName: string;
  onQuestionsAdded: () => void;
}

interface ChapterLibrary {
  id: string;
  chapter_name: string;
  full_topics: Array<{
    topic_name: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }> | null;
}

export const CentralizedQuestionBrowser = ({
  examDomain,
  board,
  classLevel,
  subject,
  chapterName,
  batchId,
  roadmapTopicId,
  roadmapTopicName,
  onQuestionsAdded
}: CentralizedQuestionBrowserProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [chapterLibrary, setChapterLibrary] = useState<ChapterLibrary | null>(null);
  const [selectedTopicName, setSelectedTopicName] = useState<string>('');

  useEffect(() => {
    fetchMatchingChapterLibrary();
  }, [examDomain, board, classLevel, subject, chapterName]);

  const fetchMatchingChapterLibrary = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('chapter_library')
        .select('id, chapter_name, full_topics, exam_type, display_order')
        .eq('exam_type', examDomain)
        .eq('subject', subject)
        .eq('is_active', true)
        .ilike('chapter_name', `%${chapterName}%`)
        .order('display_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "No Matching Chapter Found",
          description: "No centralized chapter library found for this context. Please create one in Chapter Library Manager.",
          variant: "destructive"
        });
        setChapterLibrary(null);
        return;
      }

      setChapterLibrary({
        ...data,
        full_topics: (data.full_topics as any) || []
      });
    } catch (error: any) {
      console.error('Error fetching chapter library:', error);
      toast({
        title: "Error",
        description: "Failed to fetch centralized chapter library",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!chapterLibrary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Centralized Chapter Found</CardTitle>
          <CardDescription>
            No matching chapter library found for this context. Please create one in Chapter Library Manager.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const topics = chapterLibrary.full_topics || [];

  if (topics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Topics Available</CardTitle>
          <CardDescription>
            The chapter "{chapterLibrary.chapter_name}" has no topics. Please generate topics in Chapter Library Manager.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Browse Centralized Questions</CardTitle>
          <CardDescription>
            Pull questions from centralized chapter: "{chapterLibrary.chapter_name}" → Add to batch topic: "{roadmapTopicName}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Topic Selection */}
          {!selectedTopicName && (
            <div>
              <h3 className="text-sm font-medium mb-3">Select a Topic</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {topics.map((topic, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start text-left"
                    onClick={() => setSelectedTopicName(topic.topic_name)}
                  >
                    <div className="flex items-start justify-between w-full mb-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={topic.difficulty === 'hard' ? 'destructive' : topic.difficulty === 'medium' ? 'default' : 'secondary'}>
                        {topic.difficulty}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium line-clamp-2">{topic.topic_name}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Full-Featured Question Extractor UI */}
          {selectedTopicName && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedTopicName('')}
                >
                  ← Back to Topics
                </Button>
                <div className="text-sm text-muted-foreground">
                  Topic: <span className="font-medium">{selectedTopicName}</span>
                </div>
              </div>

              {/* Render SmartQuestionExtractorNew with centralized mode */}
              <SmartQuestionExtractorNew
                mode="centralized"
                chapterLibraryId={chapterLibrary.id}
                centralizedTopicName={selectedTopicName}
                applicableClasses={classLevel ? [classLevel] : []}
                applicableExams={[examDomain]}
                selectedTopic={roadmapTopicId}
                selectedTopicName={roadmapTopicName}
                selectedBatch={batchId}
                selectedExamDomain={examDomain}
                onQuestionsAdded={() => {
                  onQuestionsAdded();
                  toast({
                    title: "Questions Added",
                    description: "Selected questions have been added to the batch topic"
                  });
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};