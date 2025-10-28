import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TestXPConfig } from './TestXPConfig';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  base_xp_reward: number;
  xp_per_mark: number;
  bonus_xp_on_perfect: number;
  total_marks: number;
  question_count: number;
}

interface TestsXPManagerProps {
  chapterId: string;
  subject: string;
}

export const TestsXPManager = ({ chapterId, subject }: TestsXPManagerProps) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTests, setOpenTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTests();
  }, [chapterId, subject]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      
      // Get test IDs from questions that belong to this specific chapter
      // @ts-ignore - Supabase type inference issue
      const { data: questionData, error: questionsError } = await supabase
        .from('questions')
        .select('test_id')
        .eq('chapter_id', chapterId);
      
      if (questionsError) throw questionsError;
      
      if (!questionData || questionData.length === 0) {
        setTests([]);
        setLoading(false);
        return;
      }

      // Extract unique test IDs
      const testIds = [...new Set(
        questionData
          .map((q) => q.test_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )];

      if (testIds.length === 0) {
        setTests([]);
        setLoading(false);
        return;
      }

      // Fetch test details for these test IDs, filtered by subject
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .in('id', testIds)
        .eq('subject', subject);
      
      if (testsError) throw testsError;

      // Get question counts for each test (only questions from this chapter)
      const testsWithCounts: Test[] = [];
      for (const test of testsData || []) {
        const { count } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('test_id', test.id)
          .eq('chapter_id', chapterId);
        
        testsWithCounts.push({ 
          ...test, 
          question_count: count || 0 
        });
      }

      setTests(testsWithCounts);
    } catch (error: any) {
      console.error('Error fetching tests:', error);
      toast.error('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const toggleTest = (testId: string) => {
    setOpenTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (tests.length === 0) {
    return <Card className="p-8"><div className="text-center text-muted-foreground"><p>No tests found for {subject}</p></div></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tests in {subject}</h3>
        <Badge variant="secondary">{tests.length} tests</Badge>
      </div>

      {tests.map((test) => (
        <Collapsible key={test.id} open={openTests.has(test.id)} onOpenChange={() => toggleTest(test.id)}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-3">
                    {openTests.has(test.id) ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    <span>{test.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{test.question_count} questions</Badge>
                    <Badge variant="secondary">{test.total_marks} marks</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <TestXPConfig test={test} onUpdate={fetchTests} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};
