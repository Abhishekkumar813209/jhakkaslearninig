import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllTemplates, WellnessTemplate, getTemplateBySlug } from '@/lib/wellnessTemplates';
import { Calendar, Clock, Target, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const WellnessRoadmapManager = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<WellnessTemplate | null>(null);
  const [roadmapTitle, setRoadmapTitle] = useState('');
  const [roadmapDescription, setRoadmapDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const templates = getAllTemplates();

  const handleTemplateSelect = (slug: string) => {
    const template = getTemplateBySlug(slug);
    if (template) {
      setSelectedTemplate(template);
      setRoadmapTitle(template.title);
      setRoadmapDescription(template.description);
    }
  };

  const createRoadmap = async () => {
    if (!selectedTemplate || !startDate || !batchId) {
      toast({
        title: 'Missing Information',
        description: 'Please select template, batch, and start date',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate end date
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + selectedTemplate.totalDays);

      // Create roadmap
      const { data: roadmap, error: roadmapError } = await supabase
        .from('batch_roadmaps')
        .insert({
          title: roadmapTitle,
          description: roadmapDescription,
          batch_id: batchId,
          start_date: startDate,
          end_date: end.toISOString().split('T')[0],
          total_days: selectedTemplate.totalDays,
          is_wellness_mode: true,
          status: 'active',
          created_by: user.id,
          ai_generated_plan: {
            template_id: selectedTemplate.id,
            template_slug: selectedTemplate.slug
          }
        })
        .select()
        .single();

      if (roadmapError) throw roadmapError;

      // Create chapters and topics for each phase
      let currentDay = 0;
      for (const phase of selectedTemplate.phases) {
        for (const task of phase.tasks) {
          // Insert chapter (task)
          const { data: chapter, error: chapterError } = await supabase
            .from('roadmap_chapters')
            .insert({
              roadmap_id: roadmap.id,
              subject: phase.name,
              chapter_name: task.name,
              description: task.description,
              estimated_days: task.days,
              day_start: currentDay + 1,
              day_end: currentDay + task.days,
              order_num: currentDay,
              is_wellness_mode: true
            })
            .select()
            .single();

          if (chapterError) throw chapterError;

          // Insert topics (daily activities)
          for (let i = 0; i < task.dailyActivities.length; i++) {
            await supabase
              .from('roadmap_topics')
              .insert({
                chapter_id: chapter.id,
                topic_name: task.dailyActivities[i],
                estimated_hours: 1,
                order_num: i,
                day_number: currentDay + Math.floor(i / 3) + 1,
                is_wellness_mode: true
              });
          }

          currentDay += task.days;
        }
      }

      toast({
        title: 'Roadmap Created!',
        description: `${roadmapTitle} has been set up successfully`
      });

      // Reset form
      setSelectedTemplate(null);
      setRoadmapTitle('');
      setRoadmapDescription('');
      setStartDate('');
      setBatchId('');

    } catch (error: any) {
      console.error('Error creating roadmap:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Wellness Roadmap</CardTitle>
          <CardDescription>Choose a template and configure your wellness program</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="templates">
            <TabsList>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="configure">Configure</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template.slug)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <span className="text-4xl">{template.icon}</span>
                        <Badge variant={template.difficulty === 'advanced' ? 'destructive' : 'secondary'}>
                          {template.difficulty}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {template.totalDays} days
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {template.phases.length} phases
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedTemplate && (
                <Card className="bg-accent">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{selectedTemplate.icon}</span>
                      {selectedTemplate.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedTemplate.phases.map((phase, idx) => (
                      <div key={idx} className="border-l-4 border-primary pl-4">
                        <h4 className="font-semibold">{phase.name}</h4>
                        <p className="text-sm text-muted-foreground">{phase.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {phase.days} days · {phase.tasks.length} tasks
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="configure" className="space-y-4">
              {!selectedTemplate ? (
                <p className="text-muted-foreground">Please select a template first</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title">Roadmap Title</Label>
                    <Input
                      id="title"
                      value={roadmapTitle}
                      onChange={(e) => setRoadmapTitle(e.target.value)}
                      placeholder="e.g., 90-Day NoFap Journey - Batch A"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={roadmapDescription}
                      onChange={(e) => setRoadmapDescription(e.target.value)}
                      placeholder="Additional context for this roadmap..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="batch">Batch ID</Label>
                      <Input
                        id="batch"
                        value={batchId}
                        onChange={(e) => setBatchId(e.target.value)}
                        placeholder="Enter batch UUID"
                      />
                      <p className="text-xs text-muted-foreground">
                        Tip: Get batch ID from the batches table
                      </p>
                    </div>
                  </div>

                  <Button onClick={createRoadmap} disabled={loading} className="w-full">
                    <Zap className="h-4 w-4 mr-2" />
                    {loading ? 'Creating...' : 'Create Wellness Roadmap'}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
