import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WellnessJourney() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Wellness Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Track your daily progress and milestones</p>
        </CardContent>
      </Card>
    </div>
  );
}
