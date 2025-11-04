import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { QuestionFilterPanel } from "./QuestionFilterPanel";
import { QuestionAnswerInput } from "./QuestionAnswerInput";
import { renderWithImages } from "@/lib/mathRendering";
import { toast } from "sonner";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Save,
  Edit,
  Eye,
  BarChart3,
  HelpCircle,
  CheckCircle,
  FileQuestion
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface FilterValues {
  exam_domain?: string;
  batch_id?: string;
  subject?: string;
  chapter_id?: string;
  topic_id?: string;
  answer_status?: 'all' | 'unanswered' | 'answered' | 'reviewed';
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options?: string[];
  left_column?: string[];
  right_column?: string[];
  assertion?: string;
  reason?: string;
  correct_answer?: any;
  explanation?: string;
  marks?: number;
  difficulty?: string;
  admin_reviewed?: boolean;
  exam_domain?: string;
  subject?: string;
  chapter_name?: string;
  batch_id?: string;
  topic_id?: string;
  roadmap_topics?: {
    topic_name: string;
    chapter?: {
      chapter_name: string;
    };
  };
  created_at?: string;
  updated_at?: string;
}

export const AnswerManagementPanel = () => {
  const [filters, setFilters] = useState<FilterValues>({ answer_status: 'all' });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [editingAnswers, setEditingAnswers] = useState<Map<string, any>>(new Map());
  const [editingExplanations, setEditingExplanations] = useState<Map<string, string>>(new Map());
  const [savingQuestions, setSavingQuestions] = useState<Set<string>>(new Set());
  
  const pageSize = 20;

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    unanswered: 0,
    answered: 0,
    reviewed: 0
  });

  useEffect(() => {
    loadQuestions();
  }, [filters, currentPage, searchTerm]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load total count
      const totalData = await invokeWithAuth({
        name: 'topic-questions-api',
        body: { 
          action: 'get_questions_by_filter',
          answer_status: 'all',
          limit: 1,
          offset: 0
        }
      });
      
      // Load unanswered count
      const unansweredData = await invokeWithAuth({
        name: 'topic-questions-api',
        body: { 
          action: 'get_questions_by_filter',
          answer_status: 'unanswered',
          limit: 1,
          offset: 0
        }
      });

      // Load answered count
      const answeredData = await invokeWithAuth({
        name: 'topic-questions-api',
        body: { 
          action: 'get_questions_by_filter',
          answer_status: 'answered',
          limit: 1,
          offset: 0
        }
      });

      // Load reviewed count
      const reviewedData = await invokeWithAuth({
        name: 'topic-questions-api',
        body: { 
          action: 'get_questions_by_filter',
          answer_status: 'reviewed',
          limit: 1,
          offset: 0
        }
      });

      setStats({
        total: (totalData as any).total_count || 0,
        unanswered: (unansweredData as any).total_count || 0,
        answered: (answeredData as any).total_count || 0,
        reviewed: (reviewedData as any).total_count || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      
      const data = await invokeWithAuth<any, any>({
        name: 'topic-questions-api',
        body: {
          action: 'get_questions_by_filter',
          ...filters,
          search_term: searchTerm || undefined,
          offset,
          limit: pageSize
        }
      });

      if ((data as any).success) {
        setQuestions((data as any).questions || []);
        setTotalCount((data as any).total_count || 0);
      } else {
        toast.error('Failed to load questions');
      }
    } catch (error: any) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    const newMap = new Map(editingAnswers);
    newMap.set(questionId, answer);
    setEditingAnswers(newMap);
  };

  const handleExplanationChange = (questionId: string, explanation: string) => {
    const newMap = new Map(editingExplanations);
    newMap.set(questionId, explanation);
    setEditingExplanations(newMap);
  };

  const saveAnswer = async (question: Question) => {
    const answer = editingAnswers.get(question.id);
    const explanation = editingExplanations.get(question.id);

    if (!answer) {
      toast.error('Please provide an answer');
      return;
    }

    setSavingQuestions(prev => new Set(prev).add(question.id));

    try {
      const data = await invokeWithAuth({
        name: 'topic-questions-api',
        body: {
          action: 'update_question_answer',
          question_id: question.id,
          correct_answer: answer,
          explanation: explanation || null
        }
      });

      if ((data as any).success) {
        toast.success('Answer saved successfully');
        editingAnswers.delete(question.id);
        editingExplanations.delete(question.id);
        setEditingAnswers(new Map(editingAnswers));
        setEditingExplanations(new Map(editingExplanations));
        loadQuestions();
        loadStats();
      } else {
        toast.error('Failed to save answer');
      }
    } catch (error: any) {
      console.error('Error saving answer:', error);
      toast.error('Failed to save answer: ' + error.message);
    } finally {
      setSavingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(question.id);
        return newSet;
      });
    }
  };

  const toggleQuestionSelection = (questionId: string) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(questionId)) {
      newSet.delete(questionId);
    } else {
      newSet.add(questionId);
    }
    setSelectedQuestions(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map(q => q.id)));
    }
  };

  const bulkMarkReviewed = async () => {
    if (selectedQuestions.size === 0) {
      toast.error('No questions selected');
      return;
    }

    setLoading(true);
    try {
      const data = await invokeWithAuth({
        name: 'topic-questions-api',
        body: {
          action: 'bulk_mark_reviewed',
          question_ids: Array.from(selectedQuestions)
        }
      });

      if ((data as any).success) {
        toast.success(`${(data as any).updated_count} questions marked as reviewed`);
        setSelectedQuestions(new Set());
        loadQuestions();
        loadStats();
      } else {
        toast.error('Failed to mark questions as reviewed');
      }
    } catch (error: any) {
      console.error('Error marking reviewed:', error);
      toast.error('Failed to mark as reviewed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  
  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length;

  // Helper: Check if question has a valid answer (handles 0, false, empty arrays)
  const hasAnswer = (question: Question): boolean => {
    const { correct_answer, question_type } = question;
    
    if (correct_answer === null || correct_answer === undefined) return false;
    
    switch (question_type) {
      case 'mcq':
      case 'assertion_reason':
        // For MCQ: 0 is valid (Option A)
        return typeof correct_answer === 'number' || 
               (typeof correct_answer === 'object' && 'index' in correct_answer);
      
      case 'true_false':
        // For boolean: false is valid
        return typeof correct_answer === 'boolean' ||
               (typeof correct_answer === 'object' && 'value' in correct_answer);
      
      case 'fill_blank':
      case 'short_answer':
        // For text: check non-empty string
        return (typeof correct_answer === 'string' && correct_answer.trim() !== '') ||
               (typeof correct_answer === 'object' && correct_answer.text);
      
      case 'match_column':
        // For pairs: check array has items
        return Array.isArray(correct_answer) ||
               (typeof correct_answer === 'object' && Array.isArray(correct_answer.pairs) && correct_answer.pairs.length > 0);
      
      default:
        return !!correct_answer;
    }
  };

  // Helper: Normalize answer for form input (convert DB format to component format)
  const normalizeAnswerForForm = (question: Question): any => {
    const { correct_answer, question_type } = question;
    
    if (!hasAnswer(question)) return null;
    
    switch (question_type) {
      case 'mcq':
      case 'assertion_reason':
        // Ensure { index: number } format
        if (typeof correct_answer === 'number') {
          return { index: correct_answer };
        }
        if (typeof correct_answer === 'object' && 'index' in correct_answer) {
          return { index: correct_answer.index };
        }
        return { index: 0 };
      
      case 'true_false':
        // Ensure { value: boolean } format
        if (typeof correct_answer === 'boolean') {
          return { value: correct_answer };
        }
        if (typeof correct_answer === 'object' && 'value' in correct_answer) {
          return { value: correct_answer.value };
        }
        return null;
      
      case 'fill_blank':
        // Ensure { text: string, answers?: string[] } format
        if (typeof correct_answer === 'string') {
          return { text: correct_answer };
        }
        if (typeof correct_answer === 'object' && 'text' in correct_answer) {
          return correct_answer;
        }
        return null;
      
      case 'match_column':
        // Ensure { pairs: Array } format
        if (Array.isArray(correct_answer)) {
          return { pairs: correct_answer };
        }
        if (typeof correct_answer === 'object' && 'pairs' in correct_answer) {
          return correct_answer;
        }
        return null;
      
      default:
        return correct_answer;
    }
  };

  const getStatusBadge = (question: Question) => {
    if (question.admin_reviewed) {
      return <Badge className="bg-green-500 hover:bg-green-600">✓ Reviewed</Badge>;
    } else if (hasAnswer(question)) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">✓ Answered</Badge>;
    } else {
      return <Badge variant="destructive">! Unanswered</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unanswered</CardTitle>
              <HelpCircle className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.unanswered}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.unanswered / stats.total) * 100) : 0}% remaining
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Answered</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.answered}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0}% completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reviewed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.reviewed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.reviewed / stats.total) * 100) : 0}% verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Panel */}
      <Collapsible defaultOpen>
        <Card>
          <CardHeader className="cursor-pointer">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {activeFilterCount} active
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Filter questions by domain, batch, subject, chapter, and topic</CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 transition-transform duration-200 ui-expanded:rotate-90" />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <QuestionFilterPanel filters={filters} onFiltersChange={setFilters} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Search & Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {selectedQuestions.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedQuestions.size} selected</Badge>
                <Button onClick={bulkMarkReviewed} size="sm">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Reviewed
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-muted">
                  <FileQuestion className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">No questions found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                No questions match your current filters. Try adjusting your criteria or extract new questions from PDFs.
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/admin/dashboard?tab=question-bank'}>
                Go to Question Bank Builder
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Checkbox
              checked={selectedQuestions.size === questions.length && questions.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              Select all {questions.length} questions on this page
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card 
                key={question.id} 
                className="overflow-hidden hover:shadow-md transition-all duration-200 border-l-4"
                style={{
                  borderLeftColor: question.admin_reviewed 
                    ? '#10b981' 
                    : hasAnswer(question)
                      ? '#3b82f6' 
                      : '#f59e0b'
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedQuestions.has(question.id)}
                      onCheckedChange={() => toggleQuestionSelection(question.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Badge variant="outline" className="font-mono">
                              Q{(currentPage - 1) * pageSize + index + 1}
                            </Badge>
                            <Badge variant={question.question_type === 'mcq' ? 'default' : 'secondary'}>
                              {question.question_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {getStatusBadge(question)}
                            {question.marks && <Badge variant="outline">{question.marks} marks</Badge>}
                            {question.difficulty && (
                              <Badge variant="outline" className="capitalize">{question.difficulty}</Badge>
                            )}
                          </div>
                          
                          {/* Breadcrumb */}
                          {question.roadmap_topics && (
                            <Breadcrumb className="mb-2">
                              <BreadcrumbList className="text-xs">
                                <BreadcrumbItem>
                                  <BreadcrumbPage className="text-muted-foreground">
                                    {question.exam_domain?.toUpperCase()}
                                  </BreadcrumbPage>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                  <BreadcrumbPage className="text-muted-foreground">
                                    {question.subject}
                                  </BreadcrumbPage>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                  <BreadcrumbPage className="text-muted-foreground">
                                    {question.roadmap_topics.chapter?.chapter_name ?? '—'}
                                  </BreadcrumbPage>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                  <BreadcrumbPage className="font-medium">
                                    {question.roadmap_topics.topic_name}
                                  </BreadcrumbPage>
                                </BreadcrumbItem>
                              </BreadcrumbList>
                            </Breadcrumb>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div 
                        className="prose prose-sm max-w-none question-content"
                        dangerouslySetInnerHTML={{ __html: renderWithImages(question.question_text) }}
                      />

                      {/* Options (for MCQ) */}
                      {question.question_type === 'mcq' && question.options && (
                        <div className="mt-3 space-y-1">
                          {question.options.map((option, idx) => (
                            <div key={idx} className="text-sm pl-4">
                              <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {option}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Match Column Preview */}
                      {question.question_type === 'match_column' && 
                       (question.left_column?.length > 0 || question.right_column?.length > 0) && (
                        <div className="mt-3 grid grid-cols-2 gap-6 border-l-2 border-primary/20 pl-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Column I</p>
                            <div className="space-y-1">
                              {(question.left_column || []).map((item, idx) => (
                                <div key={idx} className="text-sm flex items-start gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {String.fromCharCode(65 + idx)}
                                  </Badge>
                                  <span 
                                    className="flex-1 prose prose-sm max-w-none question-content"
                                    dangerouslySetInnerHTML={{ __html: renderWithImages(item) }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Column II</p>
                            <div className="space-y-1">
                              {(question.right_column || []).map((item, idx) => (
                                <div key={idx} className="text-sm flex items-start gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {String.fromCharCode(105 + idx)}
                                  </Badge>
                                  <span 
                                    className="flex-1 prose prose-sm max-w-none question-content"
                                    dangerouslySetInnerHTML={{ __html: renderWithImages(item) }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Assertion-Reason Preview */}
                      {question.question_type === 'assertion_reason' && 
                       (question.assertion || question.reason) && (
                        <div className="mt-3 space-y-2 border-l-2 border-purple-500/20 pl-4">
                          {question.assertion && (
                            <div>
                              <Badge variant="outline" className="text-xs mb-1">Assertion (A)</Badge>
                              <div 
                                className="text-sm prose prose-sm max-w-none question-content"
                                dangerouslySetInnerHTML={{ __html: renderWithImages(question.assertion) }}
                              />
                            </div>
                          )}
                          {question.reason && (
                            <div>
                              <Badge variant="outline" className="text-xs mb-1">Reason (R)</Badge>
                              <div 
                                className="text-sm prose prose-sm max-w-none question-content"
                                dangerouslySetInnerHTML={{ __html: renderWithImages(question.reason) }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <Separator />

                <CardContent className="pt-4">
                  {/* Show existing answer or input */}
                  {hasAnswer(question) && !editingAnswers.has(question.id) ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Current Answer:</Label>
                        <div className="mt-1 p-3 bg-muted rounded-md">
                          {typeof question.correct_answer === 'object' 
                            ? JSON.stringify(question.correct_answer)
                            : String(question.correct_answer)
                          }
                        </div>
                      </div>

                      {question.explanation && (
                        <div>
                          <Label className="text-sm font-medium">Explanation:</Label>
                          <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                            {question.explanation}
                          </div>
                        </div>
                      )}

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Pre-seed the form with normalized answer
                          handleAnswerChange(question.id, normalizeAnswerForForm(question));
                          handleExplanationChange(question.id, question.explanation || '');
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Answer
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Answer</Label>
                        <QuestionAnswerInput
                          questionType={question.question_type}
                          options={question.options}
                          leftColumn={question.left_column}
                          rightColumn={question.right_column}
                          currentAnswer={editingAnswers.get(question.id)}
                          onChange={(answer) => handleAnswerChange(question.id, answer)}
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Explanation (Optional)</Label>
                        <Textarea
                          placeholder="Add explanation for this question..."
                          value={editingExplanations.get(question.id) || ''}
                          onChange={(e) => handleExplanationChange(question.id, e.target.value)}
                          rows={3}
                        />
                      </div>

                      <Button 
                        onClick={() => saveAnswer(question)}
                        disabled={savingQuestions.has(question.id)}
                      >
                        {savingQuestions.has(question.id) ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Answer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} questions
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
