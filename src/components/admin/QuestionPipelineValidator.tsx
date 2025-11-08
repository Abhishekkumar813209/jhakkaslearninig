import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileQuestion,
  Library,
  Gamepad2,
  ArrowRight,
  Info
} from "lucide-react";
import { 
  validateExtractedQuestion,
  validateLessonContent,
  validateGamifiedExercise,
  validateTopicPipeline,
  diagnoseQuestion,
  type ValidationResult
} from "@/lib/questionPipelineValidation";
import { toast } from "sonner";

export function QuestionPipelineValidator() {
  const [questionId, setQuestionId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [extractionResult, setExtractionResult] = useState<ValidationResult | null>(null);
  const [lessonResult, setLessonResult] = useState<ValidationResult | null>(null);
  const [exerciseResult, setExerciseResult] = useState<ValidationResult | null>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [pipelineResults, setPipelineResults] = useState<any>(null);

  const handleValidateQuestion = async () => {
    if (!questionId.trim()) {
      toast.error("Please enter a question ID");
      return;
    }

    setLoading(true);
    try {
      const result = await validateExtractedQuestion(questionId);
      setExtractionResult(result);
      
      if (result.isValid) {
        toast.success("Question validation passed!");
      } else {
        toast.error(`Found ${result.errors.length} errors`);
      }
    } catch (error: any) {
      toast.error(`Validation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnoseQuestion = async () => {
    if (!questionId.trim()) {
      toast.error("Please enter a question ID");
      return;
    }

    setLoading(true);
    try {
      const result = await diagnoseQuestion(questionId);
      setDiagnosis(result);
      toast.success("Diagnosis complete!");
    } catch (error: any) {
      toast.error(`Diagnosis failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleValidatePipeline = async () => {
    if (!topicId.trim()) {
      toast.error("Please enter a topic ID");
      return;
    }

    setLoading(true);
    try {
      const results = await validateTopicPipeline(topicId);
      setPipelineResults(results);
      
      if (results.summary.criticalErrors === 0) {
        toast.success("Pipeline validation passed!");
      } else {
        toast.error(`Found ${results.summary.criticalErrors} critical errors`);
      }
    } catch (error: any) {
      toast.error(`Pipeline validation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderValidationResult = (result: ValidationResult | null) => {
    if (!result) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {result.isValid ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <h3 className="font-semibold">
            {result.stage} - {result.isValid ? "Valid" : "Invalid"}
          </h3>
        </div>

        {result.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Critical Errors:</p>
                {result.errors.map((err, idx) => (
                  <p key={idx} className="text-sm">• {err}</p>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {result.warnings.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Warnings:</p>
                {result.warnings.map((warn, idx) => (
                  <p key={idx} className="text-sm">• {warn}</p>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {result.data && (
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold mb-2">
              View Raw Data
            </summary>
            <pre className="bg-muted p-2 rounded overflow-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Question Pipeline Validator</h1>
        <p className="text-muted-foreground mt-2">
          Debug and validate questions at each stage of the pipeline
        </p>
      </div>

      {/* Pipeline Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Flow</CardTitle>
          <CardDescription>The complete journey of a question</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-2">
              <FileQuestion className="h-4 w-4" />
              1. PDF Upload
            </Badge>
            <ArrowRight className="h-4 w-4" />
            <Badge variant="outline">2. AI Extraction</Badge>
            <ArrowRight className="h-4 w-4" />
            <Badge variant="outline">3. generated_questions</Badge>
            <ArrowRight className="h-4 w-4" />
            <Badge variant="outline" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              4. Lesson Builder
            </Badge>
            <ArrowRight className="h-4 w-4" />
            <Badge variant="outline">5. topic_learning_content</Badge>
            <ArrowRight className="h-4 w-4" />
            <Badge variant="outline">6. Trigger Sync</Badge>
            <ArrowRight className="h-4 w-4" />
            <Badge variant="outline" className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              7. gamified_exercises
            </Badge>
            <ArrowRight className="h-4 w-4" />
            <Badge variant="outline">8. Student Games</Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single">Single Question</TabsTrigger>
          <TabsTrigger value="diagnose">Diagnose Path</TabsTrigger>
          <TabsTrigger value="topic">Full Topic</TabsTrigger>
        </TabsList>

        {/* Single Question Validation */}
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validate Single Question</CardTitle>
              <CardDescription>
                Check a specific question at any stage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question ID (from generated_questions)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter question UUID"
                    value={questionId}
                    onChange={(e) => setQuestionId(e.target.value)}
                  />
                  <Button onClick={handleValidateQuestion} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Validate
                  </Button>
                </div>
              </div>

              {extractionResult && renderValidationResult(extractionResult)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnose Question Path */}
        <TabsContent value="diagnose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Diagnose Question Journey</CardTitle>
              <CardDescription>
                Track a question through the entire pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question ID</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter question UUID"
                    value={questionId}
                    onChange={(e) => setQuestionId(e.target.value)}
                  />
                  <Button onClick={handleDiagnoseQuestion} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Diagnose
                  </Button>
                </div>
              </div>

              {diagnosis && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Pipeline Path:</h3>
                    {diagnosis.path.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        {step.startsWith('✓') ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="grid gap-4">
                    {diagnosis.extraction && (
                      <details>
                        <summary className="cursor-pointer font-semibold mb-2">
                          Extraction Data (generated_questions)
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-60">
                          {JSON.stringify(diagnosis.extraction, null, 2)}
                        </pre>
                      </details>
                    )}

                    {diagnosis.lesson && (
                      <details>
                        <summary className="cursor-pointer font-semibold mb-2">
                          Lesson Data (topic_learning_content)
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-60">
                          {JSON.stringify(diagnosis.lesson, null, 2)}
                        </pre>
                      </details>
                    )}

                    {diagnosis.exercise && (
                      <details>
                        <summary className="cursor-pointer font-semibold mb-2">
                          Exercise Data (gamified_exercises)
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-60">
                          {JSON.stringify(diagnosis.exercise, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full Topic Pipeline */}
        <TabsContent value="topic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validate Full Topic Pipeline</CardTitle>
              <CardDescription>
                Check all questions in a topic across all stages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Topic ID</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter topic UUID"
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                  />
                  <Button onClick={handleValidatePipeline} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Validate
                  </Button>
                </div>
              </div>

              {pipelineResults && (
                <div className="space-y-4">
                  {/* Summary */}
                  <Card className={pipelineResults.summary.criticalErrors > 0 ? "border-red-500" : "border-green-500"}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{pipelineResults.summary.totalIssues}</p>
                          <p className="text-sm text-muted-foreground">Total Issues</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-500">{pipelineResults.summary.criticalErrors}</p>
                          <p className="text-sm text-muted-foreground">Critical Errors</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-yellow-500">{pipelineResults.summary.warnings}</p>
                          <p className="text-sm text-muted-foreground">Warnings</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detailed Results */}
                  <Tabs defaultValue="extracted">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="extracted">
                        Extracted ({pipelineResults.extracted.length})
                      </TabsTrigger>
                      <TabsTrigger value="lessons">
                        Lessons ({pipelineResults.lessons.length})
                      </TabsTrigger>
                      <TabsTrigger value="exercises">
                        Exercises ({pipelineResults.exercises.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="extracted">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4 pr-4">
                          {pipelineResults.extracted.map((result: ValidationResult, idx: number) => (
                            <Card key={idx}>
                              <CardContent className="pt-6">
                                {renderValidationResult(result)}
                              </CardContent>
                            </Card>
                          ))}
                          {pipelineResults.extracted.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">
                              No extracted questions found for this topic
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="lessons">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4 pr-4">
                          {pipelineResults.lessons.map((result: ValidationResult, idx: number) => (
                            <Card key={idx}>
                              <CardContent className="pt-6">
                                {renderValidationResult(result)}
                              </CardContent>
                            </Card>
                          ))}
                          {pipelineResults.lessons.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">
                              No lesson content found for this topic
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="exercises">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4 pr-4">
                          {pipelineResults.exercises.map((result: ValidationResult, idx: number) => (
                            <Card key={idx}>
                              <CardContent className="pt-6">
                                {renderValidationResult(result)}
                              </CardContent>
                            </Card>
                          ))}
                          {pipelineResults.exercises.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">
                              No gamified exercises found for this topic
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
