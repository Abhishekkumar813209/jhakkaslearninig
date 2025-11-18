import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExamTypeStep } from "./wizard-steps/ExamTypeStep";
import { SubjectDaysStep } from "./wizard-steps/SubjectDaysStep";
import { ChapterSelectionStep } from "./wizard-steps/ChapterSelectionStep";
import { CentralizedChapterSelectionStep } from "./wizard-steps/CentralizedChapterSelectionStep";
import { IntensitySelectionStep } from "./wizard-steps/IntensitySelectionStep";
import { RoadmapPreviewStep } from "./wizard-steps/RoadmapPreviewStep";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Check, Loader2, AlertCircle, Sparkles, Library } from "lucide-react";

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

export interface Batch {
  id: string;
  name: string;
  level: string;
  exam_type: string;
  exam_name: string;
  start_date?: string;
  end_date?: string | null;
  target_class?: string;
  target_board?: string;
}

interface CreateRoadmapWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onSwitchToManual?: (prefillData: any) => void;
  initialDomain?: string;
  initialBoard?: string;
  initialClass?: string;
  editRoadmapId?: string | null;
}

// localStorage helpers
const WIZARD_STORAGE_KEY = 'roadmap-wizard-progress';
const WIZARD_EXPIRY_HOURS = 24;

const saveWizardProgress = (data: any) => {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to save wizard progress:', error);
  }
};

const loadWizardProgress = () => {
  try {
    const stored = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    const savedTime = new Date(data.timestamp).getTime();
    const hoursDiff = (Date.now() - savedTime) / (1000 * 60 * 60);
    
    if (hoursDiff > WIZARD_EXPIRY_HOURS) {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
      return null;
    }
    
    return data;
  } catch (error) {
    return null;
  }
};

const clearWizardProgress = () => {
  localStorage.removeItem(WIZARD_STORAGE_KEY);
};

