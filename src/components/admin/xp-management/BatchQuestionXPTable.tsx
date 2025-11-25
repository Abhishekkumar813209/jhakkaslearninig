import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { XP_REWARDS } from '@/lib/xpConfig';
import { extractQuestionText } from '@/lib/questionTextHelpers';

interface AssignedQuestionRow {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  marks: number;
  xp_reward: number | null;
  assignment_order: number;
  source: 'centralized' | 'batch';
}

export const BatchQuestionXPTable = ({ topicId }: { topicId: string }) => {
  const [questions, setQuestions] = useState<AssignedQuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [modified, setModified] = useState<Set<string>>(new Set());
  const [topicInfo, setTopicInfo] = useState<{ difficulty: string; name: string } | null>(null);

  useEffect(() => {
    fetchAssignedQuestions();
    fetchTopicInfo();
  }, [topicId]);

  const fetchTopicInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('roadmap_topics')
        .select('topic_name, difficulty')
        .eq('id', topicId)
        .single();

      if (error) throw error;
      setTopicInfo({ difficulty: data.difficulty || 'medium', name: data.topic_name });
    } catch (error) {
      console.error('Error fetching topic info:', error);
    }
  };

  const fetchAssignedQuestions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('batch_question_assignments')
        .select(`
          id,
          xp_reward,
          difficulty,
          assignment_order,
          question_bank!inner(
            id,
            question_type,
            question_data,
            answer_data,
            difficulty,
            marks,
            is_centralized
          )
        `)
        .eq('roadmap_topic_id', topicId)
        .order('assignment_order');

      if (error) throw error;

      const transformedData = data?.map(assignment => ({
        id: assignment.id,
        question_text: extractQuestionText(assignment.question_bank), // ✅ Use helper to extract from JSONB
        question_type: assignment.question_bank.question_type,
        difficulty: assignment.difficulty || assignment.question_bank.difficulty || 'medium',
        marks: assignment.question_bank.marks || 1,
        xp_reward: assignment.xp_reward,
        assignment_order: assignment.assignment_order || 0,
        source: assignment.question_bank.is_centralized ? 'centralized' as const : 'batch' as const,
      })) || [];

      setQuestions(transformedData);
      setModified(new Set());
    } catch (error: any) {
      console.error('Error fetching assigned questions:', error);
      toast.error('Failed to load assigned questions');
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (assignmentId: string, field: keyof AssignedQuestionRow, value: any) => {
    setQuestions(prev => prev.map(q => 
      q.id === assignmentId ? { ...q, [field]: value } : q
    ));
    setModified(prev => new Set(prev).add(assignmentId));
  };

  const saveQuestion = async (assignmentId: string) => {
    try {
      setSaving(assignmentId);
      const question = questions.find(q => q.id === assignmentId);
      if (!question) return;

      const { error } = await supabase
        .from('batch_question_assignments')
        .update({
          xp_reward: question.xp_reward,
          difficulty: question.difficulty,
        })
        .eq('id', assignmentId);

      if (error) throw error;

      setModified(prev => {
        const next = new Set(prev);
        next.delete(assignmentId);
        return next;
      });

      toast.success('XP updated');
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update XP');
    } finally {
      setSaving(null);
    }
  };

  const saveAllQuestions = async () => {
    try {
      setSaving('all');
      const updates = Array.from(modified).map(assignmentId => {
        const question = questions.find(q => q.id === assignmentId);
        if (!question) return null;

        return supabase
          .from('batch_question_assignments')
          .update({
            xp_reward: question.xp_reward,
            difficulty: question.difficulty,
          })
          .eq('id', assignmentId);
      });

      await Promise.all(updates.filter(Boolean));

      setModified(new Set());
      toast.success(`${updates.length} questions updated successfully`);
    } catch (error: any) {
      console.error('Error updating questions:', error);
      toast.error('Failed to update questions');
    } finally {
      setSaving(null);
    }
  };

  const recalculateTopicXP = async (force = false) => {
    try {
      setSaving('all');
      
      const { data, error } = await supabase.functions.invoke('auto-distribute-topic-xp', {
        body: { 
          topic_id: topicId,
          force_recalculate: force
        }
      });

      if (error) throw error;

      if (data.success) {
        await fetchAssignedQuestions();
        toast.success(`XP distributed: ${data.questions_count} questions, ${data.budget} XP total`);
      } else {
        toast.error(data.message || 'Failed to distribute XP');
      }
    } catch (error: any) {
      console.error('Error recalculating XP:', error);
      toast.error('Failed to recalculate XP');
    } finally {
      setSaving(null);
    }
  };

  const handleRecalculateClick = () => {
    const hasManualValues = questions.some(q => q.xp_reward !== null);
    
    if (hasManualValues) {
      if (confirm('This will reset all manual XP values based on topic difficulty. Continue?')) {
        recalculateTopicXP(true);
      }
    } else {
      recalculateTopicXP(false);
    }
  };

  const questionTypeLabels: Record<string, string> = {
    mcq: 'MCQ',
    match_pair: 'Match Pairs',
    match_column: 'Match Columns',
    fill_blank: 'Fill Blanks',
    true_false: 'True/False',
    short_answer: 'Short Answer',
    assertion_reason: 'Assertion-Reason',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No assigned questions in this topic</p>
        <p className="text-xs mt-1">Assign questions from the centralized question bank or add from lesson library</p>
      </div>
    );
  }

  const totalXP = questions.reduce((sum, q) => sum + (q.xp_reward || 0), 0);
  const avgXP = questions.length > 0 ? (totalXP / questions.length).toFixed(1) : 0;
  const topicBudget = topicInfo?.difficulty === 'hard' ? 50 
                    : topicInfo?.difficulty === 'medium' ? 40 
                    : 30;
  const budgetMatch = totalXP === topicBudget;

  return (
    <div className="space-y-4">
      {/* Topic XP Budget Header */}
      {topicInfo && (
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Topic Difficulty:</span>
            <Badge variant={
              topicInfo.difficulty === 'easy' ? 'secondary' :
              topicInfo.difficulty === 'medium' ? 'default' :
              'destructive'
            }>
              {topicInfo.difficulty}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">XP Budget:</span>
            <span className="font-semibold">{topicBudget} XP</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Assigned:</span>
            <span className={`font-semibold ${budgetMatch ? 'text-green-600' : 'text-red-600'}`}>
              {totalXP} XP {budgetMatch ? '✓' : `(${totalXP > topicBudget ? '+' : ''}${totalXP - topicBudget})`}
            </span>
          </div>
        </div>
      )}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-[250px]">Question</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="w-24">Marks</TableHead>
              <TableHead className="w-24">XP Reward</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question, index) => (
              <TableRow key={question.id} className={modified.has(question.id) ? 'bg-accent/50' : ''}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="text-sm">
                  {question.question_text?.substring(0, 100)}
                  {(question.question_text?.length || 0) > 100 ? '...' : ''}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {questionTypeLabels[question.question_type] || question.question_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={question.source === 'centralized' ? 'default' : 'secondary'}>
                    {question.source === 'centralized' ? '🌐 Centralized' : '📚 Batch'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={question.difficulty}
                    onValueChange={(value) => updateQuestion(question.id, 'difficulty', value)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{question.marks}</span>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={question.xp_reward ?? ''}
                    placeholder="Auto"
                    onChange={(e) => updateQuestion(question.id, 'xp_reward', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => saveQuestion(question.id)}
                    disabled={!modified.has(question.id) || saving === question.id}
                  >
                    {saving === question.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Total Questions:</span>
            <span className="font-semibold ml-2">{questions.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total XP:</span>
            <span className="font-semibold ml-2">{totalXP}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg XP:</span>
            <span className="font-semibold ml-2">{avgXP}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculateClick}
            disabled={saving === 'all'}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Recalculate XP
          </Button>
          <Button
            size="sm"
            onClick={saveAllQuestions}
            disabled={modified.size === 0 || saving === 'all'}
          >
            {saving === 'all' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All ({modified.size})
          </Button>
        </div>
      </div>
    </div>
  );
};
