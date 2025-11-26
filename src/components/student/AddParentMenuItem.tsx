import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { LinkParentDialog } from './LinkParentDialog';
import { supabase } from '@/integrations/supabase/client';

interface AddParentMenuItemProps {
  studentUserId: string;
  onNavigate?: () => void;
}

export const AddParentMenuItem = ({ studentUserId, onNavigate }: AddParentMenuItemProps) => {
  const [hasParent, setHasParent] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    checkParentLink();
  }, [studentUserId]);

  const checkParentLink = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('parent_student_links')
        .select('id')
        .eq('student_user_id', studentUserId)
        .limit(1);

      if (error) throw error;
      setHasParent(data && data.length > 0);
    } catch (error) {
      console.error('Error checking parent link:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setHasParent(true);
    onNavigate?.();
  };

  if (loading || hasParent) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 hover:bg-primary hover:text-primary-foreground"
        onClick={() => setDialogOpen(true)}
      >
        <UserPlus className="h-5 w-5" />
        <span className="text-sm font-medium">Link Parent</span>
      </Button>

      <LinkParentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        studentUserId={studentUserId}
        onSuccess={handleSuccess}
      />
    </>
  );
};
