import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Eye, Sparkles, GripVertical, Check, X } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type LessonType = 'theory' | 'interactive_svg' | 'game' | 'quiz';
type GameType = 'match_pairs' | 'drag_drop' | 'typing_race' | 'word_puzzle' | 'fill_blanks' | 'sequence_order';
type SvgType = 'math_graph' | 'physics_motion' | 'chemistry_molecule' | 'algorithm_viz' | 'concept_diagram';

interface Lesson {
  id?: string;
  topic_id: string;
  lesson_type: LessonType;
  content_order: number;
  theory_text?: string;
  theory_html?: string;
  svg_type?: SvgType;
  svg_data?: any;
  game_type?: GameType;
  game_data?: any;
  estimated_time_minutes: number;
  xp_reward: number;
  coin_reward: number;
  generated_by: string;
  human_reviewed: boolean;
  approved_at?: string;
}

interface Topic {
  id: string;
  topic_name: string;
  chapter_id: string;
}

function SortableLesson({ lesson, onEdit, onDelete }: { lesson: Lesson; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id || '' });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="bg-card border rounded-lg p-4 mb-2">
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{lesson.lesson_type}</Badge>
            {lesson.game_type && <Badge variant="secondary">{lesson.game_type}</Badge>}
            {lesson.svg_type && <Badge variant="secondary">{lesson.svg_type}</Badge>}
            <span className="text-sm text-muted-foreground ml-auto">{lesson.estimated_time_minutes} min</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{lesson.xp_reward} XP</span>
            <span>{lesson.coin_reward} Coins</span>
            {lesson.human_reviewed ? (
              <Badge variant="default" className="bg-green-500">
                <Check className="h-3 w-3 mr-1" /> Approved
              </Badge>
            ) : (
              <Badge variant="secondary">
                <X className="h-3 w-3 mr-1" /> Pending
              </Badge>
            )}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onEdit}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function LessonContentBuilder() {
  const { toast } = useToast();
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
    lesson_type: 'theory',
    estimated_time_minutes: 5,
    xp_reward: 10,
    coin_reward: 2,
    generated_by: 'manual',
    human_reviewed: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    if (selectedTopic) {
      fetchLessons();
    }
  }, [selectedTopic]);

  const fetchTopics = async () => {
    const { data, error } = await supabase
      .from('roadmap_topics')
      .select('id, topic_name, chapter_id')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTopics(data || []);
    }
  };

  const fetchLessons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('topic_learning_content')
      .select('*')
      .eq('topic_id', selectedTopic)
      .order('content_order', { ascending: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setLessons((data || []) as Lesson[]);
    }
    setLoading(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(lessons, oldIndex, newIndex);
    
    setLessons(reordered);

    const updates = reordered.map((lesson, idx) => ({
      id: lesson.id,
      content_order: idx + 1,
    }));

    for (const update of updates) {
      await supabase.from('topic_learning_content').update({ content_order: update.content_order }).eq('id', update.id);
    }

    toast({ title: "Success", description: "Lessons reordered" });
  };

  const handleAddLesson = async () => {
    if (!selectedTopic) {
      toast({ title: "Error", description: "Please select a topic first", variant: "destructive" });
      return;
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const lessonData = {
      ...newLesson,
      topic_id: selectedTopic,
      content_order: lessons.length + 1,
      created_by: user.user.id,
    } as any;

    const { error } = await supabase.from('topic_learning_content').insert([lessonData]);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Lesson added successfully" });
      setIsAddDialogOpen(false);
      fetchLessons();
      setNewLesson({
        lesson_type: 'theory',
        estimated_time_minutes: 5,
        xp_reward: 10,
        coin_reward: 2,
        generated_by: 'manual',
        human_reviewed: false,
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const { error } = await supabase.from('topic_learning_content').delete().eq('id', lessonId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Lesson deleted" });
      fetchLessons();
    }
  };

  const handleApproveLesson = async (lessonId: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase
      .from('topic_learning_content')
      .update({
        human_reviewed: true,
        approved_by: user.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Lesson approved" });
      fetchLessons();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lesson Content Builder</CardTitle>
          <CardDescription>Create and manage lesson content for topics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Topic</Label>
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger>
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.topic_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTopic && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Lessons ({lessons.length})</h3>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lesson
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Lesson</DialogTitle>
                      <DialogDescription>Create a new lesson for this topic</DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="content">Content</TabsTrigger>
                        <TabsTrigger value="rewards">Rewards</TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic" className="space-y-4">
                        <div>
                          <Label>Lesson Type</Label>
                          <Select
                            value={newLesson.lesson_type}
                            onValueChange={(v) => setNewLesson({ ...newLesson, lesson_type: v as LessonType })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="theory">Theory</SelectItem>
                              <SelectItem value="interactive_svg">Interactive SVG</SelectItem>
                              <SelectItem value="game">Game</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Estimated Time (minutes)</Label>
                          <Input
                            type="number"
                            value={newLesson.estimated_time_minutes}
                            onChange={(e) => setNewLesson({ ...newLesson, estimated_time_minutes: parseInt(e.target.value) })}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="content" className="space-y-4">
                        {newLesson.lesson_type === 'theory' && (
                          <div>
                            <Label>Theory Content</Label>
                            <Textarea
                              placeholder="Enter theory content..."
                              value={newLesson.theory_text || ''}
                              onChange={(e) => setNewLesson({ ...newLesson, theory_text: e.target.value })}
                              rows={8}
                            />
                          </div>
                        )}

                        {newLesson.lesson_type === 'interactive_svg' && (
                          <div className="space-y-4">
                            <div>
                              <Label>SVG Type</Label>
                              <Select
                                value={newLesson.svg_type}
                                onValueChange={(v) => setNewLesson({ ...newLesson, svg_type: v as SvgType })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select SVG type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="math_graph">Math Graph</SelectItem>
                                  <SelectItem value="physics_motion">Physics Motion</SelectItem>
                                  <SelectItem value="chemistry_molecule">Chemistry Molecule</SelectItem>
                                  <SelectItem value="algorithm_viz">Algorithm Visualization</SelectItem>
                                  <SelectItem value="concept_diagram">Concept Diagram</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>SVG Data (JSON)</Label>
                              <Textarea
                                placeholder='{"equation": "y = 2x + 3", "x_range": [-10, 10], ...}'
                                value={typeof newLesson.svg_data === 'object' ? JSON.stringify(newLesson.svg_data, null, 2) : newLesson.svg_data || ''}
                                onChange={(e) => {
                                  try {
                                    const parsed = JSON.parse(e.target.value);
                                    setNewLesson({ ...newLesson, svg_data: parsed });
                                  } catch {
                                    setNewLesson({ ...newLesson, svg_data: e.target.value });
                                  }
                                }}
                                rows={10}
                                className="font-mono text-xs"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Enter valid JSON data for the selected SVG type
                              </p>
                            </div>
                          </div>
                        )}

                        {newLesson.lesson_type === 'game' && (
                          <div className="space-y-4">
                            <div>
                              <Label>Game Type</Label>
                              <Select
                                value={newLesson.game_type}
                                onValueChange={(v) => setNewLesson({ ...newLesson, game_type: v as GameType })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select game type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="match_pairs">Match Pairs</SelectItem>
                                  <SelectItem value="drag_drop">Drag & Drop</SelectItem>
                                  <SelectItem value="typing_race">Typing Race</SelectItem>
                                  <SelectItem value="word_puzzle">Word Puzzle</SelectItem>
                                  <SelectItem value="fill_blanks">Fill in Blanks</SelectItem>
                                  <SelectItem value="physics_simulator">Physics Simulator</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Game Data (JSON)</Label>
                              <Textarea
                                placeholder='{"pairs": [{"id": "1", "left": "F = ma", "right": "Newtons Law"}], ...}'
                                value={typeof newLesson.game_data === 'object' ? JSON.stringify(newLesson.game_data, null, 2) : newLesson.game_data || ''}
                                onChange={(e) => {
                                  try {
                                    const parsed = JSON.parse(e.target.value);
                                    setNewLesson({ ...newLesson, game_data: parsed });
                                  } catch {
                                    setNewLesson({ ...newLesson, game_data: e.target.value });
                                  }
                                }}
                                rows={10}
                                className="font-mono text-xs"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Enter valid JSON data for the selected game type
                              </p>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="rewards" className="space-y-4">
                        <div>
                          <Label>XP Reward</Label>
                          <Input
                            type="number"
                            value={newLesson.xp_reward}
                            onChange={(e) => setNewLesson({ ...newLesson, xp_reward: parseInt(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Coin Reward</Label>
                          <Input
                            type="number"
                            value={newLesson.coin_reward}
                            onChange={(e) => setNewLesson({ ...newLesson, coin_reward: parseInt(e.target.value) })}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddLesson}>Create Lesson</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading lessons...</div>
              ) : lessons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No lessons yet. Click "Add Lesson" to create one.
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={lessons.map((l) => l.id || '')} strategy={verticalListSortingStrategy}>
                    {lessons.map((lesson) => (
                      <SortableLesson
                        key={lesson.id}
                        lesson={lesson}
                        onEdit={() => handleApproveLesson(lesson.id!)}
                        onDelete={() => handleDeleteLesson(lesson.id!)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
