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
  chapterStatuses: Record<string, { total: number; completed: number }>;
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
              const chapterData = chapterStatuses[chapter.id] || { total: 0, completed: 0 };
              const { total, completed } = chapterData;
              const completionPercentage = total > 0 ? (completed / total) * 100 : 0;
              
              return (
                <div
                  key={chapter.id}
                  className="relative p-4 rounded-lg border-2 transition-all overflow-hidden"
                >
                  {/* Background gradient fill based on completion */}
                  <div
                    className="absolute inset-0 transition-all duration-500"
                    style={{
                      background: completionPercentage === 0 
                        ? 'hsl(var(--destructive) / 0.1)'
                        : completionPercentage === 100
                        ? 'hsl(142 76% 36% / 0.1)'
                        : `linear-gradient(to right, hsl(142 76% 36% / 0.1) ${completionPercentage}%, hsl(var(--destructive) / 0.1) ${completionPercentage}%)`
                    }}
                  />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm flex-1">
                        {chapter.chapter_name}
                      </h4>
                      {completed === total && total > 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      )}
                    </div>
                    
                    <Badge
                      variant={completed === total && total > 0 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {completed} / {total} tests completed
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
