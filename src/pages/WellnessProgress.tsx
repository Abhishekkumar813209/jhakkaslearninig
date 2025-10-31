import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WellnessProgress() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Progress Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">View your wellness statistics and trends</p>
        </CardContent>
      </Card>
    </div>
  );
}
