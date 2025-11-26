import { useProfile } from '@/hooks/useProfile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentBatchRoadmap } from "@/components/student/StudentBatchRoadmap";
import StudentLearningPaths from "@/components/student/StudentLearningPaths";
import { StudentAppLayout } from "@/components/student/StudentAppLayout";
import { StudentHomeDashboard } from "@/components/student/StudentHomeDashboard";
import { Target, Youtube, Home } from "lucide-react";
import { useState } from "react";

const Student = () => {
  const { loading } = useProfile();
  const [activeTab, setActiveTab] = useState("batch-roadmap");

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
    <StudentAppLayout>
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
            <TabsTrigger value="batch-roadmap" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              My Roadmap
            </TabsTrigger>
            <TabsTrigger value="custom-paths" className="flex items-center gap-2">
              <Youtube className="h-4 w-4" />
              YouTube Paths
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batch-roadmap" className="mt-0">
            <div className="container mx-auto px-4 py-6">
              <StudentBatchRoadmap />
            </div>
          </TabsContent>

          <TabsContent value="custom-paths" className="mt-0">
            <div className="container mx-auto px-4 py-6">
              <StudentLearningPaths />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StudentAppLayout>
  );
};

export default Student;