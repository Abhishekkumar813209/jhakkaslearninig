import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Topic {
  topic_name: string;
  estimated_hours: number;
  day_number: number;
  book_page_reference?: string;
  xp_reward?: number;
  coin_reward?: number;
  difficulty?: string;
  animation_type?: string;
}

interface Batch {
  id: string;
  name: string;
}

interface Roadmap {
  id: string;
  title: string;
  batch_id: string;
}

interface Chapter {
  id: string;
  chapter_name: string;
  subject: string;
}

export const ManualTopicEditor = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedRoadmap, setSelectedRoadmap] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [csvInput, setCsvInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchRoadmaps(selectedBatch);
    }
  }, [selectedBatch]);

  useEffect(() => {
    if (selectedRoadmap) {
      fetchChapters(selectedRoadmap);
    }
  }, [selectedRoadmap]);

  const fetchBatches = async () => {
    const { data, error } = await supabase
      .from("batches")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load batches",
        variant: "destructive"
      });
      return;
    }

    setBatches(data || []);
  };

  const fetchRoadmaps = async (batchId: string) => {
    const { data, error } = await supabase
      .from("batch_roadmaps")
      .select("id, title, batch_id")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load roadmaps",
        variant: "destructive"
      });
      return;
    }

    setRoadmaps(data || []);
    setSelectedRoadmap("");
    setChapters([]);
  };

  const fetchChapters = async (roadmapId: string) => {
    const { data, error } = await supabase
      .from("roadmap_chapters")
      .select("id, chapter_name, subject")
      .eq("roadmap_id", roadmapId)
      .order("order_num");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load chapters",
        variant: "destructive"
      });
      return;
    }

    setChapters(data || []);
    setSelectedChapter("");
  };

  const addEmptyTopic = () => {
    setTopics([
      ...topics,
      {
        topic_name: "",
        estimated_hours: 1,
        day_number: topics.length + 1,
        xp_reward: 50,
        coin_reward: 10,
        difficulty: "medium",
        animation_type: "interactive_svg"
      }
    ]);
  };

  const updateTopic = (index: number, field: keyof Topic, value: any) => {
    const updated = [...topics];
    updated[index] = { ...updated[index], [field]: value };
    setTopics(updated);
  };

  const removeTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const handleCsvParse = () => {
    try {
      const lines = csvInput.trim().split("\n");
      const parsed: Topic[] = [];

      for (const line of lines) {
        const parts = line.split(",").map(p => p.trim());
        if (parts.length >= 2) {
          parsed.push({
            topic_name: parts[0],
            estimated_hours: parseFloat(parts[1]) || 1,
            day_number: parseInt(parts[2]) || (parsed.length + 1),
            book_page_reference: parts[3] || undefined,
            xp_reward: parseInt(parts[4]) || 50,
            coin_reward: parseInt(parts[5]) || 10,
            difficulty: parts[6] || "medium",
            animation_type: parts[7] || "interactive_svg"
          });
        }
      }

      if (parsed.length > 0) {
        setTopics([...topics, ...parsed]);
        setCsvInput("");
        toast({
          title: "CSV Parsed",
          description: `Added ${parsed.length} topics from CSV`
        });
      }
    } catch (error) {
      toast({
        title: "CSV Parse Error",
        description: "Invalid CSV format",
        variant: "destructive"
      });
    }
  };

  const saveTopics = async () => {
    if (!selectedChapter || topics.length === 0) {
      toast({
        title: "Validation Error",
        description: "Select a chapter and add at least one topic",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const topicsToInsert = topics.map((topic, index) => ({
        chapter_id: selectedChapter,
        topic_name: topic.topic_name,
        estimated_hours: topic.estimated_hours,
        day_number: topic.day_number || (index + 1),
        order_num: index + 1,
        xp_reward: topic.xp_reward || 50,
        coin_reward: topic.coin_reward || 10,
        unlock_condition: index === 0 ? "always" : "previous_complete"
      }));

      const { error } = await supabase
        .from("roadmap_topics")
        .insert(topicsToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${topics.length} topics successfully`
      });

      setTopics([]);
      setCsvInput("");
    } catch (error: any) {
      console.error("Error saving topics:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save topics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Topic Addition</CardTitle>
          <CardDescription>
            Add topics to chapters manually with book references and learning parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selection Section */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Roadmap</Label>
              <Select 
                value={selectedRoadmap} 
                onValueChange={setSelectedRoadmap}
                disabled={!selectedBatch}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select roadmap" />
                </SelectTrigger>
                <SelectContent>
                  {roadmaps.map((roadmap) => (
                    <SelectItem key={roadmap.id} value={roadmap.id}>
                      {roadmap.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chapter</Label>
              <Select 
                value={selectedChapter} 
                onValueChange={setSelectedChapter}
                disabled={!selectedRoadmap}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.chapter_name} ({chapter.subject})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CSV Bulk Input */}
          <div className="space-y-2">
            <Label>Bulk CSV Input</Label>
            <p className="text-xs text-muted-foreground">
              Format: Topic Name, Hours, Day#, Page, XP, Coins, Difficulty, AnimationType
            </p>
            <Textarea
              placeholder="Introduction to Algebra, 1.5, 1, 45, 50, 10, medium, interactive_svg"
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              rows={4}
              className="font-mono text-xs"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCsvParse}
              disabled={!csvInput.trim()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Parse CSV
            </Button>
          </div>

          {/* Topics Table */}
          {topics.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Topic Name</TableHead>
                    <TableHead className="w-24">Hours</TableHead>
                    <TableHead className="w-24">Day#</TableHead>
                    <TableHead className="w-32">Page</TableHead>
                    <TableHead className="w-20">XP</TableHead>
                    <TableHead className="w-20">Coins</TableHead>
                    <TableHead className="w-32">Difficulty</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topics.map((topic, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={topic.topic_name}
                          onChange={(e) => updateTopic(index, "topic_name", e.target.value)}
                          placeholder="Topic name"
                          className="min-w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.5"
                          value={topic.estimated_hours}
                          onChange={(e) => updateTopic(index, "estimated_hours", parseFloat(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={topic.day_number}
                          onChange={(e) => updateTopic(index, "day_number", parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={topic.book_page_reference || ""}
                          onChange={(e) => updateTopic(index, "book_page_reference", e.target.value)}
                          placeholder="e.g., 45-47"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={topic.xp_reward}
                          onChange={(e) => updateTopic(index, "xp_reward", parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={topic.coin_reward}
                          onChange={(e) => updateTopic(index, "coin_reward", parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={topic.difficulty}
                          onValueChange={(value) => updateTopic(index, "difficulty", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTopic(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={addEmptyTopic}
              disabled={!selectedChapter}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Topic Row
            </Button>

            <div className="flex gap-2">
              <Badge variant="secondary">
                {topics.length} topic(s) ready
              </Badge>
              <Button 
                onClick={saveTopics} 
                disabled={loading || topics.length === 0 || !selectedChapter}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save All Topics"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};