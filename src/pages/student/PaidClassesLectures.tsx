import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, CheckCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  youtube_video_id: string;
  video_duration_seconds: number;
  thumbnail_url: string | null;
  lecture_order: number;
  xp_reward: number;
  lecture_notes_url: string | null;
}

interface LectureProgress {
  chapter_lecture_id: string;
  watch_time_seconds: number;
  is_completed: boolean;
}

interface LocationState {
  subjectName?: string;
  roadmapId?: string;
}

export default function PaidClassesLectures() {
  const navigate = useNavigate();
  const { chapterId } = useParams();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [progress, setProgress] = useState<Map<string, LectureProgress>>(new Map());
  const [chapterName, setChapterName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLectures();
    fetchProgress();
    fetchChapterName();
  }, [chapterId]);

  const fetchLectures = async () => {
    const { data, error } = await supabase
      .from("chapter_lectures" as any)
      .select("*")
      .eq("chapter_id", chapterId)
      .eq("is_published", true)
      .order("lecture_order");

    if (!error && data) {
      setLectures(data as any);
    }
    setLoading(false);
  };

  const fetchProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("student_lecture_progress" as any)
      .select("*")
      .eq("student_id", user.id);

    if (!error && data) {
      const progressMap = new Map();
      (data as any[]).forEach((p: any) => {
        progressMap.set(p.chapter_lecture_id, p);
      });
      setProgress(progressMap);
    }
  };

  const fetchChapterName = async () => {
    const { data, error } = await supabase
      .from("roadmap_chapters")
      .select("chapter_name")
      .eq("id", chapterId)
      .single();

    if (!error && data) {
      setChapterName(data.chapter_name);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const parseLectureTitle = (fullTitle: string): { mainTitle: string; context: string } => {
    const parts = fullTitle.split(/\s*[|•]\s*/);
    let mainTitle = parts[0].trim();
    mainTitle = mainTitle.replace(/\s*in\s+\d+\s+minutes?\s*/gi, "").trim();
    mainTitle = mainTitle.replace(/\s*[🔥⚡️💡📚✨]+\s*$/g, "").trim();
    
    let context = "";
    const contextMatches = fullTitle.match(/(?:Rapid Revision|Quick Learning|One Shot|Complete Chapter|Practice Session)/i);
    if (contextMatches) {
      context = contextMatches[0];
    }
    
    return { mainTitle, context };
  };

  const extractMetadata = (title: string): { className?: string; subject?: string } => {
    const classMatch = title.match(/Class\s*(\d+(?:th|st|nd|rd)?)/i);
    const subjectMatch = title.match(/(?:Science|Math|Physics|Chemistry|Biology|English|History|Geography)/i);
    
    return {
      className: classMatch ? `Class ${classMatch[1]}` : undefined,
      subject: subjectMatch ? subjectMatch[0] : undefined
    };
  };

  const getProgressPercentage = (lectureId: string, duration: number): number => {
    const prog = progress.get(lectureId);
    if (!prog) return 0;
    return Math.min(100, (prog.watch_time_seconds / duration) * 100);
  };

  const handleLectureClick = (lectureId: string) => {
    // Navigate to lecture player with paid-classes context
    navigate(`/student/paid-classes/chapter/${chapterId}/lecture/${lectureId}`, {
      state: { subjectName: state?.subjectName, fromPaidClasses: true }
    });
  };

  const handleBack = () => {
    // Go back to paid classes page (chapter selection)
    navigate('/student/paid-classes');
  };

  // Calculate totals for summary
  const totalCompleted = Array.from(progress.values()).filter((p) => p.is_completed).length;
  const totalDuration = lectures.reduce((acc, l) => acc + l.video_duration_seconds, 0);
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{chapterName}</h1>
            {state?.subjectName && (
              <p className="text-sm text-muted-foreground">{state.subjectName}</p>
            )}
          </div>
        </div>

        {/* Summary Stats Card */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 md:gap-4 flex-wrap">
              <span className="font-medium">
                {lectures.length} {lectures.length === 1 ? 'lecture' : 'lectures'}
              </span>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <span className="text-muted-foreground">
                {totalHours > 0 && `${totalHours}h `}{totalMinutes}m total
              </span>
            </div>
            <div className="text-muted-foreground text-xs md:text-sm">
              {totalCompleted}/{lectures.length} completed
            </div>
          </div>
          {totalCompleted > 0 && (
            <Progress 
              value={(totalCompleted / lectures.length) * 100} 
              className="h-1.5 mt-3"
            />
          )}
        </Card>

        {/* Lecture List */}
        <div className="space-y-3">
          {lectures.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No lectures available for this chapter yet.</p>
            </Card>
          ) : (
            <Card className="divide-y divide-border">
              {lectures.map((lecture, index) => {
                const prog = progress.get(lecture.id);
                const progressPercent = getProgressPercentage(lecture.id, lecture.video_duration_seconds);
                const isCompleted = prog?.is_completed || false;
                const { mainTitle } = parseLectureTitle(lecture.title);
                const metadata = extractMetadata(lecture.title);

                return (
                  <div
                    key={lecture.id}
                    className="group hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleLectureClick(lecture.id)}
                  >
                    <div className="flex items-center gap-3 p-3 md:p-4">
                      <div className="flex-shrink-0 flex items-center justify-center">
                        <div className={`
                          relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                          ${isCompleted 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-primary/10 text-primary'
                          }
                        `}>
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <PlayCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`
                          font-medium text-sm md:text-base line-clamp-1
                          ${isCompleted ? 'text-muted-foreground' : ''}
                        `}>
                          {index + 1}. {mainTitle}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <PlayCircle className="h-3 w-3" />
                            {formatDuration(lecture.video_duration_seconds)}
                          </span>
                          
                          {metadata.className && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="hidden sm:inline">{metadata.className}</span>
                            </>
                          )}
                          
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">{lecture.xp_reward} XP</span>
                          
                          {lecture.lecture_notes_url && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(lecture.lecture_notes_url!, '_blank');
                                }}
                                className="hidden sm:inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 dark:text-orange-400"
                              >
                                <FileText className="h-3 w-3" />
                                Notes
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 hidden md:flex items-center gap-2">
                        {lecture.lecture_notes_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(lecture.lecture_notes_url!, '_blank');
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Notes
                          </Button>
                        )}
                        {isCompleted ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                            Completed
                          </Badge>
                        ) : progressPercent > 0 ? (
                          <Badge variant="outline">
                            {Math.round(progressPercent)}%
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {progressPercent > 0 && !isCompleted && (
                      <div className="px-3 pb-2 md:px-4">
                        <Progress value={progressPercent} className="h-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}