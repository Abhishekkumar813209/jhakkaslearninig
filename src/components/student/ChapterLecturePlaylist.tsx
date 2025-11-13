import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, CheckCircle } from "lucide-react";
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
}

interface LectureProgress {
  chapter_lecture_id: string;
  watch_time_seconds: number;
  is_completed: boolean;
}

export default function ChapterLecturePlaylist() {
  const navigate = useNavigate();
  const { roadmapId, chapterId } = useParams();
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

  const getProgressPercentage = (lectureId: string, duration: number): number => {
    const prog = progress.get(lectureId);
    if (!prog) return 0;
    return Math.min(100, (prog.watch_time_seconds / duration) * 100);
  };

  const handleLectureClick = (lectureId: string) => {
    navigate(`/student/roadmap/${roadmapId}/chapter/${chapterId}/lecture/${lectureId}`);
  };

  const totalCompleted = Array.from(progress.values()).filter((p) => p.is_completed).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{chapterName}</h1>
            <p className="text-muted-foreground">
              {totalCompleted} of {lectures.length} lectures completed
            </p>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Chapter Progress</span>
              <span className="text-muted-foreground">
                {Math.round((totalCompleted / lectures.length) * 100)}%
              </span>
            </div>
            <Progress value={(totalCompleted / lectures.length) * 100} />
          </div>
        </Card>

        {/* Lectures List */}
        <div className="space-y-3">
          {lectures.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No lectures available for this chapter yet.</p>
            </Card>
          ) : (
            lectures.map((lecture) => {
              const prog = progress.get(lecture.id);
              const progressPercent = getProgressPercentage(lecture.id, lecture.video_duration_seconds);
              const isCompleted = prog?.is_completed || false;

              return (
                <Card
                  key={lecture.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleLectureClick(lecture.id)}
                >
                  <div className="flex gap-4">
                    <div className="relative">
                      <img
                        src={lecture.thumbnail_url || ""}
                        alt={lecture.title}
                        className="w-48 h-28 object-cover rounded"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                        {isCompleted ? (
                          <CheckCircle className="h-10 w-10 text-green-500" />
                        ) : (
                          <PlayCircle className="h-10 w-10 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{lecture.title}</h3>
                          {lecture.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {lecture.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {formatDuration(lecture.video_duration_seconds)}
                        </Badge>
                        <Badge variant="secondary">{lecture.xp_reward} XP</Badge>
                        {isCompleted && (
                          <Badge className="bg-green-600">Completed</Badge>
                        )}
                      </div>
                      {progressPercent > 0 && !isCompleted && (
                        <div className="space-y-1">
                          <Progress value={progressPercent} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {Math.round(progressPercent)}% watched
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
