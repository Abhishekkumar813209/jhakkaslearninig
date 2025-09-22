import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import GuidedPathsExplorer from "@/components/student/GuidedPathsExplorer";

const StudentGuidedPaths = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Guided Learning Paths</h1>
          <p className="text-muted-foreground">
            Explore structured learning paths created by your teachers with curated video content and study materials
          </p>
        </div>

        <GuidedPathsExplorer />
      </div>
    </div>
  );
};

export default StudentGuidedPaths;