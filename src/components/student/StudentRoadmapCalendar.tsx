import { useState, useEffect } from 'react';
import { format, addDays, parseISO, getWeek } from 'date-fns';
import { Calendar, CheckCircle2, Lock, PlayCircle, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
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

interface StudentRoadmapCalendarProps {
  startDate: Date;
  totalDays: number;
  subjectsData: SubjectData[];
  onTopicClick?: (topicId: string, chapterName: string, subject: string) => void;
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

const ChapterPill = ({ 
  chapter, 
  isToday, 
  isPast, 
  onTopicClick 
}: { 
  chapter: CalendarChapter; 
  isToday: boolean; 
  isPast: boolean;
  onTopicClick?: (topicId: string, chapterName: string, subject: string) => void;
}) => {
  const [showTopics, setShowTopics] = useState(false);
  const colorClass = SUBJECT_COLORS[chapter.subject] || SUBJECT_COLORS.default;
  
  const isLocked = !isPast && !isToday;
  const completedTopics = chapter.topics.filter(t => t.is_completed).length;
  const totalTopics = chapter.topics.length;

  return (
    <div className={`p-2 border rounded-lg ${colorClass} relative mb-2`}>
      {/* Subject tag */}
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {chapter.subject}
      </div>

      {/* Chapter name */}
      <div className="font-medium text-sm flex items-center justify-between gap-2">
        <span>{chapter.chapterName}</span>
        {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
        {isToday && <Badge variant="secondary" className="text-xs">Today</Badge>}
      </div>

      {/* Progress */}
      {totalTopics > 0 && (
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-primary h-full transition-all"
              style={{ width: `${(completedTopics / totalTopics) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {completedTopics}/{totalTopics}
          </span>
        </div>
      )}

      {/* Topics toggle */}
      {totalTopics > 0 && (
        <button
          onClick={() => setShowTopics(!showTopics)}
          className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
          disabled={isLocked}
        >
          <FileText className="h-3 w-3" />
          {showTopics ? 'Hide' : 'Show'} Topics ({totalTopics})
        </button>
      )}

      {/* Topics list */}
      {showTopics && totalTopics > 0 && (
        <div className="mt-2 space-y-1 border-t pt-2">
          {chapter.topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => !isLocked && onTopicClick?.(topic.id, chapter.chapterName, chapter.subject)}
              disabled={isLocked}
              className={`w-full text-left text-xs p-1.5 rounded flex items-center gap-2 transition-colors ${
                isLocked 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-white/50 cursor-pointer'
              }`}
            >
              {topic.is_completed ? (
                <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
              ) : topic.theory_completed ? (
                <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />
              ) : isLocked ? (
                <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              ) : (
                <div className="h-3 w-3 border border-muted-foreground rounded-full flex-shrink-0" />
              )}
              <span className={topic.is_completed ? 'line-through text-muted-foreground' : ''}>
                {topic.topic_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const StudentRoadmapCalendar = ({
  startDate,
  totalDays,
  subjectsData,
  onTopicClick
}: StudentRoadmapCalendarProps) => {
  const isMobile = useIsMobile();
  const [selectedSubject, setSelectedSubject] = useState<string>(subjectsData[0]?.name || '');

  // Transform subjectsData to calendar chapters
  const chapters: CalendarChapter[] = subjectsData.flatMap(subject =>
    subject.chapters.map(chapter => {
      const topics: RoadmapTopic[] = (chapter.topics || []).map(topic => ({
        id: topic.id,
        topic_name: topic.topic_name,
        day_number: 1,
        is_completed: topic.status === 'completed',
        theory_completed: topic.status === 'in_progress' || topic.status === 'unlocked'
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
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Your Learning Calendar</h3>
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
                              onTopicClick={onTopicClick}
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
                                onTopicClick={onTopicClick}
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
          <li><CheckCircle2 className="inline h-3 w-3 text-green-600" /> Completed topics</li>
          <li><FileText className="inline h-3 w-3 text-blue-600" /> Theory read (not completed)</li>
          <li><Lock className="inline h-3 w-3" /> Locked topics (future dates)</li>
          <li>Click on topics to start learning</li>
        </ul>
      </div>
    </div>
  );
};
