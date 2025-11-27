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
  is_centralized?: boolean; // Add flag to distinguish centralized vs batch-specific tests
}

interface TestsXPManagerProps {
  chapterId: string;
  subject: string;
  batchId?: string; // Add batchId to fetch centralized tests
  chapterLibraryId?: string | null; // Add to fetch centralized tests
}

export const TestsXPManager = ({ chapterId, subject, batchId, chapterLibraryId }: TestsXPManagerProps) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTests, setOpenTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTests();
  }, [chapterId, subject, batchId, chapterLibraryId]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      
      console.log('[TestsXPManager] Loading tests for XP', {
        chapterId,
        batchId,
        chapterLibraryId,
        subject,
      });

      // 1) Batch-specific tests linked directly to this chapter
      const { data: batchSpecificTests, error: batchSpecificError } = await supabase
        .from('tests')
        .select('*')
        .eq('chapter_id', chapterId);

      if (batchSpecificError) throw batchSpecificError;

      // 2) Centralized tests assigned to this batch (via batch_tests)
      let centralizedTestsWithMeta: any[] = [];

      if (batchId && chapterLibraryId) {
        const { data: assignments, error: assignmentsError } = await supabase
          .from('batch_tests')
          .select(`
            id,
            xp_override,
            tests:central_test_id (*)
          `)
          .eq('batch_id', batchId);

        if (assignmentsError) {
          console.warn('[TestsXPManager] Error fetching batch_tests:', assignmentsError);
        } else {
          centralizedTestsWithMeta =
            (assignments || []).filter((row: any) => {
              const t = row.tests;
              return t && t.chapter_library_id === chapterLibraryId && t.subject === subject;
            });
        }
      }

      console.log('[TestsXPManager] Loaded tests', {
        batchSpecificCount: batchSpecificTests?.length || 0,
        centralizedAssignedCount: centralizedTestsWithMeta.length,
      });

      // 3) Get question counts for each test
      const testsWithCounts: Test[] = [];

      // Process batch-specific tests
      for (const test of batchSpecificTests || []) {
        const { count: questionCount } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('test_id', test.id);

        testsWithCounts.push({
          ...test,
          question_count: questionCount || 0,
          is_centralized: false,
        });
      }

      // Process centralized tests
      for (const row of centralizedTestsWithMeta) {
        const test = row.tests;
        const { count: questionCount } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('test_id', test.id);

        testsWithCounts.push({
          ...test,
          question_count: questionCount || 0,
          is_centralized: true,
        });
      }

      console.log(`[TestsXPManager] ✅ Loaded ${testsWithCounts.length} tests with question counts`);
      setTests(testsWithCounts);
    } catch (error: any) {
      console.error('[TestsXPManager] ❌ Failed to load tests for XP:', error);
      toast.error('Failed to load tests');
      setTests([]);
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
        <div className="flex gap-2">
          <Badge variant="secondary">{tests.length} tests</Badge>
          {chapterLibraryId && <Badge variant="outline">Centralized support enabled</Badge>}
        </div>
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
                    {test.is_centralized && (
                      <Badge variant="default" className="bg-blue-600">Centralized</Badge>
                    )}
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
