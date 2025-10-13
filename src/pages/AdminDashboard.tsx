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
  CreditCard
} from "lucide-react";

// Import dashboard components
import OverviewSection from "@/components/admin/OverviewSection";
import StudentManagement from "@/components/admin/StudentManagement";
import BatchManagement from "@/components/admin/BatchManagement";
import TestManagement from "@/components/admin/TestManagement";
import AnalyticsReports from "@/components/admin/AnalyticsReports";
import LeaderboardManagement from "@/components/admin/LeaderboardManagement";
import { ExamTypesManagement } from "@/components/admin/ExamTypesManagement";
import AdminSettings from "@/components/admin/AdminSettings";
import FeesManagement from "@/components/admin/FeesManagement";
import GuidedPathsManagement from "@/components/admin/GuidedPathsManagement";
import ZoneManagementNew from "@/components/admin/ZoneManagementNew";
import SchoolManagement from "@/components/admin/SchoolManagement";
import { ZoneSchoolAnalytics } from "@/components/admin/ZoneSchoolAnalytics";
import RoadmapManagement from "@/components/admin/RoadmapManagement";
import { ManualTopicEditor } from "@/components/admin/ManualTopicEditor";
import { LessonContentBuilder } from "@/components/admin/LessonContentBuilder";
import UserRoleManagement from "@/components/admin/UserRoleManagement";
import AdminAIChat from "@/components/admin/AdminAIChat";
import ParentManagement from "@/components/admin/ParentManagement";
import PricingManagement from "@/components/admin/PricingManagement";
import PromoCodeManagement from "@/components/admin/PromoCodeManagement";
import ReferralManagement from "@/components/admin/ReferralManagement";
import { WithdrawalManagement } from "@/components/admin/WithdrawalManagement";
import SubscriptionManagement from "@/components/admin/SubscriptionManagement";

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview"); // Start with overview tab

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
      value: "user-roles",
      label: "User Roles",
      icon: UserCog,
      component: UserRoleManagement
    },
    {
      value: "batches",
      label: "Batches",
      icon: GraduationCap,
      component: BatchManagement
    },
    {
      value: "guided-paths",
      label: "Guided Paths",
      icon: BookOpen,
      component: GuidedPathsManagement
    },
    {
      value: "roadmaps",
      label: "Roadmaps",
      icon: Map,
      component: RoadmapManagement
    },
    {
      value: "manual-topics",
      label: "Add Topics",
      icon: BookText,
      component: ManualTopicEditor
    },
    {
      value: "lessons",
      label: "Lesson Builder",
      icon: BookOpen,
      component: LessonContentBuilder
    },
    {
      value: "zones",
      label: "Zones",
      icon: Map,
      component: ZoneManagementNew
    },
    {
      value: "schools",
      label: "Schools",
      icon: Building,
      component: SchoolManagement
    },
    {
      value: "zone-analytics",
      label: "Zone Analytics",
      icon: TrendingUp,
      component: ZoneSchoolAnalytics
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
      value: "pricing",
      label: "Pricing",
      icon: DollarSign,
      component: PricingManagement
    },
    {
      value: "promo-codes",
      label: "Promo Codes",
      icon: Tag,
      component: PromoCodeManagement
    },
    {
      value: "referrals",
      label: "Referrals",
      icon: Users2,
      component: ReferralManagement
    },
    {
      value: "subscriptions",
      label: "Subscriptions",
      icon: CreditCard,
      component: SubscriptionManagement
    },
    {
      value: "withdrawals",
      label: "Withdrawals",
      icon: DollarSign,
      component: WithdrawalManagement
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
      value: "exam-types",
      label: "Exam Types",
      icon: Target,
      component: ExamTypesManagement
    },
    {
      value: "parents",
      label: "Parents",
      icon: UserCog,
      component: ParentManagement
    },
    {
      value: "settings",
      label: "Settings",
      icon: Settings,
      component: AdminSettings
    },
    {
      value: "ai-assistant",
      label: "AI Assistant",
      icon: Bot,
      component: AdminAIChat
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
          <TabsList className="grid w-full grid-cols-12 lg:grid-cols-13 mb-6 bg-card border border-border overflow-x-auto">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-5 w-5" />
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