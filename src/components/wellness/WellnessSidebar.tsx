import { Heart, LayoutDashboard, Map, Users, Gamepad2, BarChart3, MessageCircle, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader } from '@/components/ui/sidebar';

const wellnessNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/wellness' },
  { title: 'My Journey', icon: Map, path: '/wellness/journey' },
  { title: 'Accountability', icon: Users, path: '/wellness/accountability' },
  { title: 'Daily Check-in', icon: Heart, path: '/wellness/checkin' },
  { title: 'Progress', icon: BarChart3, path: '/wellness/progress' },
  { title: 'Messages', icon: MessageCircle, path: '/wellness/messages' },
];

const adminNavItems = [
  { title: 'Manage Roadmaps', icon: Map, path: '/admin/wellness/roadmaps' },
  { title: 'Manage Games', icon: Gamepad2, path: '/admin/wellness/games' },
  { title: 'Analytics', icon: BarChart3, path: '/admin/wellness/analytics' },
];

export const WellnessSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.includes('/admin/wellness');

  const navItems = isAdmin ? adminNavItems : wellnessNavItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-bold text-lg">Wellness Hub</h2>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Admin Portal' : 'Your Journey'}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate(isAdmin ? '/admin' : '/student')}>
                  <LogOut className="h-4 w-4" />
                  <span>Exit Wellness</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
