import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { getFirstUnlockedGameId } from "@/lib/gameNavigation";
import { useToast } from "@/hooks/use-toast";

const TopicDetailPage = () => {
  const { roadmapId, topicId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    autoStartGames();
  }, [topicId]);

  const autoStartGames = async () => {
    if (!topicId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      console.log("Fetching first game for topic:", topicId);
      
      // Get first unlocked game
      const firstGameId = await getFirstUnlockedGameId(user.id, topicId);
      
      if (firstGameId) {
        console.log("Navigating to first game:", firstGameId);
        // Auto-navigate to game
        navigate(`/student/roadmap/${roadmapId}/topic/${topicId}/game/${firstGameId}`);
      } else {
        console.log("No games found for topic:", topicId);
        // No games available
        toast({
          title: "No exercises available",
          description: "This topic doesn't have any exercises yet. Please contact your instructor.",
          variant: "destructive"
        });
        navigate(`/student/roadmap/${roadmapId}`);
      }
    } catch (error) {
      console.error("Error starting games:", error);
      toast({
        title: "Error loading exercises",
        description: "Failed to load exercises. Please try again.",
        variant: "destructive"
      });
      navigate(`/student/roadmap/${roadmapId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-8 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading games...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TopicDetailPage;
