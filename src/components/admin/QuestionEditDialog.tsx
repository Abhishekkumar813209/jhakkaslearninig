import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Copy, Image as ImageIcon, AlertCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { QuestionAnswerInput } from './QuestionAnswerInput';
import { RichQuestionEditor } from './RichQuestionEditor';

interface ExtractedQuestion {
  id: string;
  question_number: string;
  question_type: 'mcq' | 'match_column' | 'assertion_reason' | 'fill_blank' | 'true_false' | 'short_answer';
  question_text: string;
  options?: string[];
  left_column?: string[];
  right_column?: string[];
  assertion?: string;
  reason?: string;
  blanks_count?: number;
  marks?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  auto_corrected?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  images?: string[];
  ocr_text?: string[];
  edited?: boolean;
  correct_answer?: any;
  explanation?: string;
  ocr_status?: {
    method: 'pix2text' | 'tesseract' | 'failed' | 'error';
    confidence: number;
    requires_manual_review: boolean;
    error?: string;
  };
  flagged_images?: Array<{
    imageId: string;
    url: string;
    reason: string;
  }>;
}

interface QuestionEditDialogProps {
  question: ExtractedQuestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedQuestion: ExtractedQuestion) => void;
}

export default function QuestionEditDialog({ question, open, onOpenChange, onSave }: QuestionEditDialogProps) {
  const [editedQuestion, setEditedQuestion] = useState<ExtractedQuestion | null>(null);

  useEffect(() => {
    if (question) {
      setEditedQuestion({ ...question });
    }
  }, [question]);

  if (!editedQuestion) return null;

  const handleSave = () => {
    // Validate question has required fields
    if (!editedQuestion.question_text?.trim()) {
      toast.error("Question text cannot be empty");
      return;
    }

    if (editedQuestion.question_type === 'mcq' && (!editedQuestion.options || editedQuestion.options.length < 2)) {
      toast.error("MCQ questions must have at least 2 options");
      return;
    }

    onSave({ ...editedQuestion, edited: true });
    toast.success("Question saved successfully");
    onOpenChange(false);
  };

  const addOption = () => {
    const newOptions = [...(editedQuestion.options || []), ''];
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = editedQuestion.options?.filter((_, i) => i !== index) || [];
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(editedQuestion.options || [])];
    newOptions[index] = value;
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const addColumnItem = (column: 'left' | 'right') => {
    const key = column === 'left' ? 'left_column' : 'right_column';
    const newColumn = [...(editedQuestion[key] || []), ''];
    setEditedQuestion({ ...editedQuestion, [key]: newColumn });
  };

  const removeColumnItem = (column: 'left' | 'right', index: number) => {
    const key = column === 'left' ? 'left_column' : 'right_column';
    const newColumn = editedQuestion[key]?.filter((_, i) => i !== index) || [];
    setEditedQuestion({ ...editedQuestion, [key]: newColumn });
  };

  const updateColumnItem = (column: 'left' | 'right', index: number, value: string) => {
    const key = column === 'left' ? 'left_column' : 'right_column';
    const newColumn = [...(editedQuestion[key] || [])];
    newColumn[index] = value;
    setEditedQuestion({ ...editedQuestion, [key]: newColumn });
  };

  const copyOcrText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("OCR text copied to clipboard");
  };

  const getWarnings = () => {
    const warnings: string[] = [];
    if (!editedQuestion.question_text || editedQuestion.question_text.trim().length < 20) {
      warnings.push("Question text is too short");
    }
    if (editedQuestion.question_type === 'mcq' && (!editedQuestion.options || editedQuestion.options.length < 2)) {
      warnings.push("MCQ needs at least 2 options");
    }
    if (editedQuestion.question_type === 'match_column' && (!editedQuestion.left_column?.length || !editedQuestion.right_column?.length)) {
      warnings.push("Match column needs both left and right items");
    }
    if (editedQuestion.question_type === 'assertion_reason' && (!editedQuestion.assertion || !editedQuestion.reason)) {
      warnings.push("Assertion-Reason needs both assertion and reason statements");
    }
    return warnings;
  };

  const warnings = getWarnings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Edit Question {editedQuestion.question_number}</span>
            {editedQuestion.edited && (
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                ✏️ Edited
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {editedQuestion.question_type.replace('_', ' ').toUpperCase()} • {editedQuestion.marks || 1} marks • {editedQuestion.difficulty || 'medium'} difficulty
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="pr-6 space-y-6 py-4">
            {/* Warnings */}
            {warnings.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-orange-800">Incomplete Data</p>
                      <ul className="text-sm text-orange-700 mt-1 space-y-1">
                        {warnings.map((warning, idx) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* OCR Text Preview (if available) */}
            {editedQuestion.ocr_text && editedQuestion.ocr_text.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">OCR Extracted Text (for reference)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyOcrText(editedQuestion.ocr_text?.join('\n\n') || '')}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap">{editedQuestion.ocr_text.join('\n\n')}</pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* LaTeX Notation Preview (if available) */}
            {editedQuestion.images && editedQuestion.images.length > 0 && editedQuestion.ocr_text?.some(text => text.includes('\\')) && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <Label className="text-sm font-semibold mb-2 block text-green-800">
                    ✨ Math/Chemistry Notation Detected (Pix2Text AI)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Advanced OCR detected equations/formulas. Copy the LaTeX code to use in your question:
                  </p>
                  <div className="space-y-2">
                    {editedQuestion.ocr_text?.map((text, idx) => {
                      if (!text.includes('\\')) return null;
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          <code className="flex-1 bg-white p-3 rounded text-sm border border-green-300 break-all">
                            {text}
                          </code>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(text);
                              toast.success('LaTeX copied to clipboard!');
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Flagged Images - Manual Math Input */}
            {editedQuestion.flagged_images && editedQuestion.flagged_images.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Images Requiring Manual Input ({editedQuestion.flagged_images.length})
                  </div>
                  <p className="text-xs text-amber-800">
                    OCR failed for these images. Please manually add equations using LaTeX notation.
                  </p>
                  
                  {editedQuestion.flagged_images.map(img => (
                    <div key={img.imageId} className="space-y-2 p-3 bg-white rounded border border-amber-200">
                      <div className="flex items-center gap-2 text-sm text-amber-900">
                        <ImageIcon className="h-3 w-3" />
                        <code className="font-mono text-xs">{img.imageId}</code>
                        <span className="text-xs text-muted-foreground">• {img.reason}</span>
                      </div>
                      {img.url && (
                        <img 
                          src={img.url} 
                          alt={img.imageId} 
                          className="max-w-xs border rounded bg-white"
                        />
                      )}
                      <Input 
                        placeholder="Type equation in LaTeX (e.g., \frac{a}{b}, x^{2}, H_{2}O)"
                        className="font-mono text-sm"
                        onChange={(e) => {
                          const updatedText = editedQuestion.question_text.replace(
                            `[FIGURE id=${img.imageId}]`,
                            e.target.value
                          );
                          setEditedQuestion({ ...editedQuestion, question_text: updatedText });
                        }}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Images Preview */}
            {editedQuestion.images && editedQuestion.images.length > 0 && !editedQuestion.flagged_images?.length && (
              <Card>
                <CardContent className="pt-4">
                  <Label className="text-sm font-semibold mb-2 block">Attached Images ({editedQuestion.images.length})</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {editedQuestion.images.map((imgUrl, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={imgUrl} 
                          alt={`Figure ${idx + 1}`}
                          className="w-full h-32 object-contain border rounded-md bg-white"
                        />
                        <div className="absolute top-1 right-1">
                          <Badge variant="secondary" className="text-xs">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Fig {idx + 1}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marks</Label>
                <Input
                  type="number"
                  min="1"
                  value={editedQuestion.marks || 1}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, marks: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={editedQuestion.difficulty || 'medium'}
                  onValueChange={(value: 'easy' | 'medium' | 'hard') => setEditedQuestion({ ...editedQuestion, difficulty: value })}
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
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <Label>Question Text *</Label>
              <RichQuestionEditor
                content={editedQuestion.question_text}
                onChange={(content) => setEditedQuestion({ ...editedQuestion, question_text: content })}
                placeholder="Enter question text..."
                forcePlainPaste={true}
                smartMathPaste={false}
              />
            </div>

            {/* Type-Specific Fields */}
            {editedQuestion.question_type === 'mcq' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Options *</Label>
                  <Button variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {editedQuestion.options?.map((option, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(idx)}
                        disabled={editedQuestion.options!.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editedQuestion.question_type === 'match_column' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Left Column *</Label>
                    <Button variant="outline" size="sm" onClick={() => addColumnItem('left')}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {editedQuestion.left_column?.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => updateColumnItem('left', idx, e.target.value)}
                        placeholder={`Item ${idx + 1}`}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeColumnItem('left', idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Right Column *</Label>
                    <Button variant="outline" size="sm" onClick={() => addColumnItem('right')}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {editedQuestion.right_column?.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => updateColumnItem('right', idx, e.target.value)}
                        placeholder={`Match ${idx + 1}`}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeColumnItem('right', idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editedQuestion.question_type === 'assertion_reason' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Assertion Statement *</Label>
                  <RichQuestionEditor
                    content={editedQuestion.assertion || ''}
                    onChange={(content) => setEditedQuestion({ ...editedQuestion, assertion: content })}
                    placeholder="Enter the assertion statement..."
                    compact
                    forcePlainPaste={true}
                    smartMathPaste={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reason Statement *</Label>
                  <RichQuestionEditor
                    content={editedQuestion.reason || ''}
                    onChange={(content) => setEditedQuestion({ ...editedQuestion, reason: content })}
                    placeholder="Enter the reason statement..."
                    compact
                    forcePlainPaste={true}
                    smartMathPaste={false}
                  />
                </div>
              </div>
            )}

            {editedQuestion.question_type === 'fill_blank' && (
              <div className="space-y-2">
                <Label>Number of Blanks</Label>
                <Input
                  type="number"
                  min="1"
                  value={editedQuestion.blanks_count || 1}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, blanks_count: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}

            {/* Correct Answer */}
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <QuestionAnswerInput
                questionType={editedQuestion.question_type}
                options={editedQuestion.options}
                leftColumn={editedQuestion.left_column}
                rightColumn={editedQuestion.right_column}
                currentAnswer={editedQuestion.correct_answer}
                onChange={(answer) => setEditedQuestion({ ...editedQuestion, correct_answer: answer })}
                blanksCount={editedQuestion.blanks_count}
              />
            </div>

            {/* Explanation */}
            <div className="space-y-2">
              <Label>Explanation (Optional)</Label>
              <RichQuestionEditor
                content={editedQuestion.explanation || ''}
                onChange={(content) => setEditedQuestion({ ...editedQuestion, explanation: content })}
                placeholder="Add an explanation for the correct answer..."
                compact
                forcePlainPaste={true}
                smartMathPaste={false}
              />
            </div>
          </div>
          <ScrollBar className="w-3" />
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
