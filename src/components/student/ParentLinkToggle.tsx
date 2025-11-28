import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

interface ParentLinkToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  parentName: string;
  parentPhone: string;
  parentPassword: string;
  onParentNameChange: (value: string) => void;
  onParentPhoneChange: (value: string) => void;
  onParentPasswordChange: (value: string) => void;
}

export const ParentLinkToggle = ({
  enabled,
  onToggle,
  parentName,
  parentPhone,
  parentPassword,
  onParentNameChange,
  onParentPhoneChange,
  onParentPasswordChange
}: ParentLinkToggleProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <Label htmlFor="link-parent-toggle" className="text-base font-medium">
            Link Parent Now?
          </Label>
        </div>
        <Switch
          id="link-parent-toggle"
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>

      {enabled && (
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Add parent details to link your account
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="parent-name">Parent Name</Label>
              <Input
                id="parent-name"
                type="text"
                placeholder="Enter parent name"
                value={parentName}
                onChange={(e) => onParentNameChange(e.target.value)}
                required={enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent-phone">Parent Phone</Label>
              <Input
                id="parent-phone"
                type="tel"
                placeholder="10-digit phone number"
                value={parentPhone}
                onChange={(e) => onParentPhoneChange(e.target.value)}
                maxLength={10}
                required={enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent-password">Parent Password</Label>
              <Input
                id="parent-password"
                type="password"
                placeholder="Create password for parent"
                value={parentPassword}
                onChange={(e) => onParentPasswordChange(e.target.value)}
                required={enabled}
                minLength={6}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
