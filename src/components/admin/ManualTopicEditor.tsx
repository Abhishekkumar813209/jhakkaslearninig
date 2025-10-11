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
import { Plus, Trash2, Save, Upload, Sparkles, FileText, Image, X, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useExamTypes } from "@/hooks/useExamTypes";
import { BoardClassSelector } from "./BoardClassSelector";
import { useBoardClassHierarchy } from "@/hooks/useBoardClassHierarchy";
import * as LucideIcons from "lucide-react";
import { calculateXP, Difficulty } from "@/lib/xpConfig";

interface Topic {
  id?: string;
  topic_name: string;
  day_number: number;
  book_page_reference?: string;
  xp_reward?: number;
  difficulty?: string;
  animation_type?: string;
  isSaved?: boolean;
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
  const [existingTopics, setExistingTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExistingTopics, setLoadingExistingTopics] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [roadmapCounts, setRoadmapCounts] = useState<any>({ byBoard: {}, byClass: {} });
  
  // Bulk input states
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [syllabusText, setSyllabusText] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [bulkParsing, setBulkParsing] = useState(false);
  
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

  useEffect(() => {
    if (selectedChapter) {
      fetchExistingTopics(selectedChapter);
    } else {
      setTopics([]);
      setExistingTopics([]);
    }
  }, [selectedChapter]);

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

