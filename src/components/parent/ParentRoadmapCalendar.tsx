import { useState, useEffect } from 'react';
import { format, addDays, parseISO, getWeek } from 'date-fns';
import { Calendar, Lock, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface RoadmapTopic {
  id: string;
  topic_name: string;
  is_completed: boolean;
  theory_completed: boolean;
  day_number: number;
}

interface CalendarChapter {
  id: string;
  date: string;
  subject: string;
  chapterName: string;
  estimatedDays: number;
  topics: RoadmapTopic[];
  progress: number;
}

interface SubjectData {
  name: string;
  chapters: Array<{
    id: string;
    chapter_name: string;
    day_start: number;
    day_end: number;
    progress: number;
    topics: Array<{
      id: string;
      topic_name: string;
      status: string;
      progress_percentage: number;
    }>;
  }>;
}

interface ParentRoadmapCalendarProps {
  startDate: Date;
  totalDays: number;
  subjectsData: SubjectData[];
  chapterStatuses: Record<string, boolean>;
  onChapterDoubleClick: (chapterId: string) => void;
}

const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'border-blue-200',
  Chemistry: 'border-orange-200',
  Maths: 'border-green-200',
  Mathematics: 'border-green-200',
  Biology: 'border-purple-200',
  English: 'border-pink-200',
  Hindi: 'border-yellow-200',
  default: 'border-gray-200'
};

