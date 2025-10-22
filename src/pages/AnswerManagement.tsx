import { AnswerManagementPanel } from "@/components/admin/AnswerManagementPanel";
import SEOHead from "@/components/SEOHead";

const AnswerManagement = () => {
  return (
    <>
      <SEOHead 
        title="Answer Management - Admin Dashboard"
        description="Manage and review question answers extracted from PDFs"
      />
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Answer Management</h1>
          <p className="text-muted-foreground mt-2">
            Review and add answers to extracted questions before using them in tests and lessons
          </p>
        </div>

        <AnswerManagementPanel />
      </div>
    </>
  );
};

export default AnswerManagement;
