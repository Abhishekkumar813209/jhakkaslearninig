import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StudentAppLayout } from "@/components/student/StudentAppLayout";
import { DuolingoLessonPath } from "@/components/student/DuolingoLessonPath";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getFirstUnlockedGameId } from "@/lib/gameNavigation";

const TopicDetailPage = () => {
  const { roadmapId, topicId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [topicName, setTopicName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopicDetails();
  }, [topicId]);

  const fetchTopicDetails = async () => {
    if (!topicId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch topic name from roadmap_topics
      const { data: topicData, error } = await supabase
        .from('roadmap_topics')
        .select('topic_name')
        .eq('id', topicId)
        .single();

      if (error) {
        console.error("Error fetching topic:", error);
      } else if (topicData) {
        setTopicName(topicData.topic_name);
      }
    } catch (error) {
      console.error("Error loading topic:", error);
      toast({
        title: "Error",
        description: "Failed to load topic details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLessonClick = async (lesson: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Navigate based on lesson type
      if (lesson.lesson_type === 'game') {
        navigate(`/roadmap/${roadmapId}/topic/${topicId}/game/${lesson.id}`);
      } else if (lesson.lesson_type === 'lecture') {
        navigate(`/roadmap/${roadmapId}/topic/${topicId}/lecture/${lesson.id}`);
      }
    } catch (error) {
      console.error("Error opening lesson:", error);
      toast({
        title: "Error",
        description: "Failed to open lesson",
        variant: "destructive"
      });
    }
  };

  const handleBackClick = () => {
    if (!roadmapId || roadmapId === "undefined") {
      navigate("/roadmap");
    } else {
      navigate(`/roadmap/${roadmapId}`);
    }
  };

  if (loading) {
    return (
      <StudentAppLayout>
        <div className="container py-8 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading topic...</p>
          </div>
        </div>
      </StudentAppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roadmap
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground">
            {topicName || "Topic Lessons"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete lessons in order to unlock the next ones
          </p>
        </div>

        {/* Duolingo-style lesson path */}
        {topicId && (
          <DuolingoLessonPath 
            topicId={topicId} 
            onLessonClick={handleLessonClick}
          />
        )}
      </div>
    </div>
  );
};

export default TopicDetailPage;
