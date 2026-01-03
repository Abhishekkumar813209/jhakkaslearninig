import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Trash2, Plus, Clock, HelpCircle, Search, BookOpen, PenTool, CheckCircle } from "lucide-react";
import { ManualQuestionEntry } from "./ManualQuestionEntry";

interface LectureQuestionManagerProps {
  lectureId: string;
  lectureDuration: number;
  chapterId: string;
  chapterLibraryId?: string | null;
  subject?: string;
  onClose: () => void;
}

interface LectureQuestion {
  id: string;
  lecture_id: string;
  question_id: string;
  timestamp_seconds: number;
  timer_seconds: number;
  order_in_group: number;
  is_active: boolean;
  question?: QuestionBankItem;
}

interface QuestionBankItem {
  id: string;
  question_type: string;
  question_data: any;
  answer_data: any;
  centralized_topic_name: string | null;
  difficulty: string | null;
  marks: number | null;
}

interface GroupedQuestions {
  [topicName: string]: QuestionBankItem[];
}

export default function LectureQuestionManager({
  lectureId,
  lectureDuration,
  chapterId,
  chapterLibraryId,
  subject,
  onClose
}: LectureQuestionManagerProps) {
  const { toast } = useToast();
  const [lectureQuestions, setLectureQuestions] = useState<LectureQuestion[]>([]);
  const [groupedQuestions, setGroupedQuestions] = useState<GroupedQuestions>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("chapter");

  // For selecting existing questions
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [timestampMinutes, setTimestampMinutes] = useState(0);
  const [timestampSeconds, setTimestampSeconds] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(15);

  useEffect(() => {
    fetchLectureQuestions();
    if (chapterLibraryId) {
      fetchChapterQuestions();
    }
  }, [lectureId, chapterLibraryId]);

  const fetchLectureQuestions = async () => {
    try {
      // Fetch lecture questions
      const { data: lqData, error: lqError } = await supabase
        .from("lecture_questions")
        .select("*")
        .eq("lecture_id", lectureId)
        .order("timestamp_seconds");

      if (lqError) {
        console.error("Error fetching lecture questions:", lqError);
        toast({ title: "Failed to fetch questions", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!lqData || lqData.length === 0) {
        setLectureQuestions([]);
        setIsLoading(false);
        return;
      }

      // Fetch question details from question_bank
      const questionIds = lqData.map(lq => lq.question_id);
      const { data: questionsData } = await supabase
        .from("question_bank")
        .select("id, question_type, question_data, answer_data, centralized_topic_name, difficulty, marks")
        .in("id", questionIds);

      // Map questions to lecture questions
      const questionsMap = new Map(questionsData?.map(q => [q.id, q]) || []);
      const enrichedQuestions: LectureQuestion[] = lqData.map(lq => ({
        ...lq,
        question: questionsMap.get(lq.question_id) || undefined
      }));

      setLectureQuestions(enrichedQuestions);
    } catch (error) {
      console.error("Error fetching lecture questions:", error);
    }
    setIsLoading(false);
  };

  const fetchChapterQuestions = async () => {
    if (!chapterLibraryId) return;

    // Fetch questions from question_bank for this chapter
    const { data, error } = await supabase
      .from("question_bank")
      .select("id, question_type, question_data, answer_data, centralized_topic_name, difficulty, marks")
      .eq("chapter_library_id", chapterLibraryId)
      .in("question_type", ["mcq", "true_false"])
      .eq("is_published", true);

    if (error) {
      console.error("Error fetching chapter questions:", error);
      return;
    }

    // Group questions by topic
    const grouped: GroupedQuestions = {};
    (data || []).forEach((q) => {
      const topicName = q.centralized_topic_name || "General";
      if (!grouped[topicName]) grouped[topicName] = [];
      grouped[topicName].push(q);
    });

    setGroupedQuestions(grouped);
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getQuestionText = (q: QuestionBankItem): string => {
    if (q.question_data?.text) return q.question_data.text;
    if (q.question_data?.statements?.[0]) return q.question_data.statements[0];
    return "Question";
  };

  const handleAddExistingQuestion = async () => {
    if (!selectedQuestionId) {
      toast({ title: "Please select a question", variant: "destructive" });
      return;
    }

    const timestampTotal = timestampMinutes * 60 + timestampSeconds;
    if (timestampTotal >= lectureDuration) {
      toast({ title: "Timestamp exceeds video duration", variant: "destructive" });
      return;
    }

    // Check if question is already added
    const existingQuestion = lectureQuestions.find(q => q.question_id === selectedQuestionId);
    if (existingQuestion) {
      toast({ title: "This question is already added to this lecture", variant: "destructive" });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    
    const { error } = await supabase.from("lecture_questions").insert({
      lecture_id: lectureId,
      question_id: selectedQuestionId,
      timestamp_seconds: timestampTotal,
      timer_seconds: timerSeconds,
      order_in_group: lectureQuestions.filter(q => q.timestamp_seconds === timestampTotal).length + 1,
      is_active: true,
      created_by: userData.user?.id
    });

    if (error) {
      console.error("Error adding question:", error);
      toast({ title: "Failed to add question", variant: "destructive" });
    } else {
      toast({ title: "Question added successfully!" });
      setIsAddDialogOpen(false);
      resetForm();
      fetchLectureQuestions();
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Remove this question from the lecture?")) return;

    const { error } = await supabase
      .from("lecture_questions")
      .delete()
      .eq("id", questionId);

    if (error) {
      toast({ title: "Failed to remove question", variant: "destructive" });
    } else {
      toast({ title: "Question removed" });
      fetchLectureQuestions();
    }
  };

  const handleToggleActive = async (questionId: string, currentState: boolean) => {
    const { error } = await supabase
      .from("lecture_questions")
      .update({ is_active: !currentState })
      .eq("id", questionId);

    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } else {
      fetchLectureQuestions();
    }
  };

  const resetForm = () => {
    setSelectedQuestionId("");
    setTimestampMinutes(0);
    setTimestampSeconds(0);
    setTimerSeconds(15);
    setSearchQuery("");
    setActiveTab("chapter");
  };

  const handleQuestionCreated = (questionId: string) => {
    setIsAddDialogOpen(false);
    resetForm();
    fetchLectureQuestions();
    fetchChapterQuestions();
  };

  // Filter questions by search query
  const filterQuestions = (questions: QuestionBankItem[]) => {
    if (!searchQuery.trim()) return questions;
    return questions.filter(q => 
      getQuestionText(q).toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Calculate timeline markers
  const timelineMarkers = lectureQuestions.map(q => ({
    ...q,
    position: (q.timestamp_seconds / lectureDuration) * 100
  }));

  const truncateText = (text: string, maxLength: number = 80) => {
    const strippedText = text.replace(/<[^>]*>/g, '');
    if (strippedText.length <= maxLength) return strippedText;
    return strippedText.substring(0, maxLength) + "...";
  };

  const topicNames = Object.keys(groupedQuestions);
  const hasChapterQuestions = topicNames.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Manage Lecture Questions</h2>
          <p className="text-sm text-muted-foreground">
            Video Duration: {formatDuration(lectureDuration)}
            {subject && <> • Subject: {subject}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Add Question at Timestamp</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                {/* Timestamp Input */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Timestamp (Minutes:Seconds)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={timestampMinutes}
                        onChange={(e) => setTimestampMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        min={0}
                        max={Math.floor(lectureDuration / 60)}
                        className="w-20"
                      />
                      <span>:</span>
                      <Input
                        type="number"
                        value={timestampSeconds}
                        onChange={(e) => setTimestampSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        min={0}
                        max={59}
                        className="w-20"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Max: {formatDuration(lectureDuration)}
                    </p>
                  </div>
                  <div>
                    <Label>Answer Timer (seconds)</Label>
                    <Select value={timerSeconds.toString()} onValueChange={(v) => setTimerSeconds(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="20">20 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="45">45 seconds</SelectItem>
                        <SelectItem value="60">60 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tabs for Chapter Questions vs Create New */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chapter" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Chapter Questions
                    </TabsTrigger>
                    <TabsTrigger value="create" className="flex items-center gap-2">
                      <PenTool className="h-4 w-4" />
                      Create New
                    </TabsTrigger>
                  </TabsList>

                  {/* Chapter Questions Tab */}
                  <TabsContent value="chapter" className="flex-1 overflow-hidden flex flex-col mt-4">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search questions..."
                        className="pl-10"
                      />
                    </div>

                    <ScrollArea className="flex-1 border rounded-lg p-2">
                      {!chapterLibraryId ? (
                        <p className="text-center text-muted-foreground py-8">
                          No chapter library linked. Use "Create New" tab to add questions.
                        </p>
                      ) : !hasChapterQuestions ? (
                        <p className="text-center text-muted-foreground py-8">
                          No questions found for this chapter. Use "Create New" tab to add questions.
                        </p>
                      ) : (
                        <Accordion type="multiple" className="w-full">
                          {topicNames.map((topicName) => {
                            const topicQuestions = filterQuestions(groupedQuestions[topicName]);
                            if (topicQuestions.length === 0) return null;

                            return (
                              <AccordionItem key={topicName} value={topicName}>
                                <AccordionTrigger className="text-sm hover:no-underline">
                                  <div className="flex items-center gap-2">
                                    <span>{topicName}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {topicQuestions.length}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-2 pl-2">
                                    {topicQuestions.map((q) => {
                                      const isAlreadyAdded = lectureQuestions.some(lq => lq.question_id === q.id);
                                      return (
                                        <Card
                                          key={q.id}
                                          className={`p-3 cursor-pointer transition-colors ${
                                            isAlreadyAdded
                                              ? "opacity-50 cursor-not-allowed"
                                              : selectedQuestionId === q.id
                                              ? "border-primary bg-primary/5"
                                              : "hover:bg-muted/50"
                                          }`}
                                          onClick={() => !isAlreadyAdded && setSelectedQuestionId(q.id)}
                                        >
                                          <div className="flex items-start gap-3">
                                            <div className={`w-4 h-4 rounded-full border-2 mt-1 flex-shrink-0 ${
                                              isAlreadyAdded
                                                ? "bg-green-500 border-green-500"
                                                : selectedQuestionId === q.id
                                                ? "bg-primary border-primary"
                                                : "border-muted-foreground"
                                            }`}>
                                              {isAlreadyAdded && <CheckCircle className="h-3 w-3 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm">{truncateText(getQuestionText(q))}</p>
                                              <div className="flex gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs">
                                                  {q.question_type.replace("_", " ").toUpperCase()}
                                                </Badge>
                                                {isAlreadyAdded && (
                                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                                    Added
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      )}
                    </ScrollArea>

                    <Button 
                      onClick={handleAddExistingQuestion} 
                      className="w-full mt-3" 
                      disabled={!selectedQuestionId}
                    >
                      Add Question at {formatTimestamp(timestampMinutes * 60 + timestampSeconds)}
                    </Button>
                  </TabsContent>

                  {/* Create New Tab */}
                  <TabsContent value="create" className="flex-1 overflow-auto mt-4">
                    <ScrollArea className="h-[50vh]">
                      <ManualQuestionEntry
                        mode="centralized"
                        chapterLibraryId={chapterLibraryId || undefined}
                        centralizedTopicName="Lecture Questions"
                        subject={subject}
                        lectureMode={true}
                        lectureId={lectureId}
                        timestampSeconds={timestampMinutes * 60 + timestampSeconds}
                        timerSeconds={timerSeconds}
                        onQuestionAdded={handleQuestionCreated}
                        onComplete={() => {
                          setIsAddDialogOpen(false);
                          resetForm();
                        }}
                      />
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>

      {/* Timeline Visualization */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Video Timeline</h3>
        <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-muted to-muted-foreground/20" />
          
          {timelineMarkers.map((marker) => (
            <div
              key={marker.id}
              className={`absolute top-0 bottom-0 w-1 cursor-pointer transition-all ${
                marker.is_active ? "bg-primary" : "bg-muted-foreground/50"
              }`}
              style={{ left: `${marker.position}%` }}
              title={`${formatTimestamp(marker.timestamp_seconds)} - ${truncateText(getQuestionText(marker.question as QuestionBankItem) || "", 40)}`}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background" />
            </div>
          ))}
          
          <div className="absolute bottom-1 left-2 text-xs text-muted-foreground">0:00</div>
          <div className="absolute bottom-1 right-2 text-xs text-muted-foreground">{formatDuration(lectureDuration)}</div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {lectureQuestions.length} question{lectureQuestions.length !== 1 ? "s" : ""} scheduled
        </p>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scheduled Questions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : lectureQuestions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No questions added yet. Click "Add Question" to schedule questions during the video.
            </p>
          ) : (
            <div className="space-y-3">
              {lectureQuestions.map((lq) => (
                <Card key={lq.id} className={`p-4 ${!lq.is_active ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="secondary" className="font-mono">
                        {formatTimestamp(lq.timestamp_seconds)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {lq.timer_seconds}s
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm">{truncateText(getQuestionText(lq.question as QuestionBankItem) || "", 120)}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {lq.question?.question_type?.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={lq.is_active ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleToggleActive(lq.id, lq.is_active)}
                      >
                        {lq.is_active ? "Active" : "Inactive"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteQuestion(lq.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
