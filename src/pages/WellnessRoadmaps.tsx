import { WellnessAdminLayout } from '@/components/wellness/WellnessAdminLayout';
import { WellnessRoadmapManager } from '@/components/admin/wellness/WellnessRoadmapManager';

export default function WellnessRoadmaps() {
  return (
    <WellnessAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Wellness Roadmap Templates</h1>
          <p className="text-muted-foreground">Create and manage wellness journey templates</p>
        </div>
        <WellnessRoadmapManager />
      </div>
    </WellnessAdminLayout>
  );
}
