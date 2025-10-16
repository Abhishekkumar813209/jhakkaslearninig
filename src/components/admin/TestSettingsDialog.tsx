import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon, InfoIcon } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';

interface TestSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  onSettingsUpdate?: () => void;
}

interface TestSettings {
  duration_minutes: number;
  passing_marks: number;
  allow_retakes: boolean;
  max_attempts: number;
  scheduled_at: string;
  expires_at: string;
  instructions: string;
  target_class: string;
  target_board: string;
  is_free: boolean;
  base_xp_reward: number;
  xp_per_mark: number;
  bonus_xp_on_perfect: number;
}

const TestSettingsDialog: React.FC<TestSettingsDialogProps> = ({
  open,
  onOpenChange,
  testId,
  onSettingsUpdate
}) => {
  const [settings, setSettings] = useState<TestSettings>({
    duration_minutes: 60,
    passing_marks: 40,
    allow_retakes: true,
    max_attempts: 3,
    scheduled_at: '',
    expires_at: '',
    instructions: '',
    target_class: '',
    target_board: '',
    is_free: false,
    base_xp_reward: 50,
    xp_per_mark: 2,
    bonus_xp_on_perfect: 50
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { boards: availableBoards, requiresBoard } = useBoards('school');

  useEffect(() => {
    if (open && testId) {
      fetchSettings();
    }
  }, [open, testId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-settings', {
        body: { testId, action: 'getSettings' }
      });

      if (error) throw error;

      if (data?.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching test settings:', error);
      toast({
        title: "Error",
        description: "Failed to load test settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-settings', {
        body: { testId, action: 'updateSettings', settings }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test settings updated successfully"
      });

      onSettingsUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving test settings:', error);
      toast({
        title: "Error",
        description: "Failed to save test settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDateTimeLocal = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  const handleDateTimeChange = (field: 'scheduled_at' | 'expires_at', value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value ? new Date(value).toISOString() : ''
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <InfoIcon className="h-5 w-5" />
            Test Settings
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              {/* Target Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="target_class">Target Class</Label>
                  <Select value={settings.target_class} onValueChange={(value) => setSettings(prev => ({ ...prev, target_class: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Class 1</SelectItem>
                      <SelectItem value="2">Class 2</SelectItem>
                      <SelectItem value="3">Class 3</SelectItem>
                      <SelectItem value="4">Class 4</SelectItem>
                      <SelectItem value="5">Class 5</SelectItem>
                      <SelectItem value="6">Class 6</SelectItem>
                      <SelectItem value="7">Class 7</SelectItem>
                      <SelectItem value="8">Class 8</SelectItem>
                      <SelectItem value="9">Class 9</SelectItem>
                      <SelectItem value="10">Class 10</SelectItem>
                      <SelectItem value="11">Class 11</SelectItem>
                      <SelectItem value="12">Class 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {requiresBoard && (
                  <div className="space-y-2">
                    <Label htmlFor="target_board">Target Board</Label>
                    <Select value={settings.target_board} onValueChange={(value) => setSettings(prev => ({ ...prev, target_board: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Board" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBoards.map(board => (
                          <SelectItem key={board} value={board}>
                            {board}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
              )}
            </div>

            {/* Test Duration and Passing Marks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Test Duration (minutes)</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  min="5"
                  max="300"
                  value={settings.duration_minutes}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    duration_minutes: parseInt(e.target.value) || 60
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  How long students have to complete the test
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passing_marks">Passing Marks (%)</Label>
                <Input
                  id="passing_marks"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.passing_marks}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    passing_marks: parseInt(e.target.value) || 40
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum percentage required to pass
                </p>
              </div>
            </div>

            {/* Allow Retakes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="allow_retakes">Allow Retakes</Label>
                <Switch
                  id="allow_retakes"
                  checked={settings.allow_retakes}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    allow_retakes: checked
                  }))}
                />
              </div>

              {settings.allow_retakes && (
                <div className="space-y-2">
                  <Label htmlFor="max_attempts">Maximum Attempts</Label>
                  <Input
                    id="max_attempts"
                    type="number"
                    min="1"
                    value={settings.max_attempts}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      max_attempts: parseInt(e.target.value) || 1
                    }))}
                  />
                </div>
              )}
            </div>

            {/* Scheduling */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled_at" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Scheduled Start
                </Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={formatDateTimeLocal(settings.scheduled_at)}
                  onChange={(e) => handleDateTimeChange('scheduled_at', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires_at">Expires At</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={formatDateTimeLocal(settings.expires_at)}
                  onChange={(e) => handleDateTimeChange('expires_at', e.target.value)}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                rows={2}
                placeholder="Enter test instructions for students..."
                value={settings.instructions}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  instructions: e.target.value
                }))}
              />
            </div>

            {/* XP Rewards Configuration */}
            <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">XP Rewards Configuration</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Configure how students earn XP (experience points) for completing this test
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="base_xp_reward">Base XP Reward</Label>
                  <Input
                    id="base_xp_reward"
                    type="number"
                    min="0"
                    value={settings.base_xp_reward}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      base_xp_reward: parseInt(e.target.value) || 0
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Base XP awarded for attempting the test
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="xp_per_mark">XP per Mark Obtained</Label>
                  <Input
                    id="xp_per_mark"
                    type="number"
                    min="0"
                    value={settings.xp_per_mark}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      xp_per_mark: parseInt(e.target.value) || 0
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    XP awarded for each mark the student scores
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonus_xp_on_perfect">Perfect Score Bonus XP</Label>
                  <Input
                    id="bonus_xp_on_perfect"
                    type="number"
                    min="0"
                    value={settings.bonus_xp_on_perfect}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      bonus_xp_on_perfect: parseInt(e.target.value) || 0
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Bonus XP awarded for scoring 100%
                  </p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border">
                <p className="text-xs font-medium mb-1">Total XP Formula:</p>
                <p className="text-xs text-muted-foreground">
                  Base XP + (Marks Obtained × XP per Mark) + Perfect Score Bonus (if 100%)
                </p>
              </div>
            </div>

            {/* Free Test Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="is_free" className="text-base">Make this test free</Label>
                <p className="text-sm text-muted-foreground">
                  Free tests can be taken by all students regardless of subscription status
                </p>
              </div>
              <Switch
                id="is_free"
                checked={settings.is_free}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  is_free: checked
                }))}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={saveSettings}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TestSettingsDialog;