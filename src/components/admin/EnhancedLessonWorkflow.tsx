import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PDFTopicExtractor } from "./PDFTopicExtractor";
import { YouTubeContentFetcher } from "./YouTubeContentFetcher";
import { MultilingualSummarizer } from "./MultilingualSummarizer";
import { AIContentRefinement } from "./AIContentRefinement";
import { CheckCircle2, Loader2, Youtube, FileText, Sparkles, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExtractedTopic {
  topic_name: string;
  page_references: string;
  suggested_days: number;
  difficulty: string;
  importance_score: number;
  animation_type: string;
  game_suggestions: string[];
  key_concepts: string[];
}

interface ExtractedChapter {
  chapter_name: string;
  chapter_number: number;
  topics: ExtractedTopic[];
}

interface ExtractedData {
  chapters: ExtractedChapter[];
  metadata: any;
}

interface YouTubeVideo {
  id: string;
  title: string;
  duration_seconds: number;
  thumbnail: string;
}

interface EnhancedLessonWorkflowProps {
  chapterId: string;
  chapterName: string;
  subject: string;
}

type WorkflowStage = 'pdf' | 'youtube' | 'summary' | 'generate' | 'review' | 'complete';

export function EnhancedLessonWorkflow({ chapterId, chapterName, subject }: EnhancedLessonWorkflowProps) {
  const { toast } = useToast();
  const [currentStage, setCurrentStage] = useState<WorkflowStage>('pdf');
  const [pdfData, setPdfData] = useState<ExtractedData | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [videoSummary, setVideoSummary] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("hinglish");
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ExtractedTopic | null>(null);

  const handlePDFExtracted = (data: ExtractedData, fileName: string) => {
    setPdfData(data);
    setPdfFileName(fileName);
    toast({
      title: "PDF Analyzed Successfully",
      description: `Found ${data.metadata.total_topics} topics. Now add YouTube explanations.`,
    });
    setCurrentStage('youtube');
  };

  const handleVideoSelect = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setCurrentStage('summary');
  };

  const handleLessonGenerate = async (summary: string, language: string) => {
    setVideoSummary(summary);
    setSelectedLanguage(language);
    setCurrentStage('generate');

    // Select first topic for now (you can add topic selection UI)
    if (pdfData?.chapters[0]?.topics[0]) {
      setSelectedTopic(pdfData.chapters[0].topics[0]);
      await generateLessonsForTopic(pdfData.chapters[0].topics[0], summary, language);
    }
  };

  const generateLessonsForTopic = async (topic: ExtractedTopic, summary: string, language: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-lesson-from-youtube', {
        body: {
          summary,
          language,
          videoTitle: selectedVideo?.title || '',
          topicName: topic.topic_name,
          subject,
          pdfContext: {
            key_concepts: topic.key_concepts,
            difficulty: topic.difficulty,
            animation_type: topic.animation_type,
            game_suggestions: topic.game_suggestions
          }
        }
      });

      if (error) throw error;

      setGeneratedContent(data);
      setCurrentStage('review');
      
      toast({
        title: "Lessons Generated Successfully",
        description: `Created ${data.lessons?.length || 0} gamified lessons for ${topic.topic_name}`,
      });

    } catch (error: any) {
      console.error('Lesson generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate lessons",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleContentSaved = () => {
    setCurrentStage('complete');
  };

  const handleReset = () => {
    setCurrentStage('pdf');
    setPdfData(null);
    setSelectedVideo(null);
    setVideoSummary("");
    setGeneratedContent(null);
    setSelectedTopic(null);
  };

  const stages = [
    { id: 'pdf', label: 'PDF Analysis', icon: FileText },
    { id: 'youtube', label: 'YouTube Video', icon: Youtube },
    { id: 'summary', label: 'Summarize', icon: BookOpen },
    { id: 'generate', label: 'Generate Lessons', icon: Sparkles },
    { id: 'review', label: 'Review & Publish', icon: CheckCircle2 },
  ];

  const currentStageIndex = stages.findIndex(s => s.id === currentStage);
  const progress = ((currentStageIndex + 1) / stages.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Lesson Creation Workflow</CardTitle>
          <CardDescription>
            PDF Analysis → YouTube Integration → AI Gamification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const isActive = index === currentStageIndex;
              const isComplete = index < currentStageIndex;
              
              return (
                <div key={stage.id} className="flex items-center">
                  <div className={`flex items-center gap-2 ${isActive ? 'text-primary' : isComplete ? 'text-green-500' : 'text-muted-foreground'}`}>
                    <div className={`rounded-full p-2 ${isActive ? 'bg-primary/10' : isComplete ? 'bg-green-500/10' : 'bg-muted'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium hidden md:block">{stage.label}</span>
                  </div>
                  {index < stages.length - 1 && (
                    <div className={`h-0.5 w-8 md:w-16 mx-2 ${isComplete ? 'bg-green-500' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Stage Content */}
      {currentStage === 'pdf' && (
        <PDFTopicExtractor onTopicsExtracted={handlePDFExtracted} />
      )}

      {currentStage === 'youtube' && (
        <div className="space-y-4">
          {pdfData && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>PDF Analyzed: {pdfFileName}</span>
                  <Badge variant="secondary">{pdfData.metadata.total_topics} topics</Badge>
                </div>
              </CardContent>
            </Card>
          )}
          <YouTubeContentFetcher onVideoSelect={handleVideoSelect} />
        </div>
      )}

      {currentStage === 'summary' && selectedVideo && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>PDF: {pdfFileName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Video: {selectedVideo.title}</span>
              </div>
            </CardContent>
          </Card>
          <MultilingualSummarizer
            videoId={selectedVideo.id}
            videoTitle={selectedVideo.title}
            onLessonGenerate={handleLessonGenerate}
          />
        </div>
      )}

      {currentStage === 'generate' && generating && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Generating Gamified Lessons...</h3>
              <p className="text-sm text-muted-foreground mt-2">
                AI is creating theory, animations, games, and quizzes
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStage === 'review' && generatedContent && selectedTopic && (
        <AIContentRefinement
          content={generatedContent}
          onSave={handleContentSaved}
        />
      )}

      {currentStage === 'complete' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-2xl font-bold">Lessons Created Successfully!</h3>
              <p className="text-muted-foreground mt-2">
                Gamified lessons have been created and are ready for students
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleReset}>
                Create Another Lesson
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                View All Lessons
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
