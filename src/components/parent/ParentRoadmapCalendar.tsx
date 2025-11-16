import { useState, useEffect } from 'react';
import { format, addDays, parseISO, getWeek } from 'date-fns';
import { Calendar, LayoutGrid, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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

interface TestAttempt {
  test_id: string;
  test_title: string;
  score: number;
  total_marks: number;
  percentage: number;
  submitted_at: string;
  passed: boolean;
}

interface ParentRoadmapCalendarProps {
  startDate: Date;
  totalDays: number;
  subjectsData: SubjectData[];
  chapterStatuses: Record<string, boolean>;
  onChapterDoubleClick: (chapterId: string) => void;
  testAnalysis: Record<string, TestAttempt[]>;
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
  gamesCompleted,
  totalGames,
  isToday, 
  isPast,
  isEmpty
}: { 
  topic: RoadmapTopic; 
  subject: string;
  chapterName: string;
  gameCompletionRate: number;
  gamesCompleted: number;
  totalGames: number;
  isToday: boolean; 
  isPast: boolean;
  isEmpty?: boolean;
}) => {
  // Empty chapter placeholder
  if (isEmpty) {
    return (
      <div className="p-2 border rounded-lg bg-muted border-border mb-2 hover:shadow-md transition-all">
        <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
          {subject}
        </div>
        <div className="font-medium text-sm mt-1 text-foreground">
          {chapterName}
        </div>
        <div className="text-xs mt-2 italic text-muted-foreground flex items-center gap-1">
          📚 Topics coming soon
        </div>
      </div>
    );
  }

  const color = getTopicColor(gameCompletionRate);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`p-2 border rounded-lg ${color.bg} text-white relative mb-2 hover:shadow-md transition-all cursor-pointer`}>
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
                {gamesCompleted}/{totalGames}
              </Badge>
            </div>

            {/* Progress Label */}
            <div className="mt-2 text-[10px] text-white/70">
              {color.label}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-popover text-popover-foreground">
          <div className="space-y-1 text-sm">
            <p className="font-semibold">Progress Details</p>
            <p>Games Completed: {gamesCompleted}/{totalGames} ({Math.round(gameCompletionRate)}%)</p>
            <p>Status: {color.label}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function ParentRoadmapCalendar({
  startDate,
  totalDays,
  subjectsData,
  chapterStatuses,
  onChapterDoubleClick,
  testAnalysis
}: ParentRoadmapCalendarProps) {
  const isMobile = useIsMobile();
  const [selectedSubject, setSelectedSubject] = useState<string>(subjectsData[0]?.name || '');

  // Transform to topic-level cards (including empty chapters)
  interface CalendarTopic {
    id: string;
    date: string;
    subject: string;
    chapterName: string;
    topicName: string;
    gameCompletionRate: number;
    gamesCompleted: number;
    totalGames: number;
    status: string;
    isEmpty?: boolean;
  }

  const topics: CalendarTopic[] = subjectsData.flatMap(subject =>
    subject.chapters.flatMap(chapter => {
      // If chapter has topics, show them
      if (chapter.topics && chapter.topics.length > 0) {
        return chapter.topics.map(topic => {
          const rate = topic.progress_percentage || 0;
          
          // Use topic's day_number, not chapter's day_start
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
            gamesCompleted: topic.games_completed || 0,
            totalGames: topic.total_games || 0,
            status: topic.status || 'not_started',
            isEmpty: false
          } as CalendarTopic;
        });
      } else {
        // Chapter has no topics - show placeholder
        return [{
          id: `empty-${chapter.id}`,
          date: format(addDays(startDate, chapter.day_start - 1), 'yyyy-MM-dd'),
          subject: subject.name,
          chapterName: chapter.chapter_name,
          topicName: '📚 Topics not yet added',
          gameCompletionRate: 0,
          gamesCompleted: 0,
          totalGames: 0,
          status: 'not_started',
          isEmpty: true
        } as CalendarTopic];
      }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Student Roadmap Calendar</h3>
        </div>
      </div>
        <>
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
                                    topic={{
                                      id: topicItem.id,
                                      topic_name: topicItem.topicName,
                                      is_completed: topicItem.status === 'completed',
                                      theory_completed: false,
                                      day_number: 0
                                    }}
                                    subject={topicItem.subject}
                                    chapterName={topicItem.chapterName}
                                    gameCompletionRate={topicItem.gameCompletionRate}
                                    gamesCompleted={topicItem.gamesCompleted}
                                    totalGames={topicItem.totalGames}
                                    isToday={isToday}
                                    isPast={isPast}
                                    isEmpty={topicItem.isEmpty}
                                  />
                              ))}
                            </div>
                          </td>
                        ) : (
                          subjects.map(subject => (
                            <td key={`${date}-${subject}`} className="border p-2 align-top">
                              <div className="min-h-[80px]">
                                {groupedByDateSubject[date][subject]?.map(topicItem => (
                                    <TopicCard
                                      key={topicItem.id}
                                      topic={{
                                        id: topicItem.id,
                                        topic_name: topicItem.topicName,
                                        is_completed: topicItem.status === 'completed',
                                        theory_completed: false,
                                        day_number: 0
                                      }}
                                      subject={topicItem.subject}
                                      chapterName={topicItem.chapterName}
                                      gameCompletionRate={topicItem.gameCompletionRate}
                                      gamesCompleted={topicItem.gamesCompleted}
                                      totalGames={topicItem.totalGames}
                                      isToday={isToday}
                                      isPast={isPast}
                                      isEmpty={topicItem.isEmpty}
                                    />
                                ))}
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

          {/* Legend - Only show in calendar view */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="text-sm font-semibold mb-2">Progress Indicators</h3>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span>0-25% Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500"></div>
                <span>25-75% Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span>75-100% Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-primary"></div>
                <span>Today's Topic</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Grid View - Detailed Test Analysis */
        <div className="space-y-4">
          {Object.keys(testAnalysis).length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {Object.keys(testAnalysis).map((subject) => (
                <AccordionItem key={subject} value={subject}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">{subject}</span>
                      <Badge variant="secondary">
                        {testAnalysis[subject].length} tests
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {testAnalysis[subject].map((test, idx) => (
                        <div
                          key={`${test.test_id}-${idx}`}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {test.passed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{test.test_title}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(test.submitted_at).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className={`text-lg font-bold ${test.passed ? 'text-green-600' : 'text-red-600'}`}>
                              {test.percentage.toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {test.score}/{test.total_marks}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No test data available yet.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
