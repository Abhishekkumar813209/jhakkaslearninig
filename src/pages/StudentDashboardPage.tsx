import { StudentAppLayout } from "@/components/student/StudentAppLayout";
import StudentDashboard from "@/components/student/StudentDashboard";

const StudentDashboardPage = () => {
  return (
    <StudentAppLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StudentDashboard />
      </div>
    </StudentAppLayout>
  );
};

export default StudentDashboardPage;
