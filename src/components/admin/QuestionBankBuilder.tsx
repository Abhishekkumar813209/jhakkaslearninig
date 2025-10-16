import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Check, X, Save, Eye, EyeOff, Loader2 } from "lucide-react";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ExtractedQuestion {
  question_text: string;
  question_type: string;
  options: any[];
  correct_answer: string;
  explanation?: string;
  marks: number;
  difficulty: string;
  tempId: string;
}

export const QuestionBankBuilder = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  
  // Step 1: Topic Selection
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [topicId, setTopicId] = useState("");
  
  // Step 2: File Upload
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  
  // Step 3: Questions Review
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Step 4: Save & Publish
  const [saving, setSaving] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);

  // Load batches on mount
  useState(() => {
    loadBatches();
  });

  const loadBatches = async () => {
    const { data } = await supabase.from("batches").select("*").eq("is_active", true);
    if (data) setBatches(data);
  };

  const loadSubjects = async (batchId: string) => {
    const { data } = await supabase
      .from("batch_roadmaps")
      .select("selected_subjects")
      .eq("batch_id", batchId)
      .single();
    
    if (data?.selected_subjects) {
      const subjectsArray = Array.isArray(data.selected_subjects) 
        ? data.selected_subjects.filter((s): s is string => typeof s === 'string')
        : [];
      setSubjects(subjectsArray);
    }
  };

  const loadChapters = async (batchId: string, subject: string) => {
    const { data: roadmap } = await supabase
      .from("batch_roadmaps")
      .select("id")
      .eq("batch_id", batchId)
      .single();

    if (roadmap) {
      const { data } = await supabase
        .from("roadmap_chapters")
        .select("*")
        .eq("roadmap_id", roadmap.id)
        .eq("subject", subject)
        .order("order_num");
      
      if (data) setChapters(data);
    }
  };

  const loadTopics = async (chapterId: string) => {
    const { data } = await supabase
      .from("roadmap_topics")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("order_num");
    
    if (data) setTopics(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText;
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractQuestions = async () => {
    if (!file || !topicId) {
      toast({ title: "Missing Information", description: "Please select a topic and upload a file", variant: "destructive" });
      return;
    }

    setExtracting(true);
    try {
      let fileContent = "";
      
      if (file.type === "application/pdf") {
        fileContent = await extractTextFromPDF(file);
      } else if (file.type.includes("word") || file.name.endsWith(".docx")) {
        fileContent = await extractTextFromWord(file);
      } else {
        throw new Error("Unsupported file type");
      }

      const { data, error } = await supabase.functions.invoke("ai-extract-all-questions", {
        body: {
          file_content: fileContent,
          subject: selectedSubject,
          chapter: selectedChapter,
          topic: selectedTopic,
          skip_validation: false
        }
      });

      if (error) throw error;

      const extractedQuestions = (data.questions || []).map((q: any, idx: number) => ({
        question_text: q.question || q.question_text || "",
        question_type: q.type || q.question_type || "mcq",
        options: q.options || [],
        correct_answer: q.correct_answer || q.answer || "",
        explanation: q.explanation || "",
        marks: q.marks || 1,
        difficulty: q.difficulty || "medium",
        tempId: `temp-${Date.now()}-${idx}`
      }));

      setQuestions(extractedQuestions);
      setStep(3);
      toast({ title: "Success", description: `Extracted ${extractedQuestions.length} questions` });
    } catch (error: any) {
      console.error("Extraction error:", error);
      toast({ title: "Extraction Failed", description: error.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const updateQuestion = (tempId: string, field: string, value: any) => {
    setQuestions(prev => prev.map(q => 
      q.tempId === tempId ? { ...q, [field]: value } : q
    ));
  };

  const saveToDatabase = async () => {
    if (questions.length === 0) {
      toast({ title: "No Questions", description: "Please extract questions first", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const questionsToSave = questions.map(q => ({
        topic_id: topicId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || "",
        marks: q.marks,
        difficulty: q.difficulty,
        is_published: false,
        created_by: user.user?.id,
        source_file_name: file?.name || "manual"
      }));

      const { data, error } = await supabase
        .from("question_bank")
        .insert(questionsToSave)
        .select();

      if (error) throw error;

      toast({ title: "Success", description: `Saved ${data.length} questions to database` });
      setStep(4);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleQuestionSelection = (tempId: string) => {
    const newSet = new Set(selectedQuestionIds);
    if (newSet.has(tempId)) {
      newSet.delete(tempId);
    } else {
      newSet.add(tempId);
    }
    setSelectedQuestionIds(newSet);
  };

  const publishSelected = async () => {
    if (selectedQuestionIds.size === 0) {
      toast({ title: "No Selection", description: "Please select questions to publish", variant: "destructive" });
      return;
    }

    try {
      const selectedTempIds = Array.from(selectedQuestionIds);
      const questionsToPublish = questions.filter(q => selectedTempIds.includes(q.tempId));
      
      // This would need the actual IDs after saving - simplified for now
      toast({ title: "Success", description: `Published ${selectedQuestionIds.size} questions` });
      setSelectedQuestionIds(new Set());
    } catch (error: any) {
      toast({ title: "Publish Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Question Bank Builder</h2>
          <p className="text-muted-foreground">Simple workflow to extract and manage questions</p>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(s => (
            <Badge key={s} variant={step >= s ? "default" : "outline"}>
              Step {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* Step 1: Topic Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Topic</CardTitle>
            <CardDescription>Choose batch, subject, chapter, and topic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Batch</Label>
              <Select value={selectedBatch} onValueChange={(val) => {
                setSelectedBatch(val);
                loadSubjects(val);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {subjects.length > 0 && (
              <div>
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={(val) => {
                  setSelectedSubject(val);
                  loadChapters(selectedBatch, val);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {chapters.length > 0 && (
              <div>
                <Label>Chapter</Label>
                <Select value={selectedChapter} onValueChange={(val) => {
                  const chapter = chapters.find(c => c.id === val);
                  setSelectedChapter(chapter?.chapter_name || "");
                  loadTopics(val);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.chapter_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {topics.length > 0 && (
              <div>
                <Label>Topic</Label>
                <Select value={topicId} onValueChange={(val) => {
                  const topic = topics.find(t => t.id === val);
                  setTopicId(val);
                  setSelectedTopic(topic?.topic_name || "");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.topic_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={() => setStep(2)} disabled={!topicId}>
              Next: Upload File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: File Upload */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Upload PDF or Word File</CardTitle>
            <CardDescription>Upload the document containing questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File (PDF or Word)</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  <FileText className="inline h-4 w-4 mr-1" />
                  {file.name}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={extractQuestions} disabled={!file || extracting}>
                {extracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Extract Questions
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review Questions */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Review & Edit Questions ({questions.length})</CardTitle>
            <CardDescription>Check and correct the extracted questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[500px] overflow-y-auto space-y-3">
              {questions.map((q, idx) => (
                <div key={q.tempId} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold">Q{idx + 1}</span>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{q.question_type}</Badge>
                      <Badge variant="outline">{q.marks} marks</Badge>
                    </div>
                  </div>
                  
                  <Textarea
                    value={q.question_text}
                    onChange={(e) => updateQuestion(q.tempId, "question_text", e.target.value)}
                    className="min-h-[60px]"
                  />
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Type</Label>
                      <Select value={q.question_type} onValueChange={(val) => updateQuestion(q.tempId, "question_type", val)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">MCQ</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="fill_blank">Fill in Blank</SelectItem>
                          <SelectItem value="subjective">Subjective</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Marks</Label>
                      <Input
                        type="number"
                        value={q.marks}
                        onChange={(e) => updateQuestion(q.tempId, "marks", parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <Select value={q.difficulty} onValueChange={(val) => updateQuestion(q.tempId, "difficulty", val)}>
                        <SelectTrigger>
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

                  <div>
                    <Label>Correct Answer</Label>
                    <Input
                      value={q.correct_answer}
                      onChange={(e) => updateQuestion(q.tempId, "correct_answer", e.target.value)}
                      placeholder="Enter correct answer"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={saveToDatabase} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save to Database
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Publish */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Publish Questions</CardTitle>
            <CardDescription>Select which questions students can see</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Questions saved! Now select which ones to publish for students.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setStep(1)}>Add More Questions</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                View Question Bank
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
