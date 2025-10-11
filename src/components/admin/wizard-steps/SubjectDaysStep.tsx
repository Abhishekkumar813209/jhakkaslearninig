import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Plus, Trash2, Loader2, Clock } from "lucide-react";
import type { Subject } from "../CreateRoadmapWizard";

interface SubjectDaysStepProps {
  subjects: Subject[];
  isFetching: boolean;
  onFetch: () => void;
  onToggle: (id: string) => void;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  daysBudget: Record<string, number>;
  onUpdateDays: (subjectName: string, days: number) => void;
}

export const SubjectDaysStep = ({
  subjects,
  isFetching,
  onFetch,
  onToggle,
  onAdd,
  onDelete,
  daysBudget,
  onUpdateDays,
}: SubjectDaysStepProps) => {
  const [customSubject, setCustomSubject] = useState("");

  const handleAddCustom = () => {
    if (customSubject.trim()) {
      onAdd(customSubject);
      setCustomSubject("");
    }
  };

  const selectedCount = subjects.filter(s => s.isSelected).length;
  const totalDays = Object.values(daysBudget).reduce((sum, d) => sum + d, 0);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Subject Selection & Days Budget</h3>
          <p className="text-sm text-muted-foreground">
            {selectedCount}/{subjects.length} subjects • Total: {totalDays} days
          </p>
        </div>
        <Button
          onClick={onFetch}
          disabled={isFetching || subjects.length > 0}
          className="gap-2"
        >
          {isFetching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Fetch Subjects with AI
            </>
          )}
        </Button>
      </div>

      {/* Empty State */}
      {subjects.length === 0 && !isFetching && (
        <Card className="bg-muted/30">
          <CardContent className="p-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No subjects fetched yet. Click "Fetch Subjects with AI" to get started.
            </p>
            <p className="text-sm text-muted-foreground">
              Or add subjects manually below
            </p>
          </CardContent>
        </Card>
      )}

      {/* Subjects List with Inline Days Input */}
      {subjects.length > 0 && (
        <div className="space-y-2">
          {subjects.map((subject) => (
            <Card key={subject.id} className={subject.isSelected ? "border-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <Checkbox
                    checked={subject.isSelected}
                    onCheckedChange={() => onToggle(subject.id)}
                  />
                  
                  {/* Subject Name */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{subject.name}</span>
                      {subject.isCustom && (
                        <Badge variant="secondary" className="text-xs">Custom</Badge>
                      )}
                    </div>
                  </div>

                  {/* Days Input */}
                  {subject.isSelected && (
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={daysBudget[subject.name] || 15}
                        onChange={(e) => onUpdateDays(subject.name, parseInt(e.target.value) || 15)}
                        min={1}
                        max={365}
                        className="h-9 w-20"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  )}

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(subject.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Custom Subject */}
      <div className="flex gap-2 pt-4 border-t">
        <Input
          placeholder="Add custom subject (e.g., Advanced Mathematics)"
          value={customSubject}
          onChange={(e) => setCustomSubject(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
        />
        <Button onClick={handleAddCustom} variant="secondary" className="gap-2">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Validation Message */}
      {selectedCount === 0 && subjects.length > 0 && (
        <p className="text-sm text-destructive">
          ⚠️ Please select at least one subject to continue
        </p>
      )}
    </div>
  );
};
