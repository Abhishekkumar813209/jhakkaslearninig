import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StudentAppLayout } from "@/components/student/StudentAppLayout";
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
        navigate("/roadmap");
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
          navigate("/roadmap");
        }
      } catch (error) {
        console.error("Error verifying roadmap:", error);
        navigate("/roadmap");
      } finally {
        setLoading(false);
      }
    };

    verifyRoadmapAccess();
  }, [roadmapId, navigate, toast]);

  if (loading) {
    return (
      <StudentAppLayout>
        <div className="container py-8">
          <div>Loading roadmap...</div>
        </div>
      </StudentAppLayout>
    );
  }

  return (
    <StudentAppLayout>
      <div className="container py-8">
        <StudentBatchRoadmap />
      </div>
    </StudentAppLayout>
  );
};

export default StudentRoadmapView;
