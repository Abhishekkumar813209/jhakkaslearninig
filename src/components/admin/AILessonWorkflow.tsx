import { useState } from "react";
import { ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIContentGenerator } from "./AIContentGenerator";
import { AIContentRefinement } from "./AIContentRefinement";

interface AILessonWorkflowProps {
  topicId?: string;
  topicName?: string;
  subject?: string;
  chapterName?: string;
}

type WorkflowStage = 'generate' | 'review' | 'complete';

export const AILessonWorkflow = ({
  topicId,
  topicName,
  subject,
  chapterName
}: AILessonWorkflowProps) => {
  const [currentStage, setCurrentStage] = useState<WorkflowStage>('generate');
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  const handleContentGenerated = (content: any) => {
    setGeneratedContent(content);
    setCurrentStage('review');
  };

  const handleContentSaved = (refinedContent: any) => {
    console.log('Final content saved:', refinedContent);
    setCurrentStage('complete');
  };

  const handleRegenerate = () => {
    setCurrentStage('generate');
    setGeneratedContent(null);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Lesson Creation Workflow
          </CardTitle>
          <CardDescription>
            Generate, review, and refine lesson content with AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStage === 'generate' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {currentStage !== 'generate' ? <CheckCircle className="h-4 w-4" /> : '1'}
              </div>
              <span className={currentStage === 'generate' ? 'font-medium' : 'text-muted-foreground'}>
                Generate
              </span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStage === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {currentStage === 'complete' ? <CheckCircle className="h-4 w-4" /> : '2'}
              </div>
              <span className={currentStage === 'review' ? 'font-medium' : 'text-muted-foreground'}>
                Review & Refine
              </span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStage === 'complete' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                3
              </div>
              <span className={currentStage === 'complete' ? 'font-medium' : 'text-muted-foreground'}>
                Complete
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Content */}
      {currentStage === 'generate' && (
        <AIContentGenerator
          topicId={topicId}
          topicName={topicName}
          subject={subject}
          chapterName={chapterName}
          onContentGenerated={handleContentGenerated}
        />
      )}

      {currentStage === 'review' && generatedContent && (
        <AIContentRefinement
          content={generatedContent}
          onSave={handleContentSaved}
          onRegenerate={handleRegenerate}
        />
      )}

      {currentStage === 'complete' && (
        <Card>
          <CardHeader>
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">Content Published Successfully!</CardTitle>
                <CardDescription className="mt-2">
                  Your AI-generated lesson content is now available to students
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex gap-2 justify-center">
              <Button onClick={handleRegenerate} variant="outline">
                Create Another Lesson
              </Button>
              <Button onClick={() => window.location.reload()}>
                View in Content Library
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
