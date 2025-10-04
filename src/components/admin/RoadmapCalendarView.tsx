import { useState, useEffect } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Download, GripVertical, Plus, Video, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface CalendarChapter {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  chapterName: string;
  videoLink?: string;
  isBufferTime?: boolean;
  isLive?: boolean;
  estimatedDays?: number;
}

interface RoadmapCalendarViewProps {
  roadmapId?: string;
  batchId?: string;
  startDate: Date;
  totalDays: number;
  subjects: string[];
  chapters: CalendarChapter[];
  isEditable?: boolean;
  onSave?: (chapters: CalendarChapter[]) => void;
  onChaptersChange?: (chapters: CalendarChapter[]) => void;
}

const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'bg-blue-50 border-blue-200',
  Chemistry: 'bg-orange-50 border-orange-200',
  Maths: 'bg-green-50 border-green-200',
  Mathematics: 'bg-green-50 border-green-200',
  Biology: 'bg-purple-50 border-purple-200',
  English: 'bg-pink-50 border-pink-200',
  Hindi: 'bg-yellow-50 border-yellow-200',
  default: 'bg-gray-50 border-gray-200'
};

interface SortableChapterPillProps {
  chapter: CalendarChapter;
  isEditable: boolean;
  onUpdate: (id: string, updates: Partial<CalendarChapter>) => void;
  onDelete: (id: string) => void;
}

const SortableChapterPill = ({ chapter, isEditable, onUpdate, onDelete }: SortableChapterPillProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(chapter.chapterName);
  const [videoLink, setVideoLink] = useState(chapter.videoLink || '');
  const [showVideoInput, setShowVideoInput] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    onUpdate(chapter.id, { chapterName: editValue });
    setIsEditing(false);
  };

  const handleVideoSave = () => {
    onUpdate(chapter.id, { videoLink });
    setShowVideoInput(false);
    toast.success('Video link updated');
  };

  const handleDaysChange = (delta: number) => {
    const currentDays = chapter.estimatedDays || 1;
    const newDays = Math.max(1, currentDays + delta);
    onUpdate(chapter.id, { estimatedDays: newDays });
  };

  const colorClass = SUBJECT_COLORS[chapter.subject] || SUBJECT_COLORS.default;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`inline-flex flex-col gap-1 p-2 border rounded-lg ${colorClass} relative group mr-2 mb-2 min-w-[200px]`}
    >
      {isEditable && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background rounded-full shadow-sm p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => onDelete(chapter.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Subject tag */}
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {chapter.subject}
      </div>

      {/* Chapter name */}
      {isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
          className="text-sm h-7"
        />
      ) : (
        <div
          onClick={() => isEditable && setIsEditing(true)}
          className={`font-medium text-sm ${isEditable ? 'cursor-pointer hover:bg-white/50 rounded px-1' : ''}`}
        >
          {chapter.chapterName}
          {chapter.isLive && (
            <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">LIVE</span>
          )}
        </div>
      )}

      {/* Video link */}
      {showVideoInput ? (
        <div className="space-y-1">
          <Input
            placeholder="Enter video link"
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            className="text-xs h-7"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleVideoSave} className="h-6 text-xs">
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowVideoInput(false)} className="h-6 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      ) : chapter.videoLink ? (
        <a
          href={chapter.videoLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          onClick={(e) => {
            if (isEditable) {
              e.preventDefault();
              setShowVideoInput(true);
            }
          }}
        >
          <Video className="h-3 w-3" />
          Video Link
        </a>
      ) : isEditable ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowVideoInput(true)}
          className="h-6 text-xs text-blue-600 justify-start px-1"
        >
          <Video className="h-3 w-3 mr-1" />
          Add Video
        </Button>
      ) : null}

      {/* Duration control */}
      {isEditable && (
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Days:</span>
          <Button
            variant="outline"
            size="icon"
            className="h-5 w-5"
            onClick={() => handleDaysChange(-1)}
            disabled={(chapter.estimatedDays || 1) <= 1}
          >
            -
          </Button>
          <span className="font-medium min-w-[20px] text-center">{chapter.estimatedDays || 1}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-5 w-5"
            onClick={() => handleDaysChange(1)}
          >
            +
          </Button>
        </div>
      )}
    </div>
  );
};

