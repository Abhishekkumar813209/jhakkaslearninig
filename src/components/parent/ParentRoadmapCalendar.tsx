import { useState, useEffect } from 'react';
import { format, addDays, parseISO, getWeek } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { getTopicColor } from '@/lib/progressColors';

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
      day_number: number;
      status: string;
      progress_percentage: number;
      games_completed?: number;
      total_games?: number;
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

const TopicCard = ({ 
  topic, 
  subject, 
  chapterName,
  gameCompletionRate,
  isToday, 
  isPast
}: { 
  topic: RoadmapTopic; 
  subject: string;
  chapterName: string;
  gameCompletionRate: number;
  isToday: boolean; 
  isPast: boolean;
}) => {
  const color = getTopicColor(gameCompletionRate);

  return (
    <div className={`p-2 border rounded-lg ${color.bg} text-white relative mb-2 hover:shadow-md transition-all`}>
      {/* Subject Tag */}
      <div className="text-xs font-semibold uppercase text-white/80 tracking-wide">
        {subject}
      </div>

      {/* Topic Name */}
      <div className="font-medium text-sm mt-1 flex items-center justify-between">
        <span>{topic.topic_name}</span>
        {isToday && <Badge variant="secondary" className="text-xs ml-2">Today</Badge>}
      </div>

      {/* Chapter Reference */}
      <div className="text-xs mt-1 text-white/80">
        Chapter: {chapterName}
      </div>

      {/* Progress Badge */}
      <div className="absolute top-1 right-1">
        <Badge className={`text-xs ${color.badgeClass} text-white`}>
          {color.icon} {gameCompletionRate.toFixed(0)}%
        </Badge>
      </div>

      {/* Status Text */}
      <div className="mt-2 text-[10px] text-white/70">
        {color.label}
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

  // Transform to topic-level cards
  interface CalendarTopic {
    id: string;
    date: string;
    subject: string;
    chapterName: string;
    topicName: string;
    gameCompletionRate: number;
    status: string;
  }

  const topics: CalendarTopic[] = subjectsData.flatMap(subject =>
    subject.chapters.flatMap(chapter =>
      (chapter.topics || []).map(topic => {
        const rate = topic.progress_percentage || 0;
        
        // FIX: Use topic's day_number, not chapter's day_start
        const topicDate = topic.day_number 
          ? format(addDays(startDate, topic.day_number - 1), 'yyyy-MM-dd')
          : (chapter.day_start 
            ? format(addDays(startDate, chapter.day_start - 1), 'yyyy-MM-dd')
            : format(startDate, 'yyyy-MM-dd'));
        
        return {
          id: topic.id,
          date: topicDate,
          subject: subject.name,
          chapterName: chapter.chapter_name,
          topicName: topic.topic_name,
          gameCompletionRate: rate,
          status: topic.status || 'not_started'
        };
      })
    )
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

  // Group topics by date AND subject (not by chapter)
  const groupedByDateSubject = allDates.reduce((acc, date) => {
    acc[date] = {};
    subjects.forEach(subject => {
      acc[date][subject] = topics.filter(t => 
        t.date === date && t.subject === subject
      );
    });
    return acc;
  }, {} as Record<string, Record<string, CalendarTopic[]>>);

  console.log('[ParentRoadmap] Total topics:', topics.length);
  console.log('[ParentRoadmap] Topics by date:', 
    Object.entries(groupedByDateSubject).slice(0, 5).map(([date, subjects]) => ({
      date,
      totalTopics: Object.values(subjects).flat().length
    }))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Student Roadmap Calendar</h3>
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
                          {groupedByDateSubject[date][selectedSubject]?.map(topicItem => (
                              <TopicCard
                                key={topicItem.id}
                                topic={{ id: topicItem.id, topic_name: topicItem.topicName, day_number: 0, is_completed: false, theory_completed: false }}
                                subject={topicItem.subject}
                                chapterName={topicItem.chapterName}
                                gameCompletionRate={topicItem.gameCompletionRate}
                                isToday={isToday}
                                isPast={isPast}
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
                            {groupedByDateSubject[date][subject].map(topicItem => (
                            <TopicCard
                              key={topicItem.id}
                              topic={{ id: topicItem.id, topic_name: topicItem.topicName, day_number: 0, is_completed: false, theory_completed: false }}
                              subject={topicItem.subject}
                              chapterName={topicItem.chapterName}
                              gameCompletionRate={topicItem.gameCompletionRate}
                              isToday={isToday}
                              isPast={isPast}
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
            <div className="inline-block w-4 h-4 bg-green-600 rounded"></div>
            <span>Green - <strong>Above 70%</strong> games completed (Excellent)</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="inline-block w-4 h-4 bg-gray-500 rounded"></div>
            <span>Grey - <strong>50% to 70%</strong> games completed (In Progress)</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="inline-block w-4 h-4 bg-red-600 rounded"></div>
            <span>Red - <strong>Below 50%</strong> games completed (Needs Attention)</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="inline-block w-4 h-4 bg-gray-400 rounded"></div>
            <span>Not Started - <strong>0%</strong> games completed</span>
          </li>
          <li>🤖 Auto-updates when student completes games</li>
          <li>✨ Real-time sync between student and parent portals</li>
        </ul>
      </div>
    </div>
  );
};