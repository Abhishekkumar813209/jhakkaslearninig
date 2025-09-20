import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Lock, User, Eye, EyeOff, Phone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
      });
      return;
    }

    setLoading(true);

    try {
      // Try using edge function first
      const { data } = await supabase.functions.invoke('auth-register', {
        body: { 
          email, 
          password, 
          full_name: name,
          role: 'student'
        }
      });

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Registration Successful!',
        description: 'Your account has been created successfully.',
      });
      navigate('/login');
    } catch (error: any) {
      // Fallback to direct Supabase auth
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: name,
          },
        },
      });

      if (authError) {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: authError.message,
        });
      } else {
        toast({
          title: 'Registration Successful!',
          description: 'Please check your email to verify your account.',
        });
        navigate('/login');
      }
    }

    setLoading(false);
  };

  const handleGoogleRegister = async () => {
    try {
      // Use direct Supabase auth for better compatibility
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast({
        variant: 'destructive',
        title: 'Google Registration Failed',
        description: error.message || 'Failed to connect to Google. Please check your internet connection and try again.',
      });
    }
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

    setOtpLoading(true);

    // Note: Supabase doesn't support SMS OTP out of the box
    // This is a placeholder for SMS OTP functionality
    // You would need to integrate with a service like Twilio
    toast({
      title: 'OTP Sent!',
      description: 'OTP has been sent to your phone number.',
    });
    setOtpSent(true);
    setOtpLoading(false);
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
    // In a real implementation, you would verify the OTP with your backend
    toast({
      title: 'Phone Verified!',
      description: 'Your phone number has been verified successfully.',
    });
    navigate('/login');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-large">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <p className="text-muted-foreground">Join Jhakkas today</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
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
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="Phone Number (Optional)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
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
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

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
                onClick={handleGoogleRegister}
              >
                Continue with Google
              </Button>
            </TabsContent>

          </Tabs>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;