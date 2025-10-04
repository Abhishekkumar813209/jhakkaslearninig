import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AIContentGeneratorProps {
  topicId?: string;
  topicName?: string;
  subject?: string;
  chapterName?: string;
  onContentGenerated?: (content: any) => void;
}

export const AIContentGenerator = ({
  topicId,
  topicName: initialTopicName,
  subject: initialSubject,
  chapterName,
  onContentGenerated
}: AIContentGeneratorProps) => {
  const [topicName, setTopicName] = useState(initialTopicName || "");
  const [subject, setSubject] = useState(initialSubject || "");
  const [difficulty, setDifficulty] = useState("medium");
  const [bookReference, setBookReference] = useState("");
  const [lessonTypes, setLessonTypes] = useState({
    theory: true,
    interactive_svg: true,
    game: true,
    quiz: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topicName.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic name",
        variant: "destructive"
      });
      return;
    }

    const selectedTypes = Object.entries(lessonTypes)
      .filter(([_, selected]) => selected)
      .map(([type]) => type);

    if (selectedTypes.length === 0) {
      toast({
        title: "Content Type Required",
        description: "Please select at least one content type",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke('ai-lesson-generator', {
        body: {
          topic_id: topicId,
          topic_name: topicName,
          lesson_types: selectedTypes,
          difficulty,
          book_page_reference: bookReference,
          subject,
          chapter_name: chapterName
        }
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (error) {
        console.error('Generation error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data received from AI');
      }

      setGeneratedContent(data);
      toast({
        title: "Content Generated!",
        description: "AI has successfully created your lesson content.",
      });

      if (onContentGenerated) {
        onContentGenerated(data);
      }

    } catch (error: any) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(0), 1000);
    }
  };

  const toggleLessonType = (type: keyof typeof lessonTypes) => {
    setLessonTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Content Generator
          </CardTitle>
          <CardDescription>
            Generate comprehensive lesson content using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Form */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="topic">Topic Name *</Label>
              <Input
                id="topic"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g., Pythagorean Theorem"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Mathematics"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger id="difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reference">Book Page Reference (Optional)</Label>
              <Input
                id="reference"
                value={bookReference}
                onChange={(e) => setBookReference(e.target.value)}
                placeholder="e.g., Pages 45-48"
              />
            </div>

            {/* Content Types */}
            <div className="space-y-3">
              <Label>Content Types to Generate</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(lessonTypes).map(([type, selected]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={selected}
                      onCheckedChange={() => toggleLessonType(type as keyof typeof lessonTypes)}
                    />
                    <Label
                      htmlFor={type}
                      className="text-sm font-normal cursor-pointer capitalize"
                    >
                      {type.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Generating content...</span>
                <span className="font-medium">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Content Preview */}
      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Generated Content Preview
            </CardTitle>
            <CardDescription>
              Review and refine the AI-generated content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="theory" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {generatedContent.content.theory && <TabsTrigger value="theory">Theory</TabsTrigger>}
                {generatedContent.content.svg_animation && <TabsTrigger value="svg">SVG</TabsTrigger>}
                {generatedContent.content.games && <TabsTrigger value="games">Games</TabsTrigger>}
                {generatedContent.content.exercises && <TabsTrigger value="exercises">Exercises</TabsTrigger>}
              </TabsList>

              {generatedContent.content.theory && (
                <TabsContent value="theory" className="space-y-4">
                  <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                    <div dangerouslySetInnerHTML={{ __html: generatedContent.content.theory.html }} />
                    {generatedContent.content.theory.key_points && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Key Points:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {generatedContent.content.theory.key_points.map((point: string, i: number) => (
                            <li key={i} className="text-sm">{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              )}

              {generatedContent.content.svg_animation && (
                <TabsContent value="svg" className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">
                      Animation Type: {generatedContent.content.svg_animation.svg_type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Steps: {generatedContent.content.svg_animation.steps?.length || 0}
                    </p>
                  </div>
                  <pre className="text-xs bg-card p-4 rounded-lg overflow-auto max-h-[300px]">
                    {JSON.stringify(generatedContent.content.svg_animation, null, 2)}
                  </pre>
                </TabsContent>
              )}

              {generatedContent.content.games && (
                <TabsContent value="games" className="space-y-4">
                  <ScrollArea className="h-[400px]">
                    {generatedContent.content.games.map((game: any, index: number) => (
                      <Card key={index} className="mb-4">
                        <CardHeader>
                          <CardTitle className="text-base capitalize">
                            {game.game_type?.replace('_', ' ')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                            {JSON.stringify(game, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </ScrollArea>
                </TabsContent>
              )}

              {generatedContent.content.exercises && (
                <TabsContent value="exercises" className="space-y-4">
                  <ScrollArea className="h-[400px]">
                    {generatedContent.content.exercises.map((exercise: any, index: number) => (
                      <Card key={index} className="mb-4">
                        <CardHeader>
                          <CardTitle className="text-sm">Question {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm font-medium">{exercise.question_text}</p>
                          {exercise.options && (
                            <div className="space-y-1">
                              {exercise.options.map((opt: string, i: number) => (
                                <div
                                  key={i}
                                  className={`text-sm p-2 rounded ${
                                    opt === exercise.correct_answer
                                      ? 'bg-green-100 dark:bg-green-900/20'
                                      : 'bg-muted'
                                  }`}
                                >
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          {exercise.explanation && (
                            <p className="text-xs text-muted-foreground mt-2">
                              <strong>Explanation:</strong> {exercise.explanation}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </ScrollArea>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
