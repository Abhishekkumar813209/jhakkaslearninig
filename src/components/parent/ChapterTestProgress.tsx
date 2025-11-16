import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface TestAttempt {
  test_id: string;
  test_title: string;
  score: number;
  total_marks: number;
  percentage: number;
  submitted_at: string;
  passed: boolean;
}

interface SubjectData {
  name: string;
  chapters: Array<{
    id: string;
    chapter_name: string;
    day_start: number;
    day_end: number;
    progress: number;
    topics: any[];
  }>;
}

interface ChapterTestProgressProps {
  roadmapData: SubjectData[];
  testAnalysis: Record<string, TestAttempt[]>;
  chapterStatuses: Record<string, number>;
}

export function ChapterTestProgress({
  roadmapData,
  testAnalysis,
  chapterStatuses
}: ChapterTestProgressProps) {

  return (
    <div className="space-y-6">
      {roadmapData.map((subject) => (
        <div key={subject.name}>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>{subject.name}</span>
            <Badge variant="outline">
              {subject.chapters.length} chapters
            </Badge>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {subject.chapters.map((chapter) => {
              const completedTests = chapterStatuses[chapter.id] || 0;
              const hasTests = completedTests > 0;
              
              return (
                <div
                  key={chapter.id}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${hasTests
                      ? 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-800'
                      : 'bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-800'}
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm flex-1">
                      {chapter.chapter_name}
                    </h4>
                    {hasTests ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}
                  </div>
                  
                  <Badge
                    variant={hasTests ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {completedTests} tests completed
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
