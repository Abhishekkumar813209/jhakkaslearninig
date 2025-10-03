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
import { CalendarIcon, Plus, Trash2, Edit2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ManualRoadmapBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
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

export const ManualRoadmapBuilder = ({ open, onOpenChange, onSuccess }: ManualRoadmapBuilderProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [batchId, setBatchId] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [subjects, setSubjects] = useState<SubjectColumn[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  useEffect(() => {
    if (open) {
      fetchBatches();
    }
  }, [open]);

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
      estimatedDays: 3,
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
                <span className="font-semibold text-lg">{calculateTotalDays()} days</span>
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
                    {subject.chapters.map((chapter, idx) => (
                      <div key={chapter.id} className="border rounded-md p-2 space-y-2 bg-muted/50">
                        {chapter.isEditing ? (
                          <>
                            <Input
                              value={chapter.name}
                              onChange={(e) => updateChapter(subject.id, chapter.id, 'name', e.target.value)}
                              placeholder="Chapter name"
                              className="h-8 text-sm"
                            />
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                value={chapter.estimatedDays}
                                onChange={(e) => updateChapter(subject.id, chapter.id, 'estimatedDays', parseInt(e.target.value) || 1)}
                                className="h-8 text-sm"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">days</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEditChapter(subject.id, chapter.id)}
                                className="h-8"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{idx + 1}. {chapter.name}</div>
                              <div className="text-xs text-muted-foreground">{chapter.estimatedDays} days</div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEditChapter(subject.id, chapter.id)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteChapter(subject.id, chapter.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
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

          {/* Save Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={isSaving}
            >
              Save as Draft
            </Button>
            <Button onClick={() => handleSave('active')} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Create & Activate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