// Helpers for row droppable IDs
const ROW_PREFIX = 'row|';
const makeRowId = (date: string) => `${ROW_PREFIX}${date}`;
const parseRowId = (id: string) => {
  const date = id.replace(ROW_PREFIX, '');
  return { date };
};

interface DateRowProps {
  date: string;
  rowChapters: CalendarChapter[];
  isEditable: boolean;
  allSubjects: string[];
  onAddChapter: (date: string, subject: string) => void;
  onUpdate: (id: string, updates: Partial<CalendarChapter>) => void;
  onDelete: (id: string) => void;
}

const DateRow = ({
  date,
  rowChapters,
  isEditable,
  allSubjects,
  onAddChapter,
  onUpdate,
  onDelete,
}: DateRowProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: makeRowId(date) });
  const [selectedSubject, setSelectedSubject] = useState(allSubjects[0] || 'Physics');

  const handleAddChapter = () => {
    onAddChapter(date, selectedSubject);
  };

  return (
    <tr ref={setNodeRef} className={`border-b hover:bg-muted/20 ${isOver ? 'ring-2 ring-primary/40' : ''}`}>
      <td className="border p-3 font-medium text-sm sticky left-0 bg-background z-10 min-w-[120px]">
        {format(parseISO(date), 'MMM dd, yyyy')}
      </td>
      <td className="border p-3 align-top">
        <SortableContext items={rowChapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-wrap items-start min-h-[60px]">
            {rowChapters.map(chapter => (
              <SortableChapterPill
                key={chapter.id}
                chapter={chapter}
                isEditable={isEditable}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
            {isEditable && (
              <div className="inline-flex items-center gap-2 mt-1">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="text-xs border rounded px-2 py-1 bg-background"
                >
                  {allSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddChapter}
                  className="h-8 border-dashed hover:bg-primary/5"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Chapter
                </Button>
              </div>
            )}
            {!isEditable && rowChapters.length === 0 && (
              <div className="text-muted-foreground text-sm">No chapters planned</div>
            )}
          </div>
        </SortableContext>
      </td>
    </tr>
  );
};

export const RoadmapCalendarView = ({
  startDate,
  totalDays,
  subjects,
  chapters: initialChapters,
  isEditable = false,
  onSave,
  onChaptersChange
}: RoadmapCalendarViewProps) => {
  const [chapters, setChapters] = useState<CalendarChapter[]>(initialChapters);
  
  // Sync with initialChapters when they change
  useEffect(() => {
    setChapters(initialChapters);
  }, [initialChapters]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Generate all dates from startDate to totalDays
  const generateDateRange = (start: Date, days: number): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      dates.push(format(addDays(start, i), 'yyyy-MM-dd'));
    }
    return dates;
  };

  const allDates = generateDateRange(startDate, totalDays);

  // Group chapters by date (all subjects mixed in one row)
  const groupedByDate = allDates.reduce((acc, date) => {
    acc[date] = chapters.filter(ch => ch.date === date && !ch.isBufferTime);
    return acc;
  }, {} as Record<string, CalendarChapter[]>);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeChapter = chapters.find(c => c.id === activeId);
    if (!activeChapter) return;

    let targetDate = activeChapter.date;
    let insertBeforeId: string | null = null;

    const overChapter = chapters.find(c => c.id === overId);

    if (overChapter) {
      // Drop over a chapter -> move to that chapter's date and insert before it
      targetDate = overChapter.date;
      insertBeforeId = overChapter.id;
    } else if (overId.startsWith(ROW_PREFIX)) {
      const { date } = parseRowId(overId);
      targetDate = date;
    } else {
      return;
    }

    // If nothing changed, bail out
    if (targetDate === activeChapter.date && insertBeforeId === null) {
      return;
    }

    const withoutActive = chapters.filter(c => c.id !== activeId);
    const moved: CalendarChapter = { ...activeChapter, date: targetDate };

    let updatedChapters: CalendarChapter[] = [];

    if (insertBeforeId) {
      // Insert before the target chapter
      for (const item of withoutActive) {
        if (item.id === insertBeforeId) {
          updatedChapters.push(moved);
        }
        updatedChapters.push(item);
      }
    } else {
      // Append to end of target row
      const lastIndexInRow = withoutActive.reduce((idx, item, i) => {
        return item.date === targetDate && !item.isBufferTime ? i : idx;
      }, -1);
      
      updatedChapters = [...withoutActive];
      const insertIndex = lastIndexInRow >= 0 ? lastIndexInRow + 1 : updatedChapters.length;
      updatedChapters.splice(insertIndex, 0, moved);
    }

    setChapters(updatedChapters);
    onChaptersChange?.(updatedChapters);
    toast.success('Chapter moved!', { duration: 1000 });
  };

  const handleUpdateChapter = (id: string, updates: Partial<CalendarChapter>) => {
    const updatedChapters = chapters.map(c => c.id === id ? { ...c, ...updates } : c);
    setChapters(updatedChapters);
    onChaptersChange?.(updatedChapters);
  };

  const handleDeleteChapter = (id: string) => {
    const updatedChapters = chapters.filter(c => c.id !== id);
    setChapters(updatedChapters);
    onChaptersChange?.(updatedChapters);
    toast.success('Chapter deleted');
  };

  const handleAddChapter = (date: string, subject: string) => {
    const newChapterId = `chapter-${Date.now()}`;
    
    const newChapter: CalendarChapter = {
      id: newChapterId,
      date,
      subject,
      chapterName: 'New Chapter',
      isBufferTime: false,
      estimatedDays: 1
    };

    const updatedChapters = [...chapters, newChapter].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setChapters(updatedChapters);
    onChaptersChange?.(updatedChapters);
    toast.success('Chapter added');
  };

  const handleAddBufferTime = (afterDate: string) => {
    const dateObj = parseISO(afterDate);
    const nextDay = addDays(dateObj, 1);
    const newBufferId = `buffer-${Date.now()}`;
    
    const bufferChapter: CalendarChapter = {
      id: newBufferId,
      date: format(nextDay, 'yyyy-MM-dd'),
      subject: 'ALL',
      chapterName: 'Buffer Time / Revision / Test',
      isBufferTime: true
    };

    const updatedChapters = [...chapters, bufferChapter].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setChapters(updatedChapters);
    onChaptersChange?.(updatedChapters);
    toast.success('Buffer time added');
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('roadmap-calendar');
    if (!element) return;

    try {
      toast.loading('Generating PDF...');
      
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 210;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 210;
      }

      pdf.save(`roadmap-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.dismiss();
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate PDF');
      console.error(error);
    }
  };

  const handleSaveChanges = () => {
    onSave?.(chapters);
    toast.success('Roadmap saved successfully!');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Roadmap Schedule</h3>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          {isEditable && onSave && (
            <Button onClick={handleSaveChanges} size="sm">
              Save Changes
            </Button>
          )}
        </div>
      </div>

      <Card className="p-4">
        <div id="roadmap-calendar" className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-3 text-left font-semibold sticky left-0 bg-muted z-10 min-w-[120px]">
                    Date
                  </th>
                  <th className="border p-3 text-left font-semibold">
                    Plan (All Subjects)
                  </th>
                </tr>
              </thead>
              <tbody>
                {allDates.map((date) => {
                  const rowChapters = groupedByDate[date];
                  return (
                    <DateRow
                      key={`row-${date}`}
                      date={date}
                      rowChapters={rowChapters}
                      isEditable={isEditable}
                      allSubjects={subjects}
                      onAddChapter={handleAddChapter}
                      onUpdate={handleUpdateChapter}
                      onDelete={handleDeleteChapter}
                    />
                  );
                })}
              </tbody>
            </table>
          </DndContext>
        </div>
      </Card>

      {isEditable && (
        <div className="text-sm text-muted-foreground space-y-1">
          <p>💡 <strong>Tips:</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Click on any chapter name to edit it</li>
            <li>Drag chapters using the grip handle to reorder</li>
            <li>Click "Buffer" button to add rest days</li>
            <li>Add video links to each chapter for easy access</li>
          </ul>
        </div>
      )}
    </div>
  );
};
