import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Languages, Sparkles, Copy, Check } from "lucide-react";

interface MultilingualSummarizerProps {
  videoId: string;
  videoTitle: string;
  onLessonGenerate: (summary: any, language: string) => void;
}

type SummaryFormat = 'short' | 'detailed' | 'keypoints' | 'timestamped';
type Language = 'hinglish' | 'hindi' | 'english';

interface Summary {
  short: string;
  detailed: string;
  keypoints: string[];
  timestamped: Array<{ time: string; content: string }>;
}

export function MultilingualSummarizer({ 
  videoId, 
  videoTitle, 
  onLessonGenerate 
}: MultilingualSummarizerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [summaries, setSummaries] = useState<Record<Language, Summary>>({
    hinglish: { short: '', detailed: '', keypoints: [], timestamped: [] },
    hindi: { short: '', detailed: '', keypoints: [], timestamped: [] },
    english: { short: '', detailed: '', keypoints: [], timestamped: [] },
  });
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('hinglish');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const fetchTranscript = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-transcript-fetcher', {
        body: { videoId }
      });

      if (error) throw error;

      setTranscript(data.transcript);
      toast({ 
        title: "Transcript Fetched", 
        description: `Retrieved ${data.transcript.length} characters` 
      });
    } catch (error: any) {
      console.error('Transcript fetch error:', error);
      toast({ 
        title: "Fetch Failed", 
        description: error.message || "Failed to fetch transcript", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (language: Language) => {
    if (!transcript) {
      toast({ 
        title: "Error", 
        description: "Please fetch transcript first", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-multilingual-summarizer', {
        body: { 
          transcript, 
          language,
          videoTitle,
        }
      });

      if (error) throw error;

      setSummaries(prev => ({
        ...prev,
        [language]: data.summary
      }));

      toast({ 
        title: "Summary Generated", 
        description: `Created ${language} summary successfully` 
      });
    } catch (error: any) {
      console.error('Summary generation error:', error);
      toast({ 
        title: "Generation Failed", 
        description: error.message || "Failed to generate summary", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
    toast({ title: "Copied!", description: "Content copied to clipboard" });
  };

  const languageLabels: Record<Language, string> = {
    hinglish: 'Hinglish (आसान Mix)',
    hindi: 'Easy Hindi (सरल हिंदी)',
    english: 'English (Simple)',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          Multilingual Summarizer
        </CardTitle>
        <CardDescription>
          Extract and translate video content into multiple languages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={fetchTranscript} 
            disabled={loading || !!transcript}
            variant={transcript ? "secondary" : "default"}
          >
            {transcript ? "✓ Transcript Loaded" : "Fetch Transcript"}
          </Button>
        </div>

        {transcript && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['hinglish', 'hindi', 'english'] as Language[]).map((lang) => (
                <Button
                  key={lang}
                  onClick={() => {
                    setSelectedLanguage(lang);
                    if (!summaries[lang].short) {
                      generateSummary(lang);
                    }
                  }}
                  disabled={loading}
                  variant={selectedLanguage === lang ? "default" : "outline"}
                  size="sm"
                >
                  {languageLabels[lang]}
                </Button>
              ))}
            </div>

            {summaries[selectedLanguage].short && (
              <Tabs defaultValue="short" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="short">Short</TabsTrigger>
                  <TabsTrigger value="detailed">Detailed</TabsTrigger>
                  <TabsTrigger value="keypoints">Key Points</TabsTrigger>
                  <TabsTrigger value="timestamped">Timestamps</TabsTrigger>
                </TabsList>

                <TabsContent value="short" className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Short Summary</Label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(summaries[selectedLanguage].short, 'short')}
                    >
                      {copiedSection === 'short' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <ScrollArea className="h-[200px] border rounded-lg p-4">
                    <p className="text-sm">{summaries[selectedLanguage].short}</p>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="detailed" className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Detailed Summary</Label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(summaries[selectedLanguage].detailed, 'detailed')}
                    >
                      {copiedSection === 'detailed' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">{summaries[selectedLanguage].detailed}</p>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="keypoints" className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Key Points</Label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(
                        summaries[selectedLanguage].keypoints.join('\n'), 
                        'keypoints'
                      )}
                    >
                      {copiedSection === 'keypoints' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-lg p-4">
                    <ul className="space-y-2">
                      {summaries[selectedLanguage].keypoints.map((point, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          <Badge variant="outline">{idx + 1}</Badge>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="timestamped" className="space-y-2">
                  <Label>Timestamped Breakdown</Label>
                  <ScrollArea className="h-[300px] border rounded-lg p-4">
                    <div className="space-y-3">
                      {summaries[selectedLanguage].timestamped.map((item, idx) => (
                        <div key={idx} className="flex gap-3">
                          <Badge variant="secondary" className="shrink-0">
                            {item.time}
                          </Badge>
                          <p className="text-sm">{item.content}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}

            <Button 
              onClick={() => onLessonGenerate(summaries[selectedLanguage], selectedLanguage)}
              disabled={!summaries[selectedLanguage].short || loading}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI-Enhanced Lessons
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
