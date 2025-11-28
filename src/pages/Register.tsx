import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authAPI } from '@/services/api';
import { useExamTypes } from '@/hooks/useExamTypes';
import { useBoards } from '@/hooks/useBoards';
import { Card as ExamCard, CardContent as ExamCardContent } from '@/components/ui/card';
import * as LucideIcons from 'lucide-react';
import { useEffect } from 'react';
import { ParentLinkToggle } from '@/components/student/ParentLinkToggle';

const Register = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const referralCodeFromUrl = urlParams.get('ref') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [examDomain, setExamDomain] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [educationBoard, setEducationBoard] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState(referralCodeFromUrl);
  const [linkParent, setLinkParent] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { examTypes } = useExamTypes();
  const { boards: availableBoards, requiresBoard } = useBoards(examDomain);

  const iconMap: Record<string, any> = {
    GraduationCap: LucideIcons.GraduationCap,
    BookOpen: LucideIcons.BookOpen,
    Briefcase: LucideIcons.Briefcase,
    Building2: LucideIcons.Building2,
    Globe: LucideIcons.Globe,
    Shield: LucideIcons.Shield,
    Award: LucideIcons.Award,
    Pencil: LucideIcons.Pencil,
  };

  const selectedExamType = examTypes.find(t => t.code === examDomain);
  const requiresClass = selectedExamType?.requires_class || false;

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

    if (!examDomain) {
      toast({
        variant: 'destructive',
        title: 'Required Fields Missing',
        description: 'Please select an exam type.',
      });
      return;
    }

    if (requiresClass && !studentClass) {
      toast({
        variant: 'destructive',
        title: 'Required Fields Missing',
        description: 'Please select your class.',
      });
      return;
    }

    if (requiresBoard && !educationBoard) {
      toast({
        variant: 'destructive',
        title: 'Required Fields Missing',
        description: 'Please select your education board.',
      });
      return;
    }

    setLoading(true);

    try {
      // Try using edge function first
      const { data, error: invokeError } = await supabase.functions.invoke('auth-register', {
        body: { 
          email, 
          password, 
          full_name: name,
          role: 'student',
          exam_domain: examDomain,
          student_class: requiresClass ? studentClass : null,
          education_board: requiresBoard ? educationBoard : null,
          referral_code: referralCode || null,
          link_parent: linkParent,
          parent_name: linkParent ? parentName : null,
          parent_phone: linkParent ? parentPhone : null,
          parent_password: linkParent ? parentPassword : null
        }
      });

      // Check for function invocation errors (non-2xx status codes)
      if (invokeError) {
        // Try to parse error context for structured error info
        let errorCode = null;
        let errorMessage = invokeError.message;
        
        if (invokeError.name === 'FunctionsHttpError') {
          try {
            const errorContext = await invokeError.context.json();
            errorCode = errorContext.errorCode;
            errorMessage = errorContext.error || errorMessage;
          } catch (e) {
            // Failed to parse, use original message
          }
        }
        
        // Check if it's EMAIL_EXISTS
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
          
          // Auto-redirect after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          
          setLoading(false);
          return;
        }
        
        // Other errors
        throw new Error(errorMessage);
      }

      // Check for application errors in response (legacy check, should not happen with 409)
      if (data?.error) {
        throw new Error(data.error);
      }

      // Success case - Auto-login with session tokens
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
        description: 'Your account has been created successfully.',
      });
      navigate('/student/dashboard');
      
    } catch (error: any) {
      // Handle any other errors
      const errorMessage = error?.message || 'Registration failed';
      const errorMsgLower = errorMessage.toLowerCase();
      
      // Check if account already exists
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
        
        // Auto-redirect after 3 seconds
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
      // Use direct Supabase signInWithOAuth for same-window experience
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/student/dashboard`
        }
      });

      if (error) {
        throw error;
      }

      // This will redirect in the same window
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
                
                {/* Exam Type Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Exam Category *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {examTypes.map((type) => {
                      const IconComponent = type.icon_name ? iconMap[type.icon_name] || LucideIcons.BookOpen : LucideIcons.BookOpen;
                      return (
                        <ExamCard
                          key={type.id}
                          className={`cursor-pointer transition-all ${
                            examDomain === type.code ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => {
                            setExamDomain(type.code);
                            // Reset class and board when changing exam type
                            setStudentClass('');
                            setEducationBoard('');
                          }}
                        >
                          <ExamCardContent className="p-3 flex items-center gap-2">
                            <div className={`p-1.5 rounded ${type.color_class || 'bg-gray-500'}`}>
                              <IconComponent className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-xs font-medium">{type.display_name}</span>
                          </ExamCardContent>
                        </ExamCard>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional Class and Board Selection */}
                {requiresClass && (
                  <div className="space-y-2">
                    <Select value={studentClass} onValueChange={setStudentClass} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Class 1</SelectItem>
                        <SelectItem value="2">Class 2</SelectItem>
                        <SelectItem value="3">Class 3</SelectItem>
                        <SelectItem value="4">Class 4</SelectItem>
                        <SelectItem value="5">Class 5</SelectItem>
                        <SelectItem value="6">Class 6</SelectItem>
                        <SelectItem value="7">Class 7</SelectItem>
                        <SelectItem value="8">Class 8</SelectItem>
                        <SelectItem value="9">Class 9</SelectItem>
                        <SelectItem value="10">Class 10</SelectItem>
                        <SelectItem value="11">Class 11</SelectItem>
                        <SelectItem value="12">Class 12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                  
                {requiresBoard && (
                  <div className="space-y-2">
                    <Select value={educationBoard} onValueChange={setEducationBoard} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Education Board" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBoards.map(board => (
                          <SelectItem key={board} value={board}>
                            {board}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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

                {/* Parent Linking Toggle */}
                <div className="pt-2 border-t">
                  <ParentLinkToggle
                    enabled={linkParent}
                    onToggle={setLinkParent}
                    parentName={parentName}
                    parentPhone={parentPhone}
                    parentPassword={parentPassword}
                    onParentNameChange={setParentName}
                    onParentPhoneChange={setParentPhone}
                    onParentPasswordChange={setParentPassword}
                  />
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