import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Plus, Trash2, Loader2 } from "lucide-react";
import type { Subject } from "../CreateRoadmapWizard";

interface SubjectSelectionStepProps {
  subjects: Subject[];
  isFetching: boolean;
  onFetch: () => void;
  onToggle: (id: string) => void;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
}

export const SubjectSelectionStep = ({
  subjects,
  isFetching,
  onFetch,
  onToggle,
  onAdd,
  onDelete,
}: SubjectSelectionStepProps) => {
  const [customSubject, setCustomSubject] = useState("");

  const handleAddCustom = () => {
    if (customSubject.trim()) {
      onAdd(customSubject);
      setCustomSubject("");
    }
  };

  const selectedCount = subjects.filter(s => s.isSelected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Subject Selection</h3>
          <p className="text-sm text-muted-foreground">
            {selectedCount}/{subjects.length} subjects selected
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

      {subjects.length === 0 && !isFetching && (
        <Card className="bg-muted/30">
          <CardContent className="p-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No subjects fetched yet. Click "Fetch Subjects with AI" to get started.
            </p>
            <p className="text-sm text-muted-foreground">
              Or add subjects manually using the input below
            </p>
          </CardContent>
        </Card>
      )}

      {subjects.length > 0 && (
        <div className="space-y-2">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    checked={subject.isSelected}
                    onCheckedChange={() => onToggle(subject.id)}
                  />
                  <span className="font-medium">{subject.name}</span>
                  {subject.isCustom && (
                    <Badge variant="secondary" className="text-xs">Custom</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(subject.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

      {selectedCount === 0 && subjects.length > 0 && (
        <p className="text-sm text-destructive">
          ⚠️ Please select at least one subject to continue
        </p>
      )}
    </div>
  );
};
