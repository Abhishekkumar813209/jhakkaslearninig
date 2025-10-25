import { useState, useEffect } from 'react';
import { format, addDays, parseISO, getWeek } from 'date-fns';
import { Calendar, CheckCircle2, Lock, PlayCircle, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';

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
  isFirstChapter,
  onTopicClick,
  topicStatuses
}: { 
  chapter: CalendarChapter; 
  isToday: boolean; 
  isPast: boolean;
  isFirstChapter: boolean;
  onTopicClick?: (topicId: string, chapterName: string, subject: string) => void;
  topicStatuses: Record<string, string>;
}) => {
  const [showTopics, setShowTopics] = useState(false);
  const borderClass = SUBJECT_COLORS[chapter.subject] || SUBJECT_COLORS.default;
  
  // First chapter is always unlocked, otherwise lock future dates
  const isLocked = !isFirstChapter && !isPast && !isToday;
  
  // Calculate chapter status based on game completion (60%+ topics green = chapter green)
  const topicsWithGames = chapter.topics.filter(t => {
    const status = topicStatuses[t.id];
    return status && status !== 'grey'; // Only count topics with games
  });
  
  const greenTopics = chapter.topics.filter(t => topicStatuses[t.id] === 'green').length;
  const totalTopics = chapter.topics.length;
  const topicsWithGamesCount = topicsWithGames.length;
  
  // Chapter is green if 60%+ of topics with games are green
  const chapterStatus = topicsWithGamesCount > 0 && (greenTopics / topicsWithGamesCount) >= 0.6 ? 'green' : 'red';
  const bgColor = chapterStatus === 'green' ? 'bg-green-600' : 'bg-red-600';
  const textColor = 'text-white';

  return (
    <div className={`p-2 border rounded-lg ${bgColor} ${textColor} ${borderClass} relative mb-2`}>
      {/* Status badge */}
      <div className="absolute top-1 right-1">
        <Badge variant="outline" className={`text-xs ${chapterStatus === 'green' ? 'bg-green-800 text-white border-green-400' : 'bg-red-800 text-white border-red-400'}`}>
          {chapterStatus === 'green' ? "✅ Done" : "❌ Not Done"}
        </Badge>
      </div>

      {/* Subject tag */}
      <div className="text-xs font-semibold text-white/80 uppercase tracking-wide">
        {chapter.subject}
      </div>

      {/* Chapter name */}
      <div className="font-medium text-sm flex items-center justify-between gap-2 pr-16">
        <span>{chapter.chapterName}</span>
        {isLocked && <Lock className="h-3 w-3 text-white/70" />}
        {isToday && <Badge variant="secondary" className="text-xs">Today</Badge>}
      </div>

      {/* Progress */}
      {totalTopics > 0 && (
        <div className="mt-1 text-xs text-white/90">
          {greenTopics}/{topicsWithGamesCount > 0 ? topicsWithGamesCount : totalTopics} topics done
        </div>
      )}

      {/* Topics toggle */}
      {totalTopics > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowTopics(!showTopics);
          }}
          className="text-xs text-white hover:underline mt-1 flex items-center gap-1"
          disabled={isLocked}
        >
          <FileText className="h-3 w-3" />
          {showTopics ? 'Hide' : 'Show'} Topics ({totalTopics})
        </button>
      )}

      {/* Topics list with auto-status indicators */}
      {showTopics && totalTopics > 0 && (
        <div className="mt-2 space-y-1 border-t border-white/20 pt-2">
          {chapter.topics.map((topic, topicIndex) => {
            const isTopicLocked = isLocked && topicIndex !== 0;
            const topicStatus = topicStatuses[topic.id] || 'grey';
            const statusColor = {
              green: 'bg-green-500',
              yellow: 'bg-yellow-500',
              red: 'bg-red-500',
              grey: 'bg-gray-400'
            }[topicStatus];
            
            return (
              <button
                key={topic.id}
                onClick={() => !isTopicLocked && onTopicClick?.(topic.id, chapter.chapterName, chapter.subject)}
                disabled={isTopicLocked}
                className={`w-full text-left text-xs p-1.5 rounded flex items-center gap-2 bg-white/20 text-white ${
                  isTopicLocked 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-white/30 cursor-pointer'
                }`}
              >
                <div className={`h-3 w-3 ${statusColor} rounded-full flex-shrink-0`} />
                <span>{topic.topic_name}</span>
              </button>
            );
          })}
        </div>
      )}
      
      <div className="mt-2 text-[10px] text-white/70">
        🤖 Auto-updated (60% games = green)
      </div>
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
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>(subjectsData[0]?.name || '');
  const [topicStatuses, setTopicStatuses] = useState<Record<string, string>>({});

  // Fetch topic statuses from backend
  useEffect(() => {
    if (user?.id) {
      fetchTopicStatuses();
      
      // Setup realtime subscription
      const channel = supabase
        .channel('student-topic-status-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'student_topic_status',
            filter: `student_id=eq.${user.id}`
          },
          () => {
            fetchTopicStatuses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const fetchTopicStatuses = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('student_topic_status')
      .select('topic_id, status')
      .eq('student_id', user.id);

    if (!error && data) {
      const statusMap: Record<string, string> = {};
      data.forEach(item => {
        statusMap[item.topic_id] = item.status;
      });
      setTopicStatuses(statusMap);
    }
  };

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

  // Find the first chapter overall (earliest date)
  const firstChapterId = chapters.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )[0]?.id;

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
                              isFirstChapter={chapter.id === firstChapterId}
                              onTopicClick={onTopicClick}
                              topicStatuses={topicStatuses}
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
                                isFirstChapter={chapter.id === firstChapterId}
                                onTopicClick={onTopicClick}
                                topicStatuses={topicStatuses}
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
        <p className="font-semibold">📚 Legend (Auto-Updated from Backend):</p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li className="flex items-center gap-2">
            <div className="inline-block w-4 h-4 bg-green-600 border border-green-400 rounded"></div>
            <span>Done (Green) - 60%+ games completed in chapter topics</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="inline-block w-4 h-4 bg-red-600 border border-red-400 rounded"></div>
            <span>Not Done (Red) - Less than 60% games completed</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="inline-block w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Topic Green - 60%+ games completed</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Topic Yellow - 40-60% games completed</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="inline-block w-3 h-3 bg-gray-400 rounded-full"></div>
            <span>Topic Grey - No games started yet</span>
          </li>
          <li>🤖 Status updates automatically when you complete games</li>
          <li>✨ Real-time updates via database triggers</li>
          <li>Click topics to start learning</li>
        </ul>
      </div>
    </div>
  );
};
