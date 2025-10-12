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
import { Sparkles, Plus, Trash2, Upload, Loader2, FileText, Filter, X, Pencil, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  examType?: string;
  examName?: string;
  onUpdateChapter?: (subjectName: string, chapterId: string, newName: string, newDays: number) => void;
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
  examType,
  examName,
  onUpdateChapter,
}: ChapterSelectionStepProps) => {
  const { toast } = useToast();
  const [customChapterInputs, setCustomChapterInputs] = useState<{ [key: string]: { name: string; days: number } }>({});
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [fetchedInitial, setFetchedInitial] = useState<Set<string>>(new Set());
  const [importanceFilters, setImportanceFilters] = useState<{ [subject: string]: string }>({});
  
  // Bulk input states
  const [bulkInputMode, setBulkInputMode] = useState<{ [subject: string]: 'text' | 'file' }>({});
  const [bulkChapterText, setBulkChapterText] = useState<{ [subject: string]: string }>({});
  const [bulkUploadedFiles, setBulkUploadedFiles] = useState<{ [subject: string]: File | null }>({});
  const [bulkFilePreview, setBulkFilePreview] = useState<{ [subject: string]: string | null }>({});
  const [bulkGenerating, setBulkGenerating] = useState(false);
  
  // Edit mode states
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [editChapterName, setEditChapterName] = useState("");
  const [editChapterDays, setEditChapterDays] = useState(3);

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

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>, subjectName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PDF, JPG, or PNG file", variant: "destructive" });
      return;
    }

    setBulkUploadedFiles({ ...bulkUploadedFiles, [subjectName]: file });
    setBulkFilePreview({ ...bulkFilePreview, [subjectName]: file.name });
  };

  const clearBulkFile = (subjectName: string) => {
    setBulkUploadedFiles({ ...bulkUploadedFiles, [subjectName]: null });
    setBulkFilePreview({ ...bulkFilePreview, [subjectName]: null });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const startEdit = (chapter: Chapter) => {
    setEditingChapter(chapter.id);
    setEditChapterName(chapter.chapter_name);
    setEditChapterDays(chapter.suggested_days || 3);
  };

  const saveChapterEdit = (subjectName: string, chapterId: string) => {
    if (!editChapterName.trim()) {
      toast({ title: "Chapter name cannot be empty", variant: "destructive" });
      return;
    }
    
    if (onUpdateChapter) {
      onUpdateChapter(subjectName, chapterId, editChapterName, editChapterDays);
      setEditingChapter(null);
      toast({ title: "Chapter updated successfully" });
    }
  };

  const cancelEdit = () => {
    setEditingChapter(null);
  };

  const handleBulkGenerate = async (subjectName: string) => {
    setBulkGenerating(true);
    try {
      const mode = bulkInputMode[subjectName] || 'text';
      let requestBody: any = {
        subject: subjectName,
        exam_type: examType || '',
        exam_name: examName || '',
        input_mode: mode
      };

      if (mode === 'text') {
        requestBody.chapters_text = bulkChapterText[subjectName];
      } else {
        const file = bulkUploadedFiles[subjectName];
        if (file?.type.startsWith('image/')) {
          requestBody.syllabus_image = await fileToBase64(file);
        } else if (file?.type === 'application/pdf') {
          // For PDFs, we'll still use base64
          requestBody.syllabus_image = await fileToBase64(file);
        }
      }

      const { data, error } = await supabase.functions.invoke('extract-chapters-bulk', {
        body: requestBody
      });

      if (error) throw error;

      if (data?.chapters && Array.isArray(data.chapters)) {
        data.chapters.forEach((ch: any) => {
          onAddChapter(subjectName, ch.chapter_name, ch.suggested_days || 3);
        });

        setBulkChapterText({ ...bulkChapterText, [subjectName]: '' });
        setBulkUploadedFiles({ ...bulkUploadedFiles, [subjectName]: null });
        setBulkFilePreview({ ...bulkFilePreview, [subjectName]: null });

        toast({
          title: "✨ Chapters Generated",
          description: `Added ${data.chapters.length} chapters for ${subjectName}`
        });
      }
    } catch (error: any) {
      console.error('Bulk generation error:', error);
      toast({ 
        title: "Generation failed", 
        description: error.message || "Failed to generate chapters", 
        variant: "destructive" 
      });
    } finally {
      setBulkGenerating(false);
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
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{subject.name}</span>
                      <Badge 
                        variant={
                          totalDaysAllocated <= budget 
                            ? "default" 
                            : totalDaysAllocated <= budget * 1.2 
                              ? "secondary" 
                              : "destructive"
                        }
                        className="font-mono"
                      >
                        📅 {totalDaysAllocated} days
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {budget > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Budget: {budget}d
                        </span>
                      )}
                      <Badge variant="outline">
                        {selectedCount}/{subjectChapters.length}
                      </Badge>
                    </div>
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

                    {/* NEW: Bulk Chapter Input Section */}
                    <div className="mt-4 border-t pt-4 space-y-3 bg-muted/30 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold text-sm">Bulk Chapter Input</h4>
                      </div>
                      
                      {/* Input Mode Toggle */}
                      <div className="flex gap-2">
                        <Button
                          variant={(!bulkInputMode[subject.name] || bulkInputMode[subject.name] === 'text') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setBulkInputMode({ ...bulkInputMode, [subject.name]: 'text' })}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Paste Text
                        </Button>
                        <Button
                          variant={bulkInputMode[subject.name] === 'file' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setBulkInputMode({ ...bulkInputMode, [subject.name]: 'file' })}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload File
                        </Button>
                      </div>

                      {/* Text Input UI */}
                      {(!bulkInputMode[subject.name] || bulkInputMode[subject.name] === 'text') && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Paste chapter names (one per line or comma-separated)
                          </Label>
                          <Textarea
                            placeholder={`Example:\n1. Magnetism and Matter\n2. Electromagnetic Induction\n3. Alternating Current\n\nOr: Motion, Laws of Motion, Work and Energy`}
                            value={bulkChapterText[subject.name] || ''}
                            onChange={(e) => setBulkChapterText({
                              ...bulkChapterText,
                              [subject.name]: e.target.value
                            })}
                            rows={5}
                            className="font-mono text-sm"
                          />
                        </div>
                      )}

                      {/* File Upload UI */}
                      {bulkInputMode[subject.name] === 'file' && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Upload syllabus file (PDF, JPG, PNG - up to 10MB)
                          </Label>
                          <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={(e) => handleBulkFileUpload(e, subject.name)}
                              className="hidden"
                              id={`bulk-file-${subject.name}`}
                            />
                            <label
                              htmlFor={`bulk-file-${subject.name}`}
                              className="cursor-pointer flex flex-col items-center gap-2"
                            >
                              {bulkFilePreview[subject.name] ? (
                                <div className="flex items-center gap-2 bg-primary/10 px-4 py-3 rounded-lg w-full">
                                  <FileText className="h-6 w-6 text-primary" />
                                  <div className="text-left flex-1">
                                    <p className="text-sm font-medium truncate">{bulkUploadedFiles[subject.name]?.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(bulkUploadedFiles[subject.name]?.size! / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      clearBulkFile(subject.name);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Upload className="h-10 w-10 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">Click to upload file</p>
                                    <p className="text-xs text-muted-foreground">PDF, PNG, JPG up to 10MB</p>
                                  </div>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Generate Button */}
                      <Button
                        onClick={() => handleBulkGenerate(subject.name)}
                        disabled={
                          bulkGenerating || 
                          ((!bulkInputMode[subject.name] || bulkInputMode[subject.name] === 'text') && !bulkChapterText[subject.name]?.trim()) ||
                          (bulkInputMode[subject.name] === 'file' && !bulkUploadedFiles[subject.name])
                        }
                        className="w-full"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {bulkGenerating ? "AI Processing..." : "Generate Chapters with AI"}
                      </Button>

                      {bulkGenerating && (
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                          <p className="text-sm flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            AI is extracting chapters from {bulkInputMode[subject.name] === 'file' ? 'file' : 'text'}...
                          </p>
                        </div>
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
                              
                              {editingChapter === chapter.id ? (
                                /* Edit Mode */
                                <>
                                  <div className="flex-1 flex flex-col gap-2">
                                    <Input
                                      value={editChapterName}
                                      onChange={(e) => setEditChapterName(e.target.value)}
                                      className="h-8 text-sm"
                                      placeholder="Chapter name"
                                    />
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        value={editChapterDays}
                                        onChange={(e) => setEditChapterDays(parseInt(e.target.value) || 3)}
                                        min={1}
                                        max={30}
                                        className="h-8 w-20 text-sm"
                                      />
                                      <span className="text-xs text-muted-foreground">days</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-8 w-8 p-0"
                                      onClick={() => saveChapterEdit(subject.name, chapter.id)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => cancelEdit()}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                /* View Mode */
                                <>
                                  <div className="flex-1 flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{chapter.chapter_name}</span>
                                      {getImportanceBadge(chapter.exam_relevance, chapter.importance_score)}
                                      {chapter.can_skip && (
                                        <Badge variant="secondary" className="text-xs">Skippable</Badge>
                                      )}
                                      {chapter.isCustom && (
                                        <Badge variant="secondary" className="text-xs">Custom</Badge>
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
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => startEdit(chapter)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => onDeleteChapter(subject.name, chapter.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </>
                              )}
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
