import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { BatchExamConfigStep } from "./wizard-steps/BatchExamConfigStep";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateBatchWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (createdBatch?: any) => void;
  initialDomain?: string | null;
  preselectedBoard?: string | null;
  preselectedClass?: string | null;
  existingBatches?: any[];
}

export function CreateBatchWizard({ 
  open, 
  onOpenChange, 
  onSuccess, 
  initialDomain,
  preselectedBoard,
  preselectedClass,
  existingBatches = []
}: CreateBatchWizardProps) {
  const { toast } = useToast();
  
  const generateBatchName = (startDate: string) => {
    if (!startDate || !preselectedBoard) return "";
    const year = new Date(startDate).getFullYear();
    const sameBoardClassBatches = existingBatches.filter((b: any) => 
      b.exam_type === initialDomain && 
      b.target_board === preselectedBoard && 
      b.target_class?.toString() === preselectedClass?.toString()
    );
    const batchLetter = String.fromCharCode(65 + sameBoardClassBatches.length);
    
    if (preselectedClass) {
      return `${preselectedBoard} Class ${preselectedClass} - Batch ${batchLetter} (${year})`;
    }
    return `${preselectedBoard} - Batch ${batchLetter} (${year})`;
  };

  const [formData, setFormData] = useState<any>({
    name: "",
    exam_name: preselectedBoard || "",
    target_board: preselectedBoard || null,
    level: preselectedClass ? `Class ${preselectedClass}` : "",
    target_class: preselectedClass || null,
    max_capacity: 50,
    start_date: "",
    end_date: null,
    intake_start_date: "",
    intake_end_date: "",
    auto_assign_enabled: true,
  });


  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate batch name when start date changes
      if (field === 'start_date' && value && !prev.name) {
        updated.name = generateBatchName(value);
      }
      
      // Auto-calculate intake dates
      if (field === 'start_date' && value) {
        const startDate = new Date(value);
        const intakeStart = new Date(startDate);
        intakeStart.setDate(intakeStart.getDate() - 30); // 30 days before start
        const intakeEnd = new Date(startDate);
        intakeEnd.setDate(intakeEnd.getDate() - 1); // 1 day before start
        
        updated.intake_start_date = intakeStart.toISOString().split('T')[0];
        updated.intake_end_date = intakeEnd.toISOString().split('T')[0];
      }
      
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.start_date) {
      toast({
        title: "Missing Fields",
        description: "Please enter batch name and start date",
        variant: "destructive",
      });
      return;
    }

    // Strong validation for school batches
    if (initialDomain === 'school') {
      if (!formData.target_board) {
        toast({
          title: "Missing Board",
          description: "Please select a Board for school batch",
          variant: "destructive",
        });
        return;
      }
      if (!formData.target_class) {
        toast({
          title: "Missing Class",
          description: "Please select a Class for school batch",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        return;
      }

      // For school batches, ensure exam_name matches target_board
      const batchData = {
        ...formData,
        exam_type: initialDomain,
        exam_name: initialDomain === 'school' ? formData.target_board : formData.exam_name,
      };

      const response = await fetch(`https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/batch-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(batchData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create batch');
      }

      toast({
        title: "Success",
        description: "Batch created successfully!",
      });

      handleReset();
      onSuccess(result.batch || result);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create batch",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      exam_name: preselectedBoard || "",
      target_board: preselectedBoard || null,
      level: preselectedClass ? `Class ${preselectedClass}` : "",
      target_class: preselectedClass || null,
      max_capacity: 50,
      start_date: "",
      end_date: null,
      intake_start_date: "",
      intake_end_date: "",
      auto_assign_enabled: true,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleReset}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Batch</DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {initialDomain && (
            <BatchExamConfigStep
              domain={initialDomain}
              formData={formData}
              onChange={handleFieldChange}
              preselectedBoard={preselectedBoard}
              preselectedClass={preselectedClass}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={handleReset}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create Batch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
