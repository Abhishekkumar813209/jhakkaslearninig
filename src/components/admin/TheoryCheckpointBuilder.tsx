import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Brain, MoveUp, MoveDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Checkpoint {
  question_id?: string;
  question_text: string;
  question_type: 'mcq' | 'fill_blank' | 'true_false';
  options?: string[];
  correct_answer: any;
  explanation: string;
  must_answer: boolean;
  xp_reward: number;
}

interface TheorySection {
  section_order: number;
  section_text: string;
  has_checkpoint: boolean;
  checkpoint?: Checkpoint;
}

interface TheoryCheckpointBuilderProps {
  sections: TheorySection[];
  onChange: (sections: TheorySection[]) => void;
  extractedQuestions?: any[];
  language: string;
}

export function TheoryCheckpointBuilder({ 
  sections, 
  onChange, 
  extractedQuestions = [],
  language 
}: TheoryCheckpointBuilderProps) {
  
  const addSection = () => {
    onChange([...sections, {
      section_order: sections.length,
      section_text: '',
      has_checkpoint: false
    }]);
  };

  const updateSectionText = (index: number, text: string) => {
    const updated = [...sections];
    updated[index].section_text = text;
    onChange(updated);
  };

  const toggleCheckpoint = (index: number, enabled: boolean) => {
    const updated = [...sections];
    updated[index].has_checkpoint = enabled;
    if (enabled && !updated[index].checkpoint) {
      updated[index].checkpoint = {
        question_text: '',
        question_type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: 0,
        explanation: '',
        must_answer: true,
        xp_reward: 5
      };
    }
    onChange(updated);
  };

  const updateCheckpoint = (index: number, field: string, value: any) => {
    const updated = [...sections];
    if (updated[index].checkpoint) {
      updated[index].checkpoint = {
        ...updated[index].checkpoint!,
        [field]: value
      };
    }
    onChange(updated);
  };

  const selectExtractedQuestion = (index: number, questionId: string) => {
    const question = extractedQuestions.find(q => q.id === questionId);
    if (!question) return;

    const updated = [...sections];
    updated[index].checkpoint = {
      question_id: questionId,
      question_text: question.question_text,
      question_type: question.question_type === 'MCQ' ? 'mcq' : 
                    question.question_type === 'Fill in the Blanks' ? 'fill_blank' : 'true_false',
      options: question.options,
      correct_answer: question.correct_answer,
      explanation: question.explanation || '',
      must_answer: true,
      xp_reward: 5
    };
    onChange(updated);
  };

  const removeSection = (index: number) => {
    const updated = sections.filter((_, i) => i !== index);
    updated.forEach((s, i) => s.section_order = i);
    onChange(updated);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === sections.length - 1)) return;
    const updated = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((s, i) => s.section_order = i);
    onChange(updated);
  };

  const getPlaceholder = () => {
    if (language === 'hinglish') {
      return "Example: Gravitation ek fundamental force hai jo do masses ke beech act karta hai...";
    } else if (language === 'hindi') {
      return "उदाहरण: गुरुत्वाकर्षण एक मौलिक बल है जो दो पिंडों के बीच कार्य करता है...";
    }
    return "Enter theory content in English...";
  };

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <Card key={idx} className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Section {idx + 1}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveSection(idx, 'up')}
                  disabled={idx === 0}
                >
                  <MoveUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveSection(idx, 'down')}
                  disabled={idx === sections.length - 1}
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSection(idx)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Theory Content</Label>
              <Textarea
                value={section.section_text}
                onChange={(e) => updateSectionText(idx, e.target.value)}
                placeholder={getPlaceholder()}
                rows={6}
                className="mt-2"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  Learning Checkpoint
                </Label>
                <Switch
                  checked={section.has_checkpoint}
                  onCheckedChange={(val) => toggleCheckpoint(idx, val)}
                />
              </div>

              {section.has_checkpoint && section.checkpoint && (
                <div className="space-y-3">
                  {extractedQuestions.length > 0 && (
                    <div>
                      <Label className="text-sm">Use Extracted Question</Label>
                      <Select onValueChange={(val) => selectExtractedQuestion(idx, val)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select a question..." />
                        </SelectTrigger>
                        <SelectContent>
                          {extractedQuestions.map(q => (
                            <SelectItem key={q.id} value={q.id}>
                              Q{q.question_number}: {q.question_text.slice(0, 60)}...
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm">Question Text</Label>
                    <Textarea
                      value={section.checkpoint.question_text}
                      onChange={(e) => updateCheckpoint(idx, 'question_text', e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Question Type</Label>
                    <Select
                      value={section.checkpoint.question_type}
                      onValueChange={(val) => updateCheckpoint(idx, 'question_type', val)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                        <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {section.checkpoint.question_type === 'mcq' && (
                    <div className="space-y-2">
                      <Label className="text-sm">Options</Label>
                      {section.checkpoint.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <Badge variant={section.checkpoint.correct_answer === optIdx ? "default" : "outline"}>
                            {optIdx + 1}
                          </Badge>
                          <Textarea
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...(section.checkpoint?.options || [])];
                              newOptions[optIdx] = e.target.value;
                              updateCheckpoint(idx, 'options', newOptions);
                            }}
                            rows={1}
                            className="flex-1"
                          />
                          <Switch
                            checked={section.checkpoint.correct_answer === optIdx}
                            onCheckedChange={(val) => val && updateCheckpoint(idx, 'correct_answer', optIdx)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <Label className="text-sm">Explanation</Label>
                    <Textarea
                      value={section.checkpoint.explanation}
                      onChange={(e) => updateCheckpoint(idx, 'explanation', e.target.value)}
                      rows={2}
                      className="mt-1"
                      placeholder="Explain why this is correct..."
                    />
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={section.checkpoint.must_answer}
                      onCheckedChange={(val) => updateCheckpoint(idx, 'must_answer', val)}
                    />
                    <span>Must answer to proceed</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button onClick={addSection} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>
    </div>
  );
}
