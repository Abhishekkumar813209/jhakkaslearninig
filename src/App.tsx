import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import AdminCourses from "./pages/AdminCourses";
import AdminDashboard from "./pages/AdminDashboard";
import Quiz from "./pages/Quiz";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import StudentDashboardPage from "./pages/StudentDashboard";
import StudentDashboard from "./components/student/StudentDashboard";
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
            <Route path="/student/dashboard" element={
              <ProtectedRoute>
                <StudentDashboard />
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
                <TakeTest />
              </ProtectedRoute>
            } />
            <Route path="/test/:testId/results" element={
              <ProtectedRoute>
                <TestResults />
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
            
            {/* Admin routes - require admin access */}
            <Route path="/admin" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/courses" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <AdminCourses />
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
            <Route path="/quiz" element={
              <ProtectedRoute adminOnly={true} requireProfileComplete={false}>
                <Quiz />
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
