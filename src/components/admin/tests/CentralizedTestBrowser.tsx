import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Target, FileText, CheckCircle2 } from "lucide-react";

interface Test {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  duration_minutes: number;
  total_marks: number;
  default_xp: number;
  is_centralized: boolean;
}

interface CentralizedTestBrowserProps {
  batchId: string;
  chapterLibraryId: string;
  examDomain: string;
  board?: string | null;
  studentClass?: string | null;
  subject: string;
  chapterName: string;
}

export const CentralizedTestBrowser = ({
  batchId,
  chapterLibraryId,
  examDomain,
  board,
  studentClass,
  subject,
  chapterName
}: CentralizedTestBrowserProps) => {
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [assignedTestIds, setAssignedTestIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Assignment config for each test
  const [assignConfigs, setAssignConfigs] = useState<Record<string, { isFree: boolean; xpOverride: number | null }>>({});

  useEffect(() => {
    fetchCentralizedTests();
    fetchAssignedTests();
  }, [chapterLibraryId]);

  const fetchCentralizedTests = async () => {
    try {
      setLoading(true);
      
      // FIX BUG #2: Don't query if chapterLibraryId is empty/invalid
      if (!chapterLibraryId || chapterLibraryId.trim() === '') {
        console.log('⚠️ [CentralizedTestBrowser] No chapter_library_id provided');
        console.log(`   📍 Context: batch=${batchId}, domain=${examDomain}, subject=${subject}, chapter=${chapterName}`);
        setTests([]);
        setLoading(false);
        return;
      }

      console.log(`📦 [CentralizedTestBrowser] Fetching centralized tests`);
      console.log(`   📍 chapter_library_id: ${chapterLibraryId}`);
      console.log(`   📍 exam_domain: ${examDomain}, subject: ${subject}, chapter: ${chapterName}`);
      
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('is_centralized', true)
        .eq('chapter_library_id', chapterLibraryId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [CentralizedTestBrowser] Query error:', error);
        throw error;
      }
      
      console.log(`✅ [CentralizedTestBrowser] Found ${data?.length || 0} centralized tests for chapter_library_id: ${chapterLibraryId}`);
      if (data && data.length > 0) {
        console.log(`   📊 Tests: ${data.map(t => t.title).join(', ')}`);
      }
      setTests(data || []);
    } catch (error: any) {
      console.error('❌ [CentralizedTestBrowser] Error fetching centralized tests:', error);
      // FIX BUG #4: Only show toast for genuine errors, not missing data
      if (error.code !== '22P02') {
        toast({
          title: "Error",
          description: "Failed to fetch centralized tests",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedTests = async () => {
    try {
      const { data, error } = await supabase
        .from('batch_tests')
        .select('central_test_id')
        .eq('batch_id', batchId);

      if (error) throw error;
      const ids = new Set(data.map(bt => bt.central_test_id));
      setAssignedTestIds(ids);
    } catch (error) {
      console.error('Error fetching assigned tests:', error);
    }
  };

  const handleAssignTest = async (testId: string) => {
    const config = assignConfigs[testId] || { isFree: false, xpOverride: null };

    try {
      const { error } = await supabase
        .from('batch_tests')
        .insert({
          batch_id: batchId,
          central_test_id: testId,
          is_free: config.isFree,
          xp_override: config.xpOverride
        });

      if (error) throw error;

      setAssignedTestIds(prev => new Set(prev).add(testId));
      
      toast({
        title: "Success",
        description: "Test assigned to batch"
      });
    } catch (error: any) {
      console.error('Error assigning test:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign test",
        variant: "destructive"
      });
    }
  };

  const updateAssignConfig = (testId: string, key: 'isFree' | 'xpOverride', value: any) => {
    setAssignConfigs(prev => ({
      ...prev,
      [testId]: {
        ...(prev[testId] || { isFree: false, xpOverride: null }),
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading centralized tests...
        </CardContent>
      </Card>
    );
  }

  // FIX BUG #4: Show calm informational message, not scary error
  if (!chapterLibraryId || chapterLibraryId.trim() === '') {
    return (
      <Card className="border-blue-200 bg-blue-50/10">
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-blue-500" />
          <h3 className="text-lg font-semibold mb-2">No Centralized Library Link</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This chapter is not linked to the centralized chapter library, so centralized tests are not available here.
            You can still create batch-specific tests using the "Create Test" tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (tests.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Centralized Tests Available</h3>
          <p className="text-sm text-muted-foreground">
            No tests have been created for this chapter in the centralized library yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Showing {tests.length} centralized test{tests.length !== 1 ? 's' : ''} for {chapterName}
      </div>

      {tests.map((test) => {
        const isAssigned = assignedTestIds.has(test.id);
        const config = assignConfigs[test.id] || { isFree: false, xpOverride: null };

        return (
          <Card key={test.id} className={isAssigned ? 'border-green-500' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    {isAssigned && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Assigned
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {test.description || 'No description'}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant={
                      test.difficulty === 'hard' ? 'destructive' :
                      test.difficulty === 'medium' ? 'default' : 'secondary'
                    }>
                      {test.difficulty}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {test.duration_minutes} min
                    </Badge>
                    <Badge variant="outline">
                      <Target className="h-3 w-3 mr-1" />
                      {test.total_marks} marks
                    </Badge>
                    <Badge variant="outline">
                      {test.default_xp} XP
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {!isAssigned && (
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`free-${test.id}`}>Free Access</Label>
                    <Switch
                      id={`free-${test.id}`}
                      checked={config.isFree}
                      onCheckedChange={(checked) =>
                        updateAssignConfig(test.id, 'isFree', checked)
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`xp-${test.id}`}>
                      XP Override (default: {test.default_xp})
                    </Label>
                    <Input
                      id={`xp-${test.id}`}
                      type="number"
                      value={config.xpOverride ?? ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : null;
                        updateAssignConfig(test.id, 'xpOverride', value);
                      }}
                      placeholder={`Default: ${test.default_xp}`}
                    />
                  </div>

                  <Button
                    onClick={() => handleAssignTest(test.id)}
                    className="w-full"
                  >
                    Assign to Batch
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};
