import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  GripVertical, 
  BookOpen, 
  FileText, 
  Edit, 
  Trash2, 
  ChevronDown,
  CheckCircle,
  Clock,
  Lock,
  Target,
  Layers,
  Atom,
  Beaker,
  Calculator,
  Leaf,
  BookA,
  Compass,
  Heart
} from "lucide-react";
import { getTopicColor } from "@/lib/progressColors";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

interface Topic {
  id: string;
  topic_name: string;
  estimated_hours?: number;
  status?: string;
  progress_percentage?: number;
}

interface Chapter {
  id: string;
  chapter_name: string;
  day_start: number;
  day_end: number;
  estimated_days?: number;
  custom_days?: number | null;
  progress?: number;
  topics?: Topic[];
}

interface Subject {
  name: string;
  chapters: Chapter[];
}

interface RoadmapCardViewProps {
  roadmapId: string;
  subjects: Subject[];
  isEditable?: boolean;
  onChapterClick?: (chapterId: string, chapterName: string, topics: any[]) => void;
  onChapterEdit?: (chapterId: string) => void;
  onChapterDelete?: (chapterId: string) => void;
  onChapterReorder: (subjectName: string, reorderedChapterIds: string[]) => void;
}

const SUBJECT_COLORS: Record<string, string> = {
  'Physics': 'bg-blue-50 border-blue-200 hover:border-blue-400',
  'Chemistry': 'bg-orange-50 border-orange-200 hover:border-orange-400',
  'Maths': 'bg-green-50 border-green-200 hover:border-green-400',
  'Mathematics': 'bg-green-50 border-green-200 hover:border-green-400',
  'Biology': 'bg-purple-50 border-purple-200 hover:border-purple-400',
  'English': 'bg-pink-50 border-pink-200 hover:border-pink-400',
  'Hindi': 'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
  'Social Science': 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
  'Engineering Graphics': 'bg-cyan-50 border-cyan-200 hover:border-cyan-400',
  'Thermodynamics': 'bg-red-50 border-red-200 hover:border-red-400',
  'Mechanics': 'bg-teal-50 border-teal-200 hover:border-teal-400',
  'Electrical': 'bg-amber-50 border-amber-200 hover:border-amber-400',
  'Anatomy': 'bg-pink-50 border-pink-200 hover:border-pink-400',
  'Physiology': 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
  'Biochemistry': 'bg-violet-50 border-violet-200 hover:border-violet-400',
  'General Studies': 'bg-slate-50 border-slate-200 hover:border-slate-400',
  'Reasoning': 'bg-zinc-50 border-zinc-200 hover:border-zinc-400',
  'Quantitative Aptitude': 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
  'default': 'bg-muted border-border hover:border-primary'
};

const SUBJECT_ICONS: Record<string, any> = {
  'Physics': Atom,
  'Chemistry': Beaker,
  'Maths': Calculator,
  'Mathematics': Calculator,
  'Biology': Leaf,
  'English': BookA,
  'Engineering Graphics': Compass,
  'Anatomy': Heart,
  'General Studies': BookOpen,
  'default': BookOpen
};

const getSubjectColorClass = (subjectName: string): string => {
  return SUBJECT_COLORS[subjectName] || SUBJECT_COLORS['default'];
};

const getSubjectIcon = (subjectName: string) => {
  const Icon = SUBJECT_ICONS[subjectName] || SUBJECT_ICONS['default'];
  return <Icon className="h-5 w-5" />;
};

interface SortableChapterCardProps {
  chapter: Chapter;
  isEditable: boolean;
  onEdit?: (chapterId: string) => void;
  onDelete?: (chapterId: string) => void;
  onClick?: (chapterId: string, chapterName: string, topics: any[]) => void;
  onDoubleClick?: (chapterId: string) => void;
}

