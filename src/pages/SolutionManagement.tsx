import Navbar from "@/components/Navbar";
import { AnswerManagementPanel } from "@/components/admin/AnswerManagementPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SolutionManagement = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Solution Management</CardTitle>
            <CardDescription>
              Manage answers and explanations for all questions in the question bank
            </CardDescription>
          </CardHeader>
        </Card>
        
        <AnswerManagementPanel />
      </div>
    </div>
  );
};

export default SolutionManagement;
