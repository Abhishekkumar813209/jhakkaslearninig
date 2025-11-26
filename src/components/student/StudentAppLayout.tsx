import { ReactNode, useState } from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentAppSidebar } from './StudentAppSidebar';

interface StudentAppLayoutProps {
  children: ReactNode;
}

export const StudentAppLayout = ({ children }: StudentAppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left: Hamburger Menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-muted">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <StudentAppSidebar onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Center: App Logo/Name */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">J</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">Jhakkas</h1>
          </div>

          {/* Right: Notification & Profile */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Bell className="h-5 w-5" />
            </Button>
            {/* Profile icon - hidden on mobile, visible on desktop */}
            <Button variant="ghost" size="icon" className="hidden md:inline-flex hover:bg-muted">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
};
