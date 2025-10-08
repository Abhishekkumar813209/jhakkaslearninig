import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useExamTypes } from "@/hooks/useExamTypes";

interface BatchExamConfigStepProps {
  domain: string;
  formData: any;
  onChange: (field: string, value: any) => void;
  preselectedBoard?: string | null;
  preselectedClass?: string | null;
}

export function BatchExamConfigStep({ 
  domain, 
  formData, 
  onChange,
  preselectedBoard,
  preselectedClass 
}: BatchExamConfigStepProps) {
  const { examTypes } = useExamTypes();
  const [exams, setExams] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    // Find the exam type matching the selected domain by code
    const examType = examTypes.find(et => et.code === domain);
    
    if (examType?.available_exams) {
      const examsArray = Array.isArray(examType.available_exams) 
        ? examType.available_exams 
        : [];
      setExams(examsArray);
      
      // Set classes based on exam type requirements
      if (examType.requires_class) {
        if (examType.code === 'school') {
          setClasses(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
        } else if (examType.code === 'engineering' || examType.code === 'medical') {
          setClasses(['11', '12', 'Dropper']);
        }
      }
    }
  }, [domain, examTypes]);

  const isSchoolDomain = domain === "school";
  const isEngineeringOrMedical = domain === 'engineering' || domain === 'medical';

  return (
    <div className="space-y-6">
      {(preselectedBoard || preselectedClass) && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-medium">Selected Configuration:</p>
          {preselectedBoard && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Board/Exam:</span>
              <Badge>{preselectedBoard}</Badge>
            </div>
          )}
          {preselectedClass && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Class:</span>
              <Badge>Class {preselectedClass}</Badge>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Batch Name *</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Auto-generated based on start date"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave empty to auto-generate
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_date">Start Date *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date || ""}
              onChange={(e) => onChange("start_date", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="end_date">End Date (Optional)</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date || ""}
              onChange={(e) => onChange("end_date", e.target.value)}
            />
          </div>
        </div>

        {formData.intake_start_date && formData.intake_end_date && (
          <div className="p-3 bg-muted/50 rounded-md text-sm">
            <p className="text-muted-foreground">
              📅 Intake Period: {new Date(formData.intake_start_date).toLocaleDateString()} to {new Date(formData.intake_end_date).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
