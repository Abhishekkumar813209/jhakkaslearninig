import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
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
  
  const [formData, setFormData] = useState<any>({
    exam_name: preselectedBoard || "",
    target_board: preselectedBoard || null,
    level: preselectedClass ? `Class ${preselectedClass}` : "",
    target_class: preselectedClass || null,
    max_capacity: 50,
    start_date: "",
    intake_start_date: "",
    intake_end_date: "",
    auto_assign_enabled: true,
  });
  
  const [generatedBatchName, setGeneratedBatchName] = useState<string>("");

  // Step 1: Update formData when preselected values change
  useEffect(() => {
    if (preselectedBoard) {
      setFormData(prev => ({ ...prev, target_board: preselectedBoard, exam_name: preselectedBoard }));
    }
    if (preselectedClass) {
      setFormData(prev => ({ ...prev, target_class: preselectedClass }));
    }
  }, [preselectedBoard, preselectedClass]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Check for school domain requirements
    if (initialDomain === 'school') {
      if (!preselectedBoard || !preselectedClass) {
        toast({
          title: "Error",
          description: "Board and Class must be selected for school batches",
          variant: "destructive",
        });
        return;
      }
    }

    if (!formData.start_date || !formData.intake_start_date || !formData.intake_end_date) {
      toast({
        title: "Missing Fields",
        description: "Please enter all required fields",
        variant: "destructive",
      });
      return;
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

      // Step 3: Final validation and logging before API call
      console.log('🔍 Final formData before API:', formData);
      
      if (initialDomain === 'school' && (!formData.target_board || !formData.target_class)) {
        toast({
          title: "Validation Failed",
          description: `target_board: ${formData.target_board}, target_class: ${formData.target_class}`,
          variant: "destructive",
        });
        return;
      }

      console.log('📋 Batch Creation Debug:', {
        initialDomain,
        preselectedBoard,
        preselectedClass,
        formData: {
          target_board: formData.target_board,
          target_class: formData.target_class,
          exam_name: formData.exam_name,
        }
      });

      // For school batches, ensure all required fields are set
      const batchData = {
        ...formData,
        exam_type: initialDomain,
        target_board: initialDomain === 'school' ? (formData.target_board || preselectedBoard) : formData.target_board,
        target_class: initialDomain === 'school' ? (formData.target_class || preselectedClass) : formData.target_class,
        exam_name: initialDomain === 'school' ? (formData.target_board || preselectedBoard) : formData.exam_name,
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

      // Show the server-generated batch name
      const createdBatchName = result.batch?.name || "";
      
      toast({
        title: "Success",
        description: `Batch "${createdBatchName}" created successfully!`,
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
      exam_name: preselectedBoard || "",
      target_board: preselectedBoard || null,
      level: preselectedClass ? `Class ${preselectedClass}` : "",
      target_class: preselectedClass || null,
      max_capacity: 50,
      start_date: "",
      intake_start_date: "",
      intake_end_date: "",
      auto_assign_enabled: true,
    });
    setGeneratedBatchName("");
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
