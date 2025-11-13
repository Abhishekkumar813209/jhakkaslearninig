import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LecturePlayerPage = () => {
  const { roadmapId, topicId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Temporary: Show message that lecture feature needs database migration
    toast({
      title: "Lecture Feature Coming Soon",
      description: "Database migration required to add YouTube lecture support to batch roadmaps",
      variant: "default"
    });
    
    // Redirect back to topic view
    setTimeout(() => {
      navigate(`/student/roadmap/${roadmapId}/topic/${topicId}`);
    }, 2000);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading lecture player...</p>
      </div>
    </div>
  );
};

export default LecturePlayerPage;
