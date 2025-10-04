import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Plus, Trash2, Upload, Loader2, FileText } from "lucide-react";
import type { Subject, Chapter, ChaptersBySubject } from "../CreateRoadmapWizard";

interface ChapterSelectionStepProps {
  subjects: Subject[];
  chapters: ChaptersBySubject;
  isFetching: boolean;
  onFetchChapters: (subjectName: string, fetchMode?: 'initial' | 'remaining') => void;
  onToggleChapter: (subjectName: string, chapterId: string) => void;
  onAddChapter: (subjectName: string, chapterName: string, suggestedDays: number) => void;
  onDeleteChapter: (subjectName: string, chapterId: string) => void;
  onUpdateDays: (subjectName: string, chapterId: string, days: number) => void;
  onUploadPdf: (file: File) => void;
  uploadedPdf: File | null;
}

export const ChapterSelectionStep = ({
  subjects,
  chapters,
  isFetching,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onUploadPdf(file);
      setPdfDialogOpen(false);
    }
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
        <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Syllabus PDF
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Syllabus PDF</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a PDF syllabus to automatically extract subjects and chapters using AI
              </p>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Label htmlFor="pdf-upload" className="cursor-pointer">
                  <span className="text-primary underline">Choose a PDF file</span>
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </Label>
                {uploadedPdf && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Uploaded: {uploadedPdf.name}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
            const subjectChapters = chapters[subject.name] || [];
            const selectedCount = subjectChapters.filter(c => c.isSelected).length;

            return (
              <AccordionItem key={subject.id} value={subject.name}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-semibold">{subject.name}</span>
                    <Badge variant="secondary">
                      {selectedCount}/{subjectChapters.length} selected
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div className="flex gap-2 flex-wrap">
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
                      {subjectChapters.length > 0 && (
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
                              <span className="flex-1 text-sm">{chapter.chapter_name}</span>
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
