import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Plus } from 'lucide-react';

interface Batch {
  id: string;
  name: string;
  target_board: string;
  target_class: string;
}

interface CentralizedTest {
  id: string;
  title: string;
  description: string;
  default_xp: number;
  difficulty: string;
  question_count: number;
  total_marks: number;
  is_assigned: boolean;
}

export const BatchTestAssigner = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [tests, setTests] = useState<CentralizedTest[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('school');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [testConfigs, setTestConfigs] = useState<Map<string, { isFree: boolean; xpOverride: number | null }>>(new Map());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBatches();
  }, [selectedDomain, selectedBoard, selectedClass]);

  useEffect(() => {
    if (selectedSubject && selectedClass && selectedBoard) {
      fetchChapters();
    }
  }, [selectedSubject, selectedClass, selectedBoard]);

  useEffect(() => {
    if (selectedChapter && selectedBatch) {
      fetchAvailableTests();
    }
  }, [selectedChapter, selectedBatch]);

  const fetchBatches = async () => {
    try {
      let query = supabase
        .from('batches')
        .select('*')
        .eq('is_active', true);

      if (selectedBoard) query = query.eq('target_board', selectedBoard as any);
      if (selectedClass) query = query.eq('target_class', selectedClass as any);

      const { data, error } = await query;
      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapter_library')
        .select('*')
        .eq('exam_type', selectedDomain)
        .eq('subject', selectedSubject)
        .eq('class_level', selectedClass)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchAvailableTests = async () => {
    try {
      setLoading(true);
      
      // Fetch centralized tests for this chapter
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select(`
          *,
          questions (count)
        `)
        .eq('is_centralized', true)
        .eq('chapter_library_id', selectedChapter);

      if (testsError) throw testsError;

      // Check which tests are already assigned to this batch
      const { data: assignedData, error: assignedError } = await supabase
        .from('batch_tests')
        .select('central_test_id')
        .eq('batch_id', selectedBatch);

      if (assignedError) throw assignedError;

      const assignedTestIds = new Set(assignedData?.map(a => a.central_test_id) || []);

      const testsWithStatus = (testsData || []).map(test => ({
        ...test,
        question_count: test.questions?.[0]?.count || 0,
        is_assigned: assignedTestIds.has(test.id)
      }));

      setTests(testsWithStatus);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({ title: 'Error', description: 'Failed to fetch tests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleTestSelection = (testId: string) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
      const newConfigs = new Map(testConfigs);
      newConfigs.delete(testId);
      setTestConfigs(newConfigs);
    } else {
      newSelected.add(testId);
      const test = tests.find(t => t.id === testId);
      if (test) {
        const newConfigs = new Map(testConfigs);
        newConfigs.set(testId, { isFree: false, xpOverride: test.default_xp });
        setTestConfigs(newConfigs);
      }
    }
    setSelectedTests(newSelected);
  };

  const updateTestConfig = (testId: string, updates: Partial<{ isFree: boolean; xpOverride: number | null }>) => {
    const newConfigs = new Map(testConfigs);
    const current = newConfigs.get(testId) || { isFree: false, xpOverride: null };
    newConfigs.set(testId, { ...current, ...updates });
    setTestConfigs(newConfigs);
  };

  const handleAssignTests = async () => {
    try {
      if (selectedTests.size === 0) {
        toast({ title: 'Error', description: 'Please select at least one test', variant: 'destructive' });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const assignments = Array.from(selectedTests).map(testId => {
        const config = testConfigs.get(testId) || { isFree: false, xpOverride: null };
        return {
          batch_id: selectedBatch,
          central_test_id: testId,
          is_free: config.isFree,
          xp_override: config.xpOverride,
          created_by: user.id
        };
      });

      const { error } = await supabase
        .from('batch_tests')
        .upsert(assignments, { onConflict: 'batch_id,central_test_id' });

      if (error) throw error;

      toast({ title: 'Success', description: `${assignments.length} test(s) assigned to batch` });
      setSelectedTests(new Set());
      setTestConfigs(new Map());
      fetchAvailableTests();
    } catch (error) {
      console.error('Error assigning tests:', error);
      toast({ title: 'Error', description: 'Failed to assign tests', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Batch Test Assignment</CardTitle>
          <p className="text-sm text-muted-foreground">
            Assign centralized tests to specific batches
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Domain</Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="competitive">Competitive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Board</Label>
              <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CBSE">CBSE</SelectItem>
                  <SelectItem value="ICSE">ICSE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {[6, 7, 8, 9, 10, 11, 12].map(cls => (
                    <SelectItem key={cls} value={`Class ${cls}`}>Class {cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch} disabled={!selectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(batch => (
                    <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedBatch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Science">Science</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Biology">Biology</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Chapter</Label>
              <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map(chapter => (
                    <SelectItem key={chapter.id} value={chapter.id}>{chapter.chapter_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Available Tests */}
          {selectedChapter && selectedBatch && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Available Tests</h3>
                <Button 
                  onClick={handleAssignTests} 
                  disabled={selectedTests.size === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Assign {selectedTests.size} Test(s)
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No tests available for this chapter</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {tests.map(test => (
                    <Card key={test.id} className={test.is_assigned ? 'border-green-500' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedTests.has(test.id)}
                            onCheckedChange={() => toggleTestSelection(test.id)}
                            disabled={test.is_assigned}
                          />
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold">{test.title}</h4>
                                <p className="text-sm text-muted-foreground">{test.description}</p>
                              </div>
                              <div className="flex gap-2">
                                {test.is_assigned && <Badge variant="secondary" className="bg-green-500 text-white">✓ Assigned</Badge>}
                                <Badge variant="outline">{test.difficulty}</Badge>
                                <Badge>{test.default_xp} XP</Badge>
                              </div>
                            </div>

                            {selectedTests.has(test.id) && (
                              <div className="flex items-center gap-6 p-3 bg-accent rounded-md">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={testConfigs.get(test.id)?.isFree || false}
                                    onCheckedChange={(checked) => updateTestConfig(test.id, { isFree: checked })}
                                  />
                                  <Label>Free Test</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label>Custom XP:</Label>
                                  <Input
                                    type="number"
                                    className="w-24"
                                    value={testConfigs.get(test.id)?.xpOverride || test.default_xp}
                                    onChange={(e) => updateTestConfig(test.id, { xpOverride: parseInt(e.target.value) || null })}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
