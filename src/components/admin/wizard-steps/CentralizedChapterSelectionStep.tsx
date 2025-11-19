import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Library, AlertCircle, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Chapter, ChaptersBySubject } from "../CreateRoadmapWizard";

interface ChapterLibraryItem {
  id: string;
  chapter_name: string;
  suggested_days: number;
  subject: string;
  full_topics: any;
  entry_source: string;
  topics_generated: boolean;
}

interface CentralizedChapterSelectionStepProps {
  examType: string;
  examName?: string;
  conditionalClass?: string;
  subjects: { name: string; isSelected: boolean }[];
  selectedChapters: ChaptersBySubject;
  onChaptersChange: (chapters: ChaptersBySubject) => void;
  timeBudget: { [subject: string]: number };
  intensity: "full" | "important" | "balanced";
}

export const CentralizedChapterSelectionStep = ({
  examType,
  examName,
  conditionalClass,
  subjects,
  selectedChapters,
  onChaptersChange,
  timeBudget,
  intensity,
}: CentralizedChapterSelectionStepProps) => {
  const [libraryChapters, setLibraryChapters] = useState<{ [subject: string]: ChapterLibraryItem[] }>({});
  const [loading, setLoading] = useState(false);
  const [libraryExists, setLibraryExists] = useState<{ [subject: string]: boolean }>({});
  const [difficultyFilter, setDifficultyFilter] = useState<{ [subject: string]: string }>({});
  const [importanceFilter, setImportanceFilter] = useState<{ [subject: string]: string }>({});

  useEffect(() => {
    checkAndLoadLibrary();
  }, [subjects, examType, conditionalClass]);

  const checkAndLoadLibrary = async () => {
    setLoading(true);
    const newLibraryChapters: { [subject: string]: ChapterLibraryItem[] } = {};
    const newLibraryExists: { [subject: string]: boolean } = {};

    for (const subject of subjects.filter(s => s.isSelected)) {
      try {
        const { data, error } = await supabase
          .from('chapter_library')
          .select('id, exam_type, subject, class_level, chapter_name, suggested_days, entry_source, topics_generated, full_topics, is_active, created_at, updated_at')
          .eq('exam_type', examType)
          .eq('subject', subject.name)
          .eq('is_active', true)
          .order('chapter_name');

        if (error) throw error;

        newLibraryExists[subject.name] = (data && data.length > 0);
        newLibraryChapters[subject.name] = data || [];

        if (data && data.length > 0) {
          // Auto-select based on intensity mode
          const autoSelectedChapters = autoSelectByIntensity(data, intensity);
          updateSelectedChapters(subject.name, autoSelectedChapters);
        }
      } catch (error: any) {
        console.error(`Error loading chapter library for ${subject.name}:`, error);
        newLibraryExists[subject.name] = false;
      }
    }

    setLibraryChapters(newLibraryChapters);
    setLibraryExists(newLibraryExists);
    setLoading(false);
  };

  const autoSelectByIntensity = (chapters: ChapterLibraryItem[], intensityMode: string): ChapterLibraryItem[] => {
    // Simplified: all intensities select all chapters
    return chapters;
  };

  const updateSelectedChapters = (subjectName: string, chaptersToSelect: ChapterLibraryItem[]) => {
    const newSelectedChapters = { ...selectedChapters };
    
    newSelectedChapters[subjectName] = chaptersToSelect.map(ch => ({
      id: ch.id,
      chapter_name: ch.chapter_name,
      suggested_days: ch.suggested_days || 3,
      isSelected: true,
      isCustom: false
    }));

    onChaptersChange(newSelectedChapters);
  };

  const handleToggleChapter = (subjectName: string, chapterId: string) => {
    const newSelectedChapters = { ...selectedChapters };
    const chapters = newSelectedChapters[subjectName] || [];
    
    const chapterIndex = chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex >= 0) {
      chapters[chapterIndex] = {
        ...chapters[chapterIndex],
        isSelected: !chapters[chapterIndex].isSelected,
      };
    } else {
      // Add chapter if not in list
      const libraryChapter = libraryChapters[subjectName]?.find(ch => ch.id === chapterId);
      if (libraryChapter) {
        chapters.push({
          id: libraryChapter.id,
          chapter_name: libraryChapter.chapter_name,
          suggested_days: libraryChapter.suggested_days || 3,
          isSelected: true,
          isCustom: false
        });
      }
    }

    newSelectedChapters[subjectName] = chapters;
    onChaptersChange(newSelectedChapters);
  };

  const handleSelectAll = (subjectName: string) => {
    const filtered = getFilteredChapters(subjectName);
    updateSelectedChapters(subjectName, filtered);
  };

  const handleDeselectAll = (subjectName: string) => {
    const newSelectedChapters = { ...selectedChapters };
    newSelectedChapters[subjectName] = [];
    onChaptersChange(newSelectedChapters);
  };

  const getFilteredChapters = (subjectName: string): ChapterLibraryItem[] => {
    // Return all chapters (filtering removed)
    return libraryChapters[subjectName] || [];
  };

  const getImportanceBadge = (relevance: string, score: number) => {
    const badges = {
      core: { label: "🔴 Core", variant: "destructive" as const },
      important: { label: "🟡 Important", variant: "default" as const },
      optional: { label: "⚪ Optional", variant: "outline" as const },
    };
    
    const badge = badges[relevance as keyof typeof badges] || badges.important;
    return (
      <Badge variant={badge.variant} className="text-xs">
        {badge.label} ({score}/10)
      </Badge>
    );
  };

  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      easy: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      hard: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={`text-xs ${colors[difficulty as keyof typeof colors] || colors.medium}`}>
        {difficulty}
      </Badge>
    );
  };

  const getTotalSelectedStats = (subjectName: string) => {
    const selected = selectedChapters[subjectName]?.filter(ch => ch.isSelected) || [];
    const totalDays = selected.reduce((sum, ch) => sum + (ch.suggested_days || 0), 0);
    return { count: selected.length, days: totalDays };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading chapter library...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Library className="h-4 w-4" />
        <AlertDescription>
          Selecting chapters from the centralized library. These chapters have pre-generated topics and can be linked to questions across exams.
        </AlertDescription>
      </Alert>

      {subjects.filter(s => s.isSelected).map(subject => {
        const hasLibrary = libraryExists[subject.name];
        const filtered = getFilteredChapters(subject.name);
        const stats = getTotalSelectedStats(subject.name);
        const budget = timeBudget[subject.name] || 0;
        const remaining = budget - stats.days;

        return (
          <Card key={subject.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  {subject.name}
                  {hasLibrary ? (
                    <Badge variant="outline" className="bg-green-50">
                      <Library className="h-3 w-3 mr-1" />
                      Using Library
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-50">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      No Library
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2 text-sm">
                  <Badge variant="secondary">
                    Selected: {stats.count} chapters | {stats.days} days
                  </Badge>
                  <Badge variant={remaining >= 0 ? "default" : "destructive"}>
                    Budget: {budget} days | {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {!hasLibrary ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No chapter library found for {subject.name}. Please generate one in the Centralized Question Bank section first, or switch to AI generation mode.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Filters */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={difficultyFilter[subject.name] || 'all'}
                        onValueChange={(value) => setDifficultyFilter({ ...difficultyFilter, [subject.name]: value })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Difficulty</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Select
                      value={importanceFilter[subject.name] || 'all'}
                      onValueChange={(value) => setImportanceFilter({ ...importanceFilter, [subject.name]: value })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Importance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Importance</SelectItem>
                        <SelectItem value="high">High (7-10)</SelectItem>
                        <SelectItem value="medium">Medium (4-6)</SelectItem>
                        <SelectItem value="low">Low (1-3)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectAll(subject.name)}
                    >
                      Select All ({filtered.length})
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeselectAll(subject.name)}
                    >
                      Deselect All
                    </Button>
                  </div>

                  {/* Chapter List */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filtered.map(chapter => {
                      const isSelected = selectedChapters[subject.name]?.find(
                        ch => ch.id === chapter.id
                      )?.isSelected || false;

                      return (
                        <div
                          key={chapter.id}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleChapter(subject.name, chapter.id)}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{chapter.chapter_name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {chapter.suggested_days} days
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      {subjects.filter(s => s.isSelected).length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select at least one subject in the previous step.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
