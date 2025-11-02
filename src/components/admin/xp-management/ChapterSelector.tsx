import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRoadmapChapters } from '@/hooks/useRoadmapData';

interface ChapterSelectorProps {
  roadmapId: string;
  subject: string;
  onChapterSelect: (chapter: { id: string; name: string }) => void;
}

interface Chapter {
  id: string;
  chapter_name: string;
  topic_count: number;
  game_count: number;
}

export const ChapterSelector = ({ roadmapId, subject, onChapterSelect }: ChapterSelectorProps) => {
  const { data: chapters = [], isLoading: loading } = useRoadmapChapters(roadmapId, subject);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No chapters found for {subject}</p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Select Chapter</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {chapters.map((chapter) => (
          <Card
            key={chapter.id}
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
            onClick={() => onChapterSelect({ id: chapter.id, name: chapter.chapter_name })}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-base">{chapter.chapter_name}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {chapter.topic_count} topic{chapter.topic_count !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline">
                  {chapter.game_count} game{chapter.game_count !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
