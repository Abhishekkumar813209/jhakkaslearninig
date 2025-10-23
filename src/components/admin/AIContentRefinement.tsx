import { useState } from "react";
import { Edit3, Save, X, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AIContentRefinementProps {
  content: any;
  onSave: (refinedContent: any) => void;
  onRegenerate?: () => void;
}

export const AIContentRefinement = ({
  content,
  onSave,
  onRegenerate
}: AIContentRefinementProps) => {
  const [editedContent, setEditedContent] = useState(content);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [tempEdit, setTempEdit] = useState<any>(null);
  const { toast } = useToast();

  const startEdit = (section: string, data: any) => {
    setEditingSection(section);
    setTempEdit(data);
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setTempEdit(null);
  };

  const saveEdit = (section: string) => {
    const newContent = { ...editedContent };
    
    switch (section) {
      case 'theory':
        newContent.content.theory = tempEdit;
        break;
      case 'svg':
        newContent.content.svg_animation = tempEdit;
        break;
      case 'games':
        newContent.content.games = tempEdit;
        break;
      case 'exercises':
        newContent.content.exercises = tempEdit;
        break;
    }

    setEditedContent(newContent);
    setEditingSection(null);
    setTempEdit(null);
    
    toast({
      title: "Changes Saved",
      description: "Section updated successfully",
    });
  };

  const handleFinalSave = async () => {
    try {
      const { topic_id, topic_name, content: generatedContent, metadata } = editedContent;
      let studyContentId: string | null = null;
      let orderNum = 1;

      // 1. Save theory content to study_content table if exists
      if (generatedContent.theory?.html) {
        const { data: studyData, error: studyError } = await supabase
          .from('study_content')
          .insert({
            subject: metadata?.subject || 'General',
            chapter_name: metadata?.chapter_name || 'N/A',
            topic_name,
            content_type: 'theory',
            content: generatedContent.theory.html,
            order_num: 1,
          })
          .select()
          .single();

        if (studyError) throw studyError;
        studyContentId = studyData.id;

        // Create mapping for theory content
        const { error: theoryMappingError } = await supabase
          .from('topic_content_mapping')
          .insert({
            topic_id,
            content_type: 'theory',
            study_content_id: studyContentId,
            order_num: orderNum++,
            is_required: true,
            xp_value: 20,
          });

        if (theoryMappingError) throw theoryMappingError;
      }

      // 2. Save SVG animation as content mapping (stored as JSONB in games field or as separate content)
      if (generatedContent.svg_animation) {
        // For now, we'll skip SVG as it doesn't fit study_content structure
        // It will be rendered from the AI response directly
        console.log('SVG animation available but not saved to database yet');
      }

      // 3. Save games (match_pairs, drag_drop, etc.)
      if (generatedContent.games && generatedContent.games.length > 0) {
        for (const game of generatedContent.games) {
          // Create a content mapping for each game
          const { data: gameMappingData, error: gameMappingError } = await supabase
            .from('topic_content_mapping')
            .insert({
              topic_id,
              content_type: game.game_type || 'match_column',
              order_num: orderNum++,
              is_required: false,
              xp_value: 15,
            })
            .select()
            .single();

          if (gameMappingError) throw gameMappingError;

          // Create gamified exercise for the game with simplified structure
          const { error: gameExerciseError } = await supabase
            .from('gamified_exercises')
            .insert({
              topic_content_id: gameMappingData.id,
              exercise_type: game.game_type || 'match_column',
              question_text: game.game_data?.question || game.question || '',
              options: game.game_data?.options || game.options || [],
              correct_answer_index: game.correct_answer ?? game.game_data?.correct_answer ?? 0,
              marks: game.marks || 1,
              difficulty: metadata?.difficulty || 'medium',
              xp_reward: 15,
              exercise_data: {}
            } as any); // Type assertion until types regenerate

          if (gameExerciseError) throw gameExerciseError;
        }
      }

      // 4. Save quiz exercises
      if (generatedContent.exercises && generatedContent.exercises.length > 0) {
        // Create a content mapping for quiz section
        const { data: quizMappingData, error: quizMappingError } = await supabase
          .from('topic_content_mapping')
          .insert({
            topic_id,
            content_type: 'mcq',
            order_num: orderNum++,
            is_required: true,
            xp_value: 30,
          })
          .select()
          .single();

        if (quizMappingError) throw quizMappingError;

        // Create individual exercises
        const exercisesToInsert = generatedContent.exercises.map((exercise: any) => ({
          topic_content_id: quizMappingData.id,
          exercise_type: exercise.question_type === 'true_false' ? 'true_false' : 'mcq',
          exercise_data: {
            question_text: exercise.question_text,
            options: exercise.options || [],
          },
          correct_answer: exercise.correct_answer,
          explanation: exercise.explanation,
          difficulty: exercise.difficulty || metadata?.difficulty || 'medium',
          xp_reward: exercise.difficulty === 'hard' ? 15 : exercise.difficulty === 'easy' ? 5 : 10,
        }));

        const { error: exerciseError } = await supabase
          .from('gamified_exercises')
          .insert(exercisesToInsert);

        if (exerciseError) throw exerciseError;
      }

      toast({
        title: "Content Saved!",
        description: `Successfully saved all content for "${topic_name}" to database`,
      });

      onSave(editedContent);
    } catch (error: any) {
      console.error('Error saving content:', error);
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Content Refinement</CardTitle>
              <CardDescription>Review and edit AI-generated content</CardDescription>
            </div>
            <div className="flex gap-2">
              {onRegenerate && (
                <Button onClick={onRegenerate} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              )}
              <Button onClick={handleFinalSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Approve & Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="theory" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {editedContent.content.theory && <TabsTrigger value="theory">Theory</TabsTrigger>}
              {editedContent.content.svg_animation && <TabsTrigger value="svg">SVG</TabsTrigger>}
              {editedContent.content.games && <TabsTrigger value="games">Games</TabsTrigger>}
              {editedContent.content.exercises && <TabsTrigger value="exercises">Exercises</TabsTrigger>}
            </TabsList>

            {/* Theory Tab */}
            {editedContent.content.theory && (
              <TabsContent value="theory" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Theory Content</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => startEdit('theory', editedContent.content.theory)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Theory Content</DialogTitle>
                          <DialogDescription>
                            Modify the theory section HTML and key points
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>HTML Content</Label>
                            <Textarea
                              value={tempEdit?.html || ''}
                              onChange={(e) => setTempEdit({ ...tempEdit, html: e.target.value })}
                              rows={15}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => saveEdit('theory')} className="flex-1">
                              Save Changes
                            </Button>
                            <Button onClick={cancelEdit} variant="outline" className="flex-1">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: editedContent.content.theory.html }} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* SVG Tab */}
            {editedContent.content.svg_animation && (
              <TabsContent value="svg" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">SVG Animation</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => startEdit('svg', editedContent.content.svg_animation)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit SVG Animation</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>SVG Type</Label>
                            <Input
                              value={tempEdit?.svg_type || ''}
                              onChange={(e) => setTempEdit({ ...tempEdit, svg_type: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>SVG Data (JSON)</Label>
                            <Textarea
                              value={JSON.stringify(tempEdit?.svg_data || {}, null, 2)}
                              onChange={(e) => {
                                try {
                                  setTempEdit({ ...tempEdit, svg_data: JSON.parse(e.target.value) });
                                } catch (err) {
                                  // Invalid JSON, ignore
                                }
                              }}
                              rows={10}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => saveEdit('svg')} className="flex-1">
                              Save Changes
                            </Button>
                            <Button onClick={cancelEdit} variant="outline" className="flex-1">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                      {JSON.stringify(editedContent.content.svg_animation, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Games Tab */}
            {editedContent.content.games && (
              <TabsContent value="games" className="space-y-4">
                {editedContent.content.games.map((game: any, index: number) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base capitalize">
                        {game.game_type?.replace('_', ' ')}
                      </CardTitle>
                      <Button
                        onClick={() => {
                          const newGames = [...editedContent.content.games];
                          newGames.splice(index, 1);
                          setEditedContent({
                            ...editedContent,
                            content: { ...editedContent.content, games: newGames }
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                        {JSON.stringify(game, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            )}

            {/* Exercises Tab */}
            {editedContent.content.exercises && (
              <TabsContent value="exercises" className="space-y-4">
                {editedContent.content.exercises.map((exercise: any, index: number) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">Question {index + 1}</CardTitle>
                      <Button
                        onClick={() => {
                          const newExercises = [...editedContent.content.exercises];
                          newExercises.splice(index, 1);
                          setEditedContent({
                            ...editedContent,
                            content: { ...editedContent.content, exercises: newExercises }
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm font-medium">{exercise.question_text}</p>
                      {exercise.options && (
                        <div className="space-y-1">
                          {exercise.options.map((opt: string, i: number) => (
                            <div
                              key={i}
                              className={`text-sm p-2 rounded ${
                                opt === exercise.correct_answer
                                  ? 'bg-green-100 dark:bg-green-900/20'
                                  : 'bg-muted'
                              }`}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      {exercise.explanation && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <strong>Explanation:</strong> {exercise.explanation}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
