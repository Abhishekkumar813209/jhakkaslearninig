import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users2, TrendingUp } from "lucide-react";

const ReferralManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [studentDiscount, setStudentDiscount] = useState("");
  const [referrerBonus, setReferrerBonus] = useState("");

  const { data: referralConfig, isLoading } = useQuery({
    queryKey: ['referral-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  const { data: referralStats } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const { count: totalReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true });

      const { count: paidReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid');

      const { data: totalRewards } = await supabase
        .from('referral_credits')
        .select('total_credits');

      const sumRewards = totalRewards?.reduce((sum, r) => sum + (r.total_credits || 0), 0) || 0;

      return {
        totalReferrals: totalReferrals || 0,
        paidReferrals: paidReferrals || 0,
        totalRewardsDistributed: sumRewards
      };
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (values: {
      student_discount: number;
      referrer_bonus: number;
    }) => {
      // Deactivate all existing configs
      await supabase
        .from('referral_config')
        .update({ is_active: false })
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('referral_config')
        .insert({
          student_discount: values.student_discount,
          referrer_bonus: values.referrer_bonus,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-config'] });
      toast({
        title: "Referral Settings Updated",
        description: "New referral configuration has been activated."
      });
      setStudentDiscount("");
      setReferrerBonus("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const discount = parseFloat(studentDiscount);
    const bonus = parseFloat(referrerBonus);

    if (isNaN(discount) || discount <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid student discount amount.",
        variant: "destructive"
      });
      return;
    }

    if (isNaN(bonus) || bonus <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid referrer bonus amount.",
        variant: "destructive"
      });
      return;
    }

    updateConfigMutation.mutate({
      student_discount: discount,
      referrer_bonus: bonus
    });
  };

  if (isLoading) {
    return <div>Loading referral configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Referral Program Settings
          </CardTitle>
          <CardDescription>
            Configure rewards for friend referrals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralConfig && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Current Active Configuration</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">New Student Gets:</span>
                  <span className="ml-2 font-semibold text-green-600">₹{referralConfig.student_discount} OFF</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Referrer Earns:</span>
                  <span className="ml-2 font-semibold text-blue-600">₹{referralConfig.referrer_bonus} Credits</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentDiscount">New Student Discount (₹)</Label>
                <Input
                  id="studentDiscount"
                  type="number"
                  placeholder="25"
                  value={studentDiscount}
                  onChange={(e) => setStudentDiscount(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Amount deducted when using friend's referral code
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referrerBonus">Referrer Bonus (₹)</Label>
                <Input
                  id="referrerBonus"
                  type="number"
                  placeholder="25"
                  value={referrerBonus}
                  onChange={(e) => setReferrerBonus(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Credits awarded to student who referred
                </p>
              </div>
            </div>

            <Button type="submit" disabled={updateConfigMutation.isPending}>
              {updateConfigMutation.isPending ? "Updating..." : "Update Referral Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {referralStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Referral Program Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{referralStats.totalReferrals}</div>
                <div className="text-sm text-muted-foreground">Total Referrals</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{referralStats.paidReferrals}</div>
                <div className="text-sm text-muted-foreground">Successful (Paid)</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">₹{referralStats.totalRewardsDistributed}</div>
                <div className="text-sm text-muted-foreground">Total Credits Distributed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReferralManagement;