const ChapterPill = ({ 
  chapter, 
  isToday, 
  isPast,
  isCompleted,
  onDoubleClick 
}: { 
  chapter: CalendarChapter; 
  isToday: boolean; 
  isPast: boolean;
  isCompleted: boolean;
  onDoubleClick: (chapterId: string) => void;
}) => {
  const [showTopics, setShowTopics] = useState(false);
  const colorClass = SUBJECT_COLORS[chapter.subject] || SUBJECT_COLORS.default;
  
  const bgColor = isCompleted ? 'bg-green-600' : 'bg-red-600';
  const textColor = 'text-white';
  const completedTopics = chapter.topics.filter(t => t.is_completed).length;
  const totalTopics = chapter.topics.length;

  return (
    <div 
      className={`p-2 border rounded-lg ${bgColor} ${textColor} ${colorClass} relative mb-2 cursor-pointer select-none transition-colors hover:shadow-md hover:opacity-90`}
      onDoubleClick={() => onDoubleClick(chapter.id)}
    >
      {/* Status badge */}
      <div className="absolute top-1 right-1">
        <Badge variant={isCompleted ? "outline" : "outline"} className={`text-xs ${isCompleted ? 'bg-green-800 text-white border-green-400' : 'bg-red-800 text-white border-red-400'}`}>
          {isCompleted ? "✅ Done" : "❌ Not Done"}
        </Badge>
      </div>

      {/* Subject tag */}
      <div className="text-xs font-semibold text-white/80 uppercase tracking-wide">
        {chapter.subject}
      </div>

      {/* Chapter name */}
      <div className="font-medium text-sm flex items-center justify-between gap-2 pr-16">
        <span>{chapter.chapterName}</span>
        {isToday && <Badge variant="secondary" className="text-xs">Today</Badge>}
      </div>

      {/* Topics toggle */}
      {totalTopics > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowTopics(!showTopics);
          }}
          className="text-xs text-white hover:underline mt-1 flex items-center gap-1"
        >
          <FileText className="h-3 w-3" />
          {showTopics ? 'Hide' : 'Show'} Topics ({totalTopics})
        </button>
      )}

      {/* Topics list */}
      {showTopics && totalTopics > 0 && (
        <div className="mt-2 space-y-1 border-t border-white/20 pt-2">
          {chapter.topics.map((topic) => (
            <div
              key={topic.id}
              className="w-full text-left text-xs p-1.5 rounded flex items-center gap-2 bg-white/20 text-white"
            >
              <div className="h-3 w-3 border border-white rounded-full flex-shrink-0" />
              <span>{topic.topic_name}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-2 text-[10px] text-white/70">
        💡 Double-click to toggle status
      </div>
    </div>
  );
};

export const ParentRoadmapCalendar = ({
  startDate,
  totalDays,
  subjectsData,
  chapterStatuses,
  onChapterDoubleClick
}: ParentRoadmapCalendarProps) => {
  const isMobile = useIsMobile();
  const [selectedSubject, setSelectedSubject] = useState<string>(subjectsData[0]?.name || '');

  // Transform subjectsData to calendar chapters
  const chapters: CalendarChapter[] = subjectsData.flatMap(subject =>
    subject.chapters.map(chapter => {
      const topics: RoadmapTopic[] = (chapter.topics || []).map(topic => ({
        id: topic.id,
        topic_name: topic.topic_name,
        day_number: 1,
        is_completed: false, // Always show as not completed for parent view
        theory_completed: false
      }));

      // Calculate date from day_start
      const chapterDate = chapter.day_start 
        ? format(addDays(startDate, chapter.day_start - 1), 'yyyy-MM-dd')
        : format(startDate, 'yyyy-MM-dd');

      return {
        id: chapter.id,
        date: chapterDate,
        subject: subject.name,
        chapterName: chapter.chapter_name,
        estimatedDays: (chapter.day_end - chapter.day_start + 1) || 1,
        topics,
        progress: chapter.progress || 0
      };
    })
  );

  const subjects = subjectsData.map(s => s.name);

  const generateDateRange = (start: Date, days: number): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      dates.push(format(addDays(start, i), 'yyyy-MM-dd'));
    }
    return dates;
  };

  const allDates = generateDateRange(startDate, totalDays);
  const today = format(new Date(), 'yyyy-MM-dd');

  // Group chapters by date AND subject
  const groupedByDateSubject = allDates.reduce((acc, date) => {
    acc[date] = {};
    subjects.forEach(subject => {
      acc[date][subject] = chapters.filter(ch => ch.date === date && ch.subject === subject);
    });
    return acc;
  }, {} as Record<string, Record<string, CalendarChapter[]>>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Roadmap Calendar - Manual Tracking</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          Double-click chapters to mark as done
        </Badge>
      </div>

      {isMobile && (
        <div className="mb-4">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full bg-background z-50">
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {subjects.map(subject => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border p-3 text-left font-semibold sticky left-0 bg-muted z-10 w-[120px]">
                  Date
                </th>
                {isMobile ? (
                  <th className="border p-3 text-center font-semibold min-w-[220px]">
                    {selectedSubject}
                  </th>
                ) : (
                  subjects.map(subject => (
                    <th key={subject} className="border p-3 text-center font-semibold min-w-[220px]">
                      {subject}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {allDates.map((date, index) => {
                const dateObj = parseISO(date);
                const weekNum = getWeek(dateObj);
                const dayOfWeek = format(dateObj, 'EEE');
                const isNewWeek = index === 0 || getWeek(parseISO(allDates[index - 1])) !== weekNum;
                const isToday = date === today;
                const isPast = new Date(date) < new Date(today);
                
                return (
                  <tr 
                    key={`row-${date}`} 
                    className={`border-b hover:bg-muted/20 ${isNewWeek ? 'border-t-4 border-t-primary/40 bg-primary/5' : ''} ${isToday ? 'bg-primary/10' : ''}`}
                  >
                    <td className={`border p-3 font-medium text-sm sticky left-0 bg-background z-10 w-[120px] ${isNewWeek ? 'border-t-4 border-t-primary/40 pt-6' : ''} ${isToday ? 'bg-primary/10' : ''}`}>
                      <div className="flex flex-col gap-1">
                        <div className="font-semibold flex items-center gap-2">
                          {format(dateObj, 'MMM dd, yyyy')}
                          {isToday && <Badge variant="default" className="text-xs">Today</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-medium text-primary">{dayOfWeek}</span>
                          <span>•</span>
                          <span className={isNewWeek ? 'font-semibold text-primary' : ''}>Week {weekNum}</span>
                        </div>
                      </div>
                    </td>
                    
                    {isMobile ? (
                      <td className="border p-2 align-top">
                        <div className="min-h-[80px]">
                          {groupedByDateSubject[date][selectedSubject]?.map(chapter => (
                            <ChapterPill
                              key={chapter.id}
                              chapter={chapter}
                              isToday={isToday}
                              isPast={isPast}
                              isCompleted={chapterStatuses[chapter.id] || false}
                              onDoubleClick={onChapterDoubleClick}
                            />
                          ))}
                          {(!groupedByDateSubject[date][selectedSubject] || groupedByDateSubject[date][selectedSubject].length === 0) && (
                            <div className="text-muted-foreground text-xs text-center py-4">—</div>
                          )}
                        </div>
                      </td>
                    ) : (
                      subjects.map(subject => (
                        <td key={`${date}-${subject}`} className="border p-2 align-top">
                          <div className="min-h-[80px]">
                            {groupedByDateSubject[date][subject].map(chapter => (
                              <ChapterPill
                                key={chapter.id}
                                chapter={chapter}
                                isToday={isToday}
                                isPast={isPast}
                                isCompleted={chapterStatuses[chapter.id] || false}
                                onDoubleClick={onChapterDoubleClick}
                              />
                            ))}
                            {groupedByDateSubject[date][subject].length === 0 && (
                              <div className="text-muted-foreground text-xs text-center py-4">—</div>
                            )}
                          </div>
                        </td>
                      ))
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground space-y-1 bg-muted/50 p-4 rounded-lg">
        <p className="font-semibold">📚 Legend:</p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li className="flex items-center gap-2">
            <div className="inline-block w-4 h-4 bg-red-600 border border-red-400 rounded"></div>
            <span>Not Done (Dark Red) - Chapter not yet completed</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="inline-block w-4 h-4 bg-green-600 border border-green-400 rounded"></div>
            <span>Done (Dark Green) - Chapter marked as completed</span>
          </li>
          <li>Double-click any chapter to toggle its status</li>
          <li>Status is tracked locally (not saved to backend yet)</li>
        </ul>
      </div>
    </div>
  );
};