import { useParams, useNavigate } from "react-router-dom";
import { TopicStudyView } from "@/components/student/TopicStudyView";
import Navbar from "@/components/Navbar";

const TopicDetailPage = () => {
  const { roadmapId, topicId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <TopicStudyView
          topicId={topicId!}
          topicName=""
          onBack={() => navigate(`/student/roadmap/${roadmapId}`)}
        />
      </div>
    </div>
  );
};

export default TopicDetailPage;
