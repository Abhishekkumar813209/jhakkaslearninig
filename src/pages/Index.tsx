import { StudentAppLayout } from "@/components/student/StudentAppLayout";
import { StudentHomeDashboard } from "@/components/student/StudentHomeDashboard";

const Index = () => {
  return (
    <StudentAppLayout>
      {/* Student Home Dashboard - This is the main protected home page */}
      <StudentHomeDashboard />

    </StudentAppLayout>
  );
};

export default Index;
