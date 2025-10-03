import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExamTypeStep } from "./wizard-steps/ExamTypeStep";
import { SubjectSelectionStep } from "./wizard-steps/SubjectSelectionStep";
import { ChapterSelectionStep } from "./wizard-steps/ChapterSelectionStep";
import { StudyConfigurationStep } from "./wizard-steps/StudyConfigurationStep";
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

export const CreateRoadmapWizard = ({ open, onOpenChange, onSuccess }: CreateRoadmapWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Exam Type
  const [examType, setExamType] = useState<'School' | 'SSC' | 'Banking' | 'UPSC' | 'Railway' | 'Defence' | 'Custom'>('School');
  const [examName, setExamName] = useState("");
  const [conditionalClass, setConditionalClass] = useState("");
  const [conditionalBoard, setConditionalBoard] = useState("");
  const [batchId, setBatchId] = useState("");
  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [totalDays, setTotalDays] = useState(30);

  // Step 2: Subjects
  const [fetchedSubjects, setFetchedSubjects] = useState<Subject[]>([]);
  const [isFetchingSubjects, setIsFetchingSubjects] = useState(false);

  // Step 3: Chapters
  const [fetchedChapters, setFetchedChapters] = useState<ChaptersBySubject>({});
  const [isFetchingChapters, setIsFetchingChapters] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);

  // Step 4: Study Configuration
  const [chaptersPerDay, setChaptersPerDay] = useState(3);
  const [studyDays, setStudyDays] = useState([1, 2, 3, 4, 5, 6]); // Mon-Sat by default
  const [parallelStudy, setParallelStudy] = useState(false);
  const [weeklyDistribution, setWeeklyDistribution] = useState<{ [subject: string]: number }>({});

  const progress = (currentStep / totalSteps) * 100;

  const handleFetchSubjects = async () => {
    if (!examName && examType !== 'School') {
      toast.error("Please enter exam name");
      return;
    }
    if (examType === 'School' && (!conditionalClass || !conditionalBoard)) {
      toast.error("Please select class and board");
      return;
    }

    setIsFetchingSubjects(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-exam-subjects', {
        body: {
          exam_type: examType,
          exam_name: examType === 'School' ? `${conditionalBoard} Class ${conditionalClass}` : examName,
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

  const handleFetchChaptersForSubject = async (subjectName: string) => {
    setIsFetchingChapters(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-subject-chapters', {
        body: {
          exam_type: examType,
          subject: subjectName,
          student_class: examType === 'School' ? conditionalClass : undefined,
          board: examType === 'School' ? conditionalBoard : undefined,
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
        [subjectName]: chapters
      }));

      toast.success(`Fetched ${chapters.length} chapters for ${subjectName}`);
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

    toast.loading("AI is generating your roadmap...");

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
          exam_name: examType === 'School' ? `${conditionalBoard} Class ${conditionalClass}` : examName,
          conditional_class: examType === 'School' ? conditionalClass : undefined,
          conditional_board: examType === 'School' ? conditionalBoard : undefined,
          selected_subjects,
          total_days: totalDays,
          title: roadmapTitle,
          study_config: {
            chapters_per_day: chaptersPerDay,
            study_days_per_week: studyDays,
            parallel_study_enabled: parallelStudy,
            weekly_subject_distribution: weeklyDistribution
          }
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.dismiss();
        if (data.error.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (data.error.includes('Payment required')) {
          toast.error('Payment required. Please add credits to your workspace.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.dismiss();
      toast.success("Roadmap generated successfully!");
      handleReset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.dismiss();
      console.error('Error generating roadmap:', error);
      toast.error("Failed to generate roadmap");
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setExamType('School');
    setExamName("");
    setConditionalClass("");
    setConditionalBoard("");
    setBatchId("");
    setRoadmapTitle("");
    setTotalDays(30);
    setFetchedSubjects([]);
    setFetchedChapters({});
    setUploadedPdf(null);
    setChaptersPerDay(3);
    setStudyDays([1, 2, 3, 4, 5, 6]);
    setParallelStudy(false);
    setWeeklyDistribution({});
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate Step 1
      if (examType === 'School' && (!conditionalClass || !conditionalBoard)) {
        toast.error("Please select class and board");
        return;
      }
      if (examType !== 'School' && !examName) {
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
    setCurrentStep(prev => Math.max(prev - 1, 1));
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
          {currentStep === 1 && (
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
            />
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

          {currentStep === 4 && (
            <StudyConfigurationStep
              chaptersPerDay={chaptersPerDay}
              setChaptersPerDay={setChaptersPerDay}
              studyDays={studyDays}
              setStudyDays={setStudyDays}
              parallelStudy={parallelStudy}
              setParallelStudy={setParallelStudy}
              weeklyDistribution={weeklyDistribution}
              setWeeklyDistribution={setWeeklyDistribution}
              subjects={fetchedSubjects.filter(s => s.isSelected).map(s => s.name)}
            />
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleGenerateRoadmap}>
              Generate Roadmap
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
