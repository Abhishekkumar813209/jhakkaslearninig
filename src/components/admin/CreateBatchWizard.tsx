import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { BatchExamConfigStep } from "./wizard-steps/BatchExamConfigStep";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateBatchWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialDomain?: string | null;
}

export function CreateBatchWizard({ open, onOpenChange, onSuccess, initialDomain }: CreateBatchWizardProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<any>({
    name: "",
    description: "",
    exam_name: "",
    level: "",
    target_class: null,
    max_capacity: 50,
    start_date: "",
    end_date: null,
    intake_start_date: "",
    intake_end_date: "",
    auto_assign_enabled: true,
  });


  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation for Engineering/Medical requires target_class
    const isEngineeringOrMedical = initialDomain === 'engineering' || initialDomain === 'medical';
    
    if (!formData.name || !formData.start_date) {
      toast({
        title: "Missing Fields",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    if (isEngineeringOrMedical && !formData.target_class) {
      toast({
        title: "Missing Student Category",
        description: "Please select a student category for Engineering/Medical batch",
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

      const batchData = {
        ...formData,
        exam_type: initialDomain,
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
      onSuccess();
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
      description: "",
      exam_name: "",
      level: "",
      target_class: null,
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
