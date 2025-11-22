import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface CentralizedQuestion {
  id: string;
  question_text: string;
  question_type: string;
  question_data: any;
  difficulty: string;
  marks: number;
  already_added: boolean;
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
  const [questions, setQuestions] = useState<CentralizedQuestion[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [adding, setAdding] = useState(false);

  // Filters
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchMatchingChapterLibrary();
  }, [examDomain, board, classLevel, subject, chapterName]);

  useEffect(() => {
    if (selectedTopicName) {
      fetchQuestionsForTopic(selectedTopicName);
    }
  }, [selectedTopicName]);

  const fetchMatchingChapterLibrary = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('chapter_library')
        .select('id, chapter_name, full_topics, display_order')
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

      // Type assertion for full_topics
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

  const fetchQuestionsForTopic = async (topicName: string) => {
    try {
      setLoadingQuestions(true);
      
      if (!chapterLibrary) return;

      // Fetch existing assigned question IDs for "Already Added" detection
      let existingIds = new Set<string>();
      try {
        const { data: existingAssignments, error: assignmentError } = await supabase
          .from('batch_question_assignments')
          .select('question_id')
          .eq('batch_id', batchId)
          .eq('roadmap_topic_id', roadmapTopicId);

        if (!assignmentError && existingAssignments) {
          existingIds = new Set(existingAssignments.map(a => a.question_id));
        }
      } catch (err) {
        console.error('Error fetching existing assignments:', err);
      }

      // Fetch centralized questions via edge function (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('topic-questions-api', {
        body: {
          action: 'get_topic_questions',
          is_centralized: true,
          chapter_library_id: chapterLibrary.id,
          centralized_topic_name: topicName
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      const questionsData = data?.questions || [];

      const questionsWithStatus: CentralizedQuestion[] = questionsData.map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        question_data: q.question_data,
        difficulty: q.difficulty || 'medium',
        marks: q.marks || 1,
        already_added: existingIds.has(q.id)
      }));

      setQuestions(questionsWithStatus);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch centralized questions",
        variant: "destructive"
      });
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleToggleQuestion = (questionId: string, alreadyAdded: boolean) => {
    if (alreadyAdded) return; // Can't select already added questions

    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const selectableQuestions = filteredQuestions.filter(q => !q.already_added);
    if (selectedQuestionIds.size === selectableQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(selectableQuestions.map(q => q.id)));
    }
  };

  const handleAddQuestions = async () => {
    if (selectedQuestionIds.size === 0) {
      toast({
        title: "No Questions Selected",
        description: "Please select at least one question to add",
        variant: "destructive"
      });
      return;
    }

    try {
      setAdding(true);

      const { error } = await supabase.functions.invoke('topic-questions-api', {
        body: {
          action: 'assign_to_batch',
          batch_id: batchId,
          roadmap_topic_id: roadmapTopicId,
          question_ids: Array.from(selectedQuestionIds),
          chapter_library_id: chapterLibrary?.id
        }
      });

      if (error) throw error;

      toast({
        title: "Questions Added Successfully",
        description: `Added ${selectedQuestionIds.size} questions to ${roadmapTopicName}`
      });

      setSelectedQuestionIds(new Set());
      fetchQuestionsForTopic(selectedTopicName); // Refresh to update "Already Added" status
      onQuestionsAdded();
    } catch (error: any) {
      console.error('Error adding questions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add questions",
        variant: "destructive"
      });
    } finally {
      setAdding(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    if (typeFilter !== 'all' && q.question_type !== typeFilter) return false;
    return true;
  });

  const selectableCount = filteredQuestions.filter(q => !q.already_added).length;

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
            Pull questions from centralized chapter: "{chapterLibrary.chapter_name}"
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

          {/* Questions Grid */}
          {selectedTopicName && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => { setSelectedTopicName(''); setQuestions([]); }}>
                  ← Back to Topics
                </Button>
                <div className="text-sm text-muted-foreground">
                  Topic: <span className="font-medium">{selectedTopicName}</span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-3">
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="fill_blank">Fill Blanks</SelectItem>
                    <SelectItem value="match_column">Match Column</SelectItem>
                    <SelectItem value="match_pair">Match Pairs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedQuestionIds.size === selectableCount && selectableCount > 0}
                    onCheckedChange={handleSelectAll}
                    disabled={selectableCount === 0}
                  />
                  <span className="text-sm font-medium">
                    Select All ({selectableCount} selectable)
                  </span>
                </div>
                <Badge variant="outline">
                  {questions.filter(q => q.already_added).length} Already Added
                </Badge>
              </div>

              {/* Questions List */}
              {loadingQuestions ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredQuestions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No questions found for this topic with selected filters
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto p-1">
                  {filteredQuestions.map((q) => (
                    <Card
                      key={q.id}
                      className={`p-4 cursor-pointer transition-all ${
                        q.already_added
                          ? 'opacity-60 bg-muted/50 cursor-not-allowed'
                          : selectedQuestionIds.has(q.id)
                          ? 'border-primary border-2 bg-primary/5 shadow-sm'
                          : 'hover:border-primary/50 hover:scale-[1.02] hover:shadow-md'
                      }`}
                      onClick={() => handleToggleQuestion(q.id, q.already_added)}
                    >
                      <div className="space-y-3">
                        {/* Checkbox header */}
                        <div className="flex items-center justify-between">
                          <Checkbox
                            checked={selectedQuestionIds.has(q.id)}
                            disabled={q.already_added}
                          />
                          {q.already_added && (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Added
                            </Badge>
                          )}
                        </div>

                        {/* Question text */}
                        <p className="text-sm font-medium line-clamp-3 min-h-[60px]">
                          {q.question_text || q.question_data?.text || 'Untitled Question'}
                        </p>

                        {/* Metadata badges */}
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {q.question_type}
                          </Badge>
                          <Badge 
                            variant={q.difficulty === 'hard' ? 'destructive' : q.difficulty === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {q.difficulty}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {q.marks} mark{q.marks !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Add Button */}
              {filteredQuestions.length > 0 && (
                <Button
                  onClick={handleAddQuestions}
                  disabled={selectedQuestionIds.size === 0 || adding}
                  className="w-full"
                  size="lg"
                >
                  {adding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    `Add ${selectedQuestionIds.size} Selected Question${selectedQuestionIds.size !== 1 ? 's' : ''}`
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
