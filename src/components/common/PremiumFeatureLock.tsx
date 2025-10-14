import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Zap } from 'lucide-react';

interface PremiumFeatureLockProps {
  featureName: string;
  description: string;
  onUpgrade?: () => void;
}

const PremiumFeatureLock: React.FC<PremiumFeatureLockProps> = ({
  featureName,
  description,
  onUpgrade
}) => {
  return (
    <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{description}</p>
          </div>
        </div>
        
        {onUpgrade && (
          <Button 
            onClick={onUpgrade}
            variant="default"
            size="sm"
          >
            View Renewal Plans ↓
          </Button>
        )}
      </div>
    </div>
  );
};

export default PremiumFeatureLock;