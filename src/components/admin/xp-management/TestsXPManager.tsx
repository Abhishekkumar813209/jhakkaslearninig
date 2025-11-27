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
      
      console.log(`📦 [TestsXPManager] Fetching tests for chapter ${chapterId}, batch ${batchId}, library ${chapterLibraryId}`);
      
      // PART 1: Fetch batch-specific tests (legacy)
      // Get test IDs from questions that belong to this specific chapter
      // @ts-ignore - Supabase type inference issue
      const { data: questionData, error: questionsError } = await supabase
        .from('questions')
        .select('test_id')
        .eq('chapter_id', chapterId);
      
      if (questionsError) throw questionsError;

      // Extract unique test IDs from questions
      const batchTestIds = [...new Set(
        (questionData || [])
          .map((q) => q.test_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )];

      console.log(`  ✅ Found ${batchTestIds.length} batch-specific test IDs from questions`);

      // PART 2: Fetch centralized tests assigned to this batch (NEW)
      const centralizedTestIds: string[] = [];
      
      if (batchId && chapterLibraryId) {
        const { data: batchTests, error: batchTestsError } = await supabase
          .from('batch_tests')
          .select('central_test_id')
          .eq('batch_id', batchId);

        if (batchTestsError) {
          console.warn('⚠️ [TestsXPManager] Error fetching batch_tests:', batchTestsError);
        } else if (batchTests && batchTests.length > 0) {
          // Get centralized test IDs for this chapter_library_id
          const centralIds = batchTests.map(bt => bt.central_test_id);
          
          const { data: centralTests, error: centralTestsError } = await supabase
            .from('tests')
            .select('id')
            .in('id', centralIds)
            .eq('is_centralized', true)
            .eq('chapter_library_id', chapterLibraryId)
            .eq('subject', subject);

          if (centralTestsError) {
            console.warn('⚠️ [TestsXPManager] Error fetching centralized tests:', centralTestsError);
          } else {
            centralizedTestIds.push(...(centralTests || []).map(t => t.id));
            console.log(`  ✅ Found ${centralizedTestIds.length} centralized tests assigned to batch`);
          }
        }
      }

      // Combine both sources
      const allTestIds = [...new Set([...batchTestIds, ...centralizedTestIds])];
      
      console.log(`  📊 Total unique test IDs: ${allTestIds.length}`);

      if (allTestIds.length === 0) {
        setTests([]);
        setLoading(false);
        return;
      }

      // Fetch test details for all test IDs
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .in('id', allTestIds)
        .eq('subject', subject);
      
      if (testsError) throw testsError;

      // Get question counts for each test
      const testsWithCounts: Test[] = [];
      for (const test of testsData || []) {
        // For batch-specific tests, count questions from this chapter
        // For centralized tests, count total questions
        let count = 0;
        
        if (test.is_centralized) {
          const { count: totalCount } = await supabase
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('test_id', test.id);
          count = totalCount || 0;
        } else {
          const { count: chapterCount } = await supabase
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('test_id', test.id)
            .eq('chapter_id', chapterId);
          count = chapterCount || 0;
        }
        
        testsWithCounts.push({ 
          ...test, 
          question_count: count 
        });
      }

      console.log(`  ✅ Loaded ${testsWithCounts.length} tests with question counts`);
      setTests(testsWithCounts);
    } catch (error: any) {
      console.error('❌ [TestsXPManager] Error fetching tests:', error);
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
