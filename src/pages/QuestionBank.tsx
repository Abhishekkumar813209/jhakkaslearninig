import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { QuestionBankBuilder } from "@/components/admin/QuestionBankBuilder";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Library } from "lucide-react";
import { ChapterLibraryManager } from "@/components/admin/ChapterLibraryManager";
import { CentralizedQuestionExtractor } from "@/components/admin/CentralizedQuestionExtractor";
import { BatchQuestionAssigner } from "@/components/admin/BatchQuestionAssigner";
import { CentralizedTopicQuestionsManager } from "@/components/admin/CentralizedTopicQuestionsManager";

const QuestionBank = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<'batch-specific' | 'centralized'>('batch-specific');
  const [isClient, setIsClient] = useState(false);

  // Hydration fix: only render URL-based content on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sync mode with URL
  useEffect(() => {
    if (isClient) {
      const urlMode = searchParams.get('mode');
      if (urlMode === 'centralized' || urlMode === 'batch-specific') {
        setMode(urlMode);
      }
    }
  }, [isClient, searchParams]);

  const handleModeChange = (newMode: 'batch-specific' | 'centralized') => {
    setMode(newMode);
    const params = new URLSearchParams(searchParams);
    params.set('mode', newMode);
    params.delete('subTab'); // Clear subTab when switching modes
    params.delete('chapter_id');
    params.delete('topic_name');
    setSearchParams(params);
  };

  // Check if we should show the questions manager
  const showQuestionsManager = isClient && 
    mode === 'centralized' && 
    searchParams.get('subTab') === 'questions' &&
    searchParams.get('chapter_id') &&
    searchParams.get('topic_name');

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
        
        {!showQuestionsManager && (
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => handleModeChange('batch-specific')}
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
              onClick={() => handleModeChange('centralized')}
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
        )}
      </div>

      {/* Content */}
      {showQuestionsManager ? (
        <CentralizedTopicQuestionsManager
          key={`${searchParams.get('chapter_id')}-${searchParams.get('topic_name')}`}
          examDomain={searchParams.get('exam_domain') || ''}
          board={searchParams.get('board') || undefined}
          studentClass={searchParams.get('class') || undefined}
          subject={searchParams.get('subject') || ''}
          chapterLibraryId={searchParams.get('chapter_id') || ''}
          chapterName={searchParams.get('chapter_name') || ''}
          topicName={searchParams.get('topic_name') || ''}
          onBack={() => {
            const params = new URLSearchParams(searchParams);
            params.delete('subTab');
            params.delete('chapter_id');
            params.delete('chapter_name');
            params.delete('topic_name');
            setSearchParams(params);
          }}
        />
      ) : mode === 'batch-specific' ? (
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
