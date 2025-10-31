import { WellnessAdminLayout } from '@/components/wellness/WellnessAdminLayout';
import { WellnessStudentMonitor } from '@/components/admin/wellness/WellnessStudentMonitor';

export default function WellnessStudents() {
  return (
    <WellnessAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Student Progress Monitoring</h1>
          <p className="text-muted-foreground">Track and support student wellness journeys</p>
        </div>
        <WellnessStudentMonitor />
      </div>
    </WellnessAdminLayout>
  );
}
