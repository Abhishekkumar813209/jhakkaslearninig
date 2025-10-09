import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Download, ShoppingCart } from 'lucide-react';
import { useReferrals } from '@/hooks/useReferrals';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { WithdrawCreditsDialog } from './WithdrawCreditsDialog';
import { ReferralHistory } from './ReferralHistory';

export const ReferralWallet = () => {
  const { credits, loading } = useReferrals();
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const available = credits?.available_credits || 0;
  const used = credits?.used_credits || 0;
  const locked = credits?.locked_for_withdrawal || 0;
  const total = credits?.total_credits || 0;

  return (
    <div className="space-y-4">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-3xl font-bold text-green-600">₹{available.toFixed(2)}</p>
              </div>
              <Wallet className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Used</p>
                <p className="text-3xl font-bold">₹{used.toFixed(2)}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-3xl font-bold text-primary">₹{total.toFixed(2)}</p>
              </div>
              <Download className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locked Credits Warning */}
      {locked > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800">
              ₹{locked.toFixed(2)} is locked for pending withdrawal requests
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          onClick={() => setShowWithdrawDialog(true)}
          disabled={available <= 0}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Withdraw via UPI
        </Button>
        <Button 
          variant="outline"
          className="flex-1"
          disabled={available <= 0}
          onClick={() => window.location.href = '/student'}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Use in Next Purchase
        </Button>
      </div>

      {/* Transaction History */}
      <ReferralHistory />

      {/* Withdraw Dialog */}
      <WithdrawCreditsDialog 
        open={showWithdrawDialog}
        onOpenChange={setShowWithdrawDialog}
        availableCredits={available}
      />
    </div>
  );
};
