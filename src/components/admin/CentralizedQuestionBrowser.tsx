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

  const handleAssignToBatch = async (questionIds: string[]) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get highest current assignment_order for this topic
      const { data: existingAssignments } = await supabase
        .from('batch_question_assignments')
        .select('assignment_order')
        .eq('roadmap_topic_id', roadmapTopicId)
        .order('assignment_order', { ascending: false })
        .limit(1);

      const startOrder = existingAssignments?.[0]?.assignment_order ?? -1;

      const assignments = questionIds.map((qId, index) => ({
        batch_id: batchId,
        roadmap_topic_id: roadmapTopicId,
        question_id: qId,
        chapter_library_id: chapterLibrary!.id,
        assigned_by: user.id,
        assignment_order: startOrder + index + 1,
        is_active: true,
      }));

      // Use upsert with onConflict to handle duplicates gracefully
      const { data, error } = await supabase
        .from('batch_question_assignments')
        .upsert(assignments, { 
          onConflict: 'batch_id,roadmap_topic_id,question_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) throw error;

      const newAssignments = data?.length || 0;
      const alreadyAssigned = questionIds.length - newAssignments;

      if (newAssignments > 0) {
        toast({
          title: "Questions Assigned",
          description: `Successfully assigned ${newAssignments} new question(s) to "${roadmapTopicName}"${alreadyAssigned > 0 ? ` (${alreadyAssigned} already assigned)` : ''}`,
        });
      } else {
        toast({
          title: "Already Assigned",
          description: `All ${questionIds.length} question(s) were already assigned to this batch topic`,
        });
      }
      
      onQuestionsAdded();
    } catch (error: any) {
      console.error('Assignment error:', error);
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  // Don't render SmartQuestionExtractorNew until a topic is selected
  if (!selectedTopicName) {
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
            <div>
              <h3 className="text-sm font-medium mb-3">Select a Topic to Browse Questions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {topics.map((topic, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start text-left hover:ring-2 hover:ring-primary"
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only render SmartQuestionExtractorNew AFTER topic selection
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Browse Centralized Questions</CardTitle>
          <CardDescription>
            Centralized Topic: <strong>{selectedTopicName}</strong> → Adding to Batch Topic: <strong>{roadmapTopicName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedTopicName('')}
          >
            ← Back to Topics
          </Button>

          {/* Now render SmartQuestionExtractorNew with dual mode */}
          <SmartQuestionExtractorNew
            mode="centralized"
            fetchMode="dual"
            chapterLibraryId={chapterLibrary.id}
            centralizedTopicName={selectedTopicName}
            applicableClasses={classLevel ? [classLevel] : []}
            applicableExams={[examDomain]}
            selectedTopic={roadmapTopicId}
            selectedTopicName={roadmapTopicName}
            selectedBatch={batchId}
            selectedExamDomain={examDomain}
            enableBatchAssignment={true}
            onAssignToBatch={handleAssignToBatch}
            onQuestionsAdded={() => {
              onQuestionsAdded();
              toast({
                title: "Questions Added",
                description: "Selected questions have been added to the batch topic"
              });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};