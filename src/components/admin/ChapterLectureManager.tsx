import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, PlayCircle, GripVertical, FileText, HelpCircle } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";
import { useBoards } from "@/hooks/useBoards";
import { useExamTypes } from "@/hooks/useExamTypes";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolveActiveRoadmapIdForBatch } from "@/lib/roadmapHelpers";
import LectureQuestionManager from "./LectureQuestionManager";


interface ChapterLecture {
  id: string;
  title: string;
  description: string | null;
  youtube_video_id: string;
  video_duration_seconds: number;
  thumbnail_url: string | null;
  lecture_order: number;
  xp_reward: number;
  is_published: boolean;
  lecture_notes_url: string | null;
}

export default function ChapterLectureManager() {
  const { toast } = useToast();
  const { batches } = useBatches();
  const [selectedDomain, setSelectedDomain] = useState("");
  const { boards } = useBoards(selectedDomain);
  const { examTypes } = useExamTypes();

  const [selectedBoard, setSelectedBoard] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");

  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<Array<{ id: string; chapter_name: string }>>([]);
  const [lectures, setLectures] = useState<ChapterLecture[]>([]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoDetails, setVideoDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [xpReward, setXpReward] = useState(10);
  const [lectureNotesUrl, setLectureNotesUrl] = useState("");
  
  // Question manager state
  const [managingQuestionsLecture, setManagingQuestionsLecture] = useState<ChapterLecture | null>(null);

  // Cascade reset handlers
  const handleDomainSelect = (domain: string) => {
    setSelectedDomain(domain);
    setSelectedBoard("");
    setSelectedClass("");
    setSelectedBatch("");
    setSelectedSubject("");
    setSelectedChapter("");
    setSubjects([]);
    setChapters([]);
    setLectures([]);
  };

  const handleBoardSelect = (board: string) => {
    setSelectedBoard(board);
    setSelectedBatch("");
    setSelectedSubject("");
    setSelectedChapter("");
    setSubjects([]);
    setChapters([]);
    setLectures([]);
  };

  const handleClassSelect = (classNum: string) => {
    setSelectedClass(classNum);
    setSelectedBatch("");
    setSelectedSubject("");
    setSelectedChapter("");
    setSubjects([]);
    setChapters([]);
    setLectures([]);
  };

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatch(batchId);
    setSelectedSubject("");
    setSelectedChapter("");
    setSubjects([]);
    setChapters([]);
    setLectures([]);
  };

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    setSelectedChapter("");
    setChapters([]);
    setLectures([]);
  };

  // Fetch subjects when batch is selected
  useEffect(() => {
    if (selectedBatch && batches.length > 0) {
      fetchSubjects();
    }
  }, [selectedBatch, batches]);

  // Fetch chapters when subject is selected
  useEffect(() => {
    if (selectedBatch && selectedSubject && batches.length > 0) {
      fetchChapters();
    }
  }, [selectedBatch, selectedSubject, batches]);

  // Fetch lectures when chapter is selected
  useEffect(() => {
    if (selectedChapter) {
      fetchLectures();
    }
  }, [selectedChapter]);

  const fetchSubjects = async () => {
    const batch = batches.find((b) => b.id === selectedBatch);
    if (!batch) return;

    const roadmapId = await resolveActiveRoadmapIdForBatch(
      selectedBatch,
      batch.linked_roadmap_id
    );

    if (!roadmapId) {
      toast({
        title: "No roadmap found",
        description: "This batch has no linked roadmap. Please create one in the Roadmaps tab.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("roadmap_chapters")
      .select("subject")
      .eq("roadmap_id", roadmapId);

    if (error) {
      console.error("Error fetching subjects:", error);
      toast({
        title: "Failed to fetch subjects",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      const uniqueSubjects = [...new Set(data.map((r) => r.subject))];
      setSubjects(uniqueSubjects);
    }
  };

  const fetchChapters = async () => {
    const batch = batches.find((b) => b.id === selectedBatch);
    if (!batch) return;

    const roadmapId = await resolveActiveRoadmapIdForBatch(
      selectedBatch,
      batch.linked_roadmap_id
    );

    if (!roadmapId) {
      toast({
        title: "No roadmap found",
        description: "This batch has no linked roadmap. Please create one in the Roadmaps tab.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("roadmap_chapters")
      .select("id, chapter_name")
      .eq("roadmap_id", roadmapId)
      .eq("subject", selectedSubject)
      .order("chapter_name");

    if (error) {
      console.error("Error fetching chapters:", error);
      toast({
        title: "Failed to fetch chapters",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setChapters(data);
    }
  };

  const fetchLectures = async () => {
    const { data, error } = await supabase
      .from("chapter_lectures" as any)
      .select("*")
      .eq("chapter_id", selectedChapter)
      .order("lecture_order");

    if (!error && data) {
      setLectures(data as any);
    }
  };

  const handleAutoFetch = async () => {
    if (!youtubeUrl.trim()) {
      toast({ title: "Please enter a YouTube URL", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Extract video ID
      const videoId = extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      // Call youtube-video-details edge function
      const { data, error } = await supabase.functions.invoke("youtube-video-details", {
        body: { videoId }
      });

      if (error) throw error;

      setVideoDetails({ ...data, videoId });
      toast({ title: "Video details fetched successfully!" });
    } catch (error: any) {
      toast({
        title: "Failed to fetch video details",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\/\s]+)/,
      /youtube\.com\/embed\/([^&?\/\s]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSaveLecture = async () => {
    if (!videoDetails || !selectedChapter) {
      toast({ title: "Missing required data", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("chapter_lectures" as any).insert({
        chapter_id: selectedChapter,
        title: videoDetails.title,
        description: description || null,
        youtube_video_id: videoDetails.videoId,
        video_duration_seconds: videoDetails.duration_seconds,
        thumbnail_url: videoDetails.thumbnail,
        lecture_order: lectures.length + 1,
        xp_reward: xpReward,
        is_published: true,
        lecture_notes_url: lectureNotesUrl.trim() || null
      });

      if (error) throw error;

      toast({ title: "Lecture added successfully!" });
      setIsAddDialogOpen(false);
      resetForm();
      fetchLectures();
    } catch (error: any) {
      toast({
        title: "Failed to add lecture",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLecture = async (lectureId: string) => {
    if (!confirm("Are you sure you want to delete this lecture?")) return;

    const { error } = await supabase.from("chapter_lectures" as any).delete().eq("id", lectureId);

    if (error) {
      toast({ title: "Failed to delete lecture", variant: "destructive" });
    } else {
      toast({ title: "Lecture deleted successfully!" });
      fetchLectures();
    }
  };

  const resetForm = () => {
    setYoutubeUrl("");
    setVideoDetails(null);
    setDescription("");
    setXpReward(10);
    setLectureNotesUrl("");
  };

  const filteredBatches = batches.filter((b) => {
    if (selectedDomain && b.exam_type !== selectedDomain) return false;
    if (selectedBoard && b.target_board !== selectedBoard) return false;
    if (selectedClass && b.target_class !== selectedClass) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Chapter Lecture Manager</h2>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Exam Domain</Label>
            <Select value={selectedDomain} onValueChange={handleDomainSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select Domain" />
              </SelectTrigger>
              <SelectContent>
                {examTypes.map((et) => (
                  <SelectItem key={et.id} value={et.code}>
                    {et.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Board</Label>
            <Select value={selectedBoard} onValueChange={handleBoardSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select Board" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Class</Label>
            <Select value={selectedClass} onValueChange={handleClassSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => String(12 - i)).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Batch</Label>
            <Select value={selectedBatch} onValueChange={handleBatchSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select Batch" />
              </SelectTrigger>
              <SelectContent>
                {filteredBatches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={handleSubjectSelect} disabled={!selectedBatch}>
              <SelectTrigger>
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Chapter</Label>
            <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select Chapter" />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.chapter_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Lectures List */}
      {selectedChapter && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Lectures ({lectures.length})
            </h3>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lecture
                </Button>
              </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add YouTube Lecture</DialogTitle>
          </DialogHeader>
          
          {/* Scrollable content with visible native scrollbar */}
          <div
            className="h-[70vh] overflow-y-auto pr-3
                       [-ms-overflow-style:auto] [scrollbar-width:auto]
                       [&::-webkit-scrollbar]:w-3
                       [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40
                       [&::-webkit-scrollbar-thumb]:rounded-full
                       [&::-webkit-scrollbar-track]:bg-muted/30"
          >
            <div className="space-y-4">
              <div>
                <Label>YouTube URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  <Button onClick={handleAutoFetch} disabled={isLoading}>
                    {isLoading ? "Fetching..." : "Auto-Fetch"}
                  </Button>
                </div>
              </div>

              {videoDetails && (
                <>
                  <div className="border rounded-lg p-4 space-y-2">
                    <img
                      src={videoDetails.thumbnail}
                      alt={videoDetails.title}
                      className="max-h-48 w-full object-cover rounded-md"
                    />
                    <h4 className="font-semibold">{videoDetails.title}</h4>
                    <Badge variant="secondary">
                      {formatDuration(videoDetails.duration_seconds)}
                    </Badge>
                  </div>

                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a description..."
                    />
                  </div>

                  <div>
                    <Label>XP Reward</Label>
                    <Input
                      type="number"
                      value={xpReward}
                      onChange={(e) => setXpReward(parseInt(e.target.value))}
                      min={0}
                    />
                  </div>

                  <div>
                    <Label>Lecture Notes URL (Google Drive - Optional)</Label>
                    <Input
                      value={lectureNotesUrl}
                      onChange={(e) => setLectureNotesUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Paste Google Drive link for lecture-specific notes PDF
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Sticky footer so Save button is always reachable */}
            {videoDetails && (
              <div className="sticky bottom-0 left-0 right-0 bg-background pt-3 mt-4 border-t">
                <Button onClick={handleSaveLecture} disabled={isLoading} className="w-full">
                  Save Lecture
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {lectures.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No lectures added yet. Click "Add Lecture" to get started.
              </p>
            ) : (
              lectures.map((lecture) => (
                <Card key={lecture.id} className="p-4 flex items-center gap-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <img
                    src={lecture.thumbnail_url || ""}
                    alt={lecture.title}
                    className="w-24 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold">{lecture.title}</h4>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{formatDuration(lecture.video_duration_seconds)}</Badge>
                      <Badge variant="secondary">{lecture.xp_reward} XP</Badge>
                      {lecture.lecture_notes_url && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          <FileText className="h-3 w-3 mr-1" />
                          Notes
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManagingQuestionsLecture(lecture)}
                  >
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Questions
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteLecture(lecture.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Card>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Lecture Question Manager Dialog */}
      <Dialog open={!!managingQuestionsLecture} onOpenChange={(open) => !open && setManagingQuestionsLecture(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {managingQuestionsLecture && (
            <LectureQuestionManager
              lectureId={managingQuestionsLecture.id}
              lectureDuration={managingQuestionsLecture.video_duration_seconds}
              chapterId={selectedChapter}
              onClose={() => setManagingQuestionsLecture(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