  const fetchExistingTopics = async (chapterId: string) => {
    setLoadingExistingTopics(true);
    try {
      const { data, error } = await supabase
        .from('roadmap_topics')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('day_number', { ascending: true });

      if (error) throw error;

      const formattedTopics: Topic[] = (data || []).map(t => ({
        id: t.id,
        topic_name: t.topic_name,
        day_number: t.day_number,
        book_page_reference: '',
        xp_reward: t.xp_reward || 30,
        difficulty: 'medium',
        animation_type: 'interactive_svg',
        isSaved: true
      }));

      setExistingTopics(formattedTopics);
      setTopics(formattedTopics);
      
      console.log(`Loaded ${formattedTopics.length} existing topics for chapter ${chapterId}`);
    } catch (error: any) {
      console.error("Error fetching existing topics:", error);
      toast({
        title: "Failed to Load Topics",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingExistingTopics(false);
    }
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

  const removeTopic = async (index: number) => {
    const topicToRemove = topics[index];
    
    if (topicToRemove.isSaved && topicToRemove.id) {
      try {
        const { error } = await supabase
          .from('roadmap_topics')
          .delete()
          .eq('id', topicToRemove.id);

        if (error) throw error;

        toast({
          title: "Topic Deleted",
          description: `"${topicToRemove.topic_name}" removed from database`
        });
      } catch (error: any) {
        console.error("Delete error:", error);
        toast({
          title: "Delete Failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
    }

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (PNG, JPG, JPEG)",
        variant: "destructive"
      });
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBulkParse = async () => {
    if (!selectedChapter || !selectedBatch) {
      toast({
        title: "Error",
        description: "Please select a batch and chapter",
        variant: "destructive"
      });
      return;
    }

    setBulkParsing(true);
    try {
      const selectedChapterData = chapters.find(c => c.id === selectedChapter);
      const batch = batches.find(b => b.id === selectedBatch);
      
      if (!selectedChapterData || !batch) {
        throw new Error("Chapter or batch not found");
      }

      let requestBody: any = {
        chapter_id: selectedChapter,
        chapter_name: selectedChapterData.chapter_name,
        subject: selectedChapterData.subject,
        exam_type: batch.exam_type,
        exam_name: batch.exam_name,
        estimated_days: selectedChapterData.estimated_days || 3,
        existing_topics_count: topics.length,
        input_mode: inputMode
      };

      if (inputMode === 'text') {
        requestBody.syllabus_text = syllabusText;
      } else {
        requestBody.syllabus_image = uploadedImage;
      }

      console.log(`Parsing syllabus (${inputMode} mode)...`, {
        chapter: selectedChapterData.chapter_name,
        estimated_days: selectedChapterData.estimated_days,
        has_image: !!uploadedImage,
        text_length: syllabusText.length
      });

      const { data, error } = await supabase.functions.invoke('ai-generate-chapter-topics', {
        body: requestBody
      });

      if (error) throw error;

      if (data?.success && data?.topics) {
        const normalized = data.topics.map((t: any) => {
          const diff = normalizeDifficulty(t.difficulty);
          return {
            ...t,
            difficulty: diff,
            xp_reward: calculateXP('theory', diff)
          };
        });
        
        setTopics([...topics, ...normalized]);
        
        // Clear inputs
        setSyllabusText("");
        setUploadedImage(null);
        setImageFile(null);
        
        toast({
          title: "✨ Topics Generated Successfully",
          description: `Extracted ${data.topics.length} topics from ${inputMode === 'image' ? 'image' : 'text'} with day allocations`
        });
      } else {
        throw new Error(data?.error || "Failed to generate topics");
      }
    } catch (error: any) {
      console.error("Bulk Parse Error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate topics with AI",
        variant: "destructive"
      });
    } finally {
      setBulkParsing(false);
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
      const newTopics = topics.filter(t => !t.isSaved);
      const updatedTopics = topics.filter(t => t.isSaved && t.id);

      if (newTopics.length > 0) {
        const topicsToInsert = newTopics.map((topic, index) => {
          const diff = normalizeDifficulty(topic.difficulty);
          return {
            chapter_id: selectedChapter,
            topic_name: topic.topic_name,
            estimated_hours: 1,
            day_number: topic.day_number || (index + 1),
            order_num: index + 1,
            xp_reward: calculateXP('theory', diff),
            unlock_condition: index === 0 ? "always" : "previous_complete"
          };
        });

        const { error: insertError } = await supabase
          .from("roadmap_topics")
          .insert(topicsToInsert);

        if (insertError) throw insertError;
      }

      if (updatedTopics.length > 0) {
        for (const topic of updatedTopics) {
          const diff = normalizeDifficulty(topic.difficulty);
          const { error: updateError } = await supabase
            .from("roadmap_topics")
            .update({
              topic_name: topic.topic_name,
              day_number: topic.day_number,
              xp_reward: calculateXP('theory', diff)
            })
            .eq('id', topic.id);

          if (updateError) throw updateError;
        }
      }

      toast({
        title: "Topics Saved Successfully",
        description: `${newTopics.length} new, ${updatedTopics.length} updated`
      });

      await fetchExistingTopics(selectedChapter);
      setSyllabusText("");
      setUploadedImage(null);
      setImageFile(null);
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
              {selectedChapter && (
                <div className="flex items-center gap-2 text-sm mt-2">
                  <Badge variant="secondary">
                    {existingTopics.length} Existing Topics
                  </Badge>
                  {topics.length > existingTopics.length && (
                    <Badge variant="default">
                      {topics.length - existingTopics.length} New Topics
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bulk Input - Text or Image */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Bulk Input Method</Label>
              <div className="flex gap-2">
                <Button
                  variant={inputMode === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode('text')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Paste Text
                </Button>
                <Button
                  variant={inputMode === 'image' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode('image')}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
              </div>
            </div>

            {inputMode === 'text' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Paste syllabus text from official site (any format - bullets, paragraphs, numbered lists)
                </p>
                <Textarea
                  placeholder="Example:
Unit 1: Magnetism
- Bar magnets and field lines
- Biot-Savart law
- Ampere's law applications
- Earth's magnetic field

AI will extract topics and allocate day budgets automatically."
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {inputMode === 'image' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Upload image of syllabus page (textbook, PDF screenshot, official document)
                </p>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="syllabus-image-upload"
                  />
                  <label
                    htmlFor="syllabus-image-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    {uploadedImage ? (
                      <div className="relative">
                        <img 
                          src={uploadedImage} 
                          alt="Uploaded syllabus" 
                          className="max-h-48 rounded-lg"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={(e) => {
                            e.preventDefault();
                            setUploadedImage(null);
                            setImageFile(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Click to upload image</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, JPEG up to 10MB</p>
                        </div>
                      </>
                    )}
                  </label>
                </div>
              </div>
            )}

            <Button
              onClick={handleBulkParse}
              disabled={
                !selectedChapter || 
                bulkParsing || 
                (inputMode === 'text' && !syllabusText.trim()) ||
                (inputMode === 'image' && !imageFile)
              }
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {bulkParsing ? "AI Processing..." : "Generate Topics with AI"}
            </Button>

            {bulkParsing && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI is {inputMode === 'image' ? 'reading image and' : ''} extracting topics with day budgets...
                </p>
              </div>
            )}
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
                    <TableRow key={index} className={topic.isSaved ? 'bg-green-50/30 dark:bg-green-950/20' : 'bg-blue-50/30 dark:bg-blue-950/20'}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {index + 1}
                          {topic.isSaved && (
                            <Badge variant="outline" className="text-xs">
                              Saved
                            </Badge>
                          )}
                        </div>
                      </TableCell>
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
              onClick={() => setTopics(existingTopics)} 
              variant="outline"
              disabled={topics.length === existingTopics.length}
            >
              <X className="h-4 w-4 mr-2" />
              Clear New Topics
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
