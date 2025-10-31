import { ReactNode } from 'react';
import { WellnessSidebar } from './WellnessSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

interface WellnessLayoutProps {
  children: ReactNode;
}

export const WellnessLayout = ({ children }: WellnessLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <WellnessSidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};
