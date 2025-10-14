import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, CheckCircle, Clock, BookOpen, Users, Brain } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  title?: string;
  description?: string;
}

const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onSubscribe,
  title = "Premium Required",
  description = "This feature requires a premium subscription to access."
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Premium Features</h4>
              <Badge variant="secondary" className="text-primary font-semibold">
                ₹299/month
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Unlimited Tests</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-green-500" />
                <span>Learning Paths</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-green-500" />
                <span>Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <span>Rankings</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe Later
            </Button>
            <Button onClick={onSubscribe} className="flex-1">
              View Plans ↓
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            ✓ UPI, Cards, Net Banking • ✓ Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;