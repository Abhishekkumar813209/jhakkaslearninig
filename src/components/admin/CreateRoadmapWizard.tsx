import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExamTypeStep } from "./wizard-steps/ExamTypeStep";
import { SubjectSelectionStep } from "./wizard-steps/SubjectSelectionStep";
import { ChapterSelectionStep } from "./wizard-steps/ChapterSelectionStep";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CreateRoadmapWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export interface Subject {
  id: string;
  name: string;
  isSelected: boolean;
  isCustom: boolean;
}

export interface Chapter {
  id: string;
  chapter_name: string;
  suggested_days: number;
  isSelected: boolean;
  isCustom: boolean;
}

export interface ChaptersBySubject {
  [subjectName: string]: Chapter[];
}

interface CreateRoadmapWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onSwitchToManual?: (prefillData: any) => void;
}

export const CreateRoadmapWizard = ({ open, onOpenChange, onSuccess, onSwitchToManual }: CreateRoadmapWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;

  // Step 1: Exam Type
  const [examType, setExamType] = useState<'School' | 'Engineering' | 'Medical-UG' | 'Medical-PG' | 'SSC' | 'Banking' | 'UPSC' | 'Railway' | 'Defence' | 'Custom'>('School');
  const [examName, setExamName] = useState("");
  const [conditionalClass, setConditionalClass] = useState("");
  const [conditionalBoard, setConditionalBoard] = useState("");
  const [batchId, setBatchId] = useState("");
  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [totalDays, setTotalDays] = useState(30);
  const [roadmapType, setRoadmapType] = useState<'single_year' | 'combined'>('single_year');
  const [roadmapMode, setRoadmapMode] = useState<'sequential' | 'parallel'>('parallel');

  // Step 2: Subjects
  const [fetchedSubjects, setFetchedSubjects] = useState<Subject[]>([]);
  const [isFetchingSubjects, setIsFetchingSubjects] = useState(false);

  // Step 3: Chapters
  const [fetchedChapters, setFetchedChapters] = useState<ChaptersBySubject>({});
  const [isFetchingChapters, setIsFetchingChapters] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);


  // Auto-adjust totalDays based on roadmap type for Engineering/Medical
  useEffect(() => {
    if ((examType === 'Engineering' || examType === 'Medical-UG' || examType === 'Medical-PG') && conditionalClass) {
      const calculateRemainingDays = (): number => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        
        let endDate: Date;
        if (currentMonth < 3) {
          endDate = new Date(currentYear, 2, 31);
        } else {
          endDate = new Date(currentYear + 1, 2, 31);
        }
        
        const diffTime = endDate.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 180;
      };
      
      const remainingDays = calculateRemainingDays();
      
      if (conditionalClass === '11') {
        if (roadmapType === 'single_year') {
          setTotalDays(remainingDays);
        } else if (roadmapType === 'combined') {
          setTotalDays(remainingDays + 365);
        }
      } else if (conditionalClass === '12') {
        setTotalDays(remainingDays);
      } else if (conditionalClass === 'dropper') {
        setTotalDays(365);
      }
    }
  }, [examType, conditionalClass, roadmapType]);

  const progress = (currentStep / totalSteps) * 100;

  // Derive exam name from exam type
  const getDerivedExamName = (): string => {
    if (examType === 'School') {
      return `${conditionalBoard} Class ${conditionalClass}`;
    } else if (examType === 'Engineering') {
      return 'IIT JEE';
    } else if (examType === 'Medical-UG') {
      return 'NEET UG';
    } else if (examType === 'Medical-PG') {
      return 'NEET PG';
    }
    return examName;
  };

  const handleFetchSubjects = async () => {
    const derivedExamName = getDerivedExamName();
    
    if (!derivedExamName) {
      toast.error("Please enter exam name");
      return;
    }
    if (examType === 'School' && (!conditionalClass || !conditionalBoard)) {
      toast.error("Please select class and board");
      return;
    }

    setIsFetchingSubjects(true);
    try {
      // NEW: First try to get from exam_templates
      const { data: template } = await supabase
        .from('exam_templates')
        .select('standard_subjects')
        .eq('exam_name', derivedExamName)
        .eq('exam_type', examType)
        .eq('is_active', true)
        .single();
      
      if (template?.standard_subjects) {
        // Use template subjects
        const subjects: Subject[] = (template.standard_subjects as string[]).map((s: string) => ({
          id: crypto.randomUUID(),
          name: s,
          isSelected: true,
          isCustom: false
        }));
        setFetchedSubjects(subjects);
        toast.success(`Loaded ${subjects.length} subjects for ${derivedExamName}`);
        setIsFetchingSubjects(false);
        return;
      }
      
      // Fallback: Call edge function if no template
      const { data, error } = await supabase.functions.invoke('fetch-exam-subjects', {
        body: {
          exam_type: examType,
          exam_name: derivedExamName,
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const subjects: Subject[] = (data.subjects || []).map((s: any) => ({
        id: crypto.randomUUID(),
        name: typeof s === 'string' ? s : s.name,
        isSelected: true, // Auto-select all
        isCustom: false
      }));

      setFetchedSubjects(subjects);
      toast.success(`Fetched ${subjects.length} subjects`);
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to fetch subjects. You can add them manually.');
    } finally {
      setIsFetchingSubjects(false);
    }
  };

  const handleAddCustomSubject = (name: string) => {
    if (!name.trim()) return;
    
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name: name.trim(),
      isSelected: true,
      isCustom: true
    };
    
    setFetchedSubjects([...fetchedSubjects, newSubject]);
  };

  const handleToggleSubject = (id: string) => {
    setFetchedSubjects(prev => prev.map(s => 
      s.id === id ? { ...s, isSelected: !s.isSelected } : s
    ));
  };

  const handleDeleteSubject = (id: string) => {
    setFetchedSubjects(prev => prev.filter(s => s.id !== id));
    // Also remove chapters for this subject
    const subjectName = fetchedSubjects.find(s => s.id === id)?.name;
    if (subjectName) {
      setFetchedChapters(prev => {
        const updated = { ...prev };
        delete updated[subjectName];
        return updated;
      });
    }
  };

  const handleFetchChaptersForSubject = async (subjectName: string, fetchMode: 'initial' | 'remaining' = 'initial') => {
    setIsFetchingChapters(true);
    try {
      const alreadyFetched = fetchMode === 'remaining'
        ? (fetchedChapters[subjectName] || []).map(ch => ch.chapter_name)
        : [];

      const { data, error } = await supabase.functions.invoke('fetch-subject-chapters', {
        body: {
          exam_type: examType,
          subject: subjectName,
          student_class: examType === 'School' ? conditionalClass : undefined,
          board: examType === 'School' ? conditionalBoard : undefined,
          fetch_mode: fetchMode,
          already_fetched: alreadyFetched,
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const chapters: Chapter[] = (data.chapters || []).map((c: any) => ({
        id: crypto.randomUUID(),
        chapter_name: typeof c === 'string' ? c : c.chapter_name || c.name,
        suggested_days: typeof c === 'object' ? c.suggested_days || 3 : 3,
        isSelected: true, // Auto-select all
        isCustom: false
      }));

      setFetchedChapters(prev => ({
        ...prev,
        [subjectName]: fetchMode === 'remaining'
          ? [...(prev[subjectName] || []), ...chapters]
          : chapters
      }));

      const mode = fetchMode === 'remaining' ? 'remaining' : 'initial';
      toast.success(`Fetched ${chapters.length} ${mode} chapters for ${subjectName}`);
    } catch (error: any) {
      console.error('Error fetching chapters:', error);
      toast.error(`Failed to fetch chapters for ${subjectName}`);
    } finally {
      setIsFetchingChapters(false);
    }
  };

  const handleUploadPdf = async (file: File) => {
    setUploadedPdf(file);
    toast.loading("Extracting syllabus from PDF...");
    
    try {
      const formData = new FormData();
      formData.append('pdf_file', file);
      formData.append('exam_type', examType);

      const { data, error } = await supabase.functions.invoke('extract-syllabus-structure', {
        body: formData
      });

      if (error) throw error;

      if (data?.error) {
        toast.dismiss();
        toast.error(data.error);
        return;
      }

      // Merge extracted data
      if (data.subjects && data.subjects.length > 0) {
        const extractedSubjects: Subject[] = data.subjects.map((s: any) => ({
          id: crypto.randomUUID(),
          name: s.subject_name || s.name,
          isSelected: true,
          isCustom: false
        }));

        setFetchedSubjects(prev => {
          const existing = prev.map(s => s.name.toLowerCase());
          const newSubjects = extractedSubjects.filter(s => !existing.includes(s.name.toLowerCase()));
          return [...prev, ...newSubjects];
        });

        // Also add chapters
        const chaptersData: ChaptersBySubject = {};
        data.subjects.forEach((s: any) => {
          if (s.chapters && s.chapters.length > 0) {
            chaptersData[s.subject_name || s.name] = s.chapters.map((c: any) => ({
              id: crypto.randomUUID(),
              chapter_name: c.chapter_name || c.name,
              suggested_days: c.suggested_days || 3,
              isSelected: true,
              isCustom: false
            }));
          }
        });

        setFetchedChapters(prev => ({ ...prev, ...chaptersData }));
      }

      toast.dismiss();
      toast.success("PDF processed successfully!");
    } catch (error: any) {
      toast.dismiss();
      console.error('Error processing PDF:', error);
      toast.error("Failed to extract from PDF");
    }
  };

  const handleAddCustomChapter = (subjectName: string, chapterName: string, suggestedDays: number) => {
    if (!chapterName.trim()) return;

    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      chapter_name: chapterName.trim(),
      suggested_days: suggestedDays,
      isSelected: true,
      isCustom: true
    };

    setFetchedChapters(prev => ({
      ...prev,
      [subjectName]: [...(prev[subjectName] || []), newChapter]
    }));
  };

  const handleToggleChapter = (subjectName: string, chapterId: string) => {
    setFetchedChapters(prev => ({
      ...prev,
      [subjectName]: prev[subjectName].map(c =>
        c.id === chapterId ? { ...c, isSelected: !c.isSelected } : c
      )
    }));
  };

  const handleUpdateChapterDays = (subjectName: string, chapterId: string, days: number) => {
    setFetchedChapters(prev => ({
      ...prev,
      [subjectName]: prev[subjectName].map(c =>
        c.id === chapterId ? { ...c, suggested_days: days } : c
      )
    }));
  };

  const handleDeleteChapter = (subjectName: string, chapterId: string) => {
    setFetchedChapters(prev => ({
      ...prev,
      [subjectName]: prev[subjectName].filter(c => c.id !== chapterId)
    }));
  };

  const handleGenerateRoadmap = async () => {
    // Validate
    const selectedSubjects = fetchedSubjects.filter(s => s.isSelected);
    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    const selectedChaptersCount = Object.values(fetchedChapters)
      .flat()
      .filter(c => c.isSelected).length;

    if (selectedChaptersCount === 0) {
      toast.error("Please select at least one chapter");
      return;
    }

    if (!batchId || !roadmapTitle) {
      toast.error("Please fill all required fields");
      return;
    }

    // Show informative loading message
    const loadingToastId = toast.loading(
      "AI is generating your personalized roadmap...",
      {
        description: "This may take 60-90 seconds. Please wait...",
        duration: 120000, // 2 minutes timeout
      }
    );

    try {
      // Prepare selected data
      const selected_subjects = selectedSubjects.map(subject => {
        const subjectChapters = fetchedChapters[subject.name] || [];
        const selected_chapters = subjectChapters
          .filter(c => c.isSelected)
          .map(c => ({
            chapter_id: c.id,
            chapter_name: c.chapter_name,
            suggested_days: c.suggested_days
          }));

        return {
          subject: subject.name,
          selected_chapters
        };
      }).filter(s => s.selected_chapters.length > 0);

      const { data, error } = await supabase.functions.invoke('ai-roadmap-generator', {
        body: {
          batch_id: batchId,
          exam_type: examType,
          exam_name: getDerivedExamName(),
          conditional_class: conditionalClass,
          conditional_board: examType === 'School' ? conditionalBoard : undefined,
          roadmap_type: (examType === 'Engineering' || examType === 'Medical-UG' || examType === 'Medical-PG') ? roadmapType : undefined,
          selected_subjects,
          total_days: totalDays,
          title: roadmapTitle,
          mode: roadmapMode
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.dismiss(loadingToastId);
        if (data.error.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (data.error.includes('Payment required')) {
          toast.error('Payment required. Please add credits to your workspace.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.dismiss(loadingToastId);
      toast.success("Roadmap generated successfully!", {
        description: `Created ${totalDays}-day roadmap with 65-25-10 revision strategy`,
      });
      handleReset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.dismiss(loadingToastId);
      console.error('Error generating roadmap:', error);
      
      if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
        toast.error("Generation timed out", {
          description: "The roadmap is still being created. Please refresh in a minute.",
        });
      } else {
        toast.error("Failed to generate roadmap", {
          description: error.message || "Please try again with fewer subjects or chapters",
        });
      }
    }
  };

  const handleSwitchToManual = () => {
    if (!onSwitchToManual) return;

    // Transform fetchedChapters to manual builder format
    const subjects = fetchedSubjects
      .filter(s => s.isSelected)
      .map((subject, idx) => ({
        id: `${idx + 1}`,
        name: subject.name,
        isEditingName: false,
        chapters: (fetchedChapters[subject.name] || [])
          .filter(ch => ch.isSelected)
          .map((ch, chIdx) => ({
            id: `${idx + 1}-${chIdx + 1}`,
            name: ch.chapter_name,
            estimatedDays: ch.suggested_days || 3,
            isEditing: false
          }))
      }));

    const prefillData = {
      batchId,
      examType,
      examName: getDerivedExamName(),
      roadmapTitle,
      totalDays,
      subjects
    };

    onSwitchToManual(prefillData);
    onOpenChange(false);
    handleReset();
  };

  const handleReset = () => {
    setCurrentStep(0);
    setExamType('School');
    setExamName("");
    setConditionalClass("");
    setConditionalBoard("");
    setBatchId("");
    setRoadmapTitle("");
    setTotalDays(30);
    setRoadmapType('single_year');
    setFetchedSubjects([]);
    setFetchedChapters({});
    setUploadedPdf(null);
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!totalDays || totalDays < 7) {
        toast.error("Please enter at least 7 days for the roadmap");
        return;
      }
    }

    if (currentStep === 1) {
      // Validate Step 1
      if (examType === 'School' && (!conditionalClass || !conditionalBoard)) {
        toast.error("Please select class and board");
        return;
      }
      if ((examType === 'Engineering' || examType === 'Medical-UG' || examType === 'Medical-PG') && !conditionalClass) {
        toast.error("Please select student category");
        return;
      }
      if ((examType === 'Engineering' || examType === 'Medical-UG' || examType === 'Medical-PG') && conditionalClass === '11' && !roadmapType) {
        toast.error("Please select roadmap duration");
        return;
      }
      if (examType !== 'School' && examType !== 'Engineering' && examType !== 'Medical-UG' && examType !== 'Medical-PG' && !examName.trim()) {
        toast.error("Please enter exam name");
        return;
      }
      if (!batchId || !roadmapTitle) {
        toast.error("Please fill all required fields");
        return;
      }
    }

    if (currentStep === 2) {
      const selectedSubjects = fetchedSubjects.filter(s => s.isSelected);
      if (selectedSubjects.length === 0) {
        toast.error("Please select at least one subject");
        return;
      }
    }

    if (currentStep === 3) {
      const selectedChaptersCount = Object.values(fetchedChapters)
        .flat()
        .filter(c => c.isSelected).length;

      if (selectedChaptersCount === 0) {
        toast.error("Please select at least one chapter");
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleReset();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create AI Roadmap - Step {currentStep}/{totalSteps}</DialogTitle>
          <Progress value={progress} className="mt-2" />
        </DialogHeader>

        <div className="space-y-6 py-4">
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/30">
                <Label className="text-lg font-semibold">📅 Roadmap Duration</Label>
                <p className="text-sm text-muted-foreground mt-2">
                  How many days should this roadmap cover? This affects chapter distribution.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="totalDays">Total Days</Label>
                <input
                  id="totalDays"
                  type="number"
                  min={7}
                  max={730}
                  value={totalDays}
                  onChange={(e) => setTotalDays(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter total days (e.g., 30, 90, 180)"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum: 7 days | Maximum: 730 days (2 years)
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setTotalDays(30)}
                  className={totalDays === 30 ? "border-primary" : ""}
                >
                  30 Days
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTotalDays(90)}
                  className={totalDays === 90 ? "border-primary" : ""}
                >
                  90 Days
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTotalDays(180)}
                  className={totalDays === 180 ? "border-primary" : ""}
                >
                  180 Days
                </Button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <>
              <div className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/30">
                <Label className="text-base font-semibold">Roadmap Mode</Label>
                <RadioGroup value={roadmapMode} onValueChange={(v) => setRoadmapMode(v as 'sequential' | 'parallel')}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="sequential" id="sequential" />
                    <Label htmlFor="sequential" className="cursor-pointer flex-1">
                      <div className="font-medium">📚 Sequential Mode</div>
                      <div className="text-sm text-muted-foreground">One subject at a time - Deep focus approach</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="parallel" id="parallel" />
                    <Label htmlFor="parallel" className="cursor-pointer flex-1">
                      <div className="font-medium">⚡ Parallel Mode (Independent)</div>
                      <div className="text-sm text-muted-foreground">All subjects run independently from Day 1</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <ExamTypeStep
                examType={examType}
                setExamType={setExamType}
                examName={examName}
                setExamName={setExamName}
                conditionalClass={conditionalClass}
                setConditionalClass={setConditionalClass}
                conditionalBoard={conditionalBoard}
                setConditionalBoard={setConditionalBoard}
                batchId={batchId}
                setBatchId={setBatchId}
                roadmapTitle={roadmapTitle}
                setRoadmapTitle={setRoadmapTitle}
                totalDays={totalDays}
                setTotalDays={setTotalDays}
                roadmapType={roadmapType}
                setRoadmapType={setRoadmapType}
              />
            </>
          )}

          {currentStep === 2 && (
            <SubjectSelectionStep
              subjects={fetchedSubjects}
              isFetching={isFetchingSubjects}
              onFetch={handleFetchSubjects}
              onToggle={handleToggleSubject}
              onAdd={handleAddCustomSubject}
              onDelete={handleDeleteSubject}
            />
          )}

          {currentStep === 3 && (
            <ChapterSelectionStep
              subjects={fetchedSubjects.filter(s => s.isSelected)}
              chapters={fetchedChapters}
              isFetching={isFetchingChapters}
              onFetchChapters={handleFetchChaptersForSubject}
              onToggleChapter={handleToggleChapter}
              onAddChapter={handleAddCustomChapter}
              onDeleteChapter={handleDeleteChapter}
              onUpdateDays={handleUpdateChapterDays}
              onUploadPdf={handleUploadPdf}
              uploadedPdf={uploadedPdf}
            />
          )}

        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                handleReset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <>
                {onSwitchToManual && (
                  <Button 
                    variant="outline" 
                    onClick={handleSwitchToManual}
                  >
                    Switch to Manual Builder
                  </Button>
                )}
                <Button onClick={handleGenerateRoadmap}>
                  Generate AI Roadmap
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
