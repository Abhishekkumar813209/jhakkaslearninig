import { useState, useEffect } from 'react';
import { format, addDays, parseISO, getWeek } from 'date-fns';
import { DndContext, DragEndEvent, DragOverEvent, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
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
  mode: 'sequential' | 'parallel';
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

// Helpers for cell droppable IDs
const CELL_PREFIX = 'cell|';
const makeCellId = (date: string, subject: string) => `${CELL_PREFIX}${date}|${subject}`;
const parseCellId = (id: string) => {
  const [, date, subject] = id.split('|');
  return { date, subject };
};

interface CalendarCellProps {
  date: string;
  subject: string;
  cellChapters: CalendarChapter[];
  isEditable: boolean;
  onAddChapter: (date: string, subject: string) => void;
  onUpdate: (id: string, updates: Partial<CalendarChapter>) => void;
  onDelete: (id: string) => void;
  dragInfo?: { willShift: number; shiftDays: number } | null;
}

const CalendarCell = ({
  date,
  subject,
  cellChapters,
  isEditable,
  onAddChapter,
  onUpdate,
  onDelete,
  dragInfo,
}: CalendarCellProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: makeCellId(date, subject) });

  return (
    <td 
      ref={setNodeRef} 
      className={`border p-2 align-top ${isOver ? 'bg-primary/10 ring-2 ring-primary/40' : ''}`}
    >
      {isOver && dragInfo && (
        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
          <strong>⚠️ Will shift {dragInfo.willShift} chapter{dragInfo.willShift > 1 ? 's' : ''}</strong> by {dragInfo.shiftDays} day{dragInfo.shiftDays > 1 ? 's' : ''}
        </div>
      )}
      <SortableContext items={cellChapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[80px]">
          {cellChapters.map(chapter => (
            <SortableChapterPill
              key={chapter.id}
              chapter={chapter}
              isEditable={isEditable}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
          {isEditable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddChapter(date, subject)}
              className="h-8 border-dashed hover:bg-primary/5 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add {subject}
            </Button>
          )}
          {!isEditable && cellChapters.length === 0 && (
            <div className="text-muted-foreground text-xs text-center">—</div>
          )}
        </div>
      </SortableContext>
    </td>
  );
};

export const RoadmapCalendarView = ({
  mode,
  startDate,
  totalDays,
  subjects,
  chapters: initialChapters,
  isEditable = false,
  onSave,
  onChaptersChange
}: RoadmapCalendarViewProps) => {
  const [chapters, setChapters] = useState<CalendarChapter[]>(initialChapters);
  const [dragOverInfo, setDragOverInfo] = useState<{ date: string; subject: string; willShift: number; shiftDays: number } | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('roadmap-column-widths');
    return saved ? JSON.parse(saved) : {};
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);
  
  // Sync with initialChapters when they change (prevent snap-back after drag)
  useEffect(() => {
    const incoming = JSON.stringify(initialChapters.map(c => ({
      id: c.id, date: c.date, subject: c.subject, chapterName: c.chapterName, 
      videoLink: c.videoLink, estimatedDays: c.estimatedDays
    })));
    const current = JSON.stringify(chapters.map(c => ({
      id: c.id, date: c.date, subject: c.subject, chapterName: c.chapterName,
      videoLink: c.videoLink, estimatedDays: c.estimatedDays
    })));
    if (incoming !== current) {
      setChapters(initialChapters);
    }
  }, [initialChapters]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Column resize handlers
  const handleResizeStart = (subject: string, startX: number, startWidth: number) => {
    setResizingColumn(subject);
    setResizeStartX(startX);
    setResizeStartWidth(startWidth);
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX;
      const newWidth = Math.max(150, Math.min(500, resizeStartWidth + delta));
      setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
    };

    const handleMouseUp = () => {
      if (resizingColumn) {
        const newWidths = { ...columnWidths };
        localStorage.setItem('roadmap-column-widths', JSON.stringify(newWidths));
      }
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth, columnWidths]);

  // Generate all dates from startDate to totalDays
  const generateDateRange = (start: Date, days: number): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      dates.push(format(addDays(start, i), 'yyyy-MM-dd'));
    }
    return dates;
  };

  const allDates = generateDateRange(startDate, totalDays);

  // Group chapters by date AND subject (2D grouping)
  const groupedByDateSubject = allDates.reduce((acc, date) => {
    acc[date] = {};
    subjects.forEach(subject => {
      acc[date][subject] = chapters.filter(ch => 
        ch.date === date && ch.subject === subject && !ch.isBufferTime
      );
    });
    return acc;
  }, {} as Record<string, Record<string, CalendarChapter[]>>);

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDragOverInfo(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeChapter = chapters.find(c => c.id === activeId);
    if (!activeChapter) return;

    let targetDate = activeChapter.date;
    let targetSubject = activeChapter.subject;

    const overChapter = chapters.find(c => c.id === overId);
    if (overChapter) {
      targetDate = overChapter.date;
      targetSubject = overChapter.subject;
    } else if (overId.startsWith(CELL_PREFIX)) {
      const parsed = parseCellId(overId);
      targetDate = parsed.date;
      targetSubject = parsed.subject;
    }

    // Calculate impact
    const movedDays = activeChapter.estimatedDays || 1;
    const chaptersToShift = chapters.filter(ch => {
      if (ch.id === activeId) return false;
      const chDate = parseISO(ch.date);
      const tDate = parseISO(targetDate);
      if (chDate < tDate) return false;
      
      if (mode === 'parallel') {
        return ch.subject === targetSubject;
      }
      return true;
    });

    setDragOverInfo({
      date: targetDate,
      subject: targetSubject,
      willShift: chaptersToShift.length,
      shiftDays: movedDays
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDragOverInfo(null);
    
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeChapter = chapters.find(c => c.id === activeId);
    if (!activeChapter) return;

    let targetDate = activeChapter.date;
    let targetSubject = activeChapter.subject;
    let insertBeforeId: string | null = null;

    const overChapter = chapters.find(c => c.id === overId);

    if (overChapter) {
      targetDate = overChapter.date;
      targetSubject = overChapter.subject;
      insertBeforeId = overChapter.id;
    } else if (overId.startsWith(CELL_PREFIX)) {
      const parsed = parseCellId(overId);
      targetDate = parsed.date;
      targetSubject = parsed.subject;
    } else {
      return;
    }

    if (targetDate === activeChapter.date && targetSubject === activeChapter.subject && insertBeforeId === null) {
      return;
    }

    console.log('🔵 Drag Start:', {
      chapter: activeChapter.chapterName,
      fromDate: activeChapter.date,
      toDate: targetDate,
      subject: targetSubject,
      estimatedDays: activeChapter.estimatedDays || 1
    });

    const withoutActive = chapters.filter(c => c.id !== activeId);
    const moved: CalendarChapter = { ...activeChapter, date: targetDate, subject: targetSubject };

    let updatedChapters: CalendarChapter[] = [];

    if (insertBeforeId) {
      for (const item of withoutActive) {
        if (item.id === insertBeforeId) {
          updatedChapters.push(moved);
        }
        updatedChapters.push(item);
      }
    } else {
      const cellChapters = withoutActive.filter(c => c.date === targetDate && c.subject === targetSubject && !c.isBufferTime);
      const lastCellChapterIndex = cellChapters.length > 0 
        ? withoutActive.lastIndexOf(cellChapters[cellChapters.length - 1])
        : -1;
      
      updatedChapters = [...withoutActive];
      const insertIndex = lastCellChapterIndex >= 0 ? lastCellChapterIndex + 1 : updatedChapters.length;
      updatedChapters.splice(insertIndex, 0, moved);
    }

    // Auto-shift subsequent chapters
    const movedDays = moved.estimatedDays || 1;
    const movedDate = parseISO(moved.date);
    const nextAvailableDate = addDays(movedDate, movedDays);

    console.log('🟢 Auto-shifting logic:', { movedDays, nextAvailableDate: format(nextAvailableDate, 'yyyy-MM-dd') });

    const shifted: string[] = [];
    
    for (let i = 0; i < updatedChapters.length; i++) {
      const ch = updatedChapters[i];
      const chDate = parseISO(ch.date);
      
      // Skip the moved chapter itself
      if (ch.id === moved.id) continue;
      
      // Only shift chapters that are on or after the nextAvailableDate
      if (chDate < nextAvailableDate) continue;
      
      // In parallel mode, only shift same subject
      if (mode === 'parallel' && ch.subject !== moved.subject) continue;
      
      // Calculate how many days to shift this chapter
      const daysDiff = Math.ceil((nextAvailableDate.getTime() - chDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 0) {
        const newDate = addDays(chDate, daysDiff);
        updatedChapters[i] = { ...ch, date: format(newDate, 'yyyy-MM-dd') };
        shifted.push(ch.chapterName);
        console.log(`  ↳ Shifted "${ch.chapterName}" from ${ch.date} to ${format(newDate, 'yyyy-MM-dd')} (+${daysDiff} days)`);
      }
    }

    console.log('✅ Total shifted:', shifted.length, shifted);

    setChapters(updatedChapters);
    onChaptersChange?.(updatedChapters);
    toast.success(`Chapter moved! ${shifted.length > 0 ? `${shifted.length} chapter${shifted.length > 1 ? 's' : ''} auto-shifted.` : ''}`, { duration: 2000 });
  };

  const handleUpdateChapter = (id: string, updates: Partial<CalendarChapter>) => {
    const updatedChapters = [...chapters];
    const chapterIndex = updatedChapters.findIndex(c => c.id === id);
    if (chapterIndex === -1) return;

    const chapter = updatedChapters[chapterIndex];
    const oldDays = chapter.estimatedDays || 1;
    
    // Apply the updates
    updatedChapters[chapterIndex] = { ...chapter, ...updates };
    
    // If estimatedDays changed, shift subsequent chapters
    if (updates.estimatedDays !== undefined && updates.estimatedDays !== oldDays) {
      const newDays = updates.estimatedDays;
      const daysDiff = newDays - oldDays;
      
      if (mode === 'sequential') {
        // Sequential: shift all chapters after this one
        for (let i = chapterIndex + 1; i < updatedChapters.length; i++) {
          const currentDate = parseISO(updatedChapters[i].date);
          updatedChapters[i].date = format(addDays(currentDate, daysDiff), 'yyyy-MM-dd');
        }
      } else {
        // Parallel: only shift same-subject chapters after this one
        const subject = chapter.subject;
        for (let i = chapterIndex + 1; i < updatedChapters.length; i++) {
          if (updatedChapters[i].subject === subject) {
            const currentDate = parseISO(updatedChapters[i].date);
            updatedChapters[i].date = format(addDays(currentDate, daysDiff), 'yyyy-MM-dd');
          }
        }
      }
    }

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
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Roadmap Schedule</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Mode: <span className="font-medium">{mode === 'sequential' ? '📚 Sequential (One at a time)' : '⚡ Parallel (All subjects together)'}</span>
          </p>
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
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-3 text-left font-semibold sticky left-0 bg-muted z-10 min-w-[150px]">
                    Date
                  </th>
                  {subjects.map(subject => {
                    const width = columnWidths[subject] || 220;
                    return (
                      <th 
                        key={subject} 
                        className="border p-3 text-center font-semibold relative group"
                        style={{ width: `${width}px`, minWidth: `${width}px` }}
                      >
                        {subject}
                        {isEditable && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors group-hover:bg-primary/30"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleResizeStart(subject, e.clientX, width);
                            }}
                            onDoubleClick={() => {
                              setColumnWidths(prev => ({ ...prev, [subject]: 220 }));
                              localStorage.setItem('roadmap-column-widths', JSON.stringify({ ...columnWidths, [subject]: 220 }));
                            }}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {allDates.map((date, index) => {
                  const dateObj = parseISO(date);
                  const weekNum = getWeek(dateObj);
                  const dayOfWeek = format(dateObj, 'EEE');
                  const isNewWeek = index === 0 || getWeek(parseISO(allDates[index - 1])) !== weekNum;
                  
                  return (
                    <tr key={`row-${date}`} className={`border-b hover:bg-muted/20 ${isNewWeek ? 'border-t-4 border-t-primary/40 bg-primary/5' : ''}`}>
                      <td className={`border p-3 font-medium text-sm sticky left-0 bg-background z-10 min-w-[150px] ${isNewWeek ? 'border-t-4 border-t-primary/40 pt-6' : ''}`}>
                        <div className="flex flex-col gap-1">
                          <div className="font-semibold">
                            {format(dateObj, 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="font-medium text-primary">{dayOfWeek}</span>
                            <span>•</span>
                            <span className={isNewWeek ? 'font-semibold text-primary' : ''}>Week {weekNum}</span>
                          </div>
                        </div>
                      </td>
                      {subjects.map(subject => {
                        const width = columnWidths[subject] || 220;
                        return (
                          <td
                            key={`${date}-${subject}-wrapper`}
                            className={isNewWeek ? 'border-t-4 border-t-primary/40 pt-4' : ''}
                            style={{ width: `${width}px`, minWidth: `${width}px`, padding: 0 }}
                          >
                            <CalendarCell
                              date={date}
                              subject={subject}
                              cellChapters={groupedByDateSubject[date][subject]}
                              isEditable={isEditable}
                              onAddChapter={handleAddChapter}
                              onUpdate={handleUpdateChapter}
                              onDelete={handleDeleteChapter}
                              dragInfo={dragOverInfo?.date === date && dragOverInfo?.subject === subject ? dragOverInfo : null}
                            />
                          </td>
                        );
                      })}
                    </tr>
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
            <li>Drag chapters using the grip handle to reorder - <strong>subsequent chapters will auto-shift!</strong></li>
            <li>Adjust estimated days using +/- buttons - chapters will automatically reschedule</li>
            <li>Add video links to each chapter for easy access</li>
            <li>Week numbers are shown in the date column - new weeks have extra spacing</li>
            <li>Drag column borders to resize (like Excel) - double-click to reset width</li>
          </ul>
        </div>
      )}
    </div>
  );
};
