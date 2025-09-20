import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon, ClockIcon, InfoIcon } from 'lucide-react';

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
    instructions: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      <DialogContent className="max-w-md">
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
          <div className="space-y-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4" />
                  Duration (minutes)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={settings.duration_minutes}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    duration_minutes: parseInt(e.target.value) || 0
                  }))}
                />
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
                    passing_marks: parseInt(e.target.value) || 0
                  }))}
                />
              </div>

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
            <div className="space-y-4">
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
                rows={3}
                placeholder="Enter test instructions for students..."
                value={settings.instructions}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  instructions: e.target.value
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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TestSettingsDialog;