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
      // Create parent auth user
      const parentEmail = `${parentPhone}@parent.app`;
      const { data: parentAuth, error: authError } = await supabase.auth.signUp({
        email: parentEmail,
        password: parentPassword,
      });

      if (authError) throw authError;

      // Check if parent already exists in parents table (using type assertion)
      const { data: existingParent } = await (supabase as any)
        .from('parents')
        .select('*')
        .eq('phone', parentPhone)
        .single();

      let parentId: string;

      if (!existingParent) {
        // Insert new parent
        const { data: newParent, error: insertError } = await (supabase as any)
          .from('parents')
          .insert({
            phone: parentPhone,
            name: parentName,
            auth_user_id: parentAuth.user?.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        parentId = newParent.id;
      } else {
        // Update existing parent only if auth_user_id is null
        if (!existingParent.auth_user_id) {
          const { error: updateError } = await (supabase as any)
            .from('parents')
            .update({ auth_user_id: parentAuth.user?.id })
            .eq('id', existingParent.id);

          if (updateError) throw updateError;
        }
        // Do NOT overwrite name if it already exists
        parentId = existingParent.id;
      }

      // Create parent-student link (use student_id not student_user_id)
      const { error: linkError } = await (supabase as any)
        .from('parent_student_links')
        .insert({
          parent_id: parentId,
          student_id: studentUserId,
        });

      if (linkError) throw linkError;

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
