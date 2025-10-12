import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, Trash2, Edit2, Save, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RoadmapCalendarView, CalendarChapter } from './RoadmapCalendarView';
import { addDays } from 'date-fns';
import { useFormPersistence } from "@/hooks/useFormPersistence";

interface ManualRoadmapBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  prefillData?: {
    batchId?: string;
    examType?: string;
    examName?: string;
    roadmapTitle?: string;
    totalDays?: number;
    subjects?: SubjectColumn[];
    selectedBoard?: string;
    selectedClass?: string;
  };
}

interface ChapterRow {
  id: string;
  name: string;
  estimatedDays: number;
  isEditing?: boolean;
}

interface SubjectColumn {
  id: string;
  name: string;
  chapters: ChapterRow[];
  isEditingName?: boolean;
}

interface SortableChapterProps {
  chapter: ChapterRow;
  subjectId: string;
  chapterIndex: number;
  isEditing: boolean;
  onNameChange: (value: string) => void;
  onDaysChange: (value: number) => void;
  onSaveEdit: () => void;
  onToggleEdit: () => void;
  onDelete: () => void;
}

const SortableChapter = ({
  chapter,
  subjectId,
  chapterIndex,
  isEditing,
  onNameChange,
  onDaysChange,
  onSaveEdit,
  onToggleEdit,
  onDelete
}: SortableChapterProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: chapter.id 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-md p-2 space-y-2 bg-muted/50">
      {isEditing ? (
        <>
          <Input
            value={chapter.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Chapter name"
            className="h-8 text-sm"
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={chapter.estimatedDays}
              onChange={(e) => onDaysChange(parseInt(e.target.value) || 1)}
              className="h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">days</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveEdit}
              className="h-8"
            >
              <Save className="h-3 w-3" />
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{chapterIndex + 1}. {chapter.name}</div>
            <div className="text-xs text-muted-foreground">
              {chapter.estimatedDays > 0 ? `${chapter.estimatedDays} days` : 'Set days'}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleEdit}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ManualRoadmapBuilder = ({ open, onOpenChange, onSuccess, prefillData }: ManualRoadmapBuilderProps) => {
  const {
    data: builderData,
    setData: setBuilderData,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showResumeDialog,
    setShowResumeDialog,
    showExitConfirmation,
    setShowExitConfirmation,
    savedProgress,
    clearProgress,
    resumeProgress,
    startFresh,
  } = useFormPersistence(
    'manual-roadmap-builder-progress',
    {
      roadmapTitle: '',
      description: '',
      selectedBatchId: '',
      startDate: null as Date | null,
      subjects: [] as SubjectColumn[],
    },
    24,
    open
  );

  const [batches, setBatches] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [calendarChapters, setCalendarChapters] = useState<CalendarChapter[]>([]);

  // Derived state from builderData
  const title = builderData.roadmapTitle;
  const description = builderData.description;
  const batchId = builderData.selectedBatchId;
  const startDate = builderData.startDate;
  const subjects = builderData.subjects;

  // Setters that update builderData
  const setTitle = (val: string) => {
    setBuilderData({ ...builderData, roadmapTitle: val });
    setHasUnsavedChanges(true);
  };
  const setDescription = (val: string) => {
    setBuilderData({ ...builderData, description: val });
    setHasUnsavedChanges(true);
  };
  const setBatchId = (val: string) => {
    setBuilderData({ ...builderData, selectedBatchId: val });
    setHasUnsavedChanges(true);
  };
  const setStartDate = (val: Date | undefined) => {
    setBuilderData({ ...builderData, startDate: val || null });
    setHasUnsavedChanges(true);
  };
  const setSubjects = (val: SubjectColumn[] | ((prev: SubjectColumn[]) => SubjectColumn[])) => {
    const newSubjects = typeof val === 'function' ? val(builderData.subjects) : val;
    setBuilderData({ ...builderData, subjects: newSubjects });
    setHasUnsavedChanges(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      fetchBatches();
      
      // Prioritize prefill data over saved progress
      if (prefillData) {
        setBuilderData({
          roadmapTitle: prefillData.roadmapTitle || '',
          description: '',
          selectedBatchId: prefillData.batchId || '',
          startDate: null,
          subjects: prefillData.subjects || [],
        });
        setHasUnsavedChanges(true);
      }
    }
  }, [open, prefillData]);

  const fetchBatches = async () => {
    try {
      let query = supabase
        .from('batches')
        .select('id, name, level, exam_type, target_board, target_class')
        .eq('is_active', true);
      
      // If prefillData has board/class, filter accordingly
      if (prefillData?.examType === 'school') {
        if (prefillData?.selectedBoard) {
          query = query.eq('target_board', prefillData.selectedBoard as any);
        }
        if (prefillData?.selectedClass) {
          query = query.eq('target_class', prefillData.selectedClass as any);
        }
      }
      
      const { data, error } = await query.order('name');

      if (error) throw error;
      setBatches(data || []);
    } catch (error: any) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to load batches');
    }
  };

  const calculateTotalDays = () => {
    // Calculate maximum duration among subjects (parallel scheduling)
    const subjectDurations = subjects.map(subject => 
      subject.chapters.reduce((sum, ch) => sum + ch.estimatedDays, 0)
    );
    return subjectDurations.length > 0 ? Math.max(...subjectDurations) : 0;
  };

  const addSubject = () => {
    if (!newSubjectName.trim()) {
      toast.error('Please enter a subject name');
      return;
    }

    const newSubject: SubjectColumn = {
      id: crypto.randomUUID(),
      name: newSubjectName.trim(),
      chapters: [],
      isEditingName: false,
    };

    setSubjects([...subjects, newSubject]);
    setNewSubjectName("");
  };

  const deleteSubject = (subjectId: string) => {
    setSubjects(subjects.filter(s => s.id !== subjectId));
  };

  const updateSubjectName = (subjectId: string, newName: string) => {
    setSubjects(subjects.map(s => 
      s.id === subjectId ? { ...s, name: newName } : s
    ));
  };

  const toggleEditSubjectName = (subjectId: string) => {
    setSubjects(subjects.map(s => 
      s.id === subjectId ? { ...s, isEditingName: !s.isEditingName } : s
    ));
  };

  const addChapter = (subjectId: string) => {
    const newChapter: ChapterRow = {
      id: crypto.randomUUID(),
      name: "New Chapter",
      estimatedDays: 0, // Default to 0 - must be set manually
      isEditing: true,
    };

    setSubjects(subjects.map(s => 
      s.id === subjectId 
        ? { ...s, chapters: [...s.chapters, newChapter] }
        : s
    ));
  };

  const updateChapter = (subjectId: string, chapterId: string, field: keyof ChapterRow, value: any) => {
    setSubjects(subjects.map(s => 
      s.id === subjectId 
        ? {
            ...s,
            chapters: s.chapters.map(ch => 
              ch.id === chapterId ? { ...ch, [field]: value } : ch
            )
          }
        : s
    ));
  };

  const deleteChapter = (subjectId: string, chapterId: string) => {
    setSubjects(subjects.map(s => 
      s.id === subjectId 
        ? { ...s, chapters: s.chapters.filter(ch => ch.id !== chapterId) }
        : s
    ));
  };

  const toggleEditChapter = (subjectId: string, chapterId: string) => {
    setSubjects(subjects.map(s => 
      s.id === subjectId 
        ? {
            ...s,
            chapters: s.chapters.map(ch => 
              ch.id === chapterId ? { ...ch, isEditing: !ch.isEditing } : ch
            )
          }
        : s
    ));
  };

  const handleDragEnd = (subjectId: string) => (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSubjects((prevSubjects) =>
        prevSubjects.map((subject) => {
          if (subject.id === subjectId) {
            const oldIndex = subject.chapters.findIndex((ch) => ch.id === active.id);
            const newIndex = subject.chapters.findIndex((ch) => ch.id === over.id);
            
            return {
              ...subject,
              chapters: arrayMove(subject.chapters, oldIndex, newIndex),
            };
          }
          return subject;
        })
      );
    }
  };

  const handleSave = async (status: 'draft' | 'active') => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!batchId) {
      toast.error('Please select a batch');
      return;
    }

    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    if (subjects.length === 0) {
      toast.error('Please add at least one subject');
      return;
    }

    const totalChapters = subjects.reduce((sum, s) => sum + s.chapters.length, 0);
    if (totalChapters === 0) {
      toast.error('Please add at least one chapter');
      return;
    }

    try {
      setIsSaving(true);

      const totalDays = calculateTotalDays();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + totalDays);

      // Get batch details for board and class
      const selectedBatch = batches.find(b => b.id === batchId);
      const examType = selectedBatch?.exam_type || prefillData?.examType;
      const targetBoard = selectedBatch?.target_board || prefillData?.selectedBoard;
      const targetClass = selectedBatch?.target_class || prefillData?.selectedClass;
      const examName = selectedBatch?.exam_name || prefillData?.examName || 
        (examType === 'school' && targetBoard && targetClass 
          ? `${targetBoard} Class ${targetClass}`
          : undefined);
      
      // Create roadmap
      const { data: roadmap, error: roadmapError } = await supabase
        .from('batch_roadmaps')
        .insert({
          batch_id: batchId,
          title: title.trim(),
          description: description.trim() || null,
          total_days: totalDays,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          status,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          exam_type: examType,
          exam_name: examName,
          board: examType === 'school' ? targetBoard : undefined,
          target_board: targetBoard,
          target_class: targetClass,
        })
        .select()
        .single();

      if (roadmapError) throw roadmapError;

      // Create chapters with parallel scheduling (each subject starts from day 1)
      let orderNum = 1;

      for (const subject of subjects) {
        let subjectCurrentDay = 1; // Each subject starts from day 1

        for (const chapter of subject.chapters) {
          const dayStart = subjectCurrentDay;
          const dayEnd = subjectCurrentDay + chapter.estimatedDays - 1;

          const { error: chapterError } = await supabase
            .from('roadmap_chapters')
            .insert({
              roadmap_id: roadmap.id,
              subject: subject.name,
              chapter_name: chapter.name,
              estimated_days: chapter.estimatedDays,
              day_start: dayStart,
              day_end: dayEnd,
              order_num: orderNum,
              is_custom: true,
            });

          if (chapterError) throw chapterError;

          subjectCurrentDay = dayEnd + 1; // Only increments within same subject
          orderNum++;
        }
      }

      toast.success(`Roadmap ${status === 'active' ? 'created and activated' : 'saved as draft'}!`);
      clearProgress();
      setHasUnsavedChanges(false);
      handleReset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving roadmap:', error);
      toast.error('Failed to save roadmap');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setBuilderData({
      roadmapTitle: '',
      description: '',
      selectedBatchId: '',
      startDate: null,
      subjects: [],
    });
    setNewSubjectName("");
    setShowCalendarView(false);
    setCalendarChapters([]);
  };

  const convertToCalendarFormat = (): CalendarChapter[] => {
    if (!startDate) return [];
    
    const chapters: CalendarChapter[] = [];

    // Parallel scheduling: each subject starts from the same start date
    subjects.forEach(subject => {
      let subjectCurrentDate = startDate; // Each subject starts from same date
      
      subject.chapters.forEach(chapter => {
        chapters.push({
          id: chapter.id,
          date: format(subjectCurrentDate, 'yyyy-MM-dd'),
          subject: subject.name,
          chapterName: chapter.name,
          estimatedDays: chapter.estimatedDays,
          isBufferTime: false,
          isLive: false
        });
        subjectCurrentDate = addDays(subjectCurrentDate, chapter.estimatedDays);
      });
    });

    return chapters;
  };

  const handleToggleCalendarView = () => {
    if (!showCalendarView) {
      // Converting to calendar view
      const chapters = convertToCalendarFormat();
      setCalendarChapters(chapters);
    }
    setShowCalendarView(!showCalendarView);
  };

  const handleCalendarChaptersChange = (updatedChapters: CalendarChapter[]) => {
    setCalendarChapters(updatedChapters);
  };

  return (
    <>
      {/* Resume & Exit Confirmation Dialogs */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Previous Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have an unsaved manual roadmap draft with {savedProgress?.subjects?.length || 0} subjects.
              Would you like to resume, or start fresh?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={startFresh}>
              Start Fresh
            </AlertDialogCancel>
            <AlertDialogAction onClick={resumeProgress}>
              Resume Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Your roadmap has {subjects.length} subjects and will be automatically saved. 
              You can resume later. Are you sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirmation(false)}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowExitConfirmation(false);
              setHasUnsavedChanges(false);
              onOpenChange(false);
            }}>
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
          } else {
            onOpenChange(isOpen);
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Manual Roadmap Builder</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Roadmap Title *</Label>
              <Input
                placeholder="e.g., JEE 2025 Preparation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Batch *</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(batch => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name} - {batch.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Date & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Total Duration</Label>
              <div className="flex h-10 items-center px-3 py-2 rounded-md border border-input bg-muted">
                <span className="font-semibold text-lg">
                  {calculateTotalDays() > 0 ? `${calculateTotalDays()} days` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Add Subject */}
          <div className="flex gap-2">
            <Input
              placeholder="Subject name (e.g., Physics)"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSubject()}
            />
            <Button onClick={addSubject} className="gap-2 whitespace-nowrap">
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          </div>

          {/* Subjects Grid */}
          {subjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <Card key={subject.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      {subject.isEditingName ? (
                        <Input
                          value={subject.name}
                          onChange={(e) => updateSubjectName(subject.id, e.target.value)}
                          onBlur={() => toggleEditSubjectName(subject.id)}
                          onKeyPress={(e) => e.key === 'Enter' && toggleEditSubjectName(subject.id)}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <div className="flex items-center gap-3 flex-1">
                          <CardTitle className="text-lg">{subject.name}</CardTitle>
                          <Badge variant="outline" className="font-mono bg-blue-50 border-blue-200">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {subject.chapters.reduce((sum, ch) => sum + ch.estimatedDays, 0)} days
                          </Badge>
                        </div>
                      )}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEditSubjectName(subject.id)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSubject(subject.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd(subject.id)}
                    >
                      <SortableContext
                        items={subject.chapters.map(ch => ch.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {subject.chapters.map((chapter, idx) => (
                            <SortableChapter
                              key={chapter.id}
                              chapter={chapter}
                              subjectId={subject.id}
                              chapterIndex={idx}
                              isEditing={chapter.isEditing || false}
                              onNameChange={(value) => updateChapter(subject.id, chapter.id, 'name', value)}
                              onDaysChange={(value) => updateChapter(subject.id, chapter.id, 'estimatedDays', value)}
                              onSaveEdit={() => toggleEditChapter(subject.id, chapter.id)}
                              onToggleEdit={() => toggleEditChapter(subject.id, chapter.id)}
                              onDelete={() => deleteChapter(subject.id, chapter.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => addChapter(subject.id)}
                    >
                      <Plus className="h-3 w-3" />
                      Add Chapter
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Calendar View Toggle */}
          {subjects.length > 0 && subjects.some(s => s.chapters.length > 0) && startDate && calculateTotalDays() > 0 && (
            <div className="border-t pt-4">
              <Button
                variant="outline"
                onClick={handleToggleCalendarView}
                className="w-full gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                {showCalendarView ? 'Show Subject View' : 'Preview Calendar View'}
              </Button>
            </div>
          )}

          {/* Roadmap Summary */}
          {subjects.length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-sm">Roadmap Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {subjects.map(subject => {
                  const totalDays = subject.chapters.reduce((sum, ch) => sum + ch.estimatedDays, 0);
                  return (
                    <div key={subject.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{subject.name}</span>
                      <Badge variant="secondary" className="font-mono">
                        {subject.chapters.length} chapters • {totalDays} days
                      </Badge>
                    </div>
                  );
                })}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total Duration (Parallel)</span>
                    <Badge variant="default" className="font-mono">
                      {calculateTotalDays()} days
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Calendar View */}
          {showCalendarView && startDate && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <RoadmapCalendarView
                mode="parallel"
                startDate={startDate}
                totalDays={calculateTotalDays()}
                subjects={subjects.map(s => s.name)}
                chapters={calendarChapters}
                isEditable={true}
                onChaptersChange={handleCalendarChaptersChange}
              />
            </div>
          )}

          {/* Save Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                if (hasUnsavedChanges) {
                  setShowExitConfirmation(true);
                } else {
                  onOpenChange(false);
                }
              }} 
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={isSaving || calculateTotalDays() === 0}
            >
              Save as Draft
            </Button>
            <Button 
              onClick={() => handleSave('active')} 
              disabled={isSaving || calculateTotalDays() === 0}
            >
              {isSaving ? 'Saving...' : 'Create & Activate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
