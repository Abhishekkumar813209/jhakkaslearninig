import { useState } from "react";
import { Database, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { QuestionBankBuilder } from "./QuestionBankBuilder";
import { ChapterLibraryManager } from "./ChapterLibraryManager";
import { CentralizedQuestionExtractor } from "./CentralizedQuestionExtractor";
import { BatchQuestionAssigner } from "./BatchQuestionAssigner";

export default function QuestionBankTab() {
  const [viewMode, setViewMode] = useState<"batch-specific" | "centralized">("batch-specific");

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Question Bank Mode</h3>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "batch-specific" ? "default" : "outline"}
              onClick={() => setViewMode("batch-specific")}
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              Batch-Specific
            </Button>
            <Button
              variant={viewMode === "centralized" ? "default" : "outline"}
              onClick={() => setViewMode("centralized")}
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
    </div>
  );
}
