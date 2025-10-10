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
import { useExamTypes } from "@/hooks/useExamTypes";
import { BoardClassSelector } from "./BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";
import * as LucideIcons from "lucide-react";
import { calculateXP, Difficulty } from "@/lib/xpConfig";

interface Topic {
  topic_name: string;
  day_number: number;
  book_page_reference?: string;
  xp_reward?: number;
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

// Helper to normalize difficulty values
const normalizeDifficulty = (val?: string): Difficulty => {
  const d = (val || 'medium').toLowerCase();
  return d === 'easy' || d === 'hard' ? d as Difficulty : 'medium';
};

export const ManualTopicEditor = () => {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
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
  const [roadmapCounts, setRoadmapCounts] = useState<any>({ byBoard: {}, byClass: {} });
  
  const { toast } = useToast();
  const { examTypes } = useExamTypes();
  const { selectedBoard, selectedClass, setBoard, setClass, resetFromBoard, resetToBoard } = useBoardClassHierarchy();

  const iconMap: Record<string, any> = {
    GraduationCap: LucideIcons.GraduationCap,
    BookOpen: LucideIcons.BookOpen,
    Briefcase: LucideIcons.Briefcase,
    Building2: LucideIcons.Building2,
    Globe: LucideIcons.Globe,
    Shield: LucideIcons.Shield,
    Zap: LucideIcons.Zap,
    Award: LucideIcons.Award,
    Pencil: LucideIcons.Pencil,
  };

  useEffect(() => {
    if (selectedDomain) {
      fetchBatches();
      fetchRoadmapCounts();
      setSelectedBatch("");
      setSelectedSubject("");
      setSelectedChapter("");
    }
  }, [selectedDomain, selectedBoard, selectedClass]);

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
    if (!selectedDomain) return;

    let query = supabase
      .from("batches")
      .select("id, name, exam_type, exam_name, level, linked_roadmap_id, target_board, target_class, current_strength")
      .eq("is_active", true)
      .eq("exam_type", selectedDomain);

    const { data, error } = await query.order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load batches",
        variant: "destructive"
      });
      return;
    }

    // Filter by board and class for school domain
    let filteredData = data || [];
    if (selectedDomain === 'school') {
      filteredData = filteredData.filter(b => 
        (!selectedBoard || b.target_board === selectedBoard) &&
        (!selectedClass || b.target_class === selectedClass)
      );
    }

    setBatches(filteredData);
  };

  const fetchRoadmapCounts = async () => {
    if (!selectedDomain) return;
    
    const { data, error } = await supabase
      .from('batches')
      .select('id, exam_type, target_board, target_class, linked_roadmap_id')
      .eq('exam_type', selectedDomain)
      .eq('is_active', true)
      .not('linked_roadmap_id', 'is', null);
    
    if (error) {
      console.error('Error fetching roadmap counts:', error);
      return;
    }
    
    const byBoard: Record<string, number> = {};
    const byClass: Record<string, Record<string, number>> = {};
    
    data?.forEach((batch: any) => {
      const board = batch.target_board || 'General';
      const cls = batch.target_class;
      
      byBoard[board] = (byBoard[board] || 0) + 1;
      
      if (cls) {
        if (!byClass[board]) byClass[board] = {};
        byClass[board][cls] = (byClass[board][cls] || 0) + 1;
      }
    });
    
    setRoadmapCounts({ byBoard, byClass });
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
    const diff: Difficulty = 'medium';
    setTopics([
      ...topics,
      {
        topic_name: "",
        day_number: topics.length + 1,
        xp_reward: calculateXP('theory', diff),
        difficulty: diff,
        animation_type: "interactive_svg"
      }
    ]);
  };

  const updateTopic = (index: number, field: keyof Topic, value: any) => {
    const updated = [...topics];
    
    // Auto-update XP when difficulty changes
    if (field === 'difficulty') {
      const diff = normalizeDifficulty(value);
      updated[index] = {
        ...updated[index],
        difficulty: diff,
        xp_reward: calculateXP('theory', diff),
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
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
        // Normalize XP based on difficulty
        const normalized = data.topics.map((t: any) => {
          const diff = normalizeDifficulty(t.difficulty);
          return {
            ...t,
            difficulty: diff,
            xp_reward: calculateXP('theory', diff)
          };
        });
        
        setTopics([...topics, ...normalized]);
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
          const rawDifficulty = parts[4] || 'medium';
          const diff = normalizeDifficulty(rawDifficulty);
          
          parsed.push({
            topic_name: parts[0],
            day_number: parseInt(parts[1]) || (parsed.length + 1),
            book_page_reference: parts[2] || undefined,
            xp_reward: calculateXP('theory', diff), // Derive from difficulty
            difficulty: diff,
            animation_type: parts[5] || "interactive_svg" // Fixed index
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
      const topicsToInsert = topics.map((topic, index) => {
        const diff = normalizeDifficulty(topic.difficulty);
        return {
          chapter_id: selectedChapter,
          topic_name: topic.topic_name,
          estimated_hours: 1,
          day_number: topic.day_number || (index + 1),
          order_num: index + 1,
          xp_reward: calculateXP('theory', diff), // Always derive from difficulty
          unlock_condition: index === 0 ? "always" : "previous_complete"
        };
      });

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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Add Topics</h2>
          <p className="text-muted-foreground mt-1">
            {selectedDomain 
              ? `Managing topics for ${examTypes.find(t => t.code === selectedDomain)?.display_name}` 
              : "Select an exam domain to manage topics"}
          </p>
        </div>
        {selectedDomain && (
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={() => { 
              setSelectedDomain(null); 
              resetFromBoard();
              setSelectedBatch("");
              setSelectedSubject("");
              setSelectedChapter("");
            }} variant="outline">
              Change Domain
            </Button>
            
            {selectedDomain === 'school' && selectedBoard && (
              <Button variant="outline" onClick={resetFromBoard}>
                Change Board
              </Button>
            )}
            
            {selectedDomain === 'school' && selectedBoard && selectedClass && (
              <Button variant="outline" onClick={resetToBoard}>
                Change Class
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Domain Selection Cards */}
      {!selectedDomain ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Select Exam Domain</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {examTypes.map((examType, index) => {
              const IconComponent = examType.icon_name ? iconMap[examType.icon_name] || LucideIcons.BookOpen : LucideIcons.BookOpen;
              return (
                <Card 
                  key={examType.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 animate-fade-in hover:scale-105 border-2 hover:border-primary"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => {
                    setSelectedDomain(examType.code);
                    resetFromBoard();
                  }}
                >
                  <CardContent className="p-6">
                    <div className={`w-full h-24 ${examType.color_class || 'bg-gradient-to-br from-gray-500 to-gray-600'} rounded-lg mb-4 flex items-center justify-center`}>
                      <IconComponent className="h-12 w-12 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{examType.display_name}</h4>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : selectedDomain === 'school' && (!selectedBoard || !selectedClass) ? (
        <BoardClassSelector
          examType={selectedDomain}
          selectedBoard={selectedBoard}
          selectedClass={selectedClass}
          onBoardSelect={setBoard}
          onClassSelect={setClass}
          onReset={resetFromBoard}
          onResetToBoard={resetToBoard}
          studentCounts={roadmapCounts}
          countLabel="roadmaps"
        />
      ) : (
        <>
          {/* Selected Domain Badge */}
          <Card className="animate-fade-in bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const examType = examTypes.find(t => t.code === selectedDomain);
                  const IconComponent = examType?.icon_name ? iconMap[examType.icon_name] || LucideIcons.BookOpen : LucideIcons.BookOpen;
                  return (
                    <div className={`p-3 rounded-lg ${examType?.color_class || 'bg-gray-500'}`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                  );
                })()}
                <div>
                  <p className="text-sm text-muted-foreground">Selected Domain</p>
                  <p className="text-xl font-bold">{examTypes.find(t => t.code === selectedDomain)?.display_name}</p>
                </div>
              </div>
              <Badge className="text-lg px-4 py-2">{batches.length} batches</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Topics to Chapters</CardTitle>
              <CardDescription>
                Add topics manually with book references and learning parameters
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
              Format: Topic Name, Day#, Page, XP, Difficulty, AnimationType
            </p>
            <Textarea
              placeholder="Introduction to Algebra, 1, 45, 50, medium, interactive_svg"
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
                    <TableHead className="w-24">Page</TableHead>
                <TableHead className="w-28">XP</TableHead>
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
                          readOnly
                          disabled
                          className="bg-muted cursor-not-allowed"
                          title="XP is automatically calculated from difficulty"
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
        </>
      )}
    </div>
  );
};
