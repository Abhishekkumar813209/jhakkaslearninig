import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Search, Edit2, Trash2, FileText, Upload, List } from 'lucide-react';
import { ManualQuestionEntry } from './ManualQuestionEntry';
import { SmartQuestionExtractorNew } from './SmartQuestionExtractorNew';
import { renderWithImages } from '@/lib/mathRendering';
import { normalizeGameTypeForDisplay } from '@/lib/gameTypeMapping';

interface CentralizedTopicQuestionsManagerProps {
  examDomain: string;
  board?: string;
  studentClass?: string;
  subject: string;
  chapterLibraryId: string;
  chapterName: string;
  topicName: string;
  onBack: () => void;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  marks: number;
  correct_answer: any;
  explanation?: string;
  options?: any;
  created_at: string;
  applicable_classes?: string[];
  applicable_exams?: string[];
}

export const CentralizedTopicQuestionsManager = ({
  examDomain,
  board,
  studentClass,
  subject,
  chapterLibraryId,
  chapterName,
  topicName,
  onBack
}: CentralizedTopicQuestionsManagerProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('view-all');

  // Fetch questions for this topic
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .eq('chapter_library_id', chapterLibraryId)
        .eq('centralized_topic_name', topicName)
        .eq('is_centralized', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [chapterLibraryId, topicName]);

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !searchQuery || 
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    const matchesType = typeFilter === 'all' || q.question_type === typeFilter;
    return matchesSearch && matchesDifficulty && matchesType;
  });

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('question_bank')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      
      toast.success('Question deleted successfully');
      fetchQuestions();
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleQuestionAdded = (questions?: any[]) => {
    const count = questions?.length || 1;
    toast.success(`${count} question${count > 1 ? 's' : ''} added successfully`);
    fetchQuestions();
    setActiveTab('view-all');
  };

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chapter Library
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{examDomain}</span>
            {board && <><span>→</span><span>{board}</span></>}
            {studentClass && <><span>→</span><span>Class {studentClass}</span></>}
            <span>→</span><span>{subject}</span>
            <span>→</span><span>{chapterName}</span>
          </div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {topicName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage questions for this centralized topic
          </p>
        </div>
        <Badge variant="secondary" className="text-base px-4 py-2">
          {questions.length} Questions
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="view-all" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            View All Questions
          </TabsTrigger>
          <TabsTrigger value="manual-entry" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="upload-pdf" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload PDF/Word
          </TabsTrigger>
        </TabsList>

        {/* View All Questions Tab */}
        <TabsContent value="view-all" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-xs mb-2 block">Search Questions</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by question text..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Difficulty</Label>
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Question Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="mcq">MCQ</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="fill_blank">Fill in Blanks</SelectItem>
                      <SelectItem value="match_column">Match Column</SelectItem>
                      <SelectItem value="match_pair">Match Pairs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading questions...
              </CardContent>
            </Card>
          ) : filteredQuestions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery || difficultyFilter !== 'all' || typeFilter !== 'all'
                    ? 'No questions match your filters'
                    : 'No questions added yet'}
                </p>
                <Button onClick={() => setActiveTab('manual-entry')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredQuestions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Q{index + 1}</Badge>
                          <Badge variant="secondary">
                            {normalizeGameTypeForDisplay(question.question_type)}
                          </Badge>
                          <Badge
                            variant={
                              question.difficulty === 'easy'
                                ? 'default'
                                : question.difficulty === 'medium'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {question.difficulty}
                          </Badge>
                          <Badge variant="outline">{question.marks} marks</Badge>
                        </div>
                        <div 
                          className="text-sm"
                          dangerouslySetInnerHTML={{ 
                            __html: String(renderWithImages(question.question_text))
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {question.explanation && (
                    <CardContent className="pt-0">
                      <div className="text-xs text-muted-foreground">
                        <strong>Explanation:</strong> {question.explanation}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual-entry">
          <ManualQuestionEntry
            mode="centralized"
            chapterLibraryId={chapterLibraryId}
            centralizedTopicName={topicName}
            examDomain={examDomain}
            subject={subject}
            selectedChapter={{ id: chapterLibraryId, chapter_name: chapterName }}
            selectedTopic={{ id: chapterLibraryId, topic_name: topicName }}
            applicableClasses={studentClass ? [studentClass] : []}
            applicableExams={[examDomain]}
            onComplete={handleQuestionAdded}
          />
        </TabsContent>

        {/* Upload PDF/Word Tab */}
        <TabsContent value="upload-pdf">
          <SmartQuestionExtractorNew
            mode="centralized"
            chapterLibraryId={chapterLibraryId}
            centralizedTopicName={topicName}
            applicableClasses={studentClass ? [studentClass] : []}
            applicableExams={[examDomain]}
            selectedSubject={subject}
            selectedChapter={chapterLibraryId}
            selectedExamDomain={examDomain}
            onQuestionsAdded={handleQuestionAdded}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
