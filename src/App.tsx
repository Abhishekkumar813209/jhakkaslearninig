import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Suspense, lazy } from "react";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import Quiz from "./pages/Quiz";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RegisterParent from "./pages/RegisterParent";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import StudentDashboardPage from "./pages/StudentDashboardPage";
import Tests from "./pages/Tests";
import Leaderboard from "./pages/Leaderboard";
import Analytics from "./pages/Analytics";
import FeesManagement from "./pages/FeesManagement";
import NotFound from "./pages/NotFound";
import TestBuilder from "@/components/admin/TestBuilder";
import TestBuilderPortal from "@/components/admin/TestBuilderPortal";
import OnlineTestInterface from "@/components/student/OnlineTestInterface";
import StudentTests from "@/components/student/StudentTests";
import TakeTest from "@/components/student/TakeTest";
import TestResults from "./pages/TestResults";
import Student from "./pages/Student";
import StudentGuidedPaths from "./pages/StudentGuidedPaths";
import LiveRacing from "./pages/LiveRacing";
import ProtectedRoute from "@/components/ProtectedRoute";
import UIGuide from "./pages/UIGuide";
import ParentDashboard from "./pages/ParentDashboard";
import StudentRoadmapView from "./pages/StudentRoadmapView";
import TopicDetailPage from "./pages/TopicDetailPage";
import GamePlayerPage from "./pages/GamePlayerPage";
import LegacyTestResultsRedirect from "@/components/student/LegacyTestResultsRedirect";
import DatabaseExplorer from "./pages/DatabaseExplorer";
import { EdgeFunctionExplorer } from "./components/admin/EdgeFunctionExplorer";
import TestAnalyticsHistory from "./pages/TestAnalyticsHistory";
import TestQuestionReview from "./pages/TestQuestionReview";

// Lazy load heavy admin pages to prevent them from affecting public routes
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCourses = lazy(() => import("./pages/AdminCourses"));
const AnswerManagement = lazy(() => import("./pages/AnswerManagement"));
const SolutionManagement = lazy(() => import("./pages/SolutionManagement"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/parent" element={<RegisterParent />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Student routes - require complete profile */}
            <Route path="/courses" element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            } />
            <Route path="/tests" element={
              <ProtectedRoute>
                <Tests />
              </ProtectedRoute>
            } />
            <Route path="/student" element={
              <ProtectedRoute>
                <Student />
              </ProtectedRoute>
            } />
            <Route path="/student/roadmap/:roadmapId" element={
              <ProtectedRoute>
                <StudentRoadmapView />
              </ProtectedRoute>
            } />
            <Route path="/student/roadmap/:roadmapId/topic/:topicId" element={
              <ProtectedRoute>
                <TopicDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/student/roadmap/:roadmapId/topic/:topicId/game/:gameId" element={
              <ProtectedRoute>
                <GamePlayerPage />
              </ProtectedRoute>
            } />
        <Route path="/student/dashboard" element={
          <ProtectedRoute>
            <StudentDashboardPage />
          </ProtectedRoute>
        } />
            <Route path="/student/guided-paths" element={
              <ProtectedRoute>
                <StudentGuidedPaths />
              </ProtectedRoute>
            } />
            <Route path="/student/racing" element={
              <ProtectedRoute>
                <LiveRacing />
              </ProtectedRoute>
            } />
            <Route path="/student/tests" element={
              <ProtectedRoute>
                <StudentTests />
              </ProtectedRoute>
            } />
            <Route path="/student-tests" element={
              <ProtectedRoute>
                <StudentTests />
              </ProtectedRoute>
            } />
            <Route path="/student/test/:testId" element={
              <ProtectedRoute>
                <OnlineTestInterface />
              </ProtectedRoute>
            } />
            <Route path="/test/:testId" element={
              <ProtectedRoute>
                <OnlineTestInterface />
              </ProtectedRoute>
            } />
            <Route path="/test/:testId/results" element={
              <ProtectedRoute>
                <TestResults />
              </ProtectedRoute>
            } />
            {/* Backward compatibility for older links: /test-results/:attemptId */}
            <Route path="/test-results/:attemptId" element={
              <ProtectedRoute>
                <LegacyTestResultsRedirect />
              </ProtectedRoute>
            } />
            {/* Historical analytics view by attempt ID */}
            <Route path="/analytics/test/:attemptId" element={
              <ProtectedRoute>
                <TestAnalyticsHistory />
              </ProtectedRoute>
            } />
            {/* Question-by-question review by attempt ID */}
            <Route path="/test/review/:attemptId" element={
              <ProtectedRoute>
                <TestQuestionReview />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute requireProfileComplete={false}>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* Admin routes - require admin access - Lazy loaded */}
            <Route path="/admin" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                  <AdminDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/courses" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                  <AdminCourses />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/solution-management" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                  <SolutionManagement />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/test-builder/:testId" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <TestBuilderPortal />
              </ProtectedRoute>
            } />
            <Route path="/fees" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <FeesManagement />
              </ProtectedRoute>
            } />
            <Route path="/database-explorer" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <DatabaseExplorer />
              </ProtectedRoute>
            } />
            <Route path="/edge-function-explorer" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <EdgeFunctionExplorer />
              </ProtectedRoute>
            } />
            <Route path="/admin/answer-management" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                  <AnswerManagement />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/quiz" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <Quiz />
              </ProtectedRoute>
            } />
            
            {/* Parent routes - require parent access */}
            <Route path="/parent" element={
              <ProtectedRoute requireProfileComplete={false}>
                <ParentDashboard />
              </ProtectedRoute>
            } />
            
            {/* UI Guide - public route for reference */}
            <Route path="/ui-guide" element={<UIGuide />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
