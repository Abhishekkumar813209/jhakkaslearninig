import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Home,
  BookOpen,
  FileText,
  Trophy,
  User,
  LogOut,
  Settings,
  Target,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AddParentMenuItem } from './AddParentMenuItem';

interface StudentAppSidebarProps {
  onNavigate?: () => void;
}

export const StudentAppSidebar = ({ onNavigate }: StudentAppSidebarProps) => {
  const navigate = useNavigate();
  const { isAdmin, signOut, user } = useAuth();

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
    { icon: Home, label: 'Home', path: '/' },
    { icon: Target, label: 'My Roadmap', path: '/student' },
    { icon: BookOpen, label: 'My Courses', path: '/courses' },
    { icon: FileText, label: 'Tests', path: '/tests' },
    { icon: Trophy, label: 'Practice/Racing', path: '/racing' },
    { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
    { icon: Download, label: 'Downloads', path: '#', disabled: true },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Change Password', path: '/change-password' },
  ];

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Sidebar Header */}
      <div className="flex items-center gap-2 border-b p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-xl font-bold text-primary-foreground">J</span>
        </div>
        <span className="text-xl font-bold text-foreground">Jhakkas</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-primary hover:text-primary-foreground"
            onClick={() => !item.disabled && handleNavigate(item.path)}
            disabled={item.disabled}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </Button>
        ))}

        {/* Link Parent - one-time option */}
        {user && <AddParentMenuItem studentUserId={user.id} onNavigate={onNavigate} />}

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
