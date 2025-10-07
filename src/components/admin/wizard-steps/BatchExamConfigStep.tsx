import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { useExamTypes } from "@/hooks/useExamTypes";

interface BatchExamConfigStepProps {
  domain: string;
  formData: any;
  onChange: (field: string, value: any) => void;
}

export function BatchExamConfigStep({ domain, formData, onChange }: BatchExamConfigStepProps) {
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

  const isSchoolDomain = domain === "School Education";

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">Configure Exam Details</h3>
        <p className="text-sm text-muted-foreground">
          Provide specific information for {domain}
        </p>
      </div>

      <div className="space-y-4">
        {/* Batch Name */}
        <div>
          <Label htmlFor="name">Batch Name *</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="e.g., JEE 2026 Batch A"
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Brief description of the batch"
          />
        </div>

        {/* Exam Selection */}
        <div>
          <Label htmlFor="exam_name">
            {isSchoolDomain ? "Board" : "Exam"} *
          </Label>
          <Select
            value={formData.exam_name || ""}
            onValueChange={(value) => onChange("exam_name", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${isSchoolDomain ? "board" : "exam"}`} />
            </SelectTrigger>
            <SelectContent>
              {exams.map((exam) => (
                <SelectItem key={exam} value={exam}>
                  {exam}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Class/Level Selection */}
        {isSchoolDomain ? (
          <div>
            <Label htmlFor="target_class">Class *</Label>
            <Select
              value={formData.target_class || ""}
              onValueChange={(value) => onChange("target_class", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    Class {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (domain === 'Engineering Entrance' || domain === 'Medical Entrance') ? (
          <div>
            <Label htmlFor="target_class">Student Category *</Label>
            <Select
              value={formData.level === "Dropper" ? "dropper" : formData.target_class || ""}
              onValueChange={(value) => {
                if (value === "dropper") {
                  onChange("target_class", "12");
                  onChange("level", "Dropper");
                } else {
                  onChange("target_class", value);
                  onChange("level", value === "11" ? "Foundation Year" : "Final Year");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select student category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="11">Class 11 (Foundation Year)</SelectItem>
                <SelectItem value="12">Class 12 (Final Year)</SelectItem>
                <SelectItem value="dropper">Dropper (Class 12 Passed)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor="level">Level</Label>
            <Input
              id="level"
              value={formData.level || ""}
              onChange={(e) => onChange("level", e.target.value)}
              placeholder="e.g., Foundation, Advanced"
            />
          </div>
        )}

        {/* Capacity */}
        <div>
          <Label htmlFor="max_capacity">Maximum Capacity *</Label>
          <Input
            id="max_capacity"
            type="number"
            min="1"
            value={formData.max_capacity || ""}
            onChange={(e) => onChange("max_capacity", parseInt(e.target.value))}
            placeholder="50"
          />
        </div>

        {/* Dates */}
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
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date || ""}
              onChange={(e) => onChange("end_date", e.target.value)}
            />
          </div>
        </div>

        {/* Intake Period */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <h4 className="font-semibold mb-3">Intake Period (Student Enrollment Window)</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Define when new students can be auto-assigned to this batch. Default: 15 days from start date.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="intake_start_date">Intake Start Date</Label>
              <Input
                id="intake_start_date"
                type="date"
                value={formData.intake_start_date || ""}
                onChange={(e) => onChange("intake_start_date", e.target.value)}
                placeholder="Defaults to start date"
              />
            </div>
            <div>
              <Label htmlFor="intake_end_date">Intake End Date</Label>
              <Input
                id="intake_end_date"
                type="date"
                value={formData.intake_end_date || ""}
                onChange={(e) => onChange("intake_end_date", e.target.value)}
                placeholder="Defaults to +15 days"
              />
            </div>
          </div>
        </div>

        {/* Auto Assignment Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="auto_assign">Enable Auto-Assignment</Label>
            <p className="text-sm text-muted-foreground">
              Automatically assign new students to this batch during intake period
            </p>
          </div>
          <Switch
            id="auto_assign"
            checked={formData.auto_assign_enabled !== false}
            onCheckedChange={(checked) => onChange("auto_assign_enabled", checked)}
          />
        </div>
      </div>
    </div>
  );
}
