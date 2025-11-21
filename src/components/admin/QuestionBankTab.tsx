import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Database, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { QuestionBankBuilder } from "./QuestionBankBuilder";
import { ChapterLibraryManager } from "./ChapterLibraryManager";
import { CentralizedQuestionExtractor } from "./CentralizedQuestionExtractor";
import { BatchQuestionAssigner } from "./BatchQuestionAssigner";
import { CentralizedTopicQuestionsManager } from "./CentralizedTopicQuestionsManager";

export default function QuestionBankTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"batch-specific" | "centralized">("batch-specific");
  const [isClient, setIsClient] = useState(false);

  // Read URL parameters for topic questions management
  const subTab = searchParams.get('subTab');
  const examDomain = searchParams.get('exam_domain') || '';
  const board = searchParams.get('board') || '';
  const studentClass = searchParams.get('class') || '';
  const subject = searchParams.get('subject') || '';
  const chapterLibraryId = searchParams.get('chapter_id') || '';
  const chapterName = searchParams.get('chapter_name') || '';
  const topicName = searchParams.get('topic_name') || '';

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const urlMode = searchParams.get('mode');
      if (urlMode === 'centralized' || urlMode === 'batch-specific') {
        setViewMode(urlMode);
      } else {
        const params = new URLSearchParams(searchParams);
        params.set('mode', 'batch-specific');
        setSearchParams(params, { replace: true });
      }
    }
  }, [isClient, setSearchParams]);

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Question Bank Mode</h3>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "batch-specific" ? "default" : "outline"}
              onClick={() => {
                setViewMode("batch-specific");
                const params = new URLSearchParams(searchParams);
                params.set('mode', 'batch-specific');
                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
                setSearchParams(params);
              }}
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              Batch-Specific
            </Button>
            <Button
              variant={viewMode === "centralized" ? "default" : "outline"}
              onClick={() => {
                setViewMode("centralized");
                const params = new URLSearchParams(searchParams);
                params.set('mode', 'centralized');
                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
                setSearchParams(params);
              }}
              className="gap-2"
            >
              <Library className="h-4 w-4" />
              Centralized Bank
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {viewMode === "batch-specific"
            ? "Manage batch-specific questions tied to individual roadmaps"
            : "Manage centralized question library shared across batches and exams"}
        </p>
      </Card>

      {/* Content */}
      {viewMode === "batch-specific" ? (
        <QuestionBankBuilder />
      ) : (
        <>
          {/* Show CentralizedTopicQuestionsManager when subTab=questions */}
          {subTab === 'questions' && chapterLibraryId && topicName ? (
            <CentralizedTopicQuestionsManager
              examDomain={examDomain}
              board={board}
              studentClass={studentClass}
              subject={subject}
              chapterLibraryId={chapterLibraryId}
              chapterName={chapterName}
              topicName={topicName}
              onBack={() => {
                // Navigate back to chapter library tab
                const params = new URLSearchParams(searchParams);
                params.delete('subTab');
                params.delete('chapter_id');
                params.delete('chapter_name');
                params.delete('topic_name');
                navigate(`/admin?${params.toString()}`, { replace: true });
              }}
            />
          ) : (
            <Tabs defaultValue="chapter-library" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chapter-library">Chapter Library</TabsTrigger>
                <TabsTrigger value="extract-questions">Extract Questions</TabsTrigger>
                <TabsTrigger value="assign-to-batches">Assign to Batches</TabsTrigger>
              </TabsList>

              <TabsContent value="chapter-library">
                <ChapterLibraryManager />
              </TabsContent>

              <TabsContent value="extract-questions">
                <CentralizedQuestionExtractor />
              </TabsContent>

              <TabsContent value="assign-to-batches">
                <BatchQuestionAssigner />
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
