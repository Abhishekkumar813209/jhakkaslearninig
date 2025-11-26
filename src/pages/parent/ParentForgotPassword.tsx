import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Lock, KeyRound } from 'lucide-react';

export default function ParentForgotPassword() {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phone.length !== 10) {
      toast({
        variant: 'destructive',
        title: 'Invalid Phone',
        description: 'Please enter a valid 10-digit phone number.',
      });
      return;
    }

    setLoading(true);

    try {
      // Call edge function to generate and send OTP
      const { data, error } = await supabase.functions.invoke('parent-send-otp', {
        body: { phone, action: 'password_reset' },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      toast({
        title: 'OTP Sent!',
        description: 'OTP has been sent to your registered mobile number.',
      });

      setResetId(data.reset_id);
      setStep(1); // Keep on step 1 but show OTP input

      // Development mode: Silent console log only (no UI display)
      if (process.env.NODE_ENV === 'development' && data.otp_dev) {
        console.log('[DEV] OTP:', data.otp_dev);
      }
      
    } catch (error: any) {
      console.error('OTP send error:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Send OTP',
        description: error?.message || 'Please try again.',
      });
    }

    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit OTP.',
      });
      return;
    }

    setLoading(true);

    try {
      // Call edge function to verify OTP
      const { data, error } = await supabase.functions.invoke('parent-verify-otp', {
        body: { phone, otp, reset_id: resetId },
      });

      if (error) throw error;

      if (data.verified) {
        toast({
          title: 'OTP Verified!',
          description: 'Please set your new password.',
        });
        setStep(2);
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid OTP',
          description: 'The OTP you entered is incorrect or expired.',
        });
      }
      
    } catch (error: any) {
      console.error('OTP verify error:', error);
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error?.message || 'Please try again.',
      });
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long.',
      });
      return;
    }

    setLoading(true);

    try {
      // Call edge function to reset password
      const { data, error } = await supabase.functions.invoke('parent-reset-password', {
        body: { phone, otp, new_password: newPassword, reset_id: resetId },
      });

      if (error) throw error;

      toast({
        title: 'Password Reset Successful!',
        description: 'Your password has been changed. Redirecting to login...',
      });

      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: error?.message || 'Failed to reset password. Please try again.',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-large">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {step === 1 ? 'Reset Parent Password' : 'Set New Password'}
          </CardTitle>
          <p className="text-muted-foreground">
            {step === 1 ? 'Enter your phone number to receive OTP' : 'Create a new password for your account'}
          </p>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={resetId ? handleVerifyOTP : handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="10-digit phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-10"
                    maxLength={10}
                    required
                    disabled={!!resetId}
                  />
                </div>
              </div>

              {resetId && (
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      type="text"
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-10"
                      maxLength={6}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Didn't receive OTP? 
                    <button 
                      type="button" 
                      onClick={() => {
                        setResetId(null);
                        setOtp('');
                      }}
                      className="text-primary hover:underline ml-1"
                    >
                      Resend
                    </button>
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processing...' : resetId ? 'Verify OTP' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-primary hover:underline"
            >
              Back to Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
