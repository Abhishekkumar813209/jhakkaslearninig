import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface TestXPConfigProps {
  test: {
    id: string;
    title: string;
    default_xp?: number;
    total_marks: number;
    question_count: number;
  };
  onUpdate: () => void;
}

export const TestXPConfig = ({ test, onUpdate }: TestXPConfigProps) => {
  const [totalXP, setTotalXP] = useState(test.default_xp || 100);
  const [saving, setSaving] = useState(false);

  const saveTestXP = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('tests')
        .update({
          default_xp: totalXP,
        })
        .eq('id', test.id);

      if (error) throw error;

      toast.success('Test XP configuration updated');
      onUpdate();
    } catch (error: any) {
      console.error('Error updating test XP:', error);
      toast.error('Failed to update test XP');
    } finally {
      setSaving(false);
    }
  };

  const isModified = totalXP !== (test.default_xp || 100);

  return (
    <div className="space-y-6">
      {/* XP Configuration Input */}
      <div className="space-y-2">
        <Label htmlFor={`total-xp-${test.id}`}>Total Test XP</Label>
        <Input
          id={`total-xp-${test.id}`}
          type="number"
          min="0"
          value={totalXP}
          onChange={(e) => setTotalXP(parseInt(e.target.value) || 0)}
          placeholder="Total XP (default: 100)"
        />
        <p className="text-xs text-muted-foreground">
          Total XP awarded for this test (default: 100)
        </p>
      </div>

      {/* XP Formula Explanation */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-5 w-5 text-primary" />
            <span className="font-semibold">XP Calculation Formula:</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="bg-background p-3 rounded border">
              <code className="text-primary font-mono">
                XP Awarded = {totalXP} × (Correct Questions / Total Questions)
              </code>
            </div>
            <div className="text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Example: 7 out of 10 correct →</span>
                <span className="font-medium">{Math.round(totalXP * 0.7)} XP</span>
              </div>
              <div className="flex justify-between">
                <span>Example: 10 out of 10 correct →</span>
                <span className="font-medium">{totalXP} XP</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="space-y-1">
          <p>Total Questions: <span className="font-medium">{test.question_count}</span></p>
          <p>Total Marks: <span className="font-medium">{test.total_marks}</span></p>
        </div>
        <Button
          onClick={saveTestXP}
          disabled={!isModified || saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Test XP
        </Button>
      </div>
    </div>
  );
};