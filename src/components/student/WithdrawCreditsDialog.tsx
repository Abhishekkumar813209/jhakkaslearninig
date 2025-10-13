import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  const [withdrawalMethod, setWithdrawalMethod] = useState<'upi' | 'phone'>('upi');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const { requestWithdrawal } = useReferrals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await requestWithdrawal(
      parseFloat(amount), 
      withdrawalMethod === 'upi' ? upiId : '',
      withdrawalMethod,
      phoneNumber,
      accountName
    );
    
    setLoading(false);
    
    if (success) {
      setAmount('');
      setUpiId('');
      setPhoneNumber('');
      setAccountName('');
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
              Minimum: ₹25, Available: ₹{availableCredits.toFixed(2)}
            </p>
          </div>

          <div>
            <Label>Withdrawal Method</Label>
            <RadioGroup value={withdrawalMethod} onValueChange={(value: 'upi' | 'phone') => setWithdrawalMethod(value)} className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upi" id="upi" />
                <Label htmlFor="upi" className="font-normal cursor-pointer">UPI ID</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="phone" id="phone" />
                <Label htmlFor="phone" className="font-normal cursor-pointer">Phone Number</Label>
              </div>
            </RadioGroup>
          </div>

          {withdrawalMethod === 'upi' ? (
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
          ) : (
            <>
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your registered mobile number for UPI payment
                </p>
              </div>
              <div>
                <Label htmlFor="accountName">Full Name (as per bank account)</Label>
                <Input
                  id="accountName"
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Name as it appears on your bank account
                </p>
              </div>
            </>
          )}

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-xs text-yellow-800">
              ⏳ Your withdrawal request will be reviewed by our admin team within 24 hours
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
