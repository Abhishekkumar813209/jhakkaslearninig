import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface EditCellDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (newValue: any) => Promise<void>;
  columnName: string;
  currentValue: any;
  dataType: string;
}

export function EditCellDialog({
  open,
  onClose,
  onSave,
  columnName,
  currentValue,
  dataType
}: EditCellDialogProps) {
  const [value, setValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(value);
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderInput = () => {
    // Handle boolean
    if (dataType === 'boolean' || typeof currentValue === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={value}
            onCheckedChange={setValue}
            id="bool-switch"
          />
          <Label htmlFor="bool-switch">{value ? 'True' : 'False'}</Label>
        </div>
      );
    }

    // Handle JSON objects/arrays
    if (dataType === 'object' || (typeof currentValue === 'object' && currentValue !== null)) {
      return (
        <Textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              setValue(JSON.parse(e.target.value));
            } catch {
              setValue(e.target.value);
            }
          }}
          rows={10}
          className="font-mono text-sm"
          placeholder="Enter valid JSON"
        />
      );
    }

    // Handle numbers
    if (dataType === 'number' || typeof currentValue === 'number') {
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => setValue(e.target.value ? Number(e.target.value) : null)}
          placeholder="Enter number"
        />
      );
    }

    // Handle long text
    if (typeof currentValue === 'string' && currentValue.length > 100) {
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          placeholder="Enter text"
        />
      );
    }

    // Default: text input
    return (
      <Input
        type="text"
        value={value || ''}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter value"
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Cell</DialogTitle>
          <DialogDescription>
            Editing column: <span className="font-semibold">{columnName}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Type: {dataType}</Label>
            {renderInput()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
