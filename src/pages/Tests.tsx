import React from 'react';
import Navbar from '@/components/Navbar';
import StudentTests from '@/components/student/StudentTests';
import SEOHead from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

const Tests = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <SEOHead 
        title="Practice Tests & Assessments"
        description="Access our comprehensive test library with practice tests, mock exams, and assessments. Free test available, premium subscription for unlimited access."
        keywords="practice tests, mock exams, assessments, test series, online tests, student evaluation"
      />
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <StudentTests />
        </div>
      </div>
    </>
  );
};

export default Tests;