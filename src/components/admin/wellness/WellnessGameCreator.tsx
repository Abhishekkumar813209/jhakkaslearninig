import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const WellnessGameCreator = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wellness Game Creator</CardTitle>
        <CardDescription>Create interactive wellness exercises and challenges</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Game creation interface coming soon...</p>
        <div className="mt-4 space-y-2">
          <h4 className="font-semibold">Available Game Types:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>MCQ - Self-reflection questions</li>
            <li>Challenge Tracker - Daily habit completion</li>
            <li>Craving Timer - Urge surfing tool</li>
            <li>Progress Visualizer - Health metrics</li>
            <li>Journal Prompts - Guided reflection</li>
            <li>Habit Stack Builder - Routine creation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
