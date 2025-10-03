import { Card } from "@/components/ui/card";
import { GraduationCap, Building2, Briefcase, Trophy, Wrench } from "lucide-react";

interface BatchDomainStepProps {
  selectedDomain: string | null;
  onDomainSelect: (domain: string) => void;
}

const domains = [
  {
    id: "School Education",
    title: "School Education",
    description: "CBSE, ICSE, State Board batches",
    icon: GraduationCap,
    color: "text-blue-500",
  },
  {
    id: "SSC Exams",
    title: "SSC Exams",
    description: "CGL, CHSL, MTS, GD",
    icon: Building2,
    color: "text-green-500",
  },
  {
    id: "Banking Exams",
    title: "Banking Exams",
    description: "IBPS, SBI, RBI",
    icon: Briefcase,
    color: "text-purple-500",
  },
  {
    id: "UPSC Exams",
    title: "UPSC Exams",
    description: "CSE, CDS, NDA",
    icon: Trophy,
    color: "text-orange-500",
  },
  {
    id: "Engineering Entrance",
    title: "Engineering",
    description: "JEE Main, JEE Advanced",
    icon: Wrench,
    color: "text-red-500",
  },
  {
    id: "Medical Entrance",
    title: "Medical",
    description: "NEET UG, AIIMS",
    icon: GraduationCap,
    color: "text-pink-500",
  },
  {
    id: "Custom Exam",
    title: "Custom Exam",
    description: "Custom preparation batch",
    icon: Wrench,
    color: "text-gray-500",
  },
];

export function BatchDomainStep({ selectedDomain, onDomainSelect }: BatchDomainStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Select Exam Domain</h3>
        <p className="text-sm text-muted-foreground">
          Choose the category for this batch
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {domains.map((domain) => {
          const Icon = domain.icon;
          const isSelected = selectedDomain === domain.id;

          return (
            <Card
              key={domain.id}
              className={`p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                isSelected ? "border-primary border-2 bg-primary/5" : "hover:border-primary/50"
              }`}
              onClick={() => onDomainSelect(domain.id)}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`p-3 rounded-full bg-muted ${domain.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{domain.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {domain.description}
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
