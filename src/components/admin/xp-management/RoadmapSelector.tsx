import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Target } from 'lucide-react';
import { format } from 'date-fns';
import { useRoadmaps } from '@/hooks/useRoadmapData';

interface RoadmapSelectorProps {
  examType: string;
  board: string | null;
  targetClass: string | null;
  onRoadmapSelect: (roadmap: { id: string; title: string; batch_id?: string | null }) => void;
}

interface Roadmap {
  id: string;
  title: string;
  description: string | null;
  total_days: number;
  start_date: string;
  end_date: string;
  status: string;
  batch_id?: string | null;
  batch_name?: string | null;
  batch_level?: string | null;
}

export const RoadmapSelector = ({ examType, board, targetClass, onRoadmapSelect }: RoadmapSelectorProps) => {
  const { data: roadmaps = [], isLoading: loading } = useRoadmaps(examType, board, targetClass);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (roadmaps.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No roadmaps found for this selection.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      draft: { variant: 'secondary', label: 'Draft' },
      completed: { variant: 'destructive', label: 'Completed' },
    };
    return variants[status] || { variant: 'secondary', label: status };
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Select Roadmap</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roadmaps.map((roadmap) => {
          const statusInfo = getStatusBadge(roadmap.status);
          return (
            <Card
              key={roadmap.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onRoadmapSelect({ 
                id: roadmap.id, 
                title: roadmap.title,
                batch_id: roadmap.batch_id 
              })}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <CardTitle className="text-base">{roadmap.title}</CardTitle>
                    {(roadmap as any).batch_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Batch: {(roadmap as any).batch_level} • {(roadmap as any).batch_name}
                      </p>
                    )}
                    {!(roadmap as any).batch_name && roadmap.batch_id && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ No batch linked
                      </p>
                    )}
                  </div>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>
                {roadmap.description && (
                  <CardDescription className="text-sm line-clamp-2">
                    {roadmap.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>{roadmap.total_days} days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(roadmap.start_date), 'MMM dd')} - {format(new Date(roadmap.end_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
