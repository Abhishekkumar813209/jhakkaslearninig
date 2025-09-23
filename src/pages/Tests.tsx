import React from 'react';
import Navbar from '@/components/Navbar';
import TestsOverview from '@/components/student/TestsOverview';
import SEOHead from '@/components/SEOHead';

const Tests = () => {
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Tests & Overview</h1>
            <p className="text-muted-foreground">
              Track your progress and practice with our comprehensive test library
            </p>
          </div>

          <TestsOverview />
        </div>
      </div>
    </>
  );
};

export default Tests;