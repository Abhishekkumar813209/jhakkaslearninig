import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Target, Trash2, Edit, FileText } from "lucide-react";

interface BatchTest {
  id: string;
  batch_id: string;
  central_test_id: string;
  is_free: boolean;
  xp_override: number | null;
  tests: {
    id: string;
    title: string;
    description?: string;
    difficulty: string;
    duration_minutes: number;
    total_marks: number;
    default_xp: number;
  };
}

interface BatchAssignedTestsViewProps {
  batchId: string;
  chapterId: string;
}

export const BatchAssignedTestsView = ({ batchId, chapterId }: BatchAssignedTestsViewProps) => {
  const { toast } = useToast();
  const [batchTests, setBatchTests] = useState<BatchTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatchTests();
  }, [batchId, chapterId]);

  const fetchBatchTests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('batch_tests')
        .select(`
          *,
          tests!inner(*)
        `)
        .eq('batch_id', batchId)
        .eq('tests.chapter_library_id', chapterId);

      if (error) throw error;
      setBatchTests(data as any || []);
    } catch (error) {
      console.error('Error fetching batch tests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assigned tests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBatchTest = async (batchTestId: string, updates: Partial<BatchTest>) => {
    try {
      const { error } = await supabase
        .from('batch_tests')
        .update(updates)
        .eq('id', batchTestId);

      if (error) throw error;

      setBatchTests(prev =>
        prev.map(bt => (bt.id === batchTestId ? { ...bt, ...updates } : bt))
      );

      toast({
        title: "Success",
        description: "Test settings updated"
      });
    } catch (error) {
      console.error('Error updating batch test:', error);
      toast({
        title: "Error",
        description: "Failed to update test settings",
        variant: "destructive"
      });
    }
  };

  const handleRemoveTest = async (batchTestId: string) => {
    if (!confirm('Remove this test from the batch? Students will lose access to it.')) return;

    try {
      const { error } = await supabase
        .from('batch_tests')
        .delete()
        .eq('id', batchTestId);

      if (error) throw error;

      setBatchTests(prev => prev.filter(bt => bt.id !== batchTestId));

      toast({
        title: "Success",
        description: "Test removed from batch"
      });
    } catch (error) {
      console.error('Error removing test:', error);
      toast({
        title: "Error",
        description: "Failed to remove test",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading assigned tests...
        </CardContent>
      </Card>
    );
  }

  if (batchTests.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Tests Assigned</h3>
          <p className="text-sm text-muted-foreground">
            Use the "Centralized" tab to browse and assign tests to this batch
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {batchTests.map((batchTest) => (
        <Card key={batchTest.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg mb-2">{batchTest.tests.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {batchTest.tests.description || 'No description'}
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant={
                    batchTest.tests.difficulty === 'hard' ? 'destructive' :
                    batchTest.tests.difficulty === 'medium' ? 'default' : 'secondary'
                  }>
                    {batchTest.tests.difficulty}
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {batchTest.tests.duration_minutes} min
                  </Badge>
                  <Badge variant="outline">
                    <Target className="h-3 w-3 mr-1" />
                    {batchTest.tests.total_marks} marks
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveTest(batchTest.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor={`free-${batchTest.id}`}>Free Access</Label>
                <Switch
                  id={`free-${batchTest.id}`}
                  checked={batchTest.is_free ?? false}
                  onCheckedChange={(checked) =>
                    handleUpdateBatchTest(batchTest.id, { is_free: checked })
                  }
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`xp-${batchTest.id}`}>
                  XP Override (default: {batchTest.tests.default_xp})
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`xp-${batchTest.id}`}
                    type="number"
                    value={batchTest.xp_override ?? ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      handleUpdateBatchTest(batchTest.id, { xp_override: value });
                    }}
                    placeholder={`Default: ${batchTest.tests.default_xp}`}
                    className="flex-1"
                  />
                  {batchTest.xp_override && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateBatchTest(batchTest.id, { xp_override: null })}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
