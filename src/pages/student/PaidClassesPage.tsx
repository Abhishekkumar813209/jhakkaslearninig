import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StudentAppLayout } from "@/components/student/StudentAppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen, PlayCircle, ChevronRight } from "lucide-react";

interface Chapter {
  id: string;
  chapter_name: string;
  progress: number;
  topics: Array<{ id: string; topic_name: string }>;
}

interface Subject {
  name: string;
  chapters: Chapter[];
}

interface RoadmapData {
  id: string;
  roadmap_id: string;
  subjects: Subject[];
}

const PaidClassesPage = () => {
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [chapterLectureCounts, setChapterLectureCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchRoadmap();
  }, []);

  useEffect(() => {
    if (roadmap) {
      fetchLectureCounts();
    }
  }, [roadmap]);

  const fetchRoadmap = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const { data, error } = await supabase.functions.invoke("student-roadmap-api", {
        body: { action: "get" },
        headers
      });

      if (error) throw error;
      if (data?.success && data?.roadmap) {
        setRoadmap(data.roadmap);
      }
    } catch (error: any) {
      console.error("Error fetching roadmap:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLectureCounts = async () => {
    if (!roadmap) return;
    
    try {
      const chapterIds = roadmap.subjects.flatMap(s => s.chapters.map(c => c.id));
      
      if (chapterIds.length === 0) return;

      const { data: lectures, error } = await supabase
        .from('chapter_lectures')
        .select('chapter_id')
        .in('chapter_id', chapterIds)
        .eq('is_published', true);

      if (error) throw error;

      const counts: Record<string, number> = {};
      lectures?.forEach((lecture: any) => {
        counts[lecture.chapter_id] = (counts[lecture.chapter_id] || 0) + 1;
      });
      
      setChapterLectureCounts(counts);
    } catch (error) {
      console.error("Error fetching lecture counts:", error);
    }
  };

  const handleChapterClick = (chapterId: string) => {
    if (roadmap) {
      navigate(`/student/roadmap/${roadmap.roadmap_id}/chapter/${chapterId}/lectures`);
    }
  };

  const getSubjectProgress = (subject: Subject) => {
    if (subject.chapters.length === 0) return 0;
    return Math.round(
      subject.chapters.reduce((sum, ch) => sum + ch.progress, 0) / subject.chapters.length
    );
  };

  const getSubjectLectureCount = (subject: Subject) => {
    return subject.chapters.reduce((sum, ch) => sum + (chapterLectureCounts[ch.id] || 0), 0);
  };

  if (loading) {
    return (
      <StudentAppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </StudentAppLayout>
    );
  }

  if (!roadmap || roadmap.subjects.length === 0) {
    return (
      <StudentAppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Classes Available</h2>
            <p className="text-muted-foreground">
              You haven't been assigned any classes yet.
            </p>
          </div>
        </div>
      </StudentAppLayout>
    );
  }

  // Chapter List View (when subject is selected)
  if (selectedSubject) {
    return (
      <StudentAppLayout>
        <div className="container mx-auto px-4 py-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedSubject(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{selectedSubject.name}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedSubject.chapters.length} chapters
              </p>
            </div>
          </div>

          {/* Chapter List */}
          <div className="space-y-3">
            {selectedSubject.chapters.map((chapter, index) => {
              const lectureCount = chapterLectureCounts[chapter.id] || 0;
              
              return (
                <Card
                  key={chapter.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleChapterClick(chapter.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Badge variant="outline" className="h-8 w-8 flex items-center justify-center shrink-0">
                          {index + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm line-clamp-2">
                            {chapter.chapter_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {lectureCount > 0 && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <PlayCircle className="h-3 w-3" />
                                {lectureCount} lectures
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                    {chapter.progress > 0 && (
                      <Progress value={chapter.progress} className="h-1 mt-3" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </StudentAppLayout>
    );
  }

  // Subject Grid View (default)
  return (
    <StudentAppLayout>
      <div className="container mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Paid Classes</h1>
            <p className="text-sm text-muted-foreground">
              Select a subject to view lectures
            </p>
          </div>
        </div>

        {/* Subject Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {roadmap.subjects.map((subject) => {
            const progress = getSubjectProgress(subject);
            const lectureCount = getSubjectLectureCount(subject);
            
            return (
              <Card
                key={subject.name}
                className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                onClick={() => setSelectedSubject(subject)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-2">{subject.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {subject.chapters.length} chapters
                    </Badge>
                    {lectureCount > 0 && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <PlayCircle className="h-3 w-3" />
                        {lectureCount}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </StudentAppLayout>
  );
};

export default PaidClassesPage;
