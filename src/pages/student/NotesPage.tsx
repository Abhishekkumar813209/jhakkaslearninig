import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, ExternalLink, BookOpen, Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

interface LectureWithNotes {
  id: string;
  title: string;
  lecture_notes_url: string;
  video_duration_seconds: number;
  chapter_id: string;
  chapter_name?: string;
  subject?: string;
}

interface ChapterWithNotes {
  id: string;
  chapter_name: string;
  chapter_notes_url: string;
  subject: string;
}

export default function NotesPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [lectureNotes, setLectureNotes] = useState<LectureWithNotes[]>([]);
  const [chapterNotes, setChapterNotes] = useState<ChapterWithNotes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.batch_id) {
      fetchNotes();
    }
  }, [profile?.batch_id]);

  const fetchNotes = async () => {
    if (!profile?.batch_id) return;
    
    setLoading(true);
    try {
      // Fetch batch details to get linked roadmap
      const { data: batch } = await supabase
        .from("batches")
        .select("linked_roadmap_id")
        .eq("id", profile.batch_id)
        .single();

      if (!batch?.linked_roadmap_id) {
        setLoading(false);
        return;
      }

      // Fetch all chapters from the roadmap
      const { data: roadmapChapters } = await supabase
        .from("roadmap_chapters")
        .select("id, chapter_name, subject")
        .eq("roadmap_id", batch.linked_roadmap_id);

      if (!roadmapChapters) {
        setLoading(false);
        return;
      }

      const chapterIds = roadmapChapters.map(c => c.id);
      const chapterMap = new Map(roadmapChapters.map(c => [c.id, { name: c.chapter_name, subject: c.subject }]));

      // Fetch lectures with notes
      const { data: lectures } = await supabase
        .from("chapter_lectures" as any)
        .select("id, title, lecture_notes_url, video_duration_seconds, chapter_id")
        .in("chapter_id", chapterIds)
        .not("lecture_notes_url", "is", null)
        .eq("is_published", true);

      if (lectures) {
        const lecturesWithChapterInfo = (lectures as any[]).map(l => ({
          ...l,
          chapter_name: chapterMap.get(l.chapter_id)?.name,
          subject: chapterMap.get(l.chapter_id)?.subject
        }));
        setLectureNotes(lecturesWithChapterInfo);
      }

      // Fetch chapter library notes
      const chapterNames = roadmapChapters.map(c => c.chapter_name);
      const { data: chapterLibrary } = await supabase
        .from("chapter_library")
        .select("id, chapter_name, chapter_notes_url, subject")
        .in("chapter_name", chapterNames)
        .not("chapter_notes_url", "is", null);

      if (chapterLibrary) {
        setChapterNotes(chapterLibrary as ChapterWithNotes[]);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupBySubject = <T extends { subject?: string }>(items: T[]): Record<string, T[]> => {
    return items.reduce((acc, item) => {
      const subject = item.subject || "Other";
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  };

  const lecturesBySubject = groupBySubject(lectureNotes);
  const chaptersBySubject = groupBySubject(chapterNotes);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Study Notes</h1>
            <p className="text-sm text-muted-foreground">Access your lecture and chapter notes</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="lecture-notes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lecture-notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lecture Notes
            </TabsTrigger>
            <TabsTrigger value="chapter-notes" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Chapter Notes
            </TabsTrigger>
          </TabsList>

          {/* Lecture Notes Tab */}
          <TabsContent value="lecture-notes" className="mt-4 space-y-4">
            {lectureNotes.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Lecture Notes Available</h3>
                <p className="text-muted-foreground">
                  Notes will appear here when your teachers upload them.
                </p>
              </Card>
            ) : (
              Object.entries(lecturesBySubject).map(([subject, lectures]) => (
                <div key={subject} className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Badge variant="outline">{subject}</Badge>
                    <span className="text-sm text-muted-foreground">({lectures.length} notes)</span>
                  </h3>
                  <Card className="divide-y divide-border">
                    {lectures.map((lecture) => (
                      <div
                        key={lecture.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-1">{lecture.title}</h4>
                          <p className="text-xs text-muted-foreground">{lecture.chapter_name}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0 text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/20"
                          onClick={() => window.open(lecture.lecture_notes_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </Card>
                </div>
              ))
            )}
          </TabsContent>

          {/* Chapter Notes Tab */}
          <TabsContent value="chapter-notes" className="mt-4 space-y-4">
            {chapterNotes.length === 0 ? (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Chapter Notes Available</h3>
                <p className="text-muted-foreground">
                  Compiled chapter notes will appear here when available.
                </p>
              </Card>
            ) : (
              Object.entries(chaptersBySubject).map(([subject, chapters]) => (
                <div key={subject} className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Badge variant="outline">{subject}</Badge>
                    <span className="text-sm text-muted-foreground">({chapters.length} chapters)</span>
                  </h3>
                  <Card className="divide-y divide-border">
                    {chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-1">{chapter.chapter_name}</h4>
                          <p className="text-xs text-muted-foreground">Complete chapter notes</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0 text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/20"
                          onClick={() => window.open(chapter.chapter_notes_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </Card>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
