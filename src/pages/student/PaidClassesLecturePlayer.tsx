import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LecturePlayer from "@/components/student/LecturePlayer";

interface Lecture {
  id: string;
  title: string;
  youtube_video_id: string;
  video_duration_seconds: number;
  chapter: number;
  lecture_notes_url?: string;
  lecture_notes_title?: string;
}

interface LocationState {
  subjectName?: string;
  fromPaidClasses?: boolean;
}

const PaidClassesLecturePlayer = () => {
  const { chapterId, lectureId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const state = location.state as LocationState;
  
  const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
  const [playlist, setPlaylist] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLecture();
    fetchPlaylist();
  }, [lectureId, chapterId]);

  const fetchLecture = async () => {
    const { data, error } = await supabase
      .from("chapter_lectures" as any)
      .select("*")
      .eq("id", lectureId)
      .single();

    if (error) {
      toast({
        title: "Failed to load lecture",
        description: error.message,
        variant: "destructive"
      });
      navigate(-1);
    } else if (data) {
      const lecture = data as any;
      setCurrentLecture({
        id: lecture.id,
        title: lecture.title,
        youtube_video_id: lecture.youtube_video_id,
        video_duration_seconds: lecture.video_duration_seconds,
        chapter: lecture.lecture_order,
        lecture_notes_url: lecture.lecture_notes_url,
        lecture_notes_title: lecture.lecture_notes_title
      });
    }
    setLoading(false);
  };

  const fetchPlaylist = async () => {
    const { data, error } = await supabase
      .from("chapter_lectures" as any)
      .select("*")
      .eq("chapter_id", chapterId)
      .eq("is_published", true)
      .order("lecture_order");

    if (!error && data) {
      const lectures = data as any[];
      setPlaylist(lectures.map(l => ({
        id: l.id,
        title: l.title,
        youtube_video_id: l.youtube_video_id,
        video_duration_seconds: l.video_duration_seconds,
        chapter: l.lecture_order,
        lecture_notes_url: l.lecture_notes_url,
        lecture_notes_title: l.lecture_notes_title
      })));
    }
  };

  const handleComplete = async (watchTimeSeconds: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentLecture) return;

    await supabase.from("student_lecture_progress" as any).upsert({
      student_id: user.id,
      chapter_lecture_id: currentLecture.id,
      watch_time_seconds: watchTimeSeconds,
      is_completed: watchTimeSeconds >= currentLecture.video_duration_seconds * 0.8,
      last_watched_at: new Date().toISOString()
    });

    if (watchTimeSeconds >= currentLecture.video_duration_seconds * 0.8) {
      const { data: lectureData } = await supabase
        .from("chapter_lectures" as any)
        .select("xp_reward")
        .eq("id", currentLecture.id)
        .single();

      const xpReward = (lectureData as any)?.xp_reward;
      if (xpReward) {
        await supabase.functions.invoke("jhakkas-points-system", {
          body: {
            action: "add",
            student_id: user.id,
            amount: xpReward,
            source: "lecture_completed"
          }
        });

        toast({
          title: `+${xpReward} XP`,
          description: "Lecture completed!"
        });
      }
    }
  };

  const handleNext = () => {
    const currentIndex = playlist.findIndex(l => l.id === lectureId);
    if (currentIndex < playlist.length - 1) {
      navigate(`/student/paid-classes/chapter/${chapterId}/lecture/${playlist[currentIndex + 1].id}`, {
        state: { subjectName: state?.subjectName, fromPaidClasses: true }
      });
    }
  };

  const handlePrevious = () => {
    const currentIndex = playlist.findIndex(l => l.id === lectureId);
    if (currentIndex > 0) {
      navigate(`/student/paid-classes/chapter/${chapterId}/lecture/${playlist[currentIndex - 1].id}`, {
        state: { subjectName: state?.subjectName, fromPaidClasses: true }
      });
    }
  };

  const handleBackToPlaylist = () => {
    // Go back to paid classes lecture list
    navigate(`/student/paid-classes/chapter/${chapterId}/lectures`, {
      state: { subjectName: state?.subjectName }
    });
  };

  if (loading || !currentLecture) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading lecture...</p>
        </div>
      </div>
    );
  }

  return (
    <LecturePlayer
      lecture={{
        id: currentLecture.id,
        title: currentLecture.title,
        youtube_video_id: currentLecture.youtube_video_id,
        duration_seconds: currentLecture.video_duration_seconds,
        order_num: currentLecture.chapter,
        chapter: chapterId || "",
        lecture_notes_url: currentLecture.lecture_notes_url,
        lecture_notes_title: currentLecture.lecture_notes_title
      }}
      playlistId={chapterId || ""}
      playlistTitle="Chapter Lectures"
      lectures={playlist.map(l => ({
        id: l.id,
        title: l.title,
        youtube_video_id: l.youtube_video_id,
        duration_seconds: l.video_duration_seconds,
        order_num: l.chapter,
        chapter: chapterId || "",
        lecture_notes_url: l.lecture_notes_url,
        lecture_notes_title: l.lecture_notes_title
      }))}
      onClose={handleBackToPlaylist}
      onLectureChange={(id) => navigate(`/student/paid-classes/chapter/${chapterId}/lecture/${id}`, {
        state: { subjectName: state?.subjectName, fromPaidClasses: true }
      })}
    />
  );
};

export default PaidClassesLecturePlayer;