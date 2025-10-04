import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [batchId, setBatchId] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [subjects, setSubjects] = useState<SubjectColumn[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [calendarChapters, setCalendarChapters] = useState<CalendarChapter[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      fetchBatches();
      
      // Prefill data from AI wizard if available
      if (prefillData) {
        if (prefillData.batchId) setBatchId(prefillData.batchId);
        if (prefillData.roadmapTitle) setTitle(prefillData.roadmapTitle);
        if (prefillData.subjects && prefillData.subjects.length > 0) {
          setSubjects(prefillData.subjects);
        }
      }
    }
  }, [open, prefillData]);

  const fetchBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, name, level')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBatches(data || []);
    } catch (error: any) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to load batches');
    }
  };

  const calculateTotalDays = () => {
    return subjects.reduce((total, subject) => {
      return total + subject.chapters.reduce((sum, ch) => sum + ch.estimatedDays, 0);
    }, 0);
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
        })
        .select()
        .single();

      if (roadmapError) throw roadmapError;

      // Create chapters
      let currentDay = 1;
      let orderNum = 1;

      for (const subject of subjects) {
        for (const chapter of subject.chapters) {
          const dayStart = currentDay;
          const dayEnd = currentDay + chapter.estimatedDays - 1;

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

          currentDay = dayEnd + 1;
          orderNum++;
        }
      }

      toast.success(`Roadmap ${status === 'active' ? 'created and activated' : 'saved as draft'}!`);
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
    setTitle("");
    setDescription("");
    setBatchId("");
    setStartDate(undefined);
    setSubjects([]);
    setNewSubjectName("");
    setShowCalendarView(false);
    setCalendarChapters([]);
  };

  const convertToCalendarFormat = (): CalendarChapter[] => {
    if (!startDate) return [];
    
    const chapters: CalendarChapter[] = [];
    let currentDate = startDate;

    subjects.forEach(subject => {
      subject.chapters.forEach(chapter => {
        chapters.push({
          id: chapter.id,
          date: format(currentDate, 'yyyy-MM-dd'),
          subject: subject.name,
          chapterName: chapter.name,
          isBufferTime: false,
          isLive: false
        });
        currentDate = addDays(currentDate, chapter.estimatedDays);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
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
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
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
  );
};
