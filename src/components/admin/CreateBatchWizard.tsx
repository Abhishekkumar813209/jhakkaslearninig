import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { BatchDomainStep } from "./wizard-steps/BatchDomainStep";
import { BatchExamConfigStep } from "./wizard-steps/BatchExamConfigStep";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CreateBatchWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateBatchWizard({ open, onOpenChange, onSuccess }: CreateBatchWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    name: "",
    description: "",
    exam_name: "",
    level: "",
    target_class: null,
    max_capacity: 50,
    start_date: "",
    end_date: null,
  });

  const totalSteps = 2;

  const handleNext = () => {
    if (step === 1 && !selectedDomain) {
      toast({
        title: "Domain Required",
        description: "Please select an exam domain",
        variant: "destructive",
      });
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation for Engineering/Medical requires target_class
    const isEngineeringOrMedical = selectedDomain === 'Engineering Entrance' || selectedDomain === 'Medical Entrance';
    
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
        exam_type: selectedDomain,
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
    setStep(1);
    setSelectedDomain(null);
    setFormData({
      name: "",
      description: "",
      exam_name: "",
      level: "",
      target_class: null,
      max_capacity: 50,
      start_date: "",
      end_date: null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleReset}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Batch - Step {step} of {totalSteps}</DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {step === 1 && (
            <BatchDomainStep
              selectedDomain={selectedDomain}
              onDomainSelect={setSelectedDomain}
            />
          )}

          {step === 2 && selectedDomain && (
            <BatchExamConfigStep
              domain={selectedDomain}
              formData={formData}
              onChange={handleFieldChange}
            />
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleReset}>
              Cancel
            </Button>

            {step < totalSteps ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                Create Batch
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
