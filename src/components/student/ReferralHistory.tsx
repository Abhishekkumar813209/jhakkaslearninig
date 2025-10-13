import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useReferrals } from '@/hooks/useReferrals';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Download } from 'lucide-react';

export const ReferralHistory = () => {
  const { referrals, withdrawals } = useReferrals();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-green-500';
      case 'joined':
      case 'processing':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return '✅';
      case 'joined':
      case 'processing':
        return '🔄';
      case 'pending':
        return '⏳';
      case 'failed':
      case 'cancelled':
        return '❌';
      default:
        return '•';
    }
  };

  const allTransactions = [
    ...referrals.map(r => ({
      id: r.id,
      type: 'referral',
      amount: r.bonus_paid,
      description: r.referred_name || r.referred_email || 'Friend',
      status: r.status,
      date: r.paid_at || r.joined_at || r.created_at,
    })),
    ...withdrawals.map(w => ({
      id: w.id,
      type: 'withdrawal',
      amount: -w.amount,
      description: `Withdrawal to ${w.upi_id}`,
      status: w.status,
      date: w.completed_at || w.requested_at,
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your referral earnings and withdrawals</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No transactions yet. Start referring friends to earn credits!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your referral earnings and withdrawals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${transaction.type === 'referral' ? 'bg-green-100' : 'bg-blue-100'}`}>
                  {transaction.type === 'referral' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <Download className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.amount > 0 ? '+' : ''}₹{Math.abs(transaction.amount).toFixed(2)}
                </p>
                <Badge variant="outline" className={`${getStatusColor(transaction.status)} text-white text-xs`}>
                  {getStatusIcon(transaction.status)} {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
