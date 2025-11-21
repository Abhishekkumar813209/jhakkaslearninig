import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Settings, Pencil, Trash2, GripVertical, BookOpen } from "lucide-react";

interface ChapterLibrary {
  id: string;
  exam_type: string;
  subject: string;
  chapter_name: string;
  full_topics: any;
  topics_generated: boolean;
  suggested_days: number;
  entry_source: string;
  is_active: boolean;
  display_order: number;
}

interface SortableChapterCardProps {
  chapter: ChapterLibrary;
  isSelected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onGenerateTopics: (forceRegenerate: boolean) => void;
  onManageTopics: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNavigateToQuestions: () => void;
}

export function SortableChapterCard({
  chapter,
  isSelected,
  onToggleSelect,
  onGenerateTopics,
  onManageTopics,
  onEdit,
  onDelete,
  onNavigateToQuestions
}: SortableChapterCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`${isDragging ? "shadow-lg ring-2 ring-primary" : ""} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <div 
              {...attributes} 
              {...listeners} 
              className="cursor-grab active:cursor-grabbing mt-1 pt-1"
              title="Drag to reorder"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </div>

            {/* Checkbox */}
            <div className="pt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onToggleSelect(e.target.checked)}
                className="cursor-pointer w-4 h-4"
              />
            </div>
            
            <div className="flex-1">
              <CardTitle className="text-lg">{chapter.chapter_name}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  {chapter.suggested_days} day{chapter.suggested_days !== 1 ? 's' : ''}
                </Badge>
                {chapter.topics_generated && chapter.full_topics?.length > 0 ? (
                  <Badge className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {chapter.full_topics.length} Topics
                  </Badge>
                ) : (
                  <Badge variant="secondary">No Topics</Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={chapter.topics_generated ? "outline" : "default"}
                onClick={() => onGenerateTopics(chapter.topics_generated && chapter.full_topics?.length > 0)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {chapter.topics_generated ? 'Replace with AI' : 'AI Generate'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onManageTopics}
                title="Add, edit, or delete topics for this chapter"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Topics
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                title="Edit chapter details"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
                title="Delete this chapter"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {chapter.topics_generated && chapter.full_topics?.length > 0 && (
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Topics ({chapter.full_topics.length})</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onNavigateToQuestions}
                  className="h-8"
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  Manage Questions
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {chapter.full_topics.slice(0, 5).map((topic: any, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {topic.topic_name}
                  </Badge>
                ))}
                {chapter.full_topics.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{chapter.full_topics.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}