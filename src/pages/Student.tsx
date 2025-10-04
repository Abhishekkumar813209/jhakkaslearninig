import Navbar from "@/components/Navbar";
import { useProfile } from '@/hooks/useProfile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentBatchRoadmap } from "@/components/student/StudentBatchRoadmap";
import StudentLearningPaths from "@/components/student/StudentLearningPaths";
import { Target, Youtube } from "lucide-react";

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
        <Tabs defaultValue="batch-roadmap" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="batch-roadmap" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              My Batch Roadmap
            </TabsTrigger>
            <TabsTrigger value="custom-paths" className="flex items-center gap-2">
              <Youtube className="h-4 w-4" />
              Custom YouTube Paths
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batch-roadmap" className="space-y-4">
            <StudentBatchRoadmap />
          </TabsContent>

          <TabsContent value="custom-paths" className="space-y-4">
            <StudentLearningPaths />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Student;