import Navbar from "@/components/Navbar";
import StudentDashboard from "@/components/student/StudentDashboard";
import { useProfile } from '@/hooks/useProfile';

const Student = () => {
  const { loading } = useProfile();

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StudentDashboard />
      </div>
    </div>
  );
};

export default Student;