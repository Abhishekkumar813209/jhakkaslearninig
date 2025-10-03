import { useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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

interface SortableChapterCellProps {
  chapter: CalendarChapter;
  isEditable: boolean;
  onUpdate: (id: string, updates: Partial<CalendarChapter>) => void;
  onDelete: (id: string) => void;
}

const SortableChapterCell = ({ chapter, isEditable, onUpdate, onDelete }: SortableChapterCellProps) => {
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

  const colorClass = SUBJECT_COLORS[chapter.subject] || SUBJECT_COLORS.default;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`min-h-[80px] p-2 border rounded-md ${colorClass} relative group`}
    >
      {isEditable && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onDelete(chapter.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            className="text-sm"
          />
        </div>
      ) : (
        <div
          onClick={() => isEditable && setIsEditing(true)}
          className={`font-medium text-sm mb-1 ${isEditable ? 'cursor-pointer hover:bg-white/50 rounded px-1' : ''}`}
        >
          {chapter.chapterName}
          {chapter.isLive && (
            <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">LIVE</span>
          )}
        </div>
      )}

      {showVideoInput ? (
        <div className="space-y-1">
          <Input
            placeholder="Enter video link"
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            className="text-xs"
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
          For Video Link Click Here
        </a>
      ) : isEditable ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowVideoInput(true)}
          className="h-6 text-xs text-blue-600"
        >
          <Video className="h-3 w-3 mr-1" />
          Add Video Link
        </Button>
      ) : null}
    </div>
  );
};

export const RoadmapCalendarView = ({
  startDate,
  subjects,
  chapters: initialChapters,
  isEditable = false,
  onSave,
  onChaptersChange
}: RoadmapCalendarViewProps) => {
  const [chapters, setChapters] = useState<CalendarChapter[]>(initialChapters);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group chapters by date
  const groupedByDate = chapters.reduce((acc, chapter) => {
    if (!acc[chapter.date]) {
      acc[chapter.date] = {};
    }
    if (chapter.isBufferTime) {
      acc[chapter.date]['BUFFER'] = [chapter];
    } else {
      if (!acc[chapter.date][chapter.subject]) {
        acc[chapter.date][chapter.subject] = [];
      }
      acc[chapter.date][chapter.subject].push(chapter);
    }
    return acc;
  }, {} as Record<string, Record<string, CalendarChapter[]>>);

  const dates = Object.keys(groupedByDate).sort();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeChapter = chapters.find(c => c.id === active.id);
    const overChapter = chapters.find(c => c.id === over.id);

    if (!activeChapter || !overChapter) return;

    // Swap dates and subjects
    const updatedChapters = chapters.map(chapter => {
      if (chapter.id === active.id) {
        return { ...chapter, date: overChapter.date, subject: overChapter.subject };
      }
      if (chapter.id === over.id) {
        return { ...chapter, date: activeChapter.date, subject: activeChapter.subject };
      }
      return chapter;
    });

    setChapters(updatedChapters);
    onChaptersChange?.(updatedChapters);
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
                  {subjects.map(subject => (
                    <th key={subject} className="border p-3 text-center font-semibold min-w-[200px]">
                      {subject}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {dates.map((date) => {
                    const dateData = groupedByDate[date];
                    const isBuffer = dateData['BUFFER'];

                    if (isBuffer) {
                      const bufferChapter = isBuffer[0];
                      return (
                        <tr key={date} className="bg-pink-50">
                          <td className="border p-3 font-medium sticky left-0 bg-pink-50 z-10">
                            {format(parseISO(date), 'dd MMM yyyy')}
                          </td>
                          <td colSpan={subjects.length} className="border p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-semibold text-pink-700">
                                {bufferChapter.chapterName}
                              </span>
                              {isEditable && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteChapter(bufferChapter.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={date} className="hover:bg-muted/30">
                        <td className="border p-3 font-medium sticky left-0 bg-background z-10">
                          <div className="flex flex-col">
                            <span>{format(parseISO(date), 'dd MMM')}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(date), 'yyyy')}
                            </span>
                          </div>
                          {isEditable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddBufferTime(date)}
                              className="mt-2 h-7 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Buffer
                            </Button>
                          )}
                        </td>
                        {subjects.map(subject => {
                          const subjectChapters = dateData[subject] || [];
                          return (
                            <td key={`${date}-${subject}`} className="border p-2 align-top">
                              {subjectChapters.length > 0 ? (
                                <div className="space-y-2">
                                  {subjectChapters.map(chapter => (
                                    <SortableChapterCell
                                      key={chapter.id}
                                      chapter={chapter}
                                      isEditable={isEditable}
                                      onUpdate={handleUpdateChapter}
                                      onDelete={handleDeleteChapter}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="min-h-[60px] text-center text-muted-foreground text-sm flex items-center justify-center">
                                  -
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </SortableContext>
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
