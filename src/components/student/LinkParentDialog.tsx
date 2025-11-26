import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, Lock, Search, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LinkParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentUserId: string;
  onSuccess?: () => void;
}

type FlowStep = 'search' | 'confirm' | 'signup';

interface ExistingParent {
  parent_id: string;
  parent_role: string;
  full_name?: string;
  phone?: string;
}

export const LinkParentDialog = ({ open, onOpenChange, studentUserId, onSuccess }: LinkParentDialogProps) => {
  const [step, setStep] = useState<FlowStep>('search');
  const [parentPhone, setParentPhone] = useState('');
  const [existingParent, setExistingParent] = useState<ExistingParent | null>(null);
  const [parentName, setParentName] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setStep('search');
    setParentPhone('');
    setExistingParent(null);
    setParentName('');
    setParentPassword('');
    setLoading(false);
  };

  const handleSearchParent = async () => {
    if (parentPhone.length !== 10) {
      toast({
        variant: 'destructive',
        title: 'Invalid Phone',
        description: 'Please enter a valid 10-digit phone number.',
      });
      return;
    }

    setLoading(true);

    try {
      const parentEmail = `${parentPhone}@parent.app`;
      
      // Use RPC to check for existing parent (bypasses RLS)
      const { data: existingParentData, error: checkError } = await supabase
        .rpc('check_parent_exists_by_phone_or_email', {
          p_phone: parentPhone,
          p_email: parentEmail
        });

      if (checkError) {
        throw checkError;
      }

      if (existingParentData && existingParentData.length > 0) {
        const parent = existingParentData[0];
        
        // Check if it's actually a parent role
        if (parent.parent_role === 'student') {
          toast({
            variant: 'destructive',
            title: 'Phone Belongs to Student',
            description: 'This phone number belongs to a student account, not a parent. Please use a different number.',
          });
          setLoading(false);
          return;
        }

        // Get parent details from profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, phone_number')
          .eq('id', parent.parent_id)
          .single();

        setExistingParent({
          parent_id: parent.parent_id,
          parent_role: parent.parent_role,
          full_name: profileData?.full_name || undefined,
          phone: profileData?.phone_number || parentPhone,
        });

        setStep('confirm');
      } else {
        // No parent found, go to signup step
        setStep('signup');
      }
    } catch (error: any) {
      console.error('Error searching parent:', error);
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: error.message || 'Failed to search for parent account.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLink = async () => {
    if (!existingParent) return;

    setLoading(true);

    try {
      // Check if already linked
      const { data: existingLink } = await supabase
        .from('parent_student_links')
        .select('id')
        .eq('student_id', studentUserId)
        .maybeSingle();

      if (existingLink) {
        toast({
          variant: 'destructive',
          title: 'Already Linked',
          description: 'You already have a parent linked to your account.',
        });
        setLoading(false);
        return;
      }

      // Create parent-student link
      const { error: linkError } = await supabase
        .from('parent_student_links')
        .insert({
          parent_id: existingParent.parent_id,
          student_id: studentUserId,
          relationship: 'parent',
          is_primary_contact: true,
        });

      if (linkError) {
        throw linkError;
      }

      toast({
        title: 'Parent Linked Successfully',
        description: 'Your account has been linked to the parent.',
      });

      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch (error: any) {
      console.error('Error linking parent:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Link Parent',
        description: error.message || 'An error occurred while linking the parent account.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndLinkParent = async () => {
    if (!parentName.trim() || !parentPassword) {
      toast({
        variant: 'destructive',
        title: 'Required Fields Missing',
        description: 'Please fill in all fields.',
      });
      return;
    }

    if (parentPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Weak Password',
        description: 'Password must be at least 6 characters.',
      });
      return;
    }

    setLoading(true);

    try {
      const parentEmail = `${parentPhone}@parent.app`;

      // Create new parent auth user
      const { data: parentAuth, error: authError } = await supabase.auth.signUp({
        email: parentEmail,
        password: parentPassword,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          toast({
            variant: 'destructive',
            title: 'Phone Already Registered',
            description: 'This phone number is already registered. Please try searching again.',
          });
        } else {
          throw authError;
        }
        setLoading(false);
        return;
      }

      if (!parentAuth.user?.id) {
        throw new Error('Failed to create parent account');
      }

      const parentId = parentAuth.user.id;

      // Profile is auto-created by trigger, update with parent-specific info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: parentName,
          phone_number: parentPhone,
        })
        .eq('id', parentId);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Assign parent role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: parentId,
          role: 'parent',
        }, { onConflict: 'user_id' });

      if (roleError) {
        console.error('Role assignment error:', roleError);
      }

      // Create parent-student link
      const { error: linkError } = await supabase
        .from('parent_student_links')
        .insert({
          parent_id: parentId,
          student_id: studentUserId,
          relationship: 'parent',
          is_primary_contact: true,
        });

      if (linkError) {
        throw linkError;
      }

      toast({
        title: 'Parent Account Created and Linked',
        description: 'Parent account has been created and linked successfully.',
      });

      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch (error: any) {
      console.error('Error creating parent:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Create Parent',
        description: error.message || 'An error occurred while creating the parent account.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Parent Account</DialogTitle>
          <DialogDescription>
            {step === 'search' && "Enter your parent's phone number to check if they have an account"}
            {step === 'confirm' && "Confirm linking to this parent account"}
            {step === 'signup' && "Create a new parent account"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Search by Phone */}
          {step === 'search' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="searchPhone">Parent Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="searchPhone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-10"
                    maxLength={10}
                  />
                </div>
              </div>

              <Button
                onClick={handleSearchParent}
                disabled={loading || parentPhone.length !== 10}
                className="w-full"
              >
                <Search className="mr-2 h-4 w-4" />
                {loading ? 'Searching...' : 'Search Parent'}
              </Button>
            </>
          )}

          {/* Step 2A: Confirm Link to Existing Parent */}
          {step === 'confirm' && existingParent && (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  We found a parent account with this number
                </AlertDescription>
              </Alert>

              <div className="space-y-3 p-4 bg-muted rounded-lg">
                {existingParent.full_name && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Parent Name</Label>
                    <p className="font-medium">{existingParent.full_name}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Phone Number</Label>
                  <p className="font-medium">{existingParent.phone}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Do you want to link your account to this parent? This is a one-time action.
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('search')}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmLink}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Linking...' : 'Confirm & Link'}
                </Button>
              </div>
            </>
          )}

          {/* Step 2B: Create New Parent */}
          {step === 'signup' && (
            <>
              <Alert>
                <AlertDescription>
                  No parent account found with this number. Please create one.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="parentName">Parent Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="parentName"
                    type="text"
                    placeholder="Parent's full name"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentPhoneDisplay">Parent Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="parentPhoneDisplay"
                    type="tel"
                    value={parentPhone}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentPassword">Parent Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="parentPassword"
                    type="password"
                    placeholder="Create a password (min 6 characters)"
                    value={parentPassword}
                    onChange={(e) => setParentPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('search')}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateAndLinkParent}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Creating...' : 'Create & Link Parent'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