const SortableChapterCard = ({ 
  chapter, 
  isEditable, 
  onEdit, 
  onDelete, 
  onClick,
  onDoubleClick
}: SortableChapterCardProps) => {
  const [showTopics, setShowTopics] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: chapter.id, disabled: !isEditable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasTopics = chapter.topics && chapter.topics.length > 0;

  const bgColor = chapter.progress === 100 ? 'bg-green-600 text-white' : chapter.progress === 0 ? 'bg-red-600 text-white' : 'bg-card';

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`border rounded-lg p-3 space-y-2 ${bgColor} hover:shadow-md transition-all`}
      onDoubleClick={() => onDoubleClick?.(chapter.id)}
    >
      <div className="flex items-center justify-between">
        <div 
          className="flex items-center gap-2 flex-1 cursor-pointer"
          onClick={() => onClick?.(chapter.id, chapter.chapter_name, chapter.topics || [])}
        >
          {isEditable && (
            <div 
              {...attributes} 
              {...listeners} 
              className="cursor-grab active:cursor-grabbing hover:bg-accent rounded p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          
          <BookOpen className={`h-4 w-4 ${chapter.progress === 100 || chapter.progress === 0 ? 'text-white' : 'text-primary'}`} />
          <span className="font-medium text-sm">{chapter.chapter_name}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={chapter.progress === 100 || chapter.progress === 0 ? "outline" : "secondary"} className={`text-xs ${chapter.progress === 100 ? 'bg-green-800 text-white border-green-400' : chapter.progress === 0 ? 'bg-red-800 text-white border-red-400' : ''}`}>
            Day {chapter.day_start}-{chapter.day_end}
          </Badge>
          
          {hasTopics && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowTopics(!showTopics);
              }}
              className={`h-6 px-2 text-xs ${chapter.progress === 100 || chapter.progress === 0 ? 'text-white hover:bg-white/20' : 'text-primary'} hover:underline`}
            >
              <FileText className="h-3 w-3 mr-1" />
              {chapter.topics!.length}
              <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showTopics ? 'rotate-180' : ''}`} />
            </Button>
          )}
          
          {isEditable && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(chapter.id);
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-destructive hover:text-destructive" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(chapter.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {chapter.progress !== undefined && (
        <Progress value={chapter.progress} className="h-1" />
      )}
      
      {showTopics && hasTopics && (
        <div className="ml-6 space-y-1 pt-2 border-t mt-2">
          {chapter.topics!.map((topic) => {
            const topicColor = getTopicColor(topic.progress_percentage || 0);
            
            return (
              <div 
                key={topic.id} 
                className="flex items-center justify-between text-xs text-muted-foreground py-1 hover:bg-accent/50 -mx-2 px-2 rounded"
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${topicColor.bg}`} />
                  <span>{topic.topic_name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {topic.estimated_hours && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {topic.estimated_hours}h
                    </Badge>
                  )}
                  
                  {topic.progress_percentage !== undefined && (
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 ${topicColor.badgeClass}`}>
                      {topicColor.icon} {topic.progress_percentage.toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface SubjectCardProps {
  subject: Subject;
  isEditable: boolean;
  onChapterClick?: (chapterId: string, chapterName: string, topics: any[]) => void;
  onChapterEdit?: (chapterId: string) => void;
  onChapterDelete?: (chapterId: string) => void;
  onChapterReorder: (subjectName: string, reorderedChapterIds: string[]) => void;
  onChapterDoubleClick?: (chapterId: string) => void;
}

const SubjectCard = ({ 
  subject, 
  isEditable, 
  onChapterClick,
  onChapterEdit,
  onChapterDelete,
  onChapterReorder,
  onChapterDoubleClick
}: SubjectCardProps) => {
  const [localChapters, setLocalChapters] = useState(subject.chapters);

  useEffect(() => {
    setLocalChapters(subject.chapters);
  }, [subject.chapters]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localChapters.findIndex(c => c.id === active.id);
    const newIndex = localChapters.findIndex(c => c.id === over.id);

    const reordered = arrayMove(localChapters, oldIndex, newIndex);
    
    // Optimistic UI: Recalculate day_start and day_end based on estimated_days
    let currentDay = 1;
    const updated = reordered.map(ch => {
      const days = Math.max(1, (ch.day_end - ch.day_start + 1));
      const newChapter = {
        ...ch,
        day_start: currentDay,
        day_end: currentDay + days - 1
      };
      currentDay += days;
      return newChapter;
    });
    
    setLocalChapters(updated);
    
    const reorderedIds = reordered.map(c => c.id);
    onChapterReorder(subject.name, reorderedIds);
  };

  const subjectProgress = localChapters.length > 0
    ? localChapters.reduce((acc, ch) => acc + (ch.progress || 0), 0) / localChapters.length
    : 0;

  return (
    <Card className={`${getSubjectColorClass(subject.name)} transition-all`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {getSubjectIcon(subject.name)}
            {subject.name}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {localChapters.length} chapters
          </Badge>
        </div>
        
        <div className="space-y-1 mt-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall Progress</span>
            <span>{Math.round(subjectProgress)}%</span>
          </div>
          <Progress value={subjectProgress} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent>
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext 
            items={localChapters.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {localChapters.map(chapter => (
                <SortableChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  isEditable={isEditable}
                  onEdit={onChapterEdit}
                  onDelete={onChapterDelete}
                  onClick={onChapterClick}
                  onDoubleClick={onChapterDoubleClick}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        
        {localChapters.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No chapters yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const RoadmapCardView = ({
  roadmapId,
  subjects,
  isEditable = false,
  onChapterClick,
  onChapterEdit,
  onChapterDelete,
  onChapterReorder
}: RoadmapCardViewProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [customDays, setCustomDays] = useState<number>(3);

  const totalChapters = subjects.reduce((acc, s) => acc + s.chapters.length, 0);
  const totalTopics = subjects.reduce((acc, s) => 
    acc + s.chapters.reduce((sum, ch) => sum + (ch.topics?.length || 0), 0), 0
  );
  const overallProgress = totalChapters > 0
    ? subjects.reduce((acc, s) => 
        acc + s.chapters.reduce((sum, ch) => sum + (ch.progress || 0), 0), 0
      ) / totalChapters
    : 0;

  const handleEditClick = (chapterId: string) => {
    // Find the chapter across all subjects
    let foundChapter: Chapter | null = null;
    for (const subject of subjects) {
      const chapter = subject.chapters.find(ch => ch.id === chapterId);
      if (chapter) {
        foundChapter = chapter;
        break;
      }
    }

    if (foundChapter) {
      setEditingChapter(foundChapter);
      setCustomDays(foundChapter.custom_days || foundChapter.estimated_days || 3);
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = () => {
    if (editingChapter && onChapterEdit) {
      onChapterEdit(editingChapter.id);
    }
    setEditDialogOpen(false);
    setEditingChapter(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{subjects.length}</div>
              <p className="text-xs text-muted-foreground">Subjects</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Layers className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{totalChapters}</div>
              <p className="text-xs text-muted-foreground">Total Chapters</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{totalTopics}</div>
              <p className="text-xs text-muted-foreground">Total Topics</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
              <p className="text-xs text-muted-foreground">Overall Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map(subject => (
          <SubjectCard
            key={subject.name}
            subject={subject}
            isEditable={isEditable}
            onChapterClick={onChapterClick}
            onChapterEdit={handleEditClick}
            onChapterDelete={onChapterDelete}
            onChapterReorder={onChapterReorder}
            onChapterDoubleClick={onChapterEdit}
          />
        ))}
      </div>

      {/* Edit Chapter Days Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Chapter Duration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Chapter Name</Label>
              <p className="text-sm text-muted-foreground">{editingChapter?.chapter_name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-days">Days to Complete</Label>
              <Input
                id="custom-days"
                type="number"
                min="1"
                value={customDays}
                onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                placeholder="Enter number of days"
              />
              <p className="text-xs text-muted-foreground">
                Original duration: {editingChapter?.estimated_days || 3} days
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {subjects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No subjects available</h3>
            <p className="text-muted-foreground">
              {isEditable 
                ? "Create a roadmap to get started" 
                : "Your instructor will assign subjects soon"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
