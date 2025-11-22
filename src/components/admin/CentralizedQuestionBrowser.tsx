import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Edit, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuestionAnswerInput } from "./QuestionAnswerInput";

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
  correct_answer: any;
  options?: any;
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

  // Edit/Preview modals
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);

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
        correct_answer: q.correct_answer,
        options: q.options,
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

  const handleEditQuestion = (question: CentralizedQuestion) => {
    setEditingQuestionId(question.id);
    setEditFormData({
      question_text: question.question_text || question.question_data?.text || '',
      question_type: question.question_type,
      correct_answer: question.correct_answer,
      options: question.options,
      difficulty: question.difficulty,
      marks: question.marks,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingQuestionId || !editFormData) return;

    try {
      const { error } = await supabase.functions.invoke('topic-questions-api', {
        body: {
          action: 'update_question',
          question_id: editingQuestionId,
          updates: {
            question_text: editFormData.question_text,
            correct_answer: editFormData.correct_answer,
            options: editFormData.options,
            difficulty: editFormData.difficulty,
            marks: editFormData.marks,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Question Updated",
        description: "Changes saved successfully"
      });
      
      setEditingQuestionId(null);
      setEditFormData(null);
      fetchQuestionsForTopic(selectedTopicName);
    } catch (error: any) {
      console.error('Error updating question:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to update question',
        variant: "destructive"
      });
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    if (typeFilter !== 'all' && q.question_type !== typeFilter) return false;
    return true;
  });

  const selectableCount = filteredQuestions.filter(q => !q.already_added).length;

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'short_answer': return 'bg-pink-500 text-white';
      case 'true_false': return 'bg-yellow-500 text-white';
      case 'mcq': return 'bg-blue-500 text-white';
      case 'match_pair': case 'match_column': return 'bg-purple-500 text-white';
      case 'fill_blank': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'short_answer': return 'Short Answer';
      case 'true_false': return 'True/False';
      case 'mcq': return 'MCQ';
      case 'match_pair': return 'Match Pair';
      case 'match_column': return 'Match Column';
      case 'fill_blank': return 'Fill in the Blanks';
      default: return type;
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
                <div className="space-y-4 max-h-[500px] overflow-y-auto p-1">
                  {filteredQuestions.map((q, index) => (
                    <Card
                      key={q.id}
                      className={`transition-all ${
                        q.already_added
                          ? 'opacity-60 bg-muted/50 cursor-not-allowed'
                          : selectedQuestionIds.has(q.id)
                          ? 'border-primary border-2 bg-primary/5 shadow-sm'
                          : ''
                      }`}
                    >
                      <CardContent className="p-6 space-y-4">
                        {/* Top Section: Checkbox, Badges */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Checkbox
                              checked={selectedQuestionIds.has(q.id)}
                              disabled={q.already_added}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleQuestion(q.id, q.already_added);
                              }}
                            />
                            <Badge className={`${getTypeColor(q.question_type)} text-xs font-semibold px-3 py-1`}>
                              {getTypeLabel(q.question_type)}
                            </Badge>
                            <Badge className="bg-orange-500 text-white text-xs px-3 py-1">
                              medium confidence
                            </Badge>
                            <Badge 
                              variant={q.difficulty === 'hard' ? 'destructive' : q.difficulty === 'medium' ? 'default' : 'secondary'}
                              className="text-xs px-3 py-1"
                            >
                              {q.difficulty}
                            </Badge>
                            {q.already_added && (
                              <Badge className="bg-green-600 text-white text-xs px-3 py-1">
                                ✓ Already Added
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Question Metadata */}
                        <div className="text-sm text-muted-foreground">
                          Q{index + 1} • {q.marks || 2} Marks | {q.marks || 2} XP
                        </div>

                        {/* Question Text */}
                        <div className="space-y-2">
                          <div className="text-base font-medium leading-relaxed">
                            {q.question_text || q.question_data?.text || 'No question text'}
                          </div>
                        </div>

                        {/* Answer/Options Display */}
                        {(q.question_type === 'mcq' || q.question_type === 'true_false') && q.options && (
                          <div className="space-y-3">
                            <div className="text-sm font-medium text-muted-foreground">
                              Select Correct Answer
                            </div>
                            <div className="space-y-2">
                              {q.options.map((option: any, optIdx: number) => {
                                const isCorrect = q.correct_answer === option || 
                                                 q.correct_answer === optIdx || 
                                                 q.correct_answer?.toString() === optIdx.toString();
                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                      isCorrect 
                                        ? 'border-blue-500 bg-blue-50' 
                                        : 'border-border bg-background'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                                        isCorrect ? 'border-blue-500 bg-blue-500 text-white' : 'border-muted-foreground'
                                      }`}>
                                        {String.fromCharCode(65 + optIdx)}
                                      </div>
                                      <span className="text-sm">{option}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {q.correct_answer && (
                              <Badge className="bg-green-600 text-white text-xs">
                                Valid
                              </Badge>
                            )}
                          </div>
                        )}

                        {q.question_type === 'short_answer' && (
                          <div className="p-4 bg-muted/50 rounded-lg border">
                            <p className="text-sm text-muted-foreground text-center">
                              No correct answer required for short answer questions
                            </p>
                            <Badge variant="secondary" className="text-xs mt-2">
                              Subjective Question
                            </Badge>
                          </div>
                        )}

                        {/* Action Buttons at Bottom */}
                        <div className="flex gap-3 pt-2">
                          <Button
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditQuestion(q);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewQuestionId(q.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Add Button */}
              {selectedQuestionIds.size > 0 && (
                <Button 
                  onClick={handleAddQuestions} 
                  disabled={adding}
                  className="w-full"
                  size="lg"
                >
                  {adding ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Adding Questions...
                    </>
                  ) : (
                    `Add ${selectedQuestionIds.size} Selected Questions to ${roadmapTopicName}`
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editingQuestionId !== null} onOpenChange={(open) => !open && setEditingQuestionId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          {editFormData && (
            <div className="space-y-4">
              <QuestionAnswerInput
                questionType={editFormData.question_type}
                currentAnswer={editFormData.correct_answer}
                onChange={(answer) => setEditFormData({ ...editFormData, correct_answer: answer })}
                options={editFormData.options}
              />
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setEditingQuestionId(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewQuestionId !== null} onOpenChange={(open) => !open && setPreviewQuestionId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>
          {previewQuestionId && (
            <div className="space-y-4">
              {(() => {
                const q = questions.find(qu => qu.id === previewQuestionId);
                if (!q) return null;
                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded">
                      <p className="font-medium">{q.question_text || q.question_data?.text}</p>
                    </div>
                    {q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt: string, idx: number) => (
                          <div key={idx} className="p-2 border rounded">
                            {String.fromCharCode(65 + idx)}) {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      <strong>Correct Answer:</strong> {JSON.stringify(q.correct_answer)}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};