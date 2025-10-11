import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Plus, Trash2, Upload, Loader2, FileText, Filter } from "lucide-react";
import type { Subject, Chapter, ChaptersBySubject } from "../CreateRoadmapWizard";

const getImportanceBadge = (relevance?: string, score?: number) => {
  if (!relevance && !score) return null;
  
  const badges = {
    core: { label: "🔴 Core", variant: "destructive" as const },
    important: { label: "🟡 Important", variant: "default" as const },
    optional: { label: "⚪ Optional", variant: "outline" as const },
  };
  
  const badge = badges[relevance as keyof typeof badges] || badges.important;
  
  return (
    <Badge variant={badge.variant} className="text-xs mr-1">
      {badge.label} {score && `(${score}/10)`}
    </Badge>
  );
};

interface ChapterSelectionStepProps {
  subjects: Subject[];
  chapters: ChaptersBySubject;
  isFetching: boolean;
  timeBudget: { [subject: string]: number };
  onFetchChapters: (subjectName: string, fetchMode?: 'initial' | 'remaining') => void;
  onToggleChapter: (subjectName: string, chapterId: string) => void;
  onAddChapter: (subjectName: string, chapterName: string, suggestedDays: number) => void;
  onDeleteChapter: (subjectName: string, chapterId: string) => void;
  onUpdateDays: (subjectName: string, chapterId: string, days: number) => void;
  onUploadPdf: (file: File, subjectName: string) => void;
  uploadedPdf: File | null;
}

