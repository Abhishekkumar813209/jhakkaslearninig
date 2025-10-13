import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReferrals } from '@/hooks/useReferrals';
import { Loader2 } from 'lucide-react';

interface WithdrawCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCredits: number;
}

export const WithdrawCreditsDialog = ({ open, onOpenChange, availableCredits }: WithdrawCreditsDialogProps) => {
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const { requestWithdrawal } = useReferrals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await requestWithdrawal(parseFloat(amount), upiId);
    
    setLoading(false);
    
    if (success) {
      setAmount('');
      setUpiId('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw Credits via UPI</DialogTitle>
          <DialogDescription>
            Available balance: ₹{availableCredits.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="25"
              max={availableCredits}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum: ₹25, Maximum: ₹{availableCredits.toFixed(2)}
            </p>
          </div>

          <div>
            <Label htmlFor="upiId">UPI ID</Label>
            <Input
              id="upiId"
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@paytm"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              e.g., yourname@paytm, yourname@phonepe
            </p>
          </div>

          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-xs text-green-800">
              ✅ Money will be transferred to your UPI within 24 hours
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Request Withdrawal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
