import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { StudentBatchRoadmap } from "@/components/student/StudentBatchRoadmap";
import { useToast } from "@/hooks/use-toast";

const StudentRoadmapView = () => {
  const { roadmapId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyRoadmapAccess = async () => {
      if (!roadmapId || roadmapId === "undefined") {
        navigate("/student");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('batch_roadmaps')
          .select('id')
          .eq('id', roadmapId)
          .maybeSingle();

        if (error || !data) {
          toast({
            title: "Error",
            description: "Roadmap not found",
            variant: "destructive"
          });
          navigate("/student");
        }
      } catch (error) {
        console.error("Error verifying roadmap:", error);
        navigate("/student");
      } finally {
        setLoading(false);
      }
    };

    verifyRoadmapAccess();
  }, [roadmapId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-8">
          <div>Loading roadmap...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <StudentBatchRoadmap />
      </div>
    </div>
  );
};

export default StudentRoadmapView;
