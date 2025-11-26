import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  BookOpen,
  FileText,
  Trophy,
  LogOut,
  Settings,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface ParentAppSidebarProps {
  onNavigate?: () => void;
}

export const ParentAppSidebar = ({ onNavigate }: ParentAppSidebarProps) => {
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const menuItems = [
    { icon: BookOpen, label: 'Studies', path: '/parent/studies' },
    { icon: FileText, label: 'Tests', path: '/parent/tests' },
    { icon: Trophy, label: 'Ranking', path: '/parent/rankings' },
    { icon: Key, label: 'Change Password', path: '/parent/change-password' },
  ];

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Sidebar Header */}
      <div className="flex items-center gap-2 border-b p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-xl font-bold text-primary-foreground">J</span>
        </div>
        <span className="text-xl font-bold text-foreground">Jhakkas Parent</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-primary hover:text-primary-foreground"
            onClick={() => handleNavigate(item.path)}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </Button>
        ))}

        {isAdmin && (
          <>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleNavigate('/admin')}
            >
              <Settings className="h-5 w-5" />
              <span className="text-sm font-medium">Admin Dashboard</span>
            </Button>
          </>
        )}
      </nav>

      {/* Logout Button */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium">Logout</span>
        </Button>
      </div>
    </div>
  );
};
