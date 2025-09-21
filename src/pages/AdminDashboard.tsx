import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { 
  BarChart3, 
  Users, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  Bell, 
  Trophy,
  Settings,
  DollarSign
} from "lucide-react";

// Import dashboard components
import OverviewSection from "@/components/admin/OverviewSection";
import StudentManagement from "@/components/admin/StudentManagement";
import BatchManagement from "@/components/admin/BatchManagement";
import CourseManagement from "@/components/admin/CourseManagement";
import TestManagement from "@/components/admin/TestManagement";
import AnalyticsReports from "@/components/admin/AnalyticsReports";
import LeaderboardManagement from "@/components/admin/LeaderboardManagement";
import NotificationCenter from "@/components/admin/NotificationCenter";
import AdminSettings from "@/components/admin/AdminSettings";
import FeesManagement from "@/components/admin/FeesManagement";

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("courses"); // Start with courses tab

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const tabItems = [
    {
      value: "overview",
      label: "Overview",
      icon: BarChart3,
      component: OverviewSection
    },
    {
      value: "students",
      label: "Students",
      icon: Users,
      component: StudentManagement
    },
    {
      value: "batches",
      label: "Batches",
      icon: GraduationCap,
      component: BatchManagement
    },
    {
      value: "courses",
      label: "Courses",
      icon: BookOpen,
      component: CourseManagement
    },
    {
      value: "tests",
      label: "Tests",
      icon: FileText,
      component: TestManagement
    },
    {
      value: "fees",
      label: "Fees",
      icon: DollarSign,
      component: FeesManagement
    },
    {
      value: "analytics",
      label: "Analytics",
      icon: TrendingUp,
      component: AnalyticsReports
    },
    {
      value: "leaderboard",
      label: "Leaderboard",
      icon: Trophy,
      component: LeaderboardManagement
    },
    {
      value: "notifications",
      label: "Notifications",
      icon: Bell,
      component: NotificationCenter
    },
    {
      value: "settings",
      label: "Settings",
      icon: Settings,
      component: AdminSettings
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your learning management system</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-10 mb-6 bg-card border border-border">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabItems.map((tab) => {
            const Component = tab.component;
            return (
              <TabsContent key={tab.value} value={tab.value} className="space-y-6">
                <Component />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;