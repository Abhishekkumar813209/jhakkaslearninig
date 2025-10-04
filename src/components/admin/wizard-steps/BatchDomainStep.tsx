import { Card } from "@/components/ui/card";
import { useExamTypes } from "@/hooks/useExamTypes";
import { GraduationCap, Building2, Briefcase, Trophy, Wrench, Heart, Scale, Train, Shield, Star } from "lucide-react";

interface BatchDomainStepProps {
  selectedDomain: string | null;
  onDomainSelect: (domain: string) => void;
}

const iconMap: Record<string, any> = {
  GraduationCap,
  Wrench,
  Heart,
  Briefcase,
  Building2,
  Scale,
  Train,
  Shield,
  Star,
};

export function BatchDomainStep({ selectedDomain, onDomainSelect }: BatchDomainStepProps) {
  const { examTypes, loading } = useExamTypes();

  if (loading) {
    return <div className="p-6 text-center">Loading exam types...</div>;
  }
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Select Exam Domain</h3>
        <p className="text-sm text-muted-foreground">
          Choose the category for this batch
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {examTypes.map((examType) => {
          const Icon = iconMap[examType.icon_name || 'GraduationCap'];
          const isSelected = selectedDomain === examType.code;

          return (
            <Card
              key={examType.id}
              className={`p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                isSelected ? "border-primary border-2 bg-primary/5" : "hover:border-primary/50"
              }`}
              onClick={() => onDomainSelect(examType.code)}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`p-3 rounded-full ${examType.color_class || 'bg-muted'} text-white`}>
                  {Icon && <Icon className="h-6 w-6" />}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{examType.display_name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {examType.available_exams?.slice(0, 2).join(', ')}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
