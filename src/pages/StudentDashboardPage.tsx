import Navbar from "@/components/Navbar";
import StudentDashboard from "@/components/student/StudentDashboard";

const StudentDashboardPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StudentDashboard />
      </div>
    </div>
  );
};

export default StudentDashboardPage;
