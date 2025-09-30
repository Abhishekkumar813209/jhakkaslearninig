import Navbar from "@/components/Navbar";
import { UIFlowGuide } from "@/components/student/UIFlowGuide";

const UIGuide = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Navbar />
      <div className="container mx-auto py-8">
        <UIFlowGuide />
      </div>
    </div>
  );
};

export default UIGuide;
