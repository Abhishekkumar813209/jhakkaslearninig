import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Referral {
  id: string;
  referred_email: string;
  referred_name: string;
  status: string;
  bonus_paid: number;
  created_at: string;
  joined_at: string;
  paid_at: string;
}

interface ReferralCredits {
  total_credits: number;
  used_credits: number;
  locked_for_withdrawal: number;
  available_credits: number;
}

interface WithdrawalHistory {
  id: string;
  amount: number;
  upi_id: string;
  status: string;
  requested_at: string;
  completed_at: string;
}

export const useReferrals = () => {
  const [referralCode, setReferralCode] = useState<string>('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [credits, setCredits] = useState<ReferralCredits | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch or generate referral code
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('referral_code')
        .eq('referrer_id', user.id)
        .maybeSingle();

      if (existingReferral) {
        setReferralCode(existingReferral.referral_code);
      } else {
        // Generate new code
        const { data, error } = await supabase.functions.invoke('generate-referral-code');
        if (error) throw error;
        setReferralCode(data.referralCode);
      }

      // Fetch referrals
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      setReferrals(referralsData || []);

      // Fetch credits
      const { data: creditsData } = await supabase
        .from('referral_credits')
        .select('*')
        .eq('student_id', user.id)
        .maybeSingle();

      setCredits(creditsData);

      // Fetch withdrawal history
      const { data: withdrawalsData } = await supabase
        .from('withdrawal_history')
        .select('*')
        .eq('student_id', user.id)
        .order('requested_at', { ascending: false });

      setWithdrawals(withdrawalsData || []);

    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referral data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard',
    });
  };

  const requestWithdrawal = async (amount: number, upiId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { data, error } = await supabase.functions.invoke('request-withdrawal', {
        body: { amount, upiId },
        headers
      });

      if (error) throw error;

      toast({
        title: 'Withdrawal Request Submitted! 📝',
        description: 'Your request is being reviewed. Money will be transferred within 24 hours.',
      });

      await fetchReferralData();
      return true;
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      
      // Extract actual error message from edge function response
      const errorMessage = error?.context?.error || error?.message || 'Failed to request withdrawal';
      
      toast({
        title: 'Withdrawal Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  return {
    referralCode,
    referrals,
    credits,
    withdrawals,
    loading,
    copyReferralLink,
    requestWithdrawal,
    refreshData: fetchReferralData,
  };
};
