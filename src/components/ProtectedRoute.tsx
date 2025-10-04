import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireProfileComplete?: boolean;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true,
  requireProfileComplete = true,
  adminOnly = false 
}) => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();

  // Show loading while checking auth state
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if authentication is required
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if admin access is required
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Skip profile completion check for specific routes
  const skipProfileCheck = [
    '/login',
    '/register',
    '/profile',
    '/'
  ].includes(location.pathname);

  // Check if profile completion is required for students
  if (requireAuth && user && requireProfileComplete && !skipProfileCheck) {
    // Only check profile completion for students (non-admin users)
    if (!isAdmin && (!profile?.student_class || !profile?.education_board)) {
      return <Navigate to="/profile" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;