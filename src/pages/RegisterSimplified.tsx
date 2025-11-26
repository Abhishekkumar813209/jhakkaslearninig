import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Lock, User, Eye, EyeOff, Phone } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const RegisterSimplified = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const referralCodeFromUrl = urlParams.get('ref') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState(referralCodeFromUrl);
  
  // Link Parent Toggle
  const [linkParent, setLinkParent] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  
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

    if (linkParent) {
      if (!parentName.trim() || !parentPhone || !parentPassword) {
        toast({
          variant: 'destructive',
          title: 'Parent Details Required',
          description: 'Please fill in all parent details.',
        });
        return;
      }

      if (parentPhone.length !== 10) {
        toast({
          variant: 'destructive',
          title: 'Invalid Phone',
          description: 'Please enter a valid 10-digit phone number.',
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Register student
      const { data, error: invokeError } = await supabase.functions.invoke('auth-register', {
        body: { 
          email, 
          password, 
          full_name: name,
          role: 'student',
          referral_code: referralCode || null
        }
      });

      if (invokeError) {
        let errorCode = null;
        let errorMessage = invokeError.message;
        
        if (invokeError.name === 'FunctionsHttpError') {
          try {
            const errorContext = await invokeError.context.json();
            errorCode = errorContext.errorCode;
            errorMessage = errorContext.error || errorMessage;
          } catch (e) {
            // Failed to parse
          }
        }
        
        if (errorCode === 'EMAIL_EXISTS' || 
            errorMessage.toLowerCase().includes('already') || 
            errorMessage.toLowerCase().includes('exists')) {
          
          toast({
            variant: 'destructive',
            title: 'Account Already Exists',
            description: 'Your account already exists. Kindly login.',
            action: (
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            )
          });
          
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          
          setLoading(false);
          return;
        }
        
        throw new Error(errorMessage);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const studentUserId = data?.user?.id;

      // If link parent is enabled, create and link parent
      if (linkParent && studentUserId) {
        try {
          console.log('🔗 Starting parent linking process for student:', studentUserId);
          
          const parentEmail = `${parentPhone}@parent.app`;
          const { data: parentAuth, error: parentAuthError } = await supabase.auth.signUp({
            email: parentEmail,
            password: parentPassword,
          });

          if (parentAuthError) {
            console.error('❌ Parent auth creation failed:', parentAuthError);
            throw parentAuthError;
          }

          console.log('✅ Parent auth created:', parentAuth.user?.id);

          // Check if parent exists (using type assertion)
          const { data: existingParent } = await (supabase as any)
            .from('parents')
            .select('*')
            .eq('phone', parentPhone)
            .single();

          let parentId: string;

          if (!existingParent) {
            // Insert new parent
            console.log('📝 Inserting new parent record...');
            const { data: newParent, error: insertError } = await (supabase as any)
              .from('parents')
              .insert({
                phone: parentPhone,
                name: parentName,
                auth_user_id: parentAuth.user?.id,
              })
              .select()
              .single();

            if (insertError) {
              console.error('❌ Parent insert failed:', insertError);
              throw insertError;
            }
            parentId = newParent.id;
            console.log('✅ Parent created with ID:', parentId);
          } else {
            console.log('ℹ️ Parent already exists, ID:', existingParent.id);
            // Update only auth_user_id if null, do NOT overwrite name
            if (!existingParent.auth_user_id) {
              await (supabase as any)
                .from('parents')
                .update({ auth_user_id: parentAuth.user?.id })
                .eq('id', existingParent.id);
            }
            parentId = existingParent.id;
          }

          // Link parent to student (use student_id not student_user_id)
          console.log('🔗 Creating parent-student link...', { parent_id: parentId, student_id: studentUserId });
          const { error: linkError } = await (supabase as any)
            .from('parent_student_links')
            .insert({
              parent_id: parentId,
              student_id: studentUserId,
            });

          if (linkError) {
            console.error('❌ Parent-student link creation failed:', linkError);
            throw linkError;
          }

          console.log('✅ Parent linked successfully to student');
          
          toast({
            title: 'Success!',
            description: 'Your account and parent account have been created and linked successfully.',
          });

        } catch (parentError: any) {
          console.error('❌ Parent linking error:', parentError);
          // Don't block student registration if parent linking fails
          toast({
            variant: 'destructive',
            title: 'Parent Linking Failed',
            description: `Student account created successfully, but parent linking failed: ${parentError.message || 'Unknown error'}. You can link a parent later from the sidebar.`,
          });
        }
      }

      // Auto-login
      if (data?.session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
        
        if (sessionError) {
          console.error('Session setup failed:', sessionError);
          toast({
            variant: 'destructive',
            title: 'Login Required',
            description: 'Please log in with your credentials.',
          });
          navigate('/login');
          setLoading(false);
          return;
        }
      }

      toast({
        title: 'Registration Successful!',
        description: 'Your account has been created successfully. Please complete your profile.',
      });
      navigate('/profile');
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Registration failed';
      const errorMsgLower = errorMessage.toLowerCase();
      
      if (errorMsgLower.includes('already') || errorMsgLower.includes('exists') || 
          errorMsgLower.includes('duplicate') || errorMsgLower.includes('EMAIL_EXISTS')) {
        
        toast({
          variant: 'destructive',
          title: 'Account Already Exists',
          description: 'Your account already exists. Kindly login.',
          action: (
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          )
        });
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        
      } else {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: errorMessage,
        });
      }
    }

    setLoading(false);
  };

  const handleGoogleRegister = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profile`
        }
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast({
        variant: 'destructive',
        title: 'Google Registration Failed',
        description: error?.message || 'Failed to initiate Google sign-in.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-large">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <p className="text-muted-foreground">Join Jhakkas today</p>
        </CardHeader>
        <CardContent className="space-y-4">
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

            {/* Referral Code Input */}
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Referral Code (Optional)"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="uppercase"
              />
              {referralCode && (
                <p className="text-xs text-green-600">
                  ✓ Your friend will earn rewards when you subscribe!
                </p>
              )}
            </div>

            {/* Link Parent Toggle */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="linkParent" 
                  checked={linkParent}
                  onCheckedChange={(checked) => setLinkParent(checked === true)}
                />
                <Label htmlFor="linkParent" className="text-sm font-medium cursor-pointer">
                  Also create & link a Parent account now
                </Label>
              </div>

              {linkParent && (
                <div className="space-y-3 bg-muted/50 p-4 rounded-md">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Parent Name"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="Parent Phone (10 digits)"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-10"
                      maxLength={10}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Parent Password"
                      value={parentPassword}
                      onChange={(e) => setParentPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
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

export default RegisterSimplified;
