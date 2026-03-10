import { ReactNode, useState, useEffect } from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentAppSidebar } from './StudentAppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

interface StudentAppLayoutProps {
  children: ReactNode;
}

export const StudentAppLayout = ({ children }: StudentAppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isGuest = !user;

  useEffect(() => {
    if (!loading && userRole === 'parent') {
      navigate('/parent', { replace: true });
    }
  }, [userRole, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar — always visible on lg+ for logged-in users */}
      {!isGuest && !isMobile && (
        <aside className="hidden lg:flex w-64 shrink-0 fixed left-0 top-0 z-30 h-screen border-r border-border bg-card overflow-y-auto">
          <StudentAppSidebar />
        </aside>
      )}

      {/* Main area */}
      <div className={`flex-1 flex flex-col min-w-0 ${!isGuest ? 'lg:ml-64' : ''}`}>
        {/* Top App Bar */}
        <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-md shadow-sm">
          <div className="flex h-14 items-center justify-between px-4">
            {/* Left: Hamburger (mobile, logged-in only) or spacer */}
            <div className="w-10">
              {!isGuest && (
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden hover:bg-muted">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <StudentAppSidebar onNavigate={() => setSidebarOpen(false)} />
                  </SheetContent>
                </Sheet>
              )}
            </div>

            {/* Center: App Logo */}
            <div className={`flex items-center gap-2 ${!isGuest ? 'lg:hidden' : ''}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">J</span>
              </div>
              <h1 className="text-lg font-bold text-foreground">Jhakkas</h1>
            </div>

            {/* Desktop: just a subtle breadcrumb area */}
            {!isGuest && <div className="hidden lg:block" />}

            {/* Right: Auth buttons for guests, Notification & Profile for logged-in */}
            <div className="flex items-center gap-2">
              {isGuest ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                    Login
                  </Button>
                  <Button size="sm" onClick={() => navigate('/register')}>
                    Sign Up
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="icon" className="hover:bg-muted">
                    <Bell className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="hidden md:inline-flex hover:bg-muted">
                    <User className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
