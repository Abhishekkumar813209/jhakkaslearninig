import Navbar from '@/components/Navbar';
import TestsOverview from '@/components/student/TestsOverview';

const Tests = () => {
  return (
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
  );
};

export default Tests;