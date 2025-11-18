import { useState } from "react";
import { QuestionBankBuilder } from "@/components/admin/QuestionBankBuilder";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Library } from "lucide-react";
import { ChapterLibraryManager } from "@/components/admin/ChapterLibraryManager";
import { CentralizedQuestionExtractor } from "@/components/admin/CentralizedQuestionExtractor";
import { BatchQuestionAssigner } from "@/components/admin/BatchQuestionAssigner";

const QuestionBank = () => {
  const [mode, setMode] = useState<'batch-specific' | 'centralized'>('batch-specific');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Question Bank</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Question Bank</h1>
            <p className="text-muted-foreground">Build and manage questions for your batches</p>
          </div>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setMode('batch-specific')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'batch-specific'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="h-4 w-4 inline mr-2" />
            Batch-Specific
          </button>
          <button
            onClick={() => setMode('centralized')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'centralized'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Library className="h-4 w-4 inline mr-2" />
            Centralized Bank
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === 'batch-specific' ? (
        <QuestionBankBuilder />
      ) : (
        <Tabs defaultValue="library" className="space-y-4">
          <TabsList>
            <TabsTrigger value="library">Chapter Library</TabsTrigger>
            <TabsTrigger value="extract">Extract Questions</TabsTrigger>
            <TabsTrigger value="assign">Assign to Batches</TabsTrigger>
          </TabsList>
          
          <TabsContent value="library">
            <ChapterLibraryManager />
          </TabsContent>
          
          <TabsContent value="extract">
            <CentralizedQuestionExtractor />
          </TabsContent>
          
          <TabsContent value="assign">
            <BatchQuestionAssigner />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default QuestionBank;
