import { ParentAppLayout } from '@/components/parent/ParentAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export default function ParentStudies() {
  return (
    <ParentAppLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <CardTitle>Studies Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              View your child's study progress, course completion, and learning activities.
            </p>
            {/* TODO: Add studies content */}
          </CardContent>
        </Card>
      </div>
    </ParentAppLayout>
  );
}
