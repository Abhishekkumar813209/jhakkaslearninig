import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import * as LucideIcons from "lucide-react";
import { useBatches } from "@/hooks/useBatches";
import { useExamTypes } from "@/hooks/useExamTypes";
import { useBoards } from "@/hooks/useBoards";

interface Batch {
  id: string;
  name: string;
  level: string;
  exam_type: string;
  exam_name: string;
  target_class?: string;
  target_board?: string;
}

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
  roadmapType: 'single_year' | 'combined';
  setRoadmapType: (value: 'single_year' | 'combined') => void;
  setSelectedBatch: (batch: Batch | null) => void;
}

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
  roadmapType,
  setRoadmapType,
  setSelectedBatch,
}: ExamTypeStepProps) => {
  const { batches } = useBatches();
  const { examTypes } = useExamTypes();
  const { boards: availableBoards } = useBoards(examType);

  // Get selected exam type to access available exams
  const selectedExamType = examTypes.find(et => et.code === examType);

  const iconMap: Record<string, any> = {
    GraduationCap: LucideIcons.GraduationCap,
    BookOpen: LucideIcons.BookOpen,
    Briefcase: LucideIcons.Briefcase,
    Building2: LucideIcons.Building2,
    Globe: LucideIcons.Globe,
    Shield: LucideIcons.Shield,
    Zap: LucideIcons.Zap,
    Award: LucideIcons.Award,
    Pencil: LucideIcons.Pencil,
    Wrench: LucideIcons.Wrench,
    Heart: LucideIcons.Heart,
  };

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

  // Filter batches based on selected exam type
  const filteredBatches = batches.filter((batch: any) => {
    if (examType === 'school') {
      return batch.exam_type === 'school' &&
             batch.target_class === conditionalClass &&
             batch.exam_name === conditionalBoard;
    } else if (examType === 'engineering' || examType === 'medical-ug' || examType === 'medical-pg') {
      // Filter by domain AND student category (class or dropper)
      if (conditionalClass === 'dropper') {
        return batch.exam_type === examType && batch.level === 'Dropper';
      } else if (conditionalClass) {
        return batch.exam_type === examType && 
               batch.target_class === conditionalClass && 
               batch.level !== 'Dropper';
      }
      return batch.exam_type === examType;
    } else if (examType) {
      return batch.exam_type === examType;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Exam Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {examTypes.map((type) => {
            const IconComponent = type.icon_name ? iconMap[type.icon_name] || LucideIcons.BookOpen : LucideIcons.BookOpen;
            return (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  examType === type.code ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setExamType(type.code)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${type.color_class || 'bg-gray-500'}`}>
                    <IconComponent className={`h-5 w-5 text-white`} />
                  </div>
                  <span className="font-medium text-sm">{type.display_name}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Conditional Fields */}
      {examType === 'school' && (
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
                {availableBoards.map(board => (
                  <SelectItem key={board} value={board}>
                    {board}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {(examType === 'engineering' || examType === 'medical-ug' || examType === 'medical-pg') && (
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

      {/* Exam Name Selection for all exam types */}
      {examType && examType !== 'school' && selectedExamType?.available_exams && (
        <div>
          <Label>Exam Name *</Label>
          <Select value={examName} onValueChange={setExamName}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent>
              {selectedExamType.available_exams.map((exam: string) => (
                <SelectItem key={exam} value={exam}>
                  {exam}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Manual input for exam types without predefined exams */}
      {examType && examType !== 'school' && (!selectedExamType?.available_exams || selectedExamType.available_exams.length === 0) && (
        <div>
          <Label>Exam Name *</Label>
          <Input
            placeholder={`e.g., ${examType === 'ssc' ? 'SSC CGL 2025' : examType === 'banking' ? 'IBPS PO 2025' : 'Enter exam name'}`}
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
          <Select 
            value={batchId} 
            onValueChange={(id) => {
              setBatchId(id);
              
              // Find and set the complete batch object
              const selectedBatchObj = filteredBatches.find((b: any) => b.id === id);
              if (selectedBatchObj) {
                setSelectedBatch(selectedBatchObj as Batch);
              }
            }}
          >
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
              examType === 'engineering' ? "e.g., IIT JEE Complete Preparation Plan" :
              examType === 'medical-ug' ? "e.g., NEET UG 2026 Roadmap" :
              examType === 'medical-pg' ? "e.g., NEET PG Complete Preparation" :
              "e.g., Complete Preparation Roadmap"
            }
            value={roadmapTitle}
            onChange={(e) => setRoadmapTitle(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
};
