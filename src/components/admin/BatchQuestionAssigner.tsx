import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useExamTypes } from '@/hooks/useExamTypes';
import { useBoards } from '@/hooks/useBoards';
import { useBatches } from '@/hooks/useBatches';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Link2, Search, Filter } from 'lucide-react';
import { resolveActiveRoadmapIdForBatch } from '@/lib/roadmapHelpers';

interface CentralizedQuestion {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  centralized_topic_name: string;
  applicable_classes: string[];
  applicable_exams: string[];
  chapter_library_id: string;
  created_at: string;
}

interface RoadmapTopic {
  id: string;
  topic_name: string;
  chapter_id: string;
  chapter_name: string;
  subject: string;
}

interface TopicMapping {
  centralized_topic_name: string;
  chapter_library_id: string;
}

export const BatchQuestionAssigner = () => {
  const { examTypes } = useExamTypes();
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  
  const { boards, requiresBoard, requiresClass } = useBoards(selectedDomain);
  const { batches } = useBatches();
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<RoadmapTopic[]>([]);
  const [topicMapping, setTopicMapping] = useState<TopicMapping | null>(null);
  
  const [questions, setQuestions] = useState<CentralizedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [includeCrossExam, setIncludeCrossExam] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Fetch classes
  useEffect(() => {
    if (selectedDomain) {
      const examType = examTypes.find(e => e.code === selectedDomain);
      if (examType?.requires_class) {
        setClasses(['11', '12']);
      } else {
        setClasses([]);
      }
    }
  }, [selectedDomain, examTypes]);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedDomain || !selectedBatch || !batches.length) return;
      
      const batch = batches.find(b => b.id === selectedBatch);
      if (!batch) return;

      const roadmapId = await resolveActiveRoadmapIdForBatch(selectedBatch, batch.linked_roadmap_id);
      if (!roadmapId) {
        toast.error('No roadmap found for this batch');
        return;
      }

      const { data, error } = await supabase
        .from('roadmap_chapters')
        .select('subject')
        .eq('roadmap_id', roadmapId)
        .order('subject');

      if (error) {
        console.error('Error fetching subjects:', error);
        return;
      }

      const uniqueSubjects = [...new Set(data.map(d => d.subject))];
      setSubjects(uniqueSubjects);
    };

    fetchSubjects();
  }, [selectedDomain, selectedBatch, batches]);

  // Fetch topics
  useEffect(() => {
    const fetchTopics = async () => {
      if (!selectedBatch || !selectedSubject || !batches.length) return;

      const batch = batches.find(b => b.id === selectedBatch);
      if (!batch) return;

      const roadmapId = await resolveActiveRoadmapIdForBatch(selectedBatch, batch.linked_roadmap_id);
      if (!roadmapId) return;

      const { data: chapters, error: chaptersError } = await supabase
        .from('roadmap_chapters')
        .select('id, chapter_name, chapter_library_id')
        .eq('roadmap_id', roadmapId)
        .eq('subject', selectedSubject);

      if (chaptersError) {
        console.error('Error fetching chapters:', chaptersError);
        return;
      }

      const { data: topicsData, error: topicsError } = await supabase
        .from('roadmap_topics')
        .select('id, topic_name, chapter_id')
        .in('chapter_id', chapters.map(c => c.id))
        .order('chapter_id, order_num');

      if (topicsError) {
        console.error('Error fetching topics:', topicsError);
        return;
      }

      const enrichedTopics = topicsData.map(topic => {
        const chapter = chapters.find(c => c.id === topic.chapter_id);
        return {
          ...topic,
          chapter_name: chapter?.chapter_name || '',
          subject: selectedSubject
        };
      });

      setTopics(enrichedTopics);
    };

    fetchTopics();
  }, [selectedBatch, selectedSubject, batches]);

  // Fetch topic mapping
  useEffect(() => {
    const fetchMapping = async () => {
      if (!selectedTopic) return;

      const { data, error } = await supabase
        .from('centralized_topic_mappings')
        .select('centralized_topic_name, chapter_library_id')
        .eq('roadmap_topic_id', selectedTopic)
        .maybeSingle();

      if (error) {
        console.error('Error fetching mapping:', error);
        return;
      }

      setTopicMapping(data);
    };

    fetchMapping();
  }, [selectedTopic]);

  // Fetch questions
  const fetchQuestions = async () => {
    if (!selectedTopic || !topicMapping || !selectedSubject) return;

    setLoading(true);
    try {
      const currentTopic = topics.find(t => t.id === selectedTopic);
      if (!currentTopic) return;

      const { data, error } = await supabase.functions.invoke('topic-questions-api', {
        body: {
          action: 'fetch_cross_exam_questions',
          chapter_library_id: topicMapping.chapter_library_id,
          centralized_topic_name: topicMapping.centralized_topic_name,
          subject: selectedSubject,
          applicable_class: selectedClass || '11',
          exam_type_filter: includeCrossExam ? undefined : selectedDomain,
          difficulty_filter: difficultyFilter === 'all' ? undefined : difficultyFilter,
          question_type_filter: typeFilter === 'all' ? undefined : typeFilter
        }
      });

      if (error) throw error;
      setQuestions(data.questions || []);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTopic && topicMapping) {
      fetchQuestions();
    }
  }, [selectedTopic, topicMapping, includeCrossExam, difficultyFilter, typeFilter]);

  const handleAssign = async () => {
    if (!selectedBatch || !selectedTopic || selectedQuestions.size === 0) {
      toast.error('Please select batch, topic, and questions');
      return;
    }

    setAssigning(true);
    try {
      const { data, error } = await supabase.functions.invoke('topic-questions-api', {
        body: {
          action: 'assign_to_batch',
          batch_id: selectedBatch,
          roadmap_topic_id: selectedTopic,
          question_ids: Array.from(selectedQuestions),
          chapter_library_id: topicMapping?.chapter_library_id
        }
      });

      if (error) throw error;

      toast.success(`Assigned ${selectedQuestions.size} questions to topic!`);
      setSelectedQuestions(new Set());
    } catch (error: any) {
      console.error('Error assigning questions:', error);
      toast.error(error.message || 'Failed to assign questions');
    } finally {
      setAssigning(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const selectAll = () => {
    setSelectedQuestions(new Set(questions.map(q => q.id)));
  };

  const deselectAll = () => {
    setSelectedQuestions(new Set());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Assign Centralized Questions to Batch Topics
          </CardTitle>
          <CardDescription>
            Select a batch topic and assign questions from the centralized question bank
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Exam Domain</label>
              <Select value={selectedDomain} onValueChange={(val) => {
                setSelectedDomain(val);
                setSelectedBoard('');
                setSelectedClass('');
                setSelectedBatch('');
                setSelectedSubject('');
                setSelectedTopic('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {examTypes.map((exam) => (
                    <SelectItem key={exam.id} value={exam.code}>
                      {exam.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresBoard && (
              <div>
                <label className="text-sm font-medium mb-2 block">Board</label>
                <Select value={selectedBoard} onValueChange={(val) => {
                  setSelectedBoard(val);
                  setSelectedClass('');
                  setSelectedBatch('');
                  setSelectedSubject('');
                  setSelectedTopic('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board} value={board}>
                        {board}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {requiresClass && (
              <div>
                <label className="text-sm font-medium mb-2 block">Class</label>
                <Select value={selectedClass} onValueChange={(val) => {
                  setSelectedClass(val);
                  setSelectedBatch('');
                  setSelectedSubject('');
                  setSelectedTopic('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        Class {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Batch</label>
              <Select value={selectedBatch} onValueChange={(val) => {
                setSelectedBatch(val);
                setSelectedSubject('');
                setSelectedTopic('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.filter(b => 
                    b.exam_type === selectedDomain &&
                    (!requiresBoard || b.target_board === selectedBoard) &&
                    (!requiresClass || b.target_class === selectedClass)
                  ).map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Select value={selectedSubject} onValueChange={(val) => {
                setSelectedSubject(val);
                setSelectedTopic('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Topic</label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger>
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.chapter_name} → {topic.topic_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters Row */}
          {selectedTopic && (
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Switch
                  id="cross-exam"
                  checked={includeCrossExam}
                  onCheckedChange={setIncludeCrossExam}
                />
                <Label htmlFor="cross-exam" className="cursor-pointer">
                  Include Other Exams
                </Label>
              </div>

              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulty</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="fill_blank">Fill Blanks</SelectItem>
                  <SelectItem value="match_pair">Match Pair</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                </SelectContent>
              </Select>

              <Badge variant="secondary" className="ml-auto">
                {questions.length} Questions Found
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions List */}
      {selectedTopic && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Available Questions</CardTitle>
              <div className="flex items-center gap-2">
                {selectedQuestions.size > 0 && (
                  <>
                    <Badge variant="default">{selectedQuestions.size} Selected</Badge>
                    <Button size="sm" variant="outline" onClick={deselectAll}>
                      Deselect All
                    </Button>
                  </>
                )}
                {questions.length > 0 && (
                  <Button size="sm" variant="outline" onClick={selectAll}>
                    Select All
                  </Button>
                )}
                <Button
                  onClick={handleAssign}
                  disabled={selectedQuestions.size === 0 || assigning}
                >
                  {assigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Assign to Topic
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No questions found for this topic. Try enabling "Include Other Exams" or adjust filters.
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question) => (
                  <div
                    key={question.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedQuestions.has(question.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleQuestion(question.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedQuestions.has(question.id)}
                        onCheckedChange={() => toggleQuestion(question.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div
                          className="text-sm mb-2"
                          dangerouslySetInnerHTML={{ __html: question.question_text }}
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{question.question_type}</Badge>
                          <Badge variant="outline">{question.difficulty}</Badge>
                          <Badge variant="secondary">{question.centralized_topic_name}</Badge>
                          {question.applicable_exams?.map(exam => (
                            <Badge key={exam} variant="outline" className="text-xs">
                              {exam}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
