import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Briefcase, Building2, Shield, Globe, Pencil } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";

interface ExamTypeStepProps {
  examType: string;
  setExamType: (value: any) => void;
  examName: string;
  setExamName: (value: string) => void;
  conditionalClass: string;
  setConditionalClass: (value: string) => void;
  conditionalBoard: string;
  setConditionalBoard: (value: string) => void;
  batchId: string;
  setBatchId: (value: string) => void;
  roadmapTitle: string;
  setRoadmapTitle: (value: string) => void;
  totalDays: number;
  setTotalDays: (value: number) => void;
}

const examTypes = [
  { value: 'School', label: 'School/Board Exams', icon: GraduationCap, color: 'bg-blue-500' },
  { value: 'SSC', label: 'SSC (CGL, CHSL, MTS, GD)', icon: Briefcase, color: 'bg-green-500' },
  { value: 'Banking', label: 'Banking (IBPS, SBI, RBI)', icon: Building2, color: 'bg-purple-500' },
  { value: 'UPSC', label: 'UPSC (Civil Services, IES)', icon: Globe, color: 'bg-orange-500' },
  { value: 'Railway', label: 'Railway (RRB, Group D)', icon: Shield, color: 'bg-red-500' },
  { value: 'Defence', label: 'Defence (NDA, CDS, AFCAT)', icon: Shield, color: 'bg-indigo-500' },
  { value: 'Custom', label: 'Custom Exam', icon: Pencil, color: 'bg-gray-500' },
];

export const ExamTypeStep = ({
  examType,
  setExamType,
  examName,
  setExamName,
  conditionalClass,
  setConditionalClass,
  conditionalBoard,
  setConditionalBoard,
  batchId,
  setBatchId,
  roadmapTitle,
  setRoadmapTitle,
  totalDays,
  setTotalDays,
}: ExamTypeStepProps) => {
  const { batches } = useBatches();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Exam Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {examTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Card
                key={type.value}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  examType === type.value ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setExamType(type.value)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${type.color} bg-opacity-10`}>
                    <Icon className={`h-5 w-5 ${type.color.replace('bg-', 'text-')}`} />
                  </div>
                  <span className="font-medium text-sm">{type.label}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Conditional Fields */}
      {examType === 'School' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Target Class *</Label>
            <Select value={conditionalClass} onValueChange={setConditionalClass}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {[6, 7, 8, 9, 10, 11, 12].map((cls) => (
                  <SelectItem key={cls} value={cls.toString()}>
                    Class {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Board *</Label>
            <Select value={conditionalBoard} onValueChange={setConditionalBoard}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CBSE">CBSE</SelectItem>
                <SelectItem value="ICSE">ICSE</SelectItem>
                <SelectItem value="State Board">State Board</SelectItem>
                <SelectItem value="IB">IB</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {examType !== 'School' && (
        <div>
          <Label>Exam Name *</Label>
          <Input
            placeholder={`e.g., ${examType === 'SSC' ? 'SSC CGL 2025' : examType === 'Banking' ? 'IBPS PO 2025' : 'Enter exam name'}`}
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            className="mt-1.5"
          />
        </div>
      )}

      {/* Batch and Roadmap Details */}
      <div className="space-y-4 pt-4 border-t">
        <div>
          <Label>Select Batch *</Label>
          <Select value={batchId} onValueChange={setBatchId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Choose a batch" />
            </SelectTrigger>
            <SelectContent>
              {batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name} - {batch.level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Roadmap Title *</Label>
          <Input
            placeholder="e.g., Complete SSC CGL Preparation Roadmap"
            value={roadmapTitle}
            onChange={(e) => setRoadmapTitle(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Total Days (Estimated Duration)</Label>
          <Input
            type="number"
            min={7}
            max={365}
            value={totalDays}
            onChange={(e) => setTotalDays(parseInt(e.target.value) || 30)}
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            AI will distribute chapters across {totalDays} days
          </p>
        </div>
      </div>
    </div>
  );
};
