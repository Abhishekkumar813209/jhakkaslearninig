import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DuolingoStyleLearning } from "@/components/student/DuolingoStyleLearning";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Lesson {
  id?: string;
  topic_id: string;
  lesson_type: string;
  content_order: number;
  theory_text?: string;
  theory_html?: string;
  theory_language?: string;
  svg_type?: string;
  svg_data?: any;
  game_type?: string;
  game_data?: any;
  checkpoint_config?: any;
  estimated_time_minutes: number;
  xp_reward: number;
  generated_by: string;
  human_reviewed: boolean;
}

interface LessonPreviewDialogProps {
  lesson: Lesson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LessonPreviewDialog({ lesson, open, onOpenChange }: LessonPreviewDialogProps) {
  if (!lesson) return null;

  const renderPreviewContent = () => {
    if (lesson.lesson_type === 'theory') {
      const html = lesson.theory_html || lesson.theory_text;
      return (
        <ScrollArea className="h-[60vh] w-full rounded-md border p-6">
          <div className="prose prose-lg max-w-none">
            <div 
              dangerouslySetInnerHTML={{ __html: html || 'No content available' }}
              className="text-foreground"
            />
          </div>
        </ScrollArea>
      );
    }

    if (lesson.lesson_type === 'game' || lesson.lesson_type === 'interactive_svg' || lesson.lesson_type === 'quiz') {
      return (
        <div className="h-[70vh] overflow-hidden rounded-lg border bg-background">
          <DuolingoStyleLearning
            lesson={{
              ...lesson,
              id: lesson.id || 'preview'
            }}
            topicId={lesson.topic_id}
            onComplete={() => {}}
            onExit={() => onOpenChange(false)}
          />
        </div>
      );
    }

    return <div className="text-muted-foreground p-4">Preview not available for this lesson type</div>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl min-h-[70vh] max-h-[85vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Student View Preview
            {lesson.theory_language && lesson.theory_language !== 'english' && (
              <span className="text-sm font-normal text-muted-foreground">
                ({lesson.theory_language})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            This is how the lesson will appear to students
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto">
          {renderPreviewContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
