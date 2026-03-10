import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Eye, EyeOff, Phone, Sparkles, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authAPI } from '@/services/api';
import { motion } from 'framer-motion';
import trophyBoy from '@/assets/trophy-boy.png';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPhonePassword, setShowPhonePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [forgotPhonePassword, setForgotPhonePassword] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt with:', { email, password: password ? '***' : 'empty' });
    setLoading(true);

    try {
      // Try direct Supabase auth first (auto-sets session)
      console.log('Trying direct Supabase auth...');
      const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Direct auth result:', { authError, signInData });
      if (authError) throw authError;

      // Wait for session to be set properly
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check user role and redirect accordingly
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', signInData.user.id)
        .single();

      toast({
        title: 'Welcome back!',
        description: 'You have been logged in successfully.',
      });
      
      // Role-based redirect
      if (roleData?.role === 'parent') {
        window.location.replace('/parent');
      } else if (roleData?.role === 'admin') {
        window.location.replace('/admin');
      } else {
        window.location.replace('/');
      }
    } catch (firstError: any) {
      console.log('Direct auth failed, trying edge function:', firstError);

      try {
        console.log('Calling auth-login edge function...');
        const { data, error: functionError } = await supabase.functions.invoke('auth-login', {
          body: { email, password }
        });

        console.log('Edge function response:', { data, functionError });
        
        // Check for edge function invocation error first
        if (functionError) {
          console.error('Edge function error:', functionError)
          
          // Try to parse error body for errorCode
          let errorBody = null
          try {
            if (functionError.context?.json) {
              errorBody = await functionError.context.json()
            }
          } catch (e) {
            console.error('Failed to parse error body:', e)
          }

          // Handle specific error codes
          if (errorBody?.errorCode === 'USER_NOT_FOUND') {
            toast({
              variant: 'destructive',
              title: 'Account Not Found',
              description: 'Account not found. Please sign up first.',
              action: (
                <Button variant="outline" size="sm" onClick={() => navigate('/register')}>
                  Sign Up
                </Button>
              )
            })
            
            setTimeout(() => navigate('/register'), 3000)
            setLoading(false)
            return
          } else if (errorBody?.errorCode === 'WRONG_PASSWORD') {
            toast({
              variant: 'destructive',
              title: 'Incorrect Password',
              description: 'Incorrect password. Please try again.',
              action: (
                <Button variant="outline" size="sm" onClick={() => setForgotPassword(true)}>
                  Forgot Password?
                </Button>
              )
            })
            setLoading(false)
            return
          } else if (errorBody?.errorCode === 'EMAIL_NOT_CONFIRMED') {
            toast({
              variant: 'destructive',
              title: 'Email Not Verified',
              description: 'Please verify your email address first.',
            })
            setLoading(false)
            return
          }
          
          // Fallback to generic error
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: errorBody?.error || functionError.message || 'Authentication service error. Please try again.',
          })
          setLoading(false)
          return
        }
        
        // Check for auth error in response data
        if (data?.error) {
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: data.error,
          })
          setLoading(false)
          return
        }
        
        // Check if we have the required tokens
        if (!data?.access_token || !data?.refresh_token) {
          throw new Error('Invalid response from authentication service');
        }

        console.log('Edge function success, setting session...');
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        if (setSessionError) throw setSessionError;

        // Wait for session to be properly set
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check user role and redirect accordingly
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        toast({
          title: 'Welcome back!',
          description: 'You have been logged in successfully.',
        });
        
        // Role-based redirect
        if (roleData?.role === 'parent') {
          window.location.replace('/parent');
        } else if (roleData?.role === 'admin') {
          window.location.replace('/admin');
        } else {
          window.location.replace('/');
        }
      } catch (error: any) {
        console.error('Login failed:', error);
        
        // Parse error response properly
        let errorMessage = 'Unable to sign you in.';
        let shouldRedirect = false;
        let redirectPath = '';
        
        // Check if it's a 404 (user not found)
        if (error?.message?.includes('USER_NOT_FOUND') || error?.message?.includes('Account not found')) {
          errorMessage = 'Account not found. Please sign up first.';
          shouldRedirect = true;
          redirectPath = '/register';
        } 
        // Check if it's wrong password
        else if (error?.message?.includes('WRONG_PASSWORD') || error?.message?.includes('Incorrect password')) {
          errorMessage = 'Incorrect password. Please try again.';
        }
        // Check if it's email not confirmed
        else if (error?.message?.includes('EMAIL_NOT_CONFIRMED') || error?.message?.includes('verify your email')) {
          errorMessage = 'Please verify your email address first.';
        }
        // Fallback to original message
        else {
          errorMessage = error?.message || errorMessage;
        }
        
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: errorMessage,
          action: shouldRedirect ? (
            <Button variant="outline" size="sm" onClick={() => navigate(redirectPath)}>
              Sign Up
            </Button>
          ) : errorMessage.includes('password') ? (
            <Button variant="outline" size="sm" onClick={() => setForgotPassword(true)}>
              Forgot Password?
            </Button>
          ) : undefined
        });
        
        // Auto redirect if account doesn't exist
        if (shouldRedirect) {
          setTimeout(() => navigate(redirectPath), 3000);
        }
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
      redirectTo: 'https://www.jhakkaslearning.com/reset-password',
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

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Construct email from phone
      const email = `${phone}@parent.app`;

      const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: phonePassword,
      });

      if (authError) throw authError;

      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', signInData.user.id)
        .single();

      toast({
        title: 'Welcome back!',
        description: 'You have been logged in successfully.',
      });
      
      if (roleData?.role === 'parent') {
        window.location.replace('/parent');
      } else if (roleData?.role === 'admin') {
        window.location.replace('/admin');
      } else {
        window.location.replace('/');
      }
    } catch (firstError: any) {
      console.log('Direct phone login failed, trying edge function:', firstError);

      try {
        const phoneEmail = `${phone}@parent.app`;
        const { data, error: functionError } = await supabase.functions.invoke('auth-login', {
          body: { email: phoneEmail, password: phonePassword }
        });

        if (functionError) {
          console.error('Edge function error:', functionError)
          
          // Try to parse error body for errorCode
          let errorBody = null
          try {
            if (functionError.context?.json) {
              errorBody = await functionError.context.json()
            }
          } catch (e) {
            console.error('Failed to parse error body:', e)
          }

          // Handle specific error codes
          if (errorBody?.errorCode === 'USER_NOT_FOUND') {
            toast({
              variant: 'destructive',
              title: 'Account Not Found',
              description: 'Phone number not registered. Please sign up first.',
              action: (
                <Button variant="outline" size="sm" onClick={() => navigate('/register-parent')}>
                  Sign Up
                </Button>
              )
            })
            
            setTimeout(() => navigate('/register-parent'), 3000)
            setLoading(false)
            return
          } else if (errorBody?.errorCode === 'WRONG_PASSWORD') {
            toast({
              variant: 'destructive',
              title: 'Incorrect Password',
              description: 'Incorrect password. Please try again.',
              action: (
                <Button variant="outline" size="sm" onClick={() => setForgotPhonePassword(true)}>
                  Forgot Password?
                </Button>
              )
            })
            setLoading(false)
            return
          }
          
          // Fallback to generic error
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: errorBody?.error || functionError.message || 'Authentication service error. Please try again.',
          })
          setLoading(false)
          return
        }

        if (data?.error) {
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: data.error,
          })
          setLoading(false)
          return
        }

        // Set session with tokens from edge function
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        if (setSessionError) throw setSessionError;

        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        toast({
          title: 'Welcome back!',
          description: 'You have been logged in successfully.',
        });
        
        if (roleData?.role === 'parent') {
          window.location.replace('/parent');
        } else if (roleData?.role === 'admin') {
          window.location.replace('/admin');
        } else {
          window.location.replace('/');
        }
      } catch (error: any) {
        console.error('Phone login completely failed:', error);
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: error?.message || 'Invalid phone number or password.',
        });
      }
    }

    setLoading(false);
  };

  const handleParentForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPhone || resetPhone.length !== 10) {
      toast({
        variant: 'destructive',
        title: 'Invalid Phone',
        description: 'Please enter a valid 10-digit phone number.',
      });
      return;
    }

    setLoading(true);
    // Convert phone to parent email
    const parentEmail = `${resetPhone}@parent.app`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(parentEmail, {
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
        description: 'Check the email associated with this phone number for password reset instructions.',
      });
      setForgotPhonePassword(false);
      setResetPhone('');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast({
        variant: 'destructive',
        title: 'Google Login Failed',
        description: error?.message || 'Failed to initiate Google sign-in.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left: Illustration Panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative lg:w-1/2 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5 p-8 lg:p-12 overflow-hidden"
      >
        {/* Floating decorative elements */}
        <motion.div
          animate={{ y: [-8, 8, -8] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-10 left-10 text-primary/30"
        >
          <Star className="h-8 w-8 fill-current" />
        </motion.div>
        <motion.div
          animate={{ y: [6, -6, 6] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 right-16 text-warning/40"
        >
          <Sparkles className="h-6 w-6" />
        </motion.div>
        <motion.div
          animate={{ y: [-5, 10, -5] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-24 left-16 text-success/30"
        >
          <Star className="h-5 w-5 fill-current" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-16 right-10 text-primary/20"
        >
          <Sparkles className="h-10 w-10" />
        </motion.div>

        {/* Trophy boy image */}
        <motion.img
          src={trophyBoy}
          alt="Student celebrating with trophy"
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 object-contain drop-shadow-lg"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center mt-6 space-y-2"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
            Your Success Story <span className="text-primary">Starts Here</span>
          </h2>
          <p className="text-muted-foreground text-sm lg:text-base max-w-sm mx-auto">
            Join thousands of students acing their exams with Jhakkas Learning
          </p>
        </motion.div>
      </motion.div>

      {/* Right: Login Form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
        className="flex-1 flex items-center justify-center p-4 lg:p-8"
      >
        <Card className="w-full max-w-md shadow-large border-border/50">
          <CardHeader className="text-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <p className="text-muted-foreground">Sign in to your account</p>
            </motion.div>
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
                  <TabsTrigger value="phone">Phone (Parents)</TabsTrigger>
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
                  {forgotPhonePassword ? (
                    <form onSubmit={handleParentForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Enter your registered phone number to receive password reset instructions.
                        </p>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="Phone Number (10 digits)"
                            value={resetPhone}
                            onChange={(e) => setResetPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="pl-10"
                            maxLength={10}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setForgotPhonePassword(false);
                            setResetPhone('');
                          }}
                        >
                          Back to Login
                        </Button>
                        <Button type="submit" className="flex-1" disabled={loading}>
                          {loading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handlePhoneLogin} className="space-y-4">
                      <div className="space-y-2">
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="Phone Number (10 digits)"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="pl-10"
                            maxLength={10}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type={showPhonePassword ? "text" : "password"}
                            placeholder="Password"
                            value={phonePassword}
                            onChange={(e) => setPhonePassword(e.target.value)}
                            className="pl-10 pr-10"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-8 w-8"
                            onClick={() => setShowPhonePassword(!showPhonePassword)}
                          >
                            {showPhonePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <Link
                          to="/parent-forgot-password"
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot Password?
                        </Link>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Signing in...' : 'Login with Phone'}
                      </Button>
                    </form>
                  )}
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

              <div className="text-center text-sm space-y-2">
                <div>
                  <span className="text-muted-foreground">Don't have an account? </span>
                  <Link to="/register" className="text-primary hover:underline">
                    Sign up as Student
                  </Link>
                </div>
                <div>
                  <span className="text-muted-foreground">Are you a parent? </span>
                  <Link to="/register/parent" className="text-primary hover:underline font-medium">
                    Register as Parent
                  </Link>
                </div>
              </div>
            </>
          )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;