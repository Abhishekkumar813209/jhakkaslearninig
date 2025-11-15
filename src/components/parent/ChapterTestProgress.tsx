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
  chapterStatuses: Record<string, boolean>;
  onChapterDoubleClick: (chapterId: string) => void;
}

export function ChapterTestProgress({
  roadmapData,
  testAnalysis,
  chapterStatuses,
  onChapterDoubleClick
}: ChapterTestProgressProps) {
  
  // Helper: Check if chapter has completed tests
  const getChapterTestCount = (chapterId: string, chapterName: string) => {
    let count = 0;
    // Check testAnalysis for this chapter
    Object.values(testAnalysis).forEach((tests) => {
      tests.forEach((test) => {
        if (test.test_title.toLowerCase().includes(chapterName.toLowerCase())) {
          count++;
        }
      });
    });
    return count;
  };

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
              const testCount = getChapterTestCount(chapter.id, chapter.chapter_name);
              const hasTests = testCount > 0 || chapterStatuses[chapter.id];
              
              return (
                <div
                  key={chapter.id}
                  onDoubleClick={() => onChapterDoubleClick(chapter.id)}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${hasTests
                      ? 'bg-green-50 border-green-300 hover:bg-green-100 dark:bg-green-950 dark:border-green-800'
                      : 'bg-red-50 border-red-300 hover:bg-red-100 dark:bg-red-950 dark:border-red-800'}
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
                    {testCount} tests completed
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
