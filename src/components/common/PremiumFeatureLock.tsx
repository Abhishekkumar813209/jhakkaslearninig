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
    <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          {featureName} - Premium Feature
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Premium Access Required</strong>
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
            Your previous subscription has expired. Renew to continue accessing this feature.
          </p>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            ✓ Unlimited tests and learning paths
          </p>
          <p className="text-xs text-muted-foreground">
            ✓ 30 days full access for just ₹299
          </p>
          <p className="text-xs text-muted-foreground">
            ✓ All payment methods (UPI, Cards, Net Banking)
          </p>
        </div>

        {onUpgrade && (
          <Button 
            onClick={onUpgrade}
            className="w-full"
            size="lg"
          >
            <Zap className="h-4 w-4 mr-2" />
            Renew Premium Access ₹299
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PremiumFeatureLock;