export const ChapterSelectionStep = ({
  subjects,
  chapters,
  isFetching,
  timeBudget,
  onFetchChapters,
  onToggleChapter,
  onAddChapter,
  onDeleteChapter,
  onUpdateDays,
  onUploadPdf,
  uploadedPdf,
}: ChapterSelectionStepProps) => {
  const [customChapterInputs, setCustomChapterInputs] = useState<{ [key: string]: { name: string; days: number } }>({});
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [fetchedInitial, setFetchedInitial] = useState<Set<string>>(new Set());
  const [importanceFilters, setImportanceFilters] = useState<{ [subject: string]: string }>({});

  const handleAddCustomChapter = (subjectName: string) => {
    const input = customChapterInputs[subjectName];
    if (input?.name.trim()) {
      onAddChapter(subjectName, input.name, input.days || 3);
      setCustomChapterInputs({
        ...customChapterInputs,
        [subjectName]: { name: "", days: 3 }
      });
    }
  };

  const handleSubjectPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, subjectName: string) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    
    onUploadPdf(file, subjectName);
    e.target.value = ''; // Reset input
  };

  const totalSelected = Object.values(chapters).flat().filter(c => c.isSelected).length;
  const totalChapters = Object.values(chapters).flat().length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Chapter Selection</h3>
          <p className="text-sm text-muted-foreground">
            {totalSelected}/{totalChapters} chapters selected across {subjects.length} subjects
          </p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Please select subjects in the previous step first
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {subjects.map((subject) => {
            const allSubjectChapters = chapters[subject.name] || [];
            const importanceFilter = importanceFilters[subject.name] || 'all';
            
            const subjectChapters = importanceFilter === 'all' 
              ? allSubjectChapters
              : allSubjectChapters.filter(c => c.exam_relevance === importanceFilter);
            
            const selectedCount = subjectChapters.filter(c => c.isSelected).length;

            const budget = timeBudget[subject.name] || 0;
            const totalDaysAllocated = subjectChapters
              .filter(c => c.isSelected)
              .reduce((sum, c) => sum + (c.suggested_days || 0), 0);

            return (
              <AccordionItem key={subject.id} value={subject.name}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{subject.name}</span>
                      {budget > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Budget: {budget} days → {selectedCount} chapters ({totalDaysAllocated} days allocated)
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {selectedCount}/{subjectChapters.length} selected
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div className="flex gap-2 flex-wrap items-center">
                      {!fetchedInitial.has(subject.name) ? (
                        <Button
                          onClick={async () => {
                            await onFetchChapters(subject.name, 'initial');
                            setFetchedInitial(prev => new Set(prev).add(subject.name));
                          }}
                          disabled={isFetching}
                          size="sm"
                          variant="secondary"
                          className="gap-2"
                        >
                          {isFetching ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Fetching...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" />
                              Fetch Half Chapters
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => onFetchChapters(subject.name, 'remaining')}
                          disabled={isFetching}
                          size="sm"
                          variant="secondary"
                          className="gap-2"
                        >
                          {isFetching ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Fetching...
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Fetch Remaining Chapters
                            </>
                          )}
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                          >
                            <Upload className="h-3 w-3" />
                            Upload Syllabus PDF
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload {subject.name} Syllabus</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Upload PDF syllabus for {subject.name}. AI will extract chapters with importance scores.
                            </p>
                            <div className="border-2 border-dashed rounded-lg p-8 text-center">
                              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                              <Label htmlFor={`pdf-upload-${subject.name}`} className="cursor-pointer">
                                <span className="text-primary underline">Choose PDF file</span>
                                <Input
                                  id={`pdf-upload-${subject.name}`}
                                  type="file"
                                  accept=".pdf"
                                  onChange={(e) => handleSubjectPdfUpload(e, subject.name)}
                                  className="hidden"
                                />
                              </Label>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {allSubjectChapters.length > 0 && (
                        <>
                          <Select 
                            value={importanceFilter} 
                            onValueChange={(value) => setImportanceFilters({
                              ...importanceFilters,
                              [subject.name]: value
                            })}
                          >
                            <SelectTrigger className="w-[160px] h-9">
                              <Filter className="h-3 w-3 mr-2" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Chapters</SelectItem>
                              <SelectItem value="core">🔴 Core Only</SelectItem>
                              <SelectItem value="important">🟡 Important</SelectItem>
                              <SelectItem value="optional">⚪ Optional</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              subjectChapters.forEach(c => {
                                if (!c.isSelected) onToggleChapter(subject.name, c.id);
                              });
                            }}
                          >
                            Select All
                          </Button>
                        </>
                      )}
                    </div>
                    {fetchedInitial.has(subject.name) && subjectChapters.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {subjectChapters.length} chapters loaded. Click "Fetch Remaining" for more.
                      </p>
                    )}

                    {subjectChapters.length === 0 ? (
                      <Card className="bg-muted/20">
                        <CardContent className="p-4 text-center text-sm text-muted-foreground">
                          No chapters fetched. Click "Fetch Chapters" or add manually below
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {subjectChapters.map((chapter) => (
                          <Card key={chapter.id}>
                            <CardContent className="p-3 flex items-center gap-3">
                              <Checkbox
                                checked={chapter.isSelected}
                                onCheckedChange={() => onToggleChapter(subject.name, chapter.id)}
                              />
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{chapter.chapter_name}</span>
                                  {getImportanceBadge(chapter.exam_relevance, chapter.importance_score)}
                                  {chapter.can_skip && (
                                    <Badge variant="secondary" className="text-xs">Skippable</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {chapter.suggested_days && (
                                    <Badge variant="outline" className="text-xs">
                                      {chapter.suggested_days} days
                                    </Badge>
                                  )}
                                  {chapter.difficulty && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {chapter.difficulty}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {chapter.isCustom && (
                                <Badge variant="secondary" className="text-xs">Custom</Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onDeleteChapter(subject.name, chapter.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t">
                      <Input
                        placeholder="Add custom chapter"
                        value={customChapterInputs[subject.name]?.name || ""}
                        onChange={(e) => setCustomChapterInputs({
                          ...customChapterInputs,
                          [subject.name]: {
                            name: e.target.value,
                            days: 3
                          }
                        })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomChapter(subject.name)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleAddCustomChapter(subject.name)}
                        size="icon"
                        variant="secondary"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {totalSelected === 0 && totalChapters > 0 && (
        <p className="text-sm text-destructive">
          ⚠️ Please select at least one chapter to continue
        </p>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="font-semibold">Total Selected: {totalSelected} chapters across {subjects.length} subjects</p>
          <p className="text-xs text-muted-foreground mt-1">
            Timeline will be set manually in the calendar view
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
