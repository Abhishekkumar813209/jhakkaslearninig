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
import { Plus, Trash2, Save, Upload, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Topic {
  topic_name: string;
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
  exam_type: string;
  exam_name: string;
  level: string;
  linked_roadmap_id: string;
}

interface Subject {
  subject: string;
}

interface Chapter {
  id: string;
  chapter_name: string;
  subject: string;
  estimated_days?: number;
}

export const ManualTopicEditor = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [csvInput, setCsvInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchSubjects();
      setSelectedSubject("");
      setSelectedChapter("");
    }
  }, [selectedBatch]);

  useEffect(() => {
    if (selectedSubject) {
      fetchChapters();
      setSelectedChapter("");
    }
  }, [selectedSubject]);

  const fetchBatches = async () => {
    const { data, error } = await supabase
      .from("batches")
      .select("id, name, exam_type, exam_name, level, linked_roadmap_id")
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

  const fetchSubjects = async () => {
    if (!selectedBatch) return;

    const batch = batches.find(b => b.id === selectedBatch);
    if (!batch?.linked_roadmap_id) {
      toast({
        title: "Warning",
        description: "This batch has no linked roadmap",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase
      .from("roadmap_chapters")
      .select("subject")
      .eq("roadmap_id", batch.linked_roadmap_id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load subjects",
        variant: "destructive"
      });
      return;
    }

    const uniqueSubjects = Array.from(new Set(data.map(d => d.subject)))
      .map(subject => ({ subject }));
    setSubjects(uniqueSubjects);
  };

  const fetchChapters = async () => {
    if (!selectedBatch || !selectedSubject) return;

    const batch = batches.find(b => b.id === selectedBatch);
    if (!batch?.linked_roadmap_id) return;

    const { data, error } = await supabase
      .from("roadmap_chapters")
      .select("id, chapter_name, subject, estimated_days")
      .eq("roadmap_id", batch.linked_roadmap_id)
      .eq("subject", selectedSubject)
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
  };

  const addEmptyTopic = () => {
    setTopics([
      ...topics,
      {
        topic_name: "",
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

  const generateTopicsWithAI = async () => {
    if (!selectedChapter || !selectedBatch) {
      toast({ title: "Error", description: "Please select a batch and chapter", variant: "destructive" });
      return;
    }

    setAiGenerating(true);
    try {
      const selectedChapterData = chapters.find(c => c.id === selectedChapter);
      const batch = batches.find(b => b.id === selectedBatch);
      
      if (!selectedChapterData || !batch) throw new Error("Chapter or batch not found");

      console.log('Generating budget-aware topics...', {
        chapter: selectedChapterData.chapter_name,
        subject: selectedChapterData.subject,
        exam_type: batch.exam_type,
        estimated_days: selectedChapterData.estimated_days
      });

      const { data, error } = await supabase.functions.invoke('ai-generate-chapter-topics', {
        body: {
          chapter_id: selectedChapter,
          chapter_name: selectedChapterData.chapter_name,
          subject: selectedChapterData.subject,
          exam_type: batch.exam_type,
          exam_name: batch.exam_name,
          estimated_days: selectedChapterData.estimated_days || 3,
          existing_topics_count: topics.length
        }
      });

      if (error) throw error;

      if (data?.success && data?.topics) {
        setTopics([...topics, ...data.topics]);
        toast({
          title: "✨ AI Generated Topics",
          description: `Added ${data.topics.length} budget-aware topics for ${selectedChapterData.chapter_name}`
        });
      } else {
        throw new Error(data?.error || "Failed to generate topics");
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate topics with AI",
        variant: "destructive"
      });
    } finally {
      setAiGenerating(false);
    }
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
            day_number: parseInt(parts[1]) || (parsed.length + 1),
            book_page_reference: parts[2] || undefined,
            xp_reward: parseInt(parts[3]) || 50,
            coin_reward: parseInt(parts[4]) || 10,
            difficulty: parts[5] || "medium",
            animation_type: parts[6] || "interactive_svg"
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
        estimated_hours: 1,
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
          {/* Simplified Selection: Batch → Subject → Chapter */}
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
                      <div className="flex flex-col">
                        <span>{batch.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {batch.exam_name} ({batch.level})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
                disabled={!selectedBatch}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subj, idx) => (
                    <SelectItem key={idx} value={subj.subject}>
                      {subj.subject}
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
                disabled={!selectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{chapter.chapter_name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {chapter.estimated_days}d
                        </Badge>
                      </div>
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
              Format: Topic Name, Day#, Page, XP, Coins, Difficulty, AnimationType
            </p>
            <Textarea
              placeholder="Introduction to Algebra, 1, 45, 50, 10, medium, interactive_svg"
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
                          value={topic.day_number}
                          onChange={(e) => updateTopic(index, "day_number", parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={topic.book_page_reference || ""}
                          onChange={(e) => updateTopic(index, "book_page_reference", e.target.value)}
                          placeholder="Page ref"
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
                          onValueChange={(val) => updateTopic(index, "difficulty", val)}
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
          <div className="flex gap-2">
            <Button onClick={addEmptyTopic} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Topic Row
            </Button>
            
            <Button
              onClick={generateTopicsWithAI}
              variant="secondary"
              disabled={!selectedChapter || aiGenerating}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {aiGenerating ? "Generating..." : "Generate with AI"}
            </Button>
            
            <Button
              onClick={saveTopics}
              disabled={topics.length === 0 || loading}
              className="ml-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : `Save ${topics.length} Topics`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
