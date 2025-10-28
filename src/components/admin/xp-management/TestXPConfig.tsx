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
    base_xp_reward: number;
    xp_per_mark: number;
    bonus_xp_on_perfect: number;
    total_marks: number;
    question_count: number;
  };
  onUpdate: () => void;
}

export const TestXPConfig = ({ test, onUpdate }: TestXPConfigProps) => {
  const [baseXP, setBaseXP] = useState(test.base_xp_reward || 0);
  const [xpPerMark, setXpPerMark] = useState(test.xp_per_mark || 0);
  const [bonusXP, setBonusXP] = useState(test.bonus_xp_on_perfect || 0);
  const [saving, setSaving] = useState(false);

  const calculateMaxXP = () => {
    return baseXP + (test.total_marks * xpPerMark) + bonusXP;
  };

  const saveTestXP = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('tests')
        .update({
          base_xp_reward: baseXP,
          xp_per_mark: xpPerMark,
          bonus_xp_on_perfect: bonusXP,
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

  const isModified = 
    baseXP !== test.base_xp_reward ||
    xpPerMark !== test.xp_per_mark ||
    bonusXP !== test.bonus_xp_on_perfect;

  return (
    <div className="space-y-6">
      {/* XP Configuration Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`base-xp-${test.id}`}>Base XP Reward</Label>
          <Input
            id={`base-xp-${test.id}`}
            type="number"
            min="0"
            value={baseXP}
            onChange={(e) => setBaseXP(parseInt(e.target.value) || 0)}
            placeholder="Base XP"
          />
          <p className="text-xs text-muted-foreground">
            XP awarded for attempting the test
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`xp-per-mark-${test.id}`}>XP per Mark</Label>
          <Input
            id={`xp-per-mark-${test.id}`}
            type="number"
            min="0"
            step="0.5"
            value={xpPerMark}
            onChange={(e) => setXpPerMark(parseFloat(e.target.value) || 0)}
            placeholder="XP per mark"
          />
          <p className="text-xs text-muted-foreground">
            XP multiplier per mark scored
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`bonus-xp-${test.id}`}>Perfect Score Bonus</Label>
          <Input
            id={`bonus-xp-${test.id}`}
            type="number"
            min="0"
            value={bonusXP}
            onChange={(e) => setBonusXP(parseInt(e.target.value) || 0)}
            placeholder="Bonus XP"
          />
          <p className="text-xs text-muted-foreground">
            Extra XP for 100% score
          </p>
        </div>
      </div>

      {/* Max XP Calculation */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <span className="font-semibold">Maximum Possible XP:</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {calculateMaxXP()} XP
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Base XP:</span>
              <span className="font-medium">{baseXP}</span>
            </div>
            <div className="flex justify-between">
              <span>Marks XP ({test.total_marks} × {xpPerMark}):</span>
              <span className="font-medium">{test.total_marks * xpPerMark}</span>
            </div>
            <div className="flex justify-between">
              <span>Perfect Bonus:</span>
              <span className="font-medium">{bonusXP}</span>
            </div>
            <div className="border-t pt-1 mt-1 flex justify-between font-semibold">
              <span>Total:</span>
              <span>{calculateMaxXP()}</span>
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
