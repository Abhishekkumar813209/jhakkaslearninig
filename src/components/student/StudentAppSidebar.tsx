import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Home,
  BookOpen,
  FileText,
  Trophy,
  User,
  LogOut,
  Settings,
  Download,
  Users,
  Book,
  ClipboardList,
  PenTool,
  Brain,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AddParentMenuItem } from './AddParentMenuItem';
import { cn } from '@/lib/utils';

interface StudentAppSidebarProps {
  onNavigate?: () => void;
}

const menuItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Users, label: 'Paid Classes', path: '/student/paid-classes' },
  { icon: BookOpen, label: 'Roadmap', path: '/roadmap' },
  { icon: FileText, label: 'Free Test', path: '/tests' },
  { icon: Download, label: 'Notes', path: '/student/notes' },
  { icon: Trophy, label: 'Paid Test Series', path: '/tests' },
  { icon: Brain, label: 'Daily Quiz', path: '/racing' },
];

const comingSoonItems = [
  { icon: Book, label: 'Books' },
  { icon: ClipboardList, label: 'Syllabus + PYQs' },
  { icon: PenTool, label: 'Create Test' },
];

export const StudentAppSidebar = ({ onNavigate }: StudentAppSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
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
    } catch {
      toast.error('Failed to logout');
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Sidebar Header */}
      <div className="flex items-center gap-3 p-5 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
          <span className="text-xl font-bold text-primary-foreground">J</span>
        </div>
        <span className="text-xl font-bold text-foreground tracking-tight">Jhakkas</span>
      </div>

      <Separator className="mx-4 w-auto" />

      {/* Navigation Items */}
      <nav className="flex-1 space-y-0.5 p-3 pt-4">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary/10 text-primary border-l-[3px] border-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-0.5'
              )}
            >
              <item.icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <Separator className="my-3" />

        {/* Coming Soon */}
        {comingSoonItems.map((item) => (
          <div
            key={item.label}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            <span>{item.label}</span>
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 font-normal">
              Soon
            </Badge>
          </div>
        ))}

        {/* Link Parent */}
        {user && <AddParentMenuItem studentUserId={user.id} onNavigate={onNavigate} />}

        {isAdmin && (
          <>
            <Separator className="my-3" />
            <button
              onClick={() => handleNavigate('/admin')}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
            >
              <Settings className="h-[18px] w-[18px] shrink-0" />
              <span>Admin Dashboard</span>
            </button>
          </>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="border-t p-3 space-y-0.5">
        <button
          onClick={() => handleNavigate('/profile')}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
        >
          <User className="h-[18px] w-[18px] shrink-0" />
          <span>Profile</span>
        </button>
        <button
          onClick={() => handleNavigate('/change-password')}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          <span>Change Password</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
