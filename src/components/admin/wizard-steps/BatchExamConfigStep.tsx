import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BatchExamConfigStepProps {
  domain: string;
  formData: any;
  onChange: (field: string, value: any) => void;
}

export function BatchExamConfigStep({ domain, formData, onChange }: BatchExamConfigStepProps) {
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    const fetchDomainData = async () => {
      const { data } = await supabase
        .from("exam_domains")
        .select("available_exams")
        .eq("domain_name", domain)
        .single();

      if (data?.available_exams) {
        const examsArray = Array.isArray(data.available_exams) ? data.available_exams : [];
        setExams(examsArray);
        
        // Extract classes for school domain
        if (domain === "School Education" && examsArray.length > 0) {
          const firstExam = examsArray[0] as any;
          if (firstExam?.classes && Array.isArray(firstExam.classes)) {
            setClasses(firstExam.classes);
          }
        }
      }
    };

    fetchDomainData();
  }, [domain]);

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
                <SelectItem key={exam.name} value={exam.name}>
                  {exam.name}
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
                <SelectItem value="11">Class 11th (Foundation Year)</SelectItem>
                <SelectItem value="12">Class 12th (Final Year)</SelectItem>
                <SelectItem value="dropper">Dropper (12th Passed)</SelectItem>
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
      </div>
    </div>
  );
}
