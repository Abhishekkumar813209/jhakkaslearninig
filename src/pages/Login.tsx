import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Lock, Eye, EyeOff, Phone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authAPI } from '@/services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Try using edge function first
      const { data } = await supabase.functions.invoke('auth-login', {
        body: { email, password }
      });

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Welcome back!',
        description: 'You have been logged in successfully.',
      });
      navigate('/');
    } catch (error: any) {
      // Fallback to direct Supabase auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: authError.message,
        });
      } else {
        toast({
          title: 'Welcome back!',
          description: 'You have been logged in successfully.',
        });
        navigate('/');
      }
    }

    setLoading(false);
  };

  const handleSendOTP = async () => {
    if (!phone) {
      toast({
        variant: 'destructive',
        title: 'Phone Required',
        description: 'Please enter your phone number.',
      });
      return;
    }

    setLoading(true);
    // Placeholder for phone OTP - would integrate with SMS service
    toast({
      title: 'OTP Sent!',
      description: 'OTP has been sent to your phone number.',
    });
    setOtpSent(true);
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast({
        variant: 'destructive',
        title: 'OTP Required',
        description: 'Please enter the OTP.',
      });
      return;
    }

    setLoading(true);
    // Placeholder for OTP verification
    toast({
      title: 'Login Successful!',
      description: 'You have been logged in via phone.',
    });
    navigate('/');
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your email address.',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: error.message,
      });
    } else {
      toast({
        title: 'Reset Email Sent!',
        description: 'Check your email for password reset instructions.',
      });
      setForgotPassword(false);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await authAPI.googleAuth(`${window.location.origin}/`);
      const url = (result as any)?.url;
      if (!url) throw new Error('Failed to initiate Google OAuth');

      // Open in a new tab/window to bypass iframe navigation restrictions
      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      if (!popup) {
        // If pop-up blocked, force top-level navigation (escapes preview iframe)
        if (window.top && window.top !== window) {
          (window.top as Window).location.href = url;
        } else {
          window.location.href = url;
        }
      } else {
        toast({
          title: 'Continue in the new tab',
          description: 'Complete Google sign-in, then return here.',
        });
      }
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast({
        variant: 'destructive',
        title: 'Google Login Failed',
        description: error?.message || 'Please allow pop-ups and try again.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-large">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <p className="text-muted-foreground">Sign in to your account</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {forgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email for password reset"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Email'}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full" 
                onClick={() => setForgotPassword(false)}
              >
                Back to Login
              </Button>
            </form>
          ) : (
            <>
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="phone">Phone</TabsTrigger>
                </TabsList>
                
                <TabsContent value="email" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => setForgotPassword(true)}
                      >
                        Forgot Password?
                      </Button>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="phone" className="space-y-4">
                  <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="space-y-4">
                    <div className="space-y-2">
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="Phone Number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10"
                          disabled={otpSent}
                          required
                        />
                      </div>
                    </div>
                    
                    {!otpSent ? (
                      <Button type="button" className="w-full" disabled={loading} onClick={handleSendOTP}>
                        {loading ? 'Sending OTP...' : 'Send OTP'}
                      </Button>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Enter OTP"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              className="pl-10"
                              maxLength={6}
                              required
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? 'Verifying...' : 'Verify & Login'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          className="w-full" 
                          onClick={() => setOtpSent(false)}
                        >
                          Change Phone Number
                        </Button>
                      </>
                    )}
                  </form>
                </TabsContent>
              </Tabs>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
              >
                Continue with Google
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <Link to="/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;