import { WellnessAdminLayout } from '@/components/wellness/WellnessAdminLayout';
import { WellnessGameCreator } from '@/components/admin/wellness/WellnessGameCreator';

export default function WellnessGames() {
  return (
    <WellnessAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Wellness Games & Exercises</h1>
          <p className="text-muted-foreground">Create interactive wellness challenges</p>
        </div>
        <WellnessGameCreator />
      </div>
    </WellnessAdminLayout>
  );
}
