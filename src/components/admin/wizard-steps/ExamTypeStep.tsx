import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Briefcase, Building2, Shield, Globe, Pencil, Wrench, Heart } from "lucide-react";
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
  roadmapType: 'single_year' | 'combined';
  setRoadmapType: (value: 'single_year' | 'combined') => void;
}

const examTypes = [
  { value: 'School', label: 'School/Board Exams', icon: GraduationCap, color: 'bg-blue-500' },
  { value: 'Engineering', label: 'IIT JEE (Main, Advanced)', icon: Wrench, color: 'bg-red-500' },
  { value: 'Medical-UG', label: 'NEET UG', icon: Heart, color: 'bg-pink-500' },
  { value: 'Medical-PG', label: 'NEET PG', icon: Heart, color: 'bg-rose-500' },
  { value: 'SSC', label: 'SSC (CGL, CHSL, MTS, GD)', icon: Briefcase, color: 'bg-green-500' },
  { value: 'Banking', label: 'Banking (IBPS, SBI, RBI)', icon: Building2, color: 'bg-purple-500' },
  { value: 'UPSC', label: 'UPSC (Civil Services, IES)', icon: Globe, color: 'bg-orange-500' },
  { value: 'Railway', label: 'Railway (RRB, Group D)', icon: Shield, color: 'bg-teal-500' },
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
  roadmapType,
  setRoadmapType,
}: ExamTypeStepProps) => {
  const { batches } = useBatches();

  // Helper to calculate remaining days till academic year end
  const calculateRemainingDays = (currentClass: string): number => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-based (0 = Jan, 11 = Dec)
    
    let endDate: Date;
    
    if (currentMonth < 3) { // Jan, Feb, Mar - current academic year
      endDate = new Date(currentYear, 2, 31); // March 31
    } else { // Apr onwards - next academic year
      endDate = new Date(currentYear + 1, 2, 31); // March 31 next year
    }
    
    const diffTime = endDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 180; // Fallback to 180 days
  };

  // Map exam types to batch exam_type values
  const examTypeToDomain: Record<string, string> = {
    'School': 'School Education',
    'Engineering': 'Engineering Entrance',
    'Medical-UG': 'Medical Entrance',
    'Medical-PG': 'Medical Entrance',
    'SSC': 'SSC Exams',
    'Banking': 'Banking Exams',
    'UPSC': 'UPSC Exams',
    'Railway': 'Railway Exams',
    'Defence': 'Defence Exams',
    'Custom': 'Custom Exam',
  };

  // Filter batches based on selected exam type
  const filteredBatches = batches.filter((batch: any) => {
    const mappedDomain = examTypeToDomain[examType];
    
    if (examType === 'School') {
      return batch.exam_type === 'School Education' &&
             batch.target_class === conditionalClass &&
             batch.exam_name === conditionalBoard;
    } else if (examType === 'Engineering' || examType === 'Medical-UG' || examType === 'Medical-PG') {
      // Filter by domain AND student category (class or dropper)
      if (conditionalClass === 'dropper') {
        return batch.exam_type === mappedDomain && batch.level === 'Dropper';
      } else if (conditionalClass) {
        return batch.exam_type === mappedDomain && 
               batch.target_class === conditionalClass && 
               batch.level !== 'Dropper';
      }
      return batch.exam_type === mappedDomain;
    } else if (mappedDomain) {
      return batch.exam_type === mappedDomain;
    }
    return true;
  });

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

      {(examType === 'Engineering' || examType === 'Medical-UG' || examType === 'Medical-PG') && (
        <div className="space-y-4">
          <div>
            <Label>Student Category *</Label>
            <Select value={conditionalClass} onValueChange={setConditionalClass}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select your current status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="11">Class 11 (Foundation Year)</SelectItem>
                <SelectItem value="12">Class 12 (Final Year)</SelectItem>
                <SelectItem value="dropper">Dropper (Class 12 Passed)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {conditionalClass === '11' && (
            <div>
              <Label>Roadmap Duration *</Label>
              <Select value={roadmapType} onValueChange={setRoadmapType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose preparation timeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_year">
                    <div className="flex flex-col">
                      <span className="font-medium">Class 11 Only (Till March {new Date().getFullYear() + 1})</span>
                      <span className="text-xs text-muted-foreground">Focus on current academic year syllabus</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="combined">
                    <div className="flex flex-col">
                      <span className="font-medium">Combined Class 11 + 12 (2 Year Plan)</span>
                      <span className="text-xs text-muted-foreground">Complete syllabus with buffer time for revision</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {conditionalClass === '11' && roadmapType && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📅 <strong>Estimated Duration:</strong> 
                {roadmapType === 'single_year' 
                  ? ` ~${calculateRemainingDays('11')} days (Till Class 11 ends)`
                  : ` ~${calculateRemainingDays('11') + 365} days (2 years)`
                }
              </p>
            </div>
          )}
        </div>
      )}

      {examType === 'Engineering' && (
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm font-medium">
            📚 Exam: <strong>IIT JEE (Main & Advanced)</strong>
          </p>
        </div>
      )}

      {examType === 'Medical-UG' && (
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm font-medium">
            📚 Exam: <strong>NEET UG</strong>
          </p>
        </div>
      )}

      {examType === 'Medical-PG' && (
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm font-medium">
            📚 Exam: <strong>NEET PG</strong>
          </p>
        </div>
      )}

      {examType !== 'School' && examType !== 'Engineering' && examType !== 'Medical-UG' && examType !== 'Medical-PG' && (
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
              {filteredBatches.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No batches available for this exam type
                </div>
              ) : (
                filteredBatches.map((batch: any) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name} - {batch.level}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Roadmap Title *</Label>
          <Input
            placeholder={
              examType === 'Engineering' ? "e.g., IIT JEE Complete Preparation Plan" :
              examType === 'Medical-UG' ? "e.g., NEET UG 2026 Roadmap" :
              examType === 'Medical-PG' ? "e.g., NEET PG Complete Preparation" :
              "e.g., Complete Preparation Roadmap"
            }
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
