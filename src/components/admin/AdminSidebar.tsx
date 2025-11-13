import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  TrendingUp,
  Trophy,
  Settings,
  Target,
  DollarSign,
  Map,
  Building,
  BookText,
  UserCog,
  Bot,
  Tag,
  Users2,
  CreditCard,
  ChevronRight,
  Zap,
  Database,
  CheckCircle,
  FunctionSquare,
  GitBranch,
  Video,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserProfileDropdown } from "./UserProfileDropdown";

interface MenuItem {
  value: string;
  label: string;
  icon: any;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "Dashboard",
    items: [
      { value: "overview", label: "Overview", icon: BarChart3 },
    ],
  },
  {
    label: "User Management",
    items: [
      { value: "students", label: "Students", icon: Users },
      { value: "parents", label: "Parents", icon: UserCog },
      { value: "user-roles", label: "User Roles", icon: UserCog },
    ],
  },
  {
    label: "Academic",
      items: [
        { value: "batches", label: "Batches", icon: GraduationCap },
        { value: "guided-paths", label: "Guided Paths", icon: BookOpen },
        { value: "roadmaps", label: "Roadmaps", icon: Map },
        { value: "manual-topics", label: "Add Topics", icon: BookText },
        { value: "lessons", label: "Lesson Builder", icon: BookOpen },
        { value: "chapter-lectures", label: "Chapter Lectures", icon: Video },
        { value: "question-bank", label: "Question Bank", icon: FileText },
        { value: "exam-types", label: "Exam Types", icon: Target },
        { value: "database-explorer", label: "Database Explorer", icon: Database },
      ],
  },
  {
    label: "Location",
    items: [
      { value: "zones", label: "Zones", icon: Map },
      { value: "schools", label: "Schools", icon: Building },
      { value: "zone-analytics", label: "Zone Analytics", icon: TrendingUp },
    ],
  },
  {
    label: "Assessments",
    items: [
      { value: "tests", label: "Tests", icon: FileText },
      { value: "xp-config", label: "XP Configuration", icon: Zap },
    ],
  },
  {
    label: "Financial",
    items: [
      { value: "fees", label: "Fees", icon: DollarSign },
      { value: "pricing", label: "Pricing", icon: DollarSign },
      { value: "promo-codes", label: "Promo Codes", icon: Tag },
      { value: "referrals", label: "Referrals", icon: Users2 },
      { value: "subscriptions", label: "Subscriptions", icon: CreditCard },
      { value: "withdrawals", label: "Withdrawals", icon: DollarSign },
    ],
  },
  {
    label: "Analytics & Engagement",
    items: [
      { value: "analytics", label: "Analytics", icon: TrendingUp },
      { value: "leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "System",
    items: [
      { value: "settings", label: "Settings", icon: Settings },
      { value: "ai-assistant", label: "AI Assistant", icon: Bot },
    ],
  },
];

// Separate navigation items (not tabs)
const navigationItems = [
  { path: "/edge-function-explorer", label: "Edge Function Explorer", icon: FunctionSquare },
  { path: "/pipeline-validator", label: "Pipeline Validator", icon: GitBranch },
  { path: "/admin/solution-management", label: "Solution Management", icon: CheckCircle },
  { path: "/admin/courses", label: "Course Builder", icon: GraduationCap },
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold text-foreground">Jhakkas Admin</h2>
              <p className="text-xs text-muted-foreground">Learning Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.value;
                  
                  return (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        onClick={() => onTabChange(item.value)}
                        isActive={isActive}
                        className={`
                          group relative transition-all duration-200
                          ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-accent hover:text-accent-foreground'}
                        `}
                        tooltip={isCollapsed ? item.label : undefined}
                      >
                        <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${isActive ? 'text-primary-foreground' : ''}`} />
                        {!isCollapsed && (
                          <span className="font-medium">{item.label}</span>
                        )}
                        {isActive && !isCollapsed && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        
        {/* Navigation Links (separate from tabs) */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={isCollapsed ? item.label : undefined}>
                      <NavLink 
                        to={item.path}
                        className={`
                          group relative transition-all duration-200
                          ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-accent hover:text-accent-foreground'}
                        `}
                      >
                        <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${isActive ? 'text-primary-foreground' : ''}`} />
                        {!isCollapsed && (
                          <span className="font-medium">{item.label}</span>
                        )}
                        {isActive && !isCollapsed && (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <UserProfileDropdown />
      </SidebarFooter>
    </Sidebar>
  );
}
