import { ParentAppLayout } from '@/components/parent/ParentAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export default function ParentRankings() {
  return (
    <ParentAppLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              <CardTitle>Rankings & Leaderboard</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              See how your child ranks among peers in class, zone, and overall performance.
            </p>
            {/* TODO: Add rankings content */}
          </CardContent>
        </Card>
      </div>
    </ParentAppLayout>
  );
}
