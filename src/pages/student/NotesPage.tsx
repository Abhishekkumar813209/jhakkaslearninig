import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, ExternalLink, BookOpen, Loader2, ChevronRight, FolderOpen } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

interface SubjectData {
  subject: string;
  chapterCount: number;
}

interface ChapterData {
  id: string;
  chapter_name: string;
  subject: string;
  chapter_notes_url?: string | null;
}

interface LectureData {
  id: string;
  title: string;
  lecture_notes_url: string;
  lecture_order: number;
}

type ViewLevel = "subjects" | "chapters" | "lectures";

export default function NotesPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  
  // Navigation state
  const [activeTab, setActiveTab] = useState<"topic" | "chapter">("topic");
  const [viewLevel, setViewLevel] = useState<ViewLevel>("subjects");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterData | null>(null);
  
  // Data state
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [lectures, setLectures] = useState<LectureData[]>([]);
  const [roadmapId, setRoadmapId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.batch_id) {
      fetchBatchRoadmap();
    }
  }, [profile?.batch_id]);

  useEffect(() => {
    if (roadmapId) {
      fetchSubjects();
    }
  }, [roadmapId]);

  useEffect(() => {
    if (selectedSubject && roadmapId) {
      fetchChapters();
    }
  }, [selectedSubject, roadmapId]);

  useEffect(() => {
    if (selectedChapter && activeTab === "topic") {
      fetchLectures();
    }
  }, [selectedChapter, activeTab]);

  const fetchBatchRoadmap = async () => {
    if (!profile?.batch_id) return;
    
    try {
      const { data: batch } = await supabase
        .from("batches")
        .select("linked_roadmap_id")
        .eq("id", profile.batch_id)
        .single();

      if (batch?.linked_roadmap_id) {
        setRoadmapId(batch.linked_roadmap_id);
      }
    } catch (error) {
      console.error("Error fetching batch:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    if (!roadmapId) return;
    
    try {
      const { data: roadmapChapters } = await supabase
        .from("roadmap_chapters")
        .select("subject")
        .eq("roadmap_id", roadmapId);

      if (roadmapChapters) {
        const subjectCounts = roadmapChapters.reduce((acc, ch) => {
          const subject = ch.subject || "Other";
          acc[subject] = (acc[subject] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setSubjects(
          Object.entries(subjectCounts).map(([subject, count]) => ({
            subject,
            chapterCount: count,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchChapters = async () => {
    if (!roadmapId || !selectedSubject) return;
    
    setLoading(true);
    try {
      const { data: roadmapChapters } = await supabase
        .from("roadmap_chapters")
        .select("id, chapter_name, subject")
        .eq("roadmap_id", roadmapId)
        .eq("subject", selectedSubject);

      if (roadmapChapters) {
        // For chapter notes tab, also fetch chapter_library notes
        if (activeTab === "chapter") {
          const chapterNames = roadmapChapters.map(c => c.chapter_name);
          const { data: libraryNotes } = await supabase
            .from("chapter_library")
            .select("chapter_name, chapter_notes_url")
            .in("chapter_name", chapterNames);

          const notesMap = new Map(
            (libraryNotes || []).map(n => [n.chapter_name, n.chapter_notes_url])
          );

          setChapters(
            roadmapChapters.map(ch => ({
              ...ch,
              chapter_notes_url: notesMap.get(ch.chapter_name) || null,
            }))
          );
        } else {
          setChapters(roadmapChapters);
        }
      }
    } catch (error) {
      console.error("Error fetching chapters:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLectures = async () => {
    if (!selectedChapter) return;
    
    setLoading(true);
    try {
      const { data } = await supabase
        .from("chapter_lectures")
        .select("id, title, lecture_notes_url, lecture_order")
        .eq("chapter_id", selectedChapter.id)
        .not("lecture_notes_url", "is", null)
        .eq("is_published", true)
        .order("lecture_order", { ascending: true });

      if (data) {
        setLectures(data as unknown as LectureData[]);
      }
    } catch (error) {
      console.error("Error fetching lectures:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClick = (subject: string) => {
    setSelectedSubject(subject);
    setViewLevel("chapters");
    setChapters([]);
    setLectures([]);
  };

  const handleChapterClick = (chapter: ChapterData) => {
    if (activeTab === "chapter" && chapter.chapter_notes_url) {
      // Open chapter notes directly
      window.open(chapter.chapter_notes_url, "_blank");
    } else if (activeTab === "topic") {
      // Navigate to lectures
      setSelectedChapter(chapter);
      setViewLevel("lectures");
      setLectures([]);
    }
  };

  const handleBack = () => {
    if (viewLevel === "lectures") {
      setViewLevel("chapters");
      setSelectedChapter(null);
      setLectures([]);
    } else if (viewLevel === "chapters") {
      setViewLevel("subjects");
      setSelectedSubject(null);
      setChapters([]);
    } else {
      navigate("/");
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "topic" | "chapter");
    setViewLevel("subjects");
    setSelectedSubject(null);
    setSelectedChapter(null);
    setChapters([]);
    setLectures([]);
  };

  const getBreadcrumb = () => {
    const parts = [];
    if (selectedSubject) parts.push(selectedSubject);
    if (selectedChapter) parts.push(selectedChapter.chapter_name);
    return parts.join(" → ");
  };

  if (loading && !subjects.length) {
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
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Study Notes</h1>
            {viewLevel !== "subjects" && (
              <p className="text-sm text-muted-foreground">{getBreadcrumb()}</p>
            )}
            {viewLevel === "subjects" && (
              <p className="text-sm text-muted-foreground">Select a subject to view notes</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="topic" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Topic Wise Notes
            </TabsTrigger>
            <TabsTrigger value="chapter" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Chapter Notes
            </TabsTrigger>
          </TabsList>

          {/* Content for both tabs - same navigation pattern */}
          <TabsContent value={activeTab} className="mt-4 space-y-4">
            {/* Subjects View */}
            {viewLevel === "subjects" && (
              <>
                {subjects.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Subjects Found</h3>
                    <p className="text-muted-foreground">
                      Your batch doesn't have any subjects assigned yet.
                    </p>
                  </Card>
                ) : (
                  <Card className="divide-y divide-border">
                    {subjects.map((subject) => (
                      <div
                        key={subject.subject}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleSubjectClick(subject.subject)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{subject.subject}</h4>
                            <p className="text-xs text-muted-foreground">
                              {subject.chapterCount} chapters
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ))}
                  </Card>
                )}
              </>
            )}

            {/* Chapters View */}
            {viewLevel === "chapters" && (
              <>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : chapters.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Chapters Found</h3>
                    <p className="text-muted-foreground">
                      No chapters available for {selectedSubject}.
                    </p>
                  </Card>
                ) : (
                  <Card className="divide-y divide-border">
                    {chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                          activeTab === "chapter" && !chapter.chapter_notes_url
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                        onClick={() => {
                          if (activeTab === "topic" || chapter.chapter_notes_url) {
                            handleChapterClick(chapter);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <h4 className="font-medium">{chapter.chapter_name}</h4>
                            {activeTab === "chapter" && (
                              <p className="text-xs text-muted-foreground">
                                {chapter.chapter_notes_url ? "Notes available" : "No notes yet"}
                              </p>
                            )}
                            {activeTab === "topic" && (
                              <p className="text-xs text-muted-foreground">
                                Click to view lecture notes
                              </p>
                            )}
                          </div>
                        </div>
                        {activeTab === "chapter" && chapter.chapter_notes_url ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/20"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </Button>
                        ) : activeTab === "topic" ? (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    ))}
                  </Card>
                )}
              </>
            )}

            {/* Lectures View (Topic Wise only) */}
            {viewLevel === "lectures" && activeTab === "topic" && (
              <>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : lectures.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Topic Notes Available</h3>
                    <p className="text-muted-foreground">
                      No lecture notes uploaded for {selectedChapter?.chapter_name} yet.
                    </p>
                  </Card>
                ) : (
                  <Card className="divide-y divide-border">
                    {lectures.map((lecture, index) => (
                      <div
                        key={lecture.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2">{lecture.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              Lecture {lecture.lecture_order}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0 text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/20"
                          onClick={() => window.open(lecture.lecture_notes_url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
