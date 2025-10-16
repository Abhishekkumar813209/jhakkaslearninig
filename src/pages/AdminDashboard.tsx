import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

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
import { QuestionBankBuilder } from "@/components/admin/QuestionBankBuilder";
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
import XPManagement from "@/components/admin/XPManagement";

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
    { value: "overview", label: "Overview", component: OverviewSection },
    { value: "students", label: "Students", component: StudentManagement },
    { value: "user-roles", label: "User Roles", component: UserRoleManagement },
    { value: "batches", label: "Batches", component: BatchManagement },
    { value: "guided-paths", label: "Guided Paths", component: GuidedPathsManagement },
    { value: "roadmaps", label: "Roadmaps", component: RoadmapManagement },
    { value: "manual-topics", label: "Add Topics", component: ManualTopicEditor },
    { value: "lessons", label: "Lesson Builder", component: LessonContentBuilder },
    { value: "question-bank", label: "Question Bank", component: QuestionBankBuilder },
    { value: "zones", label: "Zones", component: ZoneManagementNew },
    { value: "schools", label: "Schools", component: SchoolManagement },
    { value: "zone-analytics", label: "Zone Analytics", component: ZoneSchoolAnalytics },
    { value: "tests", label: "Tests", component: TestManagement },
    { value: "xp-config", label: "XP Configuration", component: XPManagement },
    { value: "fees", label: "Fees", component: FeesManagement },
    { value: "pricing", label: "Pricing", component: PricingManagement },
    { value: "promo-codes", label: "Promo Codes", component: PromoCodeManagement },
    { value: "referrals", label: "Referrals", component: ReferralManagement },
    { value: "subscriptions", label: "Subscriptions", component: SubscriptionManagement },
    { value: "withdrawals", label: "Withdrawals", component: WithdrawalManagement },
    { value: "analytics", label: "Analytics", component: AnalyticsReports },
    { value: "leaderboard", label: "Leaderboard", component: LeaderboardManagement },
    { value: "exam-types", label: "Exam Types", component: ExamTypesManagement },
    { value: "parents", label: "Parents", component: ParentManagement },
    { value: "settings", label: "Settings", component: AdminSettings },
    { value: "ai-assistant", label: "AI Assistant", component: AdminAIChat },
  ];

  const activeTabItem = tabItems.find(item => item.value === activeTab);

  const ActiveComponent = activeTabItem?.component || OverviewSection;

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 flex flex-col">
          {/* Top Header Bar */}
          <header className="h-16 border-b border-border bg-card flex items-center px-6 sticky top-0 z-40 backdrop-blur-sm bg-card/80">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {activeTabItem?.label || "Admin Dashboard"}
              </h1>
            </div>
          </header>
          
          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-auto">
            <ActiveComponent />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;