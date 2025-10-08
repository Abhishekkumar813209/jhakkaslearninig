import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExamTypeStep } from "./wizard-steps/ExamTypeStep";
import { SubjectSelectionStep } from "./wizard-steps/SubjectSelectionStep";
import { ChapterSelectionStep } from "./wizard-steps/ChapterSelectionStep";
import { IntensitySelectionStep } from "./wizard-steps/IntensitySelectionStep";
import { RoadmapPreviewStep } from "./wizard-steps/RoadmapPreviewStep";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

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
  suggested_days?: number;
  isSelected: boolean;
  isCustom?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  importance_score?: number;
  exam_relevance?: 'core' | 'important' | 'optional';
  can_skip?: boolean;
}

export interface ChaptersBySubject {
  [subjectName: string]: Chapter[];
}

interface Batch {
  id: string;
  name: string;
  level: string;
  exam_type: string;
  exam_name: string;
  start_date: string;
  end_date: string | null;
}

interface CreateRoadmapWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onSwitchToManual?: (prefillData: any) => void;
  initialDomain?: string;
  initialBoard?: string;
  initialClass?: string;
}

export const CreateRoadmapWizard = ({ open, onOpenChange, onSuccess, onSwitchToManual, initialDomain, initialBoard, initialClass }: CreateRoadmapWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 6; // Batch, Subject, Time Budget, Chapters, Intensity, Preview

  // Batch selection state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  // State derived from batch selection
  const [examType, setExamType] = useState<string>("");
  const [examName, setExamName] = useState("");
  const [conditionalClass, setConditionalClass] = useState("");
  const [conditionalBoard, setConditionalBoard] = useState("");
  const [batchId, setBatchId] = useState("");
  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [roadmapType, setRoadmapType] = useState<'single_year' | 'combined'>('single_year');
  const [roadmapMode, setRoadmapMode] = useState<'sequential' | 'parallel'>('parallel');

  // Step 2: Subjects
  const [fetchedSubjects, setFetchedSubjects] = useState<Subject[]>([]);
  const [isFetchingSubjects, setIsFetchingSubjects] = useState(false);

  // Step 3: Chapters
  const [fetchedChapters, setFetchedChapters] = useState<ChaptersBySubject>({});
  const [isFetchingChapters, setIsFetchingChapters] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  
  // Step 3: Time Budget
  const [timeBudget, setTimeBudget] = useState<Record<string, number>>({});
  
  // Step 5: Intensity Selection
  const [intensity, setIntensity] = useState<'full' | 'important' | 'balanced'>('balanced');
  
  // Step 6: Preview state
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Timeline will be set manually - no auto-calculation

  const progress = (currentStep / totalSteps) * 100;

  const handleFetchSubjects = async () => {
    if (!selectedBatch) {
      toast.error("Please select a batch first");
      return;
    }
    
    if (!examName) {
      toast.error("Batch doesn't have exam name set");
      return;
    }

    setIsFetchingSubjects(true);
    try {
      // NEW: First try to get from exam_templates
      const { data: template } = await supabase
        .from('exam_templates')
        .select('standard_subjects')
        .eq('exam_name', examName)
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
        toast.success(`Loaded ${subjects.length} subjects for ${examName}`);
        setIsFetchingSubjects(false);
        return;
      }
      
      // Fallback: Call edge function if no template
      const { data, error } = await supabase.functions.invoke('fetch-exam-subjects', {
        body: {
          exam_type: examType,
          exam_name: examName,
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
      // Prepare selected data with importance metadata
      const selected_subjects = selectedSubjects.map(subject => {
        const subjectChapters = fetchedChapters[subject.name] || [];
        const selected_chapters = subjectChapters
          .filter(c => c.isSelected)
          .map(c => ({
            chapter_id: c.id,
            chapter_name: c.chapter_name,
            suggested_days: c.suggested_days,
            importance_score: c.importance_score,
            exam_relevance: c.exam_relevance,
            can_skip: c.can_skip,
            difficulty: c.difficulty
          }));

        return {
          subject: subject.name,
          selected_chapters
        };
      }).filter(s => s.selected_chapters.length > 0);

      // Validation
      console.log('🔍 CreateRoadmapWizard: Generating roadmap with:', {
        examType,
        examName,
        batchId,
        selectedBatch
      });
      
      if (!examType || !examName) {
        toast.error('Please select exam type and exam name');
        return;
      }

      const { data, error } = await supabase.functions.invoke('ai-roadmap-generator', {
        body: {
          batch_id: batchId,
          exam_type: examType,
          exam_name: examName,
          conditional_class: conditionalClass,
          conditional_board: examType?.toLowerCase() === 'school' ? conditionalBoard : undefined,
          roadmap_type: (examType === 'engineering' || examType === 'medical-ug' || examType === 'medical-pg') ? roadmapType : undefined,
          selected_subjects,
          title: roadmapTitle,
          mode: roadmapMode,
          time_budget: timeBudget,
          intensity: intensity // Pass intensity mode
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
        description: "Chapters organized. Now set the timeline manually in calendar view.",
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
            estimatedDays: ch.suggested_days || 3, // Preserve AI-suggested days
            isEditing: false
          }))
      }));

    const prefillData = {
      batchId,
      examType,
      examName,
      roadmapTitle,
      subjects
    };

    onSwitchToManual(prefillData);
    onOpenChange(false);
    handleReset();
  };

  const handleReset = () => {
    setCurrentStep(0);
    setSelectedBatch(null);
    setExamType("");
    setExamName("");
    setConditionalClass("");
    setConditionalBoard("");
    setBatchId("");
    setRoadmapTitle("");
    setRoadmapType('single_year');
    setFetchedSubjects([]);
    setFetchedChapters({});
    setUploadedPdf(null);
    setTimeBudget({});
  };

  // Fetch batches when wizard opens
  useEffect(() => {
    if (initialDomain && open) {
      fetchBatches(initialDomain);
    }
  }, [initialDomain, open]);
  
  // Pre-fill board/class when wizard opens
  useEffect(() => {
    if (open && initialDomain) {
      setExamType(initialDomain);
      if (initialBoard) setConditionalBoard(initialBoard);
      if (initialClass) setConditionalClass(initialClass);
    }
  }, [open, initialDomain, initialBoard, initialClass]);

  // Auto-set exam info from selected batch
  useEffect(() => {
    if (selectedBatch) {
      setExamType(selectedBatch.exam_type);
      setExamName(selectedBatch.exam_name);
      // Auto-set roadmap title from batch name
      if (!roadmapTitle) {
        setRoadmapTitle(`${selectedBatch.name} - Roadmap`);
      }
    }
  }, [selectedBatch]);

  // Auto-fetch subjects when moving to Step 1
  useEffect(() => {
    if (currentStep === 1 && selectedBatch && fetchedSubjects.length === 0 && !isFetchingSubjects) {
      handleFetchSubjects();
    }
  }, [currentStep, selectedBatch]);

  const fetchBatches = async (domain: string) => {
    setLoadingBatches(true);
    try {
      let query = supabase
        .from('batches')
        .select('id, name, level, exam_type, exam_name, start_date, end_date')
        .eq('exam_type', domain)
        .eq('is_active', true);
      
      // For school domain, filter by board and class
      if (domain === 'school') {
        // Only fetch batches with valid board and class
        query = query.not('target_board', 'is', null);
        query = query.not('target_class', 'is', null);
        
        // Apply user's selected filters
        if (initialBoard) query = query.eq('target_board', initialBoard as any);
        if (initialClass) query = query.eq('target_class', initialClass as any);
      }
      
      const { data, error } = await query.order('start_date', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch batches");
    } finally {
      setLoadingBatches(false);
    }
  };

  // Compute budget-aware suggested days when chapters or time budget changes
  useEffect(() => {
    if (Object.keys(fetchedChapters).length === 0 || Object.keys(timeBudget).length === 0) return;

    const updatedChapters: ChaptersBySubject = {};
    
    Object.entries(fetchedChapters).forEach(([subjectName, chapterList]) => {
      const budget = timeBudget[subjectName];
      if (!budget || chapterList.length === 0) {
        updatedChapters[subjectName] = chapterList;
        return;
      }

      const selectedChapters = chapterList.filter(c => c.isSelected);
      if (selectedChapters.length === 0) {
        updatedChapters[subjectName] = chapterList;
        return;
      }

      // Calculate dynamic minimum based on budget
      const avgDaysPerChapter = budget / selectedChapters.length;
      const minDays = Math.max(1, Math.floor(avgDaysPerChapter * 0.5)); // Half of average, minimum 1

      // Calculate difficulty weights
      const difficultyWeights: Record<string, number> = {
        hard: 1.3,
        medium: 1.0,
        easy: 0.7
      };

      const totalWeight = selectedChapters.reduce((sum, ch) => {
        const weight = difficultyWeights[ch.difficulty || 'medium'];
        return sum + weight;
      }, 0);

      // Distribute days proportionally
      const computedChapters = chapterList.map(chapter => {
        if (!chapter.isSelected) return chapter;
        
        const weight = difficultyWeights[chapter.difficulty || 'medium'];
        const proportionalDays = Math.round((weight / totalWeight) * budget);
        
        return {
          ...chapter,
          suggested_days: Math.max(minDays, proportionalDays) // Dynamic minimum
        };
      });

      // Normalize to exact budget
      const totalAssigned = computedChapters
        .filter(c => c.isSelected)
        .reduce((sum, c) => sum + (c.suggested_days || 0), 0);
      
      const diff = budget - totalAssigned;
      
      if (diff !== 0 && selectedChapters.length > 0) {
        const adjustmentPerChapter = Math.floor(diff / selectedChapters.length);
        const remainder = diff % selectedChapters.length;
        
        let adjustedCount = 0;
        updatedChapters[subjectName] = computedChapters.map(ch => {
          if (!ch.isSelected) return ch;
          
          const baseAdjustment = adjustmentPerChapter;
          const extraAdjustment = adjustedCount < Math.abs(remainder) ? Math.sign(diff) : 0;
          adjustedCount++;
          
          return {
            ...ch,
            suggested_days: Math.max(minDays, (ch.suggested_days || 0) + baseAdjustment + extraAdjustment)
          };
        });
      } else {
        updatedChapters[subjectName] = computedChapters;
      }
    });

    setFetchedChapters(updatedChapters);
  }, [timeBudget, JSON.stringify(Object.keys(fetchedChapters)), JSON.stringify(Object.values(fetchedChapters).map(chs => chs.map(c => `${c.id}-${c.isSelected}`).join(',')))]);

  const handleNext = () => {
    if (currentStep === 0) {
      // Validate Step 0: Batch Selection
      if (!selectedBatch) {
        toast.error("Please select a batch for this roadmap");
        return;
      }
      setBatchId(selectedBatch.id);
    }

    if (currentStep === 1) {
      // Validate Step 1: Subject Selection
      const selectedSubjects = fetchedSubjects.filter(s => s.isSelected);
      if (selectedSubjects.length === 0) {
        toast.error("Please select at least one subject");
        return;
      }
    }

    if (currentStep === 2) {
      // Validate Step 2: Time Budget
      const selectedSubjectNames = fetchedSubjects.filter(s => s.isSelected).map(s => s.name);
      const hasMissingBudget = selectedSubjectNames.some(name => !timeBudget[name] || timeBudget[name] <= 0);
      if (hasMissingBudget) {
        toast.error("Please set time budget for all selected subjects");
        return;
      }
    }

    if (currentStep === 3) {
      // Validate Step 3: Chapter Selection
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
          {/* Step 0: Batch Selection */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Select Batch</h3>
                <p className="text-sm text-muted-foreground">
                  Choose the batch for which you want to create this roadmap
                </p>
              </div>

              {loadingBatches ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center p-8 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">No active batches found for this exam domain</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {batches.map((batch) => (
                    <div
                      key={batch.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedBatch?.id === batch.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedBatch(batch)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{batch.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {batch.exam_name} • {batch.level}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Start: {new Date(batch.start_date).toLocaleDateString()}
                          </p>
                        </div>
                        {selectedBatch?.id === batch.id && (
                          <div className="ml-2">
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Subject Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {selectedBatch && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-semibold">Selected Batch Info</h4>
                  <p className="text-sm"><strong>Batch:</strong> {selectedBatch.name}</p>
                  <p className="text-sm"><strong>Exam:</strong> {selectedBatch.exam_name}</p>
                  <p className="text-sm"><strong>Level:</strong> {selectedBatch.level}</p>
                </div>
              )}
              
              <SubjectSelectionStep
                subjects={fetchedSubjects}
                isFetching={isFetchingSubjects}
                onFetch={handleFetchSubjects}
                onToggle={handleToggleSubject}
                onAdd={handleAddCustomSubject}
                onDelete={handleDeleteSubject}
              />
            </div>
          )}

          {/* Step 2: Time Budget */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Set Time Budget per Subject</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Assign how many days you want to allocate for each subject. AI will intelligently distribute these days across chapters.
                </p>
              </div>

              {fetchedSubjects.filter(s => s.isSelected).map(subject => (
                <div key={subject.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Label className="flex-1 font-medium">{subject.name}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Days"
                      value={timeBudget[subject.name] || ''}
                      onChange={(e) => setTimeBudget({
                        ...timeBudget,
                        [subject.name]: parseInt(e.target.value) || 0
                      })}
                      className="w-24 px-3 py-2 border rounded-md"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
              ))}

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Total Roadmap Duration: {roadmapMode === 'parallel' 
                    ? Math.max(...Object.values(timeBudget), 0)
                    : Object.values(timeBudget).reduce((sum, days) => sum + days, 0)} days
                  <span className="text-muted-foreground ml-2">
                    ({roadmapMode === 'parallel' ? 'longest subject duration' : 'cumulative duration'})
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Chapter Selection */}
          {currentStep === 3 && (
            <ChapterSelectionStep
              subjects={fetchedSubjects.filter(s => s.isSelected)}
              chapters={fetchedChapters}
              isFetching={isFetchingChapters}
              timeBudget={timeBudget}
              onFetchChapters={handleFetchChaptersForSubject}
              onToggleChapter={handleToggleChapter}
              onAddChapter={handleAddCustomChapter}
              onDeleteChapter={handleDeleteChapter}
              onUpdateDays={handleUpdateChapterDays}
              onUploadPdf={handleUploadPdf}
              uploadedPdf={uploadedPdf}
            />
          )}

          {/* Step 4: Intensity Selection */}
          {currentStep === 4 && (
            <IntensitySelectionStep
              intensity={intensity}
              onIntensityChange={setIntensity}
              totalBudget={Object.values(timeBudget).reduce((sum, val) => sum + val, 0)}
              totalChapters={Object.values(fetchedChapters).flat().filter(c => c.isSelected).length}
              coreChapters={Object.values(fetchedChapters).flat().filter(c => c.isSelected && c.exam_relevance === 'core').length}
              importantChapters={Object.values(fetchedChapters).flat().filter(c => c.isSelected && c.exam_relevance === 'important').length}
            />
          )}

          {/* Step 5: Preview */}
          {currentStep === 5 && (
            <RoadmapPreviewStep
              chapters={fetchedChapters}
              timeBudget={timeBudget}
              intensity={intensity}
              onRegenerate={() => {
                // Could trigger a re-calculation or AI call here
                toast.info("Regeneration functionality coming soon");
              }}
              isRegenerating={isRegenerating}
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

            {currentStep < 5 ? (
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
