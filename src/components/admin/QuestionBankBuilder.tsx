import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Check, Loader2, ChevronRight, ArrowLeft, Save, Trash2 } from "lucide-react";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { useExamTypes } from "@/hooks/useExamTypes";
import { BoardClassSelector } from "./BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";
import * as LucideIcons from "lucide-react";

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

interface Batch {
  id: string;
  name: string;
  exam_type: string;
  exam_name: string;
  linked_roadmap_id: string;
  target_board?: string;
  target_class?: string;
  current_strength: number;
}

interface Chapter {
  id: string;
  chapter_name: string;
  subject: string;
  roadmap_id: string;
}

export const QuestionBankBuilder = () => {
  const { toast } = useToast();
  const { examTypes } = useExamTypes();
  const { selectedBoard, selectedClass, setBoard, setClass, reset: resetBoardClass } = useBoardClassHierarchy();
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  
  // Domain selection (Step 1)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  // Batch selection (Step 3)
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  
  // Subject selection (Step 4)
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  
  // Chapter selection (Step 5)
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  
  // File upload (Step 6)
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  
  // Questions review (Step 7)
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  
  // Saving (Step 8)
  const [saving, setSaving] = useState(false);

  const iconMap: Record<string, any> = {
    GraduationCap: LucideIcons.GraduationCap,
    BookOpen: LucideIcons.BookOpen,
    Briefcase: LucideIcons.Briefcase,
    Building2: LucideIcons.Building2,
    Globe: LucideIcons.Globe,
    Shield: LucideIcons.Shield,
    Zap: LucideIcons.Zap,
    Award: LucideIcons.Award,
    Pencil: LucideIcons.Pencil,
  };

  // Fetch batches when domain/board/class changes
  useEffect(() => {
    if (selectedDomain) {
      fetchBatches();
    }
  }, [selectedDomain, selectedBoard, selectedClass]);

  // Fetch subjects when batch changes
  useEffect(() => {
    if (selectedBatch) {
      fetchSubjects();
    }
  }, [selectedBatch]);

  // Fetch chapters when subject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchChapters();
    }
  }, [selectedSubject]);

  const fetchBatches = async () => {
    if (!selectedDomain) return;

    let query = supabase
      .from("batches")
      .select("id, name, exam_type, exam_name, linked_roadmap_id, target_board, target_class, current_strength")
      .eq("is_active", true)
      .eq("exam_type", selectedDomain)
      .not("linked_roadmap_id", "is", null);

    const { data, error } = await query.order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to load batches", variant: "destructive" });
      return;
    }

    // Filter by board and class for school domain
    let filteredData = data || [];
    if (selectedDomain === 'school') {
      filteredData = filteredData.filter(b => 
        (!selectedBoard || b.target_board === selectedBoard) &&
        (!selectedClass || b.target_class === selectedClass)
      );
    }

    setBatches(filteredData);
  };

  const fetchSubjects = async () => {
    const batch = batches.find(b => b.id === selectedBatch);
    if (!batch?.linked_roadmap_id) return;

    const { data, error } = await supabase
      .from('roadmap_chapters')
      .select('subject')
      .eq('roadmap_id', batch.linked_roadmap_id);

    if (error) {
      toast({ title: "Error", description: "Failed to load subjects", variant: "destructive" });
      return;
    }

    const uniqueSubjects = Array.from(new Set(data.map(d => d.subject)));
    setSubjects(uniqueSubjects);
  };

  const fetchChapters = async () => {
    const batch = batches.find(b => b.id === selectedBatch);
    if (!batch?.linked_roadmap_id || !selectedSubject) return;

    const { data, error } = await supabase
      .from("roadmap_chapters")
      .select("id, chapter_name, subject, roadmap_id")
      .eq("roadmap_id", batch.linked_roadmap_id)
      .eq("subject", selectedSubject)
      .order("order_num");

    if (error) {
      toast({ title: "Error", description: "Failed to load chapters", variant: "destructive" });
      return;
    }

    setChapters(data || []);
  };

  const handleDomainSelect = (domain: string) => {
    setSelectedDomain(domain);
    resetBoardClass();
    setSelectedBatch("");
    setSelectedSubject("");
    setSelectedChapter(null);
    
    const examType = examTypes.find(t => t.code === domain);
    if (examType?.requires_board) {
      setCurrentStep(2); // Go to board/class selection
    } else {
      setCurrentStep(3); // Skip directly to batch selection
    }
  };

  const handleBoardClassComplete = () => {
    setCurrentStep(3); // Move to batch selection
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
    if (!file || !selectedChapter) {
      toast({ title: "Missing Information", description: "Please upload a file", variant: "destructive" });
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
          chapter: selectedChapter.chapter_name,
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
      setCurrentStep(7);
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

  const deleteQuestion = (tempId: string) => {
    setQuestions(prev => prev.filter(q => q.tempId !== tempId));
  };

  const saveToDatabase = async () => {
    if (questions.length === 0) {
      toast({ title: "No Questions", description: "Please extract questions first", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const batch = batches.find(b => b.id === selectedBatch);
      
      const questionsToSave = questions.map(q => ({
        chapter_id: selectedChapter?.id,
        subject: selectedSubject,
        batch_id: selectedBatch,
        exam_domain: selectedDomain,
        exam_name: batch?.exam_name || selectedDomain,
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

      toast({ title: "Success", description: `Saved ${data.length} questions to Question Bank` });
      
      // Reset and go back to start
      setCurrentStep(1);
      setSelectedDomain(null);
      resetBoardClass();
      setSelectedBatch("");
      setSelectedSubject("");
      setSelectedChapter(null);
      setFile(null);
      setQuestions([]);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderBreadcrumbs = () => {
    const crumbs = [];
    
    if (selectedDomain) {
      const examType = examTypes.find(t => t.code === selectedDomain);
      crumbs.push(examType?.display_name || selectedDomain);
    }
    if (selectedBoard) crumbs.push(selectedBoard);
    if (selectedClass) crumbs.push(`Class ${selectedClass}`);
    if (selectedBatch) {
      const batch = batches.find(b => b.id === selectedBatch);
      crumbs.push(batch?.name || "Batch");
    }
    if (selectedSubject) crumbs.push(selectedSubject);
    if (selectedChapter) crumbs.push(selectedChapter.chapter_name);
    
    return crumbs.length > 0 ? (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        {crumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-2">
            {crumb}
            {idx < crumbs.length - 1 && <ChevronRight className="h-4 w-4" />}
          </span>
        ))}
      </div>
    ) : null;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold">Question Bank Builder</h2>
        <p className="text-muted-foreground">Extract questions from PDFs/Word docs organized by Domain → Board → Class → Batch → Subject → Chapter</p>
      </div>

      {renderBreadcrumbs()}

      {/* Step 1: Domain Selection */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Exam Domain</CardTitle>
            <CardDescription>Choose the exam type to organize questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {examTypes.filter(t => t.is_active).map((examType) => {
                const IconComponent = examType.icon_name ? iconMap[examType.icon_name] : LucideIcons.BookOpen;
                return (
                  <Card
                    key={examType.id}
                    className="cursor-pointer hover:border-primary transition-all"
                    onClick={() => handleDomainSelect(examType.code)}
                  >
                    <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                      {IconComponent && <IconComponent className="h-8 w-8 text-primary" />}
                      <div>
                        <div className="font-semibold">{examType.display_name}</div>
                        <div className="text-xs text-muted-foreground">{examType.category}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Board & Class Selection (Only for School) */}
      {currentStep === 2 && selectedDomain === 'school' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Select Board & Class</CardTitle>
            <CardDescription>Choose the educational board and class</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Domain
            </Button>
            
            <BoardClassSelector
              examType={selectedDomain || ''}
              selectedBoard={selectedBoard}
              selectedClass={selectedClass}
              onBoardSelect={setBoard}
              onClassSelect={setClass}
              onReset={resetBoardClass}
            />
            
            {selectedBoard && selectedClass && (
              <Button onClick={handleBoardClassComplete} className="mt-4">
                Next: Select Batch
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Batch Selection */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Select Batch</CardTitle>
            <CardDescription>Choose a batch with a linked roadmap</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setCurrentStep(selectedDomain === 'school' ? 2 : 1)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            {batches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No batches found for this selection. Please create a batch with a linked roadmap first.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batches.map((batch) => (
                  <Card
                    key={batch.id}
                    className={`cursor-pointer hover:border-primary transition-all ${
                      selectedBatch === batch.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      setSelectedBatch(batch.id);
                      setCurrentStep(4);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="font-semibold">{batch.name}</div>
                      <div className="text-sm text-muted-foreground">{batch.exam_name}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Strength: {batch.current_strength}
                      </div>
                      <Badge variant="secondary" className="mt-2">Has Roadmap</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Subject Selection */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Select Subject</CardTitle>
            <CardDescription>Choose the subject for questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setCurrentStep(3)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Batch
            </Button>
            
            {subjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No subjects found in the batch roadmap.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {subjects.map((subject) => (
                  <Card
                    key={subject}
                    className={`cursor-pointer hover:border-primary transition-all ${
                      selectedSubject === subject ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      setSelectedSubject(subject);
                      setCurrentStep(5);
                    }}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="font-semibold">{subject}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Chapter Selection */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5: Select Chapter</CardTitle>
            <CardDescription>Choose the chapter for questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Subject
            </Button>
            
            {chapters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No chapters found for this subject.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {chapters.map((chapter) => (
                  <Card
                    key={chapter.id}
                    className={`cursor-pointer hover:border-primary transition-all ${
                      selectedChapter?.id === chapter.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      setSelectedChapter(chapter);
                      setCurrentStep(6);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="font-semibold">{chapter.chapter_name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 6: File Upload */}
      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 6: Upload PDF or Word File</CardTitle>
            <CardDescription>Upload the document containing questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setCurrentStep(5)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chapter
            </Button>
            
            <div>
              <Label htmlFor="file-upload">Select File (PDF or Word)</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </p>
              )}
            </div>

            <Button onClick={extractQuestions} disabled={!file || extracting} className="w-full">
              {extracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting Questions...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Extract Questions with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 7: Review Questions */}
      {currentStep === 7 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 7: Review & Edit Questions ({questions.length})</CardTitle>
            <CardDescription>Check and correct the extracted questions before saving</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setCurrentStep(6)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Upload
            </Button>
            
            <div className="max-h-[600px] overflow-y-auto space-y-3">
              {questions.map((q, idx) => (
                <div key={q.tempId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-lg">Q{idx + 1}</span>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{q.question_type}</Badge>
                      <Badge variant="outline">{q.marks} marks</Badge>
                      <Badge>{q.difficulty}</Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteQuestion(q.tempId)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Question Text</Label>
                    <Textarea
                      value={q.question_text}
                      onChange={(e) => updateQuestion(q.tempId, "question_text", e.target.value)}
                      className="min-h-[80px] mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select value={q.question_type} onValueChange={(val) => updateQuestion(q.tempId, "question_type", val)}>
                        <SelectTrigger className="mt-1">
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
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <Select value={q.difficulty} onValueChange={(val) => updateQuestion(q.tempId, "difficulty", val)}>
                        <SelectTrigger className="mt-1">
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
                      className="mt-1"
                    />
                  </div>

                  {q.explanation && (
                    <div>
                      <Label>Explanation (Optional)</Label>
                      <Textarea
                        value={q.explanation}
                        onChange={(e) => updateQuestion(q.tempId, "explanation", e.target.value)}
                        className="min-h-[60px] mt-1"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={saveToDatabase} disabled={saving || questions.length === 0} className="w-full mt-4">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving to Database...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save {questions.length} Questions to Question Bank
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