export const CreateRoadmapWizard = ({ open, onOpenChange, onSuccess, onSwitchToManual, initialDomain, initialBoard, initialClass, editRoadmapId }: CreateRoadmapWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 5; // ExamType, Subject+Days, Chapters, Intensity, Preview

  // Batch selection state - no longer used for fetching
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  // Manual state for exam type/name - Step 0
  const [examType, setExamType] = useState<string>(initialDomain || "");
  const [examName, setExamName] = useState("");
  const [conditionalClass, setConditionalClass] = useState(initialClass || "");
  const [conditionalBoard, setConditionalBoard] = useState(initialBoard || "");

  // Budget tracking and progress state
  const [generationProgress, setGenerationProgress] = useState<{
    stage: 'idle' | 'generating' | 'validating' | 'retrying' | 'complete' | 'failed';
    attempt: number;
    budgetStatus: { [subject: string]: { allocated: number; generated: number; status: 'pending' | 'match' | 'mismatch' } };
    message: string;
  } | null>(null);
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
  const [useChapterLibrary, setUseChapterLibrary] = useState(true); // Toggle between AI and Library
  
  // Step 1: Days Budget (merged with subjects)
  const [daysBudget, setDaysBudget] = useState<Record<string, number>>({});
  
  // Step 3: Time Budget (kept for backward compatibility)
  const [timeBudget, setTimeBudget] = useState<Record<string, number>>({});
  
  // Step 5: Intensity Selection
  const [intensity, setIntensity] = useState<'full' | 'important' | 'balanced'>('balanced');
  
  // Step 6: Preview state
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Protection state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const [isLoadingExistingRoadmap, setIsLoadingExistingRoadmap] = useState(false);

  // Timeline will be set manually - no auto-calculation

  const progress = (currentStep / totalSteps) * 100;

  // Load existing roadmap for edit mode
  const loadExistingRoadmap = async (roadmapId: string) => {
    setIsLoadingExistingRoadmap(true);
    try {
      // Fetch roadmap metadata
      const { data: roadmap, error: roadmapError } = await supabase
        .from('batch_roadmaps')
        .select('*')
        .eq('id', roadmapId)
        .single();

      if (roadmapError) throw roadmapError;

      // Fetch chapters with topics
      const { data: chapters, error: chaptersError } = await supabase
        .from('roadmap_chapters')
        .select('*, roadmap_topics(*)')
        .eq('roadmap_id', roadmapId)
        .order('order_num', { ascending: true });

      if (chaptersError) throw chaptersError;

      // Populate wizard state
      setExamType(roadmap.exam_type || '');
      setExamName(roadmap.exam_name || '');
      setBatchId(roadmap.batch_id || '');
      setRoadmapTitle(roadmap.title || '');
      setRoadmapMode((roadmap.mode as 'sequential' | 'parallel') || 'parallel');
      
      if (roadmap.exam_type === 'school') {
        setConditionalBoard(roadmap.board || roadmap.target_board || '');
        setConditionalClass(roadmap.target_class || '');
      }

      // Group chapters by subject
      const subjectMap: Record<string, Chapter[]> = {};
      const subjectDaysMap: Record<string, number> = {};
      
      (chapters || []).forEach((ch: any) => {
        if (!subjectMap[ch.subject]) {
          subjectMap[ch.subject] = [];
          subjectDaysMap[ch.subject] = 0;
        }
        
        subjectMap[ch.subject].push({
          id: ch.id,
          chapter_name: ch.chapter_name,
          suggested_days: ch.estimated_days || 1,
          isSelected: true,
          isCustom: false,
          difficulty: ch.difficulty || 'medium',
        });
        
        subjectDaysMap[ch.subject] += (ch.estimated_days || 1);
      });

      // Set subjects
      const subjects: Subject[] = Object.keys(subjectMap).map(name => ({
        id: crypto.randomUUID(),
        name,
        isSelected: true,
        isCustom: false
      }));
      
      setFetchedSubjects(subjects);
      setFetchedChapters(subjectMap);
      setDaysBudget(subjectDaysMap);
      setTimeBudget(subjectDaysMap);

      toast.success('Roadmap loaded for editing');
    } catch (error: any) {
      console.error('Error loading roadmap:', error);
      toast.error('Failed to load roadmap for editing');
    } finally {
      setIsLoadingExistingRoadmap(false);
    }
  };

  // Load roadmap when editRoadmapId changes
  useEffect(() => {
    if (editRoadmapId && open) {
      loadExistingRoadmap(editRoadmapId);
    }
  }, [editRoadmapId, open]);

  const handleFetchSubjects = async () => {
    const isSchool = examType?.toLowerCase() === 'school';
    const finalExamName = isSchool ? conditionalBoard : examName;

    console.log('🔍 Fetching subjects:', { 
      examType, 
      finalExamName, 
      isSchool, 
      board: conditionalBoard, 
      class: conditionalClass,
      batch: selectedBatch 
    });

    if (!examType) {
      toast.error('Please select exam type first');
      return;
    }
    
    if (isSchool) {
      if (!conditionalBoard || !conditionalClass) {
        toast.error('Please select both board and class for school domain');
        return;
      }
    } else if (!examName) {
      toast.error('Please select an exam name');
      return;
    }

    setIsFetchingSubjects(true);
    try {
      // NEW: First try to get from exam_templates
      const { data: template } = await supabase
        .from('exam_templates')
        .select('standard_subjects')
        .eq('exam_name', finalExamName)
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
        
        // Auto-assign default days budget
        const initialDays = subjects.reduce((acc, s) => ({
          ...acc,
          [s.name]: 15
        }), {});
        setDaysBudget(initialDays);
        setTimeBudget(initialDays);
        
        toast.success(`Loaded ${subjects.length} subjects for ${finalExamName}`);
        setIsFetchingSubjects(false);
        return;
      }

      // Fallback: Call edge function if no template
      const { data, error } = await supabase.functions.invoke('fetch-exam-subjects', {
        body: {
          exam_type: examType,
          exam_name: finalExamName,
          student_class: conditionalClass,
          board: conditionalBoard
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
      
      // Auto-assign default days budget
      const initialDays = subjects.reduce((acc, s) => ({
        ...acc,
        [s.name]: 15
      }), {});
      setDaysBudget(initialDays);
      setTimeBudget(initialDays);
      
      toast.success(`Fetched ${subjects.length} subjects`);
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to fetch subjects. You can add them manually.');
    } finally {
      setIsFetchingSubjects(false);
    }
  };

  // Auto-fetch subjects when exam details are set
  useEffect(() => {
    const isSchool = examType?.toLowerCase() === 'school';
    const canAutoFetch = examType && (isSchool ? conditionalBoard : examName);
    
    if (currentStep === 1 && fetchedSubjects.length === 0 && canAutoFetch) {
      console.log('🤖 Auto-fetching subjects for:', { examType, conditionalBoard, examName, isSchool });
      handleFetchSubjects();
    }
  }, [currentStep, examType, examName, conditionalBoard]);

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
          exam_name: examName,
          subject: subjectName,
          student_class: conditionalClass,
          board: conditionalBoard,
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

  const handleUploadPdf = async (file: File, subjectName: string) => {
    try {
      setIsFetchingChapters(true);
      toast.loading(`Processing PDF for ${subjectName}...`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('exam_type', examType);
      formData.append('subject', subjectName);

      const { data, error } = await supabase.functions.invoke('extract-syllabus-structure', {
        body: formData
      });

      if (error) throw error;

      if (data?.error) {
        toast.dismiss();
        toast.error(data.error);
        return;
      }

      // Filter chapters for this specific subject only
      const subjectChapters = data.chapters_by_subject?.[subjectName] || [];
      
      if (subjectChapters.length === 0) {
        toast.dismiss();
        toast.error(`No chapters found for ${subjectName} in the PDF.`);
        return;
      }

      // Convert to our chapter format with importance metadata
      const newChapters: Chapter[] = subjectChapters.map((ch: any, idx: number) => ({
        id: `pdf-${subjectName}-${idx}`,
        chapter_name: ch.chapter_name,
        suggested_days: ch.suggested_days || 3,
        difficulty: ch.difficulty || 'medium',
        exam_relevance: ch.exam_relevance || 'important',
        importance_score: ch.importance_score || 7,
        can_skip: ch.can_skip || false,
        isSelected: true, // Auto-select PDF extracted chapters
        isCustom: false,
      }));

      // Add to existing chapters for this subject
      setFetchedChapters(prev => ({
        ...prev,
        [subjectName]: [...(prev[subjectName] || []), ...newChapters],
      }));

      setUploadedPdf(file);
      
      toast.dismiss();
      toast.success(`Added ${newChapters.length} chapters for ${subjectName}`);
    } catch (error: any) {
      toast.dismiss();
      console.error('PDF upload error:', error);
      toast.error(error.message || "Failed to extract chapters from PDF");
    } finally {
      setIsFetchingChapters(false);
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

  const handleUpdateChapter = (subjectName: string, chapterId: string, newName: string, newDays: number) => {
    setFetchedChapters(prev => ({
      ...prev,
      [subjectName]: prev[subjectName].map(c =>
        c.id === chapterId ? { ...c, chapter_name: newName, suggested_days: newDays } : c
      )
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

    // Initialize progress tracking
    setGenerationProgress({
      stage: 'generating',
      attempt: 1,
      budgetStatus: Object.fromEntries(
        selectedSubjects.map(s => [
          s.name,
          { allocated: timeBudget[s.name] || 0, generated: 0, status: 'pending' as const }
        ])
      ),
      message: 'AI is analyzing your subjects and chapters...'
    });

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
      const isSchool = examType?.toLowerCase() === 'school';
      const finalExamName = isSchool ? conditionalBoard : examName;
      
      console.log('🚀 Generating roadmap:', { 
        examType, 
        finalExamName, 
        isSchool, 
        board: conditionalBoard, 
        class: conditionalClass,
        batchId,
        selectedBatch
      });
      
      if (!examType) {
        toast.error('Please select exam type');
        return;
      }

      if (isSchool) {
        if (!conditionalBoard) {
          toast.error('Please select a board for school exams');
          return;
        }
      } else {
        if (!examName) {
          toast.error('Please select an exam name');
          return;
        }
      }

      // If in edit mode, update existing roadmap, else create new one
      if (editRoadmapId) {
        // Update existing roadmap
        const { error: updateError } = await supabase
          .from('batch_roadmaps')
          .update({
            title: roadmapTitle,
            mode: roadmapMode,
            exam_type: examType,
            exam_name: isSchool ? `${conditionalBoard} Class ${conditionalClass}` : examName,
            board: isSchool ? conditionalBoard : undefined,
            target_board: conditionalBoard,
            target_class: conditionalClass,
            updated_at: new Date().toISOString()
          })
          .eq('id', editRoadmapId);

        if (updateError) throw updateError;

        // Delete existing chapters for this roadmap
        const { data: existingChapters } = await supabase
          .from('roadmap_chapters')
          .select('id')
          .eq('roadmap_id', editRoadmapId);

        if (existingChapters && existingChapters.length > 0) {
          const chapterIds = existingChapters.map(c => c.id);
          await supabase.from('roadmap_topics').delete().in('chapter_id', chapterIds);
          await supabase.from('roadmap_chapters').delete().eq('roadmap_id', editRoadmapId);
        }

        // Re-generate with AI
        const { data, error } = await supabase.functions.invoke('ai-roadmap-generator', {
          body: {
            roadmap_id: editRoadmapId,
            batch_id: batchId,
            exam_type: examType,
            exam_name: isSchool ? `${conditionalBoard} Class ${conditionalClass}` : examName,
            board: isSchool ? conditionalBoard : undefined,
            target_class: conditionalClass,
            target_board: conditionalBoard,
            conditional_class: conditionalClass,
            conditional_board: examType?.toLowerCase() === 'school' ? conditionalBoard : undefined,
            roadmap_type: (examType === 'engineering' || examType === 'medical-ug' || examType === 'medical-pg') ? roadmapType : undefined,
            selected_subjects,
            title: roadmapTitle,
            mode: roadmapMode,
            time_budget: timeBudget,
            intensity: intensity
          }
        });

        if (error) throw error;
        if (data?.error) {
          setGenerationProgress({ stage: 'failed', attempt: data?.attempts || 1, budgetStatus: {}, message: data.error });
          toast.error(data.error);
          return;
        }

        // Update progress with completion
        setGenerationProgress({
          stage: 'complete',
          attempt: data?.attempts || 1,
          budgetStatus: data?.budgetStatus || {},
          message: data?.message || 'Roadmap updated successfully!'
        });

        setTimeout(() => {
          setGenerationProgress(null);
          toast.success("Roadmap updated successfully!");
        }, 2000);
      } else {
        // Create new roadmap
        const selectedChapterIds = useChapterLibrary
          ? Object.values(fetchedChapters)
              .flat()
              .filter(ch => ch.isSelected)
              .map(ch => ch.id)
          : [];

        const { data, error } = await supabase.functions.invoke('ai-roadmap-generator', {
          body: {
            batch_id: batchId,
            exam_type: examType,
            exam_name: isSchool ? `${conditionalBoard} Class ${conditionalClass}` : examName,
            board: isSchool ? conditionalBoard : undefined,
            target_class: conditionalClass,
            target_board: conditionalBoard,
            conditional_class: conditionalClass,
            conditional_board: examType?.toLowerCase() === 'school' ? conditionalBoard : undefined,
            roadmap_type: (examType === 'engineering' || examType === 'medical-ug' || examType === 'medical-pg') ? roadmapType : undefined,
            selected_subjects,
            title: roadmapTitle,
            mode: roadmapMode,
            time_budget: timeBudget,
            intensity: intensity,
            use_chapter_library: useChapterLibrary,
            selected_chapter_library_ids: selectedChapterIds,
          }
        });

        if (error) throw error;
        if (data?.error) {
          setGenerationProgress({ stage: 'failed', attempt: data?.attempts || 1, budgetStatus: {}, message: data.error });
          toast.error(data.error);
          return;
        }

        // Update progress with completion
        setGenerationProgress({
          stage: 'complete',
          attempt: data?.attempts || 1,
          budgetStatus: data?.budgetStatus || {},
          message: data?.message || 'Roadmap generated successfully!'
        });

        setTimeout(() => {
          setGenerationProgress(null);
          toast.success("Roadmap updated successfully!");
        }, 2000);
      }

      clearWizardProgress();
      setHasUnsavedChanges(false);
      handleReset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      setGenerationProgress({ 
        stage: 'failed', 
        attempt: 3, 
        budgetStatus: {}, 
        message: error.message || 'Generation failed' 
      });
      console.error('Error generating roadmap:', error);
      
      setTimeout(() => {
        setGenerationProgress(null);
        if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
          toast.error("Generation timed out", {
            description: "The roadmap is still being created. Please refresh in a minute.",
          });
        } else {
          toast.error("Failed to generate roadmap", {
            description: error.message || "Please try again with fewer subjects or chapters",
          });
        }
      }, 2000);
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
    setExamType(initialDomain || "");
    setExamName("");
    setConditionalClass(initialClass || "");
    setConditionalBoard(initialBoard || "");
    setBatchId("");
    setRoadmapTitle("");
    setRoadmapType('single_year');
    setFetchedSubjects([]);
    setFetchedChapters({});
    setUploadedPdf(null);
    setTimeBudget({});
    setIntensity('balanced');
  };

  // Check for saved progress on open
  useEffect(() => {
    if (open) {
      const saved = loadWizardProgress();
      if (saved && saved.currentStep > 0) {
        setSavedProgress(saved);
        setShowResumeDialog(true);
      }
    }
  }, [open]);

  // Auto-prefill initial domain/board/class if provided
  useEffect(() => {
    if (open && initialDomain && !examType) {
      setExamType(initialDomain);
    }
    if (open && initialBoard && !conditionalBoard) {
      setConditionalBoard(initialBoard);
    }
    if (open && initialClass && !conditionalClass) {
      setConditionalClass(initialClass);
    }
  }, [open, initialDomain, initialBoard, initialClass]);

  // Auto-fetch subjects when moving to Step 1 (Subject Selection)
  useEffect(() => {
    if (currentStep === 1 && fetchedSubjects.length === 0 && examType && examName) {
      handleFetchSubjects();
    }
  }, [currentStep]);

  // Auto-save progress whenever critical state changes
  useEffect(() => {
    if (!open || currentStep === 0) return;
    
    setHasUnsavedChanges(true);
    
    const progressData = {
      currentStep,
      examType,
      examName,
      conditionalClass,
      conditionalBoard,
      batchId,
      roadmapTitle,
      roadmapType,
      roadmapMode,
      fetchedSubjects,
      fetchedChapters,
      timeBudget,
      intensity,
      selectedBatch,
    };
    
    saveWizardProgress(progressData);
  }, [currentStep, examType, examName, conditionalClass, conditionalBoard, 
      batchId, roadmapTitle, roadmapType, fetchedSubjects, fetchedChapters, 
      timeBudget, intensity, open]);

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
      // Exam type selection validation
      if (!examType) {
        toast.error("Please select an exam type");
        return;
      }
      
      // For school domain
      if (examType === 'school') {
        if (!conditionalBoard || !conditionalClass) {
          toast.error("Please select both board and class for school domain");
          return;
        }
      } else {
        // For other domains, exam name is required
        if (!examName) {
          toast.error("Please select or enter an exam name");
          return;
        }
      }
      
      // Batch and title validation
      if (!batchId) {
        toast.error("Please select a batch");
        return;
      }
      if (!roadmapTitle) {
        toast.error("Please enter a roadmap title");
        return;
      }
    }

    if (currentStep === 1) {
      // Validate Step 1: Subject + Days Selection
      const selectedSubjects = fetchedSubjects.filter(s => s.isSelected);
      if (selectedSubjects.length === 0) {
        toast.error("Please select at least one subject");
        return;
      }
      const hasMissingBudget = selectedSubjects.some(s => !daysBudget[s.name] || daysBudget[s.name] <= 0);
      if (hasMissingBudget) {
        toast.error("Please set days budget for all selected subjects");
        return;
      }
    }

    if (currentStep === 2) {
      // Validate Step 2: Chapter Selection
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

  const handleResumeProgress = () => {
    if (!savedProgress) return;
    
    setCurrentStep(savedProgress.currentStep || 0);
    setExamType(savedProgress.examType || initialDomain || "");
    setExamName(savedProgress.examName || "");
    setConditionalClass(savedProgress.conditionalClass || initialClass || "");
    setConditionalBoard(savedProgress.conditionalBoard || initialBoard || "");
    setBatchId(savedProgress.batchId || "");
    setRoadmapTitle(savedProgress.roadmapTitle || "");
    setRoadmapType(savedProgress.roadmapType || 'single_year');
    setRoadmapMode(savedProgress.roadmapMode || 'parallel');
    setFetchedSubjects(savedProgress.fetchedSubjects || []);
    setFetchedChapters(savedProgress.fetchedChapters || {});
    setTimeBudget(savedProgress.timeBudget || {});
    setIntensity(savedProgress.intensity || 'balanced');
    setSelectedBatch(savedProgress.selectedBatch || null);
    
    setShowResumeDialog(false);
    setHasUnsavedChanges(true);
    
    toast.success(`Resumed from Step ${savedProgress.currentStep}/${totalSteps}`);
  };

  const handleStartFresh = () => {
    clearWizardProgress();
    setSavedProgress(null);
    setShowResumeDialog(false);
    handleReset();
  };

  const handleConfirmExit = () => {
    setShowExitConfirmation(false);
    setHasUnsavedChanges(false);
    onOpenChange(false);
  };

  const handleCancelExit = () => {
    setShowExitConfirmation(false);
  };

  return (
    <>
      {/* Resume Progress Dialog */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Previous Progress?</AlertDialogTitle>
            <AlertDialogDescription>
              You have an unsaved roadmap creation in progress (Step {savedProgress?.currentStep}/{totalSteps}).
              Would you like to resume where you left off, or start fresh?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartFresh}>
              Start Fresh
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResumeProgress}>
              Resume Progress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Without Saving?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved progress in Step {currentStep}/{totalSteps}. 
              Your progress will be automatically saved and you can resume later.
              Are you sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelExit}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Exit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog 
        open={open} 
        onOpenChange={(isOpen) => {
          if (!isOpen && hasUnsavedChanges) {
            setShowExitConfirmation(true);
          } else if (!isOpen) {
            handleReset();
            onOpenChange(false);
          } else {
            onOpenChange(true);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editRoadmapId ? 'Edit' : 'Create'} AI Roadmap - Step {currentStep}/{totalSteps}
          </DialogTitle>
          <Progress value={progress} className="mt-2" />
        </DialogHeader>

        {isLoadingExistingRoadmap ? (
          <div className="text-center py-12">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading roadmap for editing...</p>
          </div>
        ) : (
        <>
        <div className="space-y-6 py-4">
          {/* Step 0: Exam Type Selection */}
          {currentStep === 0 && (
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
              roadmapType={roadmapType}
              setRoadmapType={setRoadmapType}
              setSelectedBatch={(batch) => setSelectedBatch(batch)}
            />
          )}

          {/* Step 1: Subject + Days Selection (Merged) */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {selectedBatch && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-semibold">Selected Exam Info</h4>
                  <p className="text-sm"><strong>Exam Type:</strong> {examType}</p>
                  {examType === 'school' ? (
                    <>
                      <p className="text-sm"><strong>Board:</strong> {conditionalBoard}</p>
                      <p className="text-sm"><strong>Class:</strong> {conditionalClass}</p>
                    </>
                  ) : (
                    <p className="text-sm"><strong>Exam:</strong> {examName}</p>
                  )}
                  <p className="text-sm"><strong>Batch:</strong> {selectedBatch.name}</p>
                </div>
              )}
              
              <SubjectDaysStep
                subjects={fetchedSubjects}
                isFetching={isFetchingSubjects}
                onFetch={handleFetchSubjects}
                onToggle={handleToggleSubject}
                onAdd={handleAddCustomSubject}
                onDelete={handleDeleteSubject}
                daysBudget={daysBudget}
                onUpdateDays={(subjectName, days) => {
                  setDaysBudget(prev => ({ ...prev, [subjectName]: days }));
                  setTimeBudget(prev => ({ ...prev, [subjectName]: days }));
                }}
              />
            </div>
          )}

          {/* Step 2: Chapter Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Mode Toggle */}
              <div className="flex items-center justify-center gap-2 p-2 bg-muted rounded-lg">
                <Button
                  variant={useChapterLibrary ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseChapterLibrary(true)}
                  className="gap-2"
                >
                  <Library className="h-4 w-4" />
                  Use Centralized Library
                </Button>
                <Button
                  variant={!useChapterLibrary ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseChapterLibrary(false)}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </Button>
              </div>

              {useChapterLibrary ? (
                <CentralizedChapterSelectionStep
                  examType={examType}
                  examName={examName}
                  conditionalClass={conditionalClass}
                  subjects={fetchedSubjects.filter(s => s.isSelected)}
                  selectedChapters={fetchedChapters}
                  onChaptersChange={setFetchedChapters}
                  timeBudget={timeBudget}
                  intensity={intensity}
                />
              ) : (
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
                  examType={examType}
                  examName={examName}
                  onUpdateChapter={handleUpdateChapter}
                />
              )}
            </div>
          )}

          {/* Step 3: Intensity Selection */}
          {currentStep === 3 && (
            <IntensitySelectionStep
              intensity={intensity}
              onIntensityChange={setIntensity}
              totalBudget={Object.values(timeBudget).reduce((sum, val) => sum + val, 0)}
              totalChapters={Object.values(fetchedChapters).flat().filter(c => c.isSelected).length}
              coreChapters={Object.values(fetchedChapters).flat().filter(c => c.isSelected && c.exam_relevance === 'core').length}
              importantChapters={Object.values(fetchedChapters).flat().filter(c => c.isSelected && c.exam_relevance === 'important').length}
            />
          )}

          {/* Step 4: Preview */}
          {currentStep === 4 && (
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
                if (hasUnsavedChanges) {
                  setShowExitConfirmation(true);
                } else {
                  handleReset();
                  onOpenChange(false);
                }
              }}
            >
              Cancel
            </Button>

            {currentStep < 4 ? (
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
                  {editRoadmapId ? 'Update Roadmap' : 'Generate AI Roadmap'}
                </Button>
              </>
            )}
          </div>
        </div>
        </>
        )}
      </DialogContent>

      {/* Budget Progress Dialog */}
      {generationProgress && generationProgress.stage !== 'idle' && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {generationProgress.stage === 'complete' ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
                {generationProgress.stage === 'generating' && `Generating Roadmap (Attempt ${generationProgress.attempt}/3)`}
                {generationProgress.stage === 'validating' && 'Validating Budget Allocation'}
                {generationProgress.stage === 'retrying' && `Retrying Generation (Attempt ${generationProgress.attempt}/3)`}
                {generationProgress.stage === 'complete' && 'Roadmap Generated Successfully!'}
                {generationProgress.stage === 'failed' && 'Generation Failed'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Status Message */}
              <p className="text-sm text-muted-foreground">{generationProgress.message}</p>

              {/* Budget Allocation Progress */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Budget Allocation Status:</h4>
                {Object.entries(generationProgress.budgetStatus).map(([subject, status]) => (
                  <div key={subject} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${
                        status.status === 'match' ? 'bg-green-600' :
                        status.status === 'mismatch' ? 'bg-red-600' :
                        'bg-yellow-600 animate-pulse'
                      }`} />
                      <span className="font-medium">{subject}</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Allocated:</span>{' '}
                        <span className="font-semibold">{status.allocated}d</span>
                      </div>
                      
                      {status.generated > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Generated:</span>{' '}
                          <span className={`font-semibold ${
                            status.status === 'match' ? 'text-green-600' :
                            status.status === 'mismatch' ? 'text-red-600' :
                            ''
                          }`}>
                            {status.generated}d
                          </span>
                        </div>
                      )}
                      
                      {status.status === 'match' && (
                        <Badge className="bg-green-600">✓ Exact Match</Badge>
                      )}
                      {status.status === 'mismatch' && (
                        <Badge variant="destructive">
                          {status.generated > status.allocated ? '+' : ''}
                          {status.generated - status.allocated}d diff
                        </Badge>
                      )}
                      {status.status === 'pending' && (
                        <Badge variant="secondary">Pending...</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Retry Information */}
              {generationProgress.stage === 'retrying' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Budget mismatch detected. Retrying with stricter constraints...
                    {generationProgress.attempt === 3 && ' (Final attempt)'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
    </>
  );
};
