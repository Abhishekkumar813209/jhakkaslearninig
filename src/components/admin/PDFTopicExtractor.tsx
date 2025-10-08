import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, Upload, BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ExtractedTopic {
  topic_name: string;
  page_references: string;
  suggested_days: number;
  difficulty: string;
  importance_score: number;
  can_skip: boolean;
  exam_relevance: string;
  animation_type: string;
  game_suggestions: string[];
  key_concepts: string[];
}

interface ExtractedChapter {
  chapter_name: string;
  chapter_number: number;
  topics: ExtractedTopic[];
}

interface ExtractedData {
  chapters: ExtractedChapter[];
  metadata: {
    total_chapters: number;
    total_topics: number;
    exam_type: string;
    subject: string;
    class: string;
  };
}

interface PDFTopicExtractorProps {
  onTopicsExtracted: (data: ExtractedData, fileName: string) => void;
}

export function PDFTopicExtractor({ onTopicsExtracted }: PDFTopicExtractorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [examType, setExamType] = useState("");
  const [subject, setSubject] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 100); // Limit to first 100 pages
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    
    return fullText;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setExtractedData(null);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file",
        variant: "destructive"
      });
    }
  };

  const handleExtractTopics = async () => {
    if (!pdfFile) {
      toast({
        title: "No File Selected",
        description: "Please upload a PDF file first",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      toast({
        title: "Extracting Text",
        description: "Reading PDF content...",
      });

      const pdfText = await extractTextFromPDF(pdfFile);
      
      toast({
        title: "Analyzing Content",
        description: "AI is extracting topics and chapters...",
      });

      const { data, error } = await supabase.functions.invoke('ai-pdf-topic-extractor', {
        body: {
          pdfText,
          fileName: pdfFile.name,
          examType,
          subject
        }
      });

      if (error) throw error;

      if (data.success && data.data) {
        setExtractedData(data.data);
        onTopicsExtracted(data.data, pdfFile.name);
        toast({
          title: "Topics Extracted Successfully",
          description: `Found ${data.data.metadata.total_chapters} chapters with ${data.data.metadata.total_topics} topics`,
        });
      } else {
        throw new Error(data.error || 'Failed to extract topics');
      }

    } catch (error: any) {
      console.error('PDF extraction error:', error);
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract topics from PDF",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          PDF Topic Extractor
        </CardTitle>
        <CardDescription>
          Upload a PDF to automatically extract chapter and topic structure using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Exam Type</Label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger>
                <SelectValue placeholder="Select exam type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="JEE">JEE Mains/Advanced</SelectItem>
                <SelectItem value="NEET">NEET</SelectItem>
                <SelectItem value="CBSE">CBSE</SelectItem>
                <SelectItem value="ICSE">ICSE</SelectItem>
                <SelectItem value="State Board">State Board</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="Physics">Physics</SelectItem>
                <SelectItem value="Chemistry">Chemistry</SelectItem>
                <SelectItem value="Biology">Biology</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Upload PDF</Label>
          <div className="flex gap-2">
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={loading}
            />
            <Button 
              onClick={handleExtractTopics} 
              disabled={!pdfFile || loading}
              className="whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Extract Topics
                </>
              )}
            </Button>
          </div>
          {pdfFile && (
            <p className="text-sm text-muted-foreground">
              Selected: {pdfFile.name}
            </p>
          )}
        </div>

        {extractedData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Extracted Structure ({extractedData.chapters.length} chapters)
              </Label>
              <Badge variant="secondary">
                {extractedData.metadata.total_topics} topics
              </Badge>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-4 space-y-4">
                {extractedData.chapters.map((chapter, idx) => (
                  <Card key={idx} className="overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-lg">
                          {chapter.chapter_number}. {chapter.chapter_name}
                        </h3>
                        <Badge>{chapter.topics.length} topics</Badge>
                      </div>
                      
                      <div className="space-y-2 pl-4">
                        {chapter.topics.map((topic, topicIdx) => (
                          <div key={topicIdx} className="p-3 bg-muted rounded-lg space-y-2">
                            <div className="flex items-start justify-between">
                              <p className="font-medium">{topic.topic_name}</p>
                              <Badge variant="outline">{topic.difficulty}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{topic.page_references}</span>
                              <span>•</span>
                              <span>{topic.suggested_days} days</span>
                              <span>•</span>
                              <span>Importance: {topic.importance_score}/10</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {topic.game_suggestions.map((game, gameIdx) => (
                                <Badge key={gameIdx} variant="secondary" className="text-xs">
                                  {game}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
