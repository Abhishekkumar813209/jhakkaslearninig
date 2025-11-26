import { ParentAppLayout } from '@/components/parent/ParentAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function ParentTests() {
  return (
    <ParentAppLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle>Tests & Assessments</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Track your child's test performance, scores, and improvement areas.
            </p>
            {/* TODO: Add test content */}
          </CardContent>
        </Card>
      </div>
    </ParentAppLayout>
  );
}
