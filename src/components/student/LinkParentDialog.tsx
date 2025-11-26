import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, Lock } from 'lucide-react';

interface LinkParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentUserId: string;
  onSuccess?: () => void;
}

export const LinkParentDialog = ({ open, onOpenChange, studentUserId, onSuccess }: LinkParentDialogProps) => {
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLinkParent = async () => {
    if (!parentName.trim() || !parentPhone || !parentPassword) {
      toast({
        variant: 'destructive',
        title: 'Required Fields Missing',
        description: 'Please fill in all fields.',
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

    setLoading(true);

    try {
      // Check for existing parent account by phone/email
      const parentEmail = `${parentPhone}@parent.app`;
      
      // First check if parent profile already exists
      const { data: existingParent } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number')
        .eq('phone_number', parentPhone)
        .maybeSingle();

      // Check if phone is already used by a student account
      if (existingParent) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', existingParent.id)
          .single();

        if (roleData?.role === 'student') {
          toast({
            variant: 'destructive',
            title: 'Phone Already Used',
            description: 'This phone number is already registered as a student account.',
          });
          setLoading(false);
          return;
        }
      }

      let parentId: string;

      if (!existingParent) {
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
              description: 'This phone number is already registered. Ask them to login instead.',
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

        parentId = parentAuth.user.id;

        // Profile is auto-created by trigger, but update it with parent-specific info
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
      } else {
        // Use existing parent profile
        parentId = existingParent.id;
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
        if (linkError.message.includes('duplicate') || linkError.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Already Linked',
            description: 'This parent is already linked to your account.',
          });
        } else {
          throw linkError;
        }
        setLoading(false);
        return;
      }

      toast({
        title: 'Parent Linked Successfully',
        description: 'Your parent account has been created and linked.',
      });

      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setParentName('');
      setParentPhone('');
      setParentPassword('');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Parent Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
            <Label htmlFor="parentPhone">Parent Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="parentPhone"
                type="tel"
                placeholder="10-digit mobile number"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="pl-10"
                maxLength={10}
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

          <Button
            onClick={handleLinkParent}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Linking...' : 'Link Parent Account'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
