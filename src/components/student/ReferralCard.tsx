import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Share2, Users, TrendingUp } from 'lucide-react';
import { useReferrals } from '@/hooks/useReferrals';
import { Skeleton } from '@/components/ui/skeleton';

export const ReferralCard = () => {
  const { referralCode, referrals, credits, loading, copyReferralLink } = useReferrals();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // const joinedCount = referrals.filter(r => r.status === 'joined' || r.status === 'paid').length; // Future feature
  const paidCount = referrals.filter(r => r.status === 'paid').length;
  const totalEarned = credits?.total_credits || 0;

  const shareOnWhatsApp = () => {
    const message = `🎓 Join this awesome learning platform using my referral code: ${referralCode}\n\nGet started now: ${window.location.origin}/register?ref=${referralCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Refer & Earn
        </CardTitle>
        <CardDescription>Earn ₹25 when friends subscribe</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Code */}
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
          <div className="flex items-center justify-between">
            <p className="text-xl font-bold text-primary">{referralCode}</p>
            <Button size="sm" variant="ghost" onClick={copyReferralLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{paidCount}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </div>
          <div className="text-center p-2 bg-green-500/10 rounded-lg">
            <p className="text-2xl font-bold text-green-600">₹{totalEarned}</p>
            <p className="text-xs text-muted-foreground">Earned</p>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-2">
          <Button onClick={shareOnWhatsApp} className="flex-1" variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button onClick={copyReferralLink} className="flex-1">
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